/**
 * Bunkr album resolver.
 *
 * Bunkr has no public search API — albums are reached by direct URL — so this
 * is a *resolver*: paste an album (or single file) link and get back every
 * downloadable item.
 *
 * The download URL is not in the page. Reconstructed flow, verified end-to-end
 * against a live album (307 MB MP4 retrieved):
 *
 *   1. GET  /a/<albumId>              -> album page, contains /f/<slug> links
 *   2. GET  /f/<slug>                 -> file page, carries data-file-id
 *   3. GET  dl.<host>/file/<fileId>   -> shim page (also has the real filename)
 *   4. POST dl.<host>/api/_001_v2 {id}-> { mediafiles, path, original }
 *   5. GET  glb-apisign.cdn.cr/sign?path=<decoded path> -> { token, ex }
 *   6. mediafiles + path + ?token&ex  -> the actual file
 *
 * Steps 4-6 are the part that matters: without the signature the CDN rejects
 * the request, which is why naive scrapers only ever get thumbnails.
 */

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const SIGN_SERVICE = "https://glb-apisign.cdn.cr/sign";

/** Mirrors seen in the wild; the album id is portable across them. */
export const BUNKR_HOSTS = ["bunkr.cr", "bunkr.si", "bunkr.fi", "bunkr.ac", "bunkr.ph", "bunkr.ru"];

export interface BunkrFile {
  fileId: string;
  slug: string;
  name: string;
  /** Signed, directly fetchable URL. Expires — resolve shortly before use. */
  url: string;
  kind: "video" | "photo" | "archive" | "other";
}

export interface BunkrAlbum {
  albumId: string;
  title: string;
  host: string;
  files: BunkrFile[];
}

export function isBunkrUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return /(^|\.)bunkr+\.[a-z]{2,}$/i.test(h) || h.startsWith("dl.bunkr");
  } catch {
    return false;
  }
}

function kindOf(name: string): BunkrFile["kind"] {
  const e = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "m4v", "mkv", "webm", "mov", "avi"].includes(e)) return "video";
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif"].includes(e)) return "photo";
  if (["zip", "rar", "7z"].includes(e)) return "archive";
  return "other";
}

async function text(url: string, init?: RequestInit, timeoutMs = 15_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "text/html,*/*", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Turn one Bunkr file id into a signed, directly downloadable URL.
 * Exported because the signature is short-lived: re-resolve at download time
 * rather than storing the result.
 */
export async function resolveBunkrFile(host: string, fileId: string): Promise<{ url: string; name: string } | null> {
  try {
    const dlHost = `https://dl.${host.replace(/^dl\./, "")}`;

    const metaRes = await fetch(`${dlHost}/api/_001_v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Referer: `${dlHost}/file/${fileId}`,
      },
      body: JSON.stringify({ id: fileId }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!metaRes.ok) return null;

    const meta = (await metaRes.json()) as { mediafiles?: string; path?: string; original?: string };
    if (!meta.mediafiles || !meta.path) return null;

    const raw = new URL(meta.mediafiles + meta.path);
    const name = meta.original || raw.pathname.split("/").pop() || "bunkr-file";
    if (meta.original) raw.searchParams.set("n", meta.original);

    // The CDN rejects unsigned requests — this is the step naive scrapers miss.
    const signRes = await fetch(
      `${SIGN_SERVICE}?path=${encodeURIComponent(decodeURIComponent(raw.pathname))}`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) },
    );
    if (!signRes.ok) return null;

    const { token, ex } = (await signRes.json()) as { token?: string; ex?: number };
    if (!token || !ex) return null;

    raw.searchParams.set("token", token);
    raw.searchParams.set("ex", String(ex));
    return { url: raw.toString(), name };
  } catch {
    return null;
  }
}

/**
 * Resolve an album (or a single /f/ link) into downloadable files.
 *
 * @param limit cap on files resolved — each one costs two extra requests, so an
 *              unbounded album could fan out badly.
 */
export async function resolveBunkrAlbum(albumUrl: string, limit = 30): Promise<BunkrAlbum | null> {
  let u: URL;
  try {
    u = new URL(albumUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|dl)\./, "");

  // Single file link — resolve just that one.
  const fileMatch = u.pathname.match(/^\/f\/([A-Za-z0-9_.-]+)/);
  if (fileMatch) {
    const page = await text(`https://${host}/f/${fileMatch[1]}`);
    const id = page?.match(/data-file-id="(\d+)"/)?.[1];
    if (!id) return null;
    const r = await resolveBunkrFile(host, id);
    if (!r) return null;
    return {
      albumId: fileMatch[1],
      title: r.name,
      host,
      files: [{ fileId: id, slug: fileMatch[1], name: r.name, url: r.url, kind: kindOf(r.name) }],
    };
  }

  const albumMatch = u.pathname.match(/^\/a\/([A-Za-z0-9_.-]+)/);
  if (!albumMatch) return null;
  const albumId = albumMatch[1];

  const html = await text(`https://${host}/a/${albumId}`, undefined, 20_000);
  if (!html) return null;

  const title =
    html.match(/<h1[^>]*>([^<]{1,120})</i)?.[1]?.trim() ||
    html.match(/<title>([^<]{1,120})</i)?.[1]?.trim() ||
    albumId;

  const slugs = Array.from(new Set(Array.from(html.matchAll(/href="\/f\/([A-Za-z0-9_.-]+)"/g)).map((m) => m[1])));
  if (slugs.length === 0) return { albumId, title, host, files: [] };

  // Resolve with bounded concurrency — polite to the host, and fast enough.
  const picked = slugs.slice(0, limit);
  const files: BunkrFile[] = [];
  const CONCURRENCY = 4;

  for (let i = 0; i < picked.length; i += CONCURRENCY) {
    const batch = picked.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (slug) => {
        const page = await text(`https://${host}/f/${slug}`);
        const id = page?.match(/data-file-id="(\d+)"/)?.[1];
        if (!id) return null;
        const r = await resolveBunkrFile(host, id);
        return r ? { fileId: id, slug, name: r.name, url: r.url, kind: kindOf(r.name) } : null;
      }),
    );
    for (const f of settled) if (f) files.push(f);
  }

  return { albumId, title, host, files };
}
