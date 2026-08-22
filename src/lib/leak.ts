// Cross-site "leak"/model search over Kemono + Coomer.
//
// Both sites share one API. The only quirk: they 403 unless you send
// `Accept: text/css` (anti-scrape trick on their edge). The creators endpoint
// ignores `?q=` (returns the full ~108k list), so we fetch-once + cache +
// substring-filter. Posts expose NO media `type` field, so we classify each
// attachment by its filename extension.
//
// Egress to the source sites is injectable: server routes pass a proxy +
// cookie-aware implementation (see lib/leak-egress), while the default uses
// the plain global fetch so this module stays client-safe (no node: built-ins)
// for the browser bundle that imports e.g. proxiedMediaUrl.

export type LeakSite = { key: string; base: string };

export const LEAK_SITES: LeakSite[] = [
  { key: "kemono", base: "https://kemono.cr" },
  { key: "coomer", base: "https://coomer.st" },
];

export function siteHeaders(base: string): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    // Required, or the API returns 403.
    Accept: "text/css",
    Referer: base + "/",
  };
}

const MEDIA_EXT: Record<string, "video" | "photo" | "archive" | "other"> = {
  mp4: "video", webm: "video", mkv: "video", mov: "video", avi: "video",
  png: "photo", jpg: "photo", jpeg: "photo", gif: "photo", webp: "photo", bmp: "photo",
  zip: "archive", rar: "archive", "7z": "archive",
};

export type MediaKind = "video" | "photo" | "archive" | "other";

export function classify(name: string): MediaKind {
  const m = (name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return "other";
  return MEDIA_EXT[m[1]] ?? "other";
}

export function dataUrl(base: string, path: string): string {
  if (!path) return "";
  return base + "/data" + path;
}

// Every other "leak" site from the Leak Sites index. None expose a public
// JSON API (only Kemono/Coomer do), so these are deep-link search targets:
// clicking opens the site's own search in a new tab. `search` uses {q}.
// The Leak CSE is the one that truly searches across all of them at once.
export interface LeakTarget {
  name: string;
  home: string;
  search: string;
}

export const LEAK_SEARCH_TARGETS: LeakTarget[] = [
  { name: "Leak CSE", home: "https://cse.google.com/cse?cx=d638aa7da557546d5", search: "https://cse.google.com/cse?cx=d638aa7da557546d5&q={q}" },
  { name: "Hotleak", home: "https://hotleak.vip/", search: "https://hotleak.vip/?s={q}" },
  { name: "SimpCity", home: "https://simpcity.su/", search: "https://simpcity.su/index.php?search/{q}/" },
  { name: "SimpTown", home: "https://simptown.su/", search: "https://simptown.su/index.php?search/{q}/" },
  { name: "ThotHub", home: "https://thothub.to/", search: "https://thothub.to/?s={q}" },
  { name: "Fapello", home: "https://fapello.com/", search: "https://fapello.com/?s={q}" },
  { name: "Vixenleaks", home: "https://vixenleaks.com/", search: "https://vixenleaks.com/?s={q}" },
  { name: "OSosedki", home: "https://ososedki.com/", search: "https://ososedki.com/?s={q}" },
  { name: "EroThots", home: "https://erothots.co/", search: "https://erothots.co/?s={q}" },
  { name: "ViperGirls", home: "https://vipergirls.to/", search: "https://vipergirls.to/search.php?do=process&query={q}" },
  { name: "Faponic", home: "https://faponic.com/", search: "https://faponic.com/?s={q}" },
  { name: "Bunkr", home: "https://bunkr-albums.io/", search: "https://bunkr-albums.io/?s={q}" },
  { name: "Nudostar", home: "https://nudostar.tv/", search: "https://nudostar.tv/?s={q}" },
  { name: "NobodyHome", home: "https://nobodyhome.tv/", search: "https://nobodyhome.tv/?s={q}" },
  { name: "Reddit Plug", home: "https://redditplug.com/", search: "https://redditplug.com/?s={q}" },
  { name: "xxxTube", home: "https://x-x-x.tube/", search: "https://x-x-x.tube/?s={q}" },
  { name: "xxxVideo", home: "https://x-x-x.video/", search: "https://x-x-x.video/?s={q}" },
];

export function leakSearchUrl(t: LeakTarget, q: string): string {
  return t.search.replace("{q}", encodeURIComponent(q));
}

// Hosts we are allowed to proxy media from (our sources + their CDNs).
const _PROXY_BASE = [
  "kemono.cr",
  "coomer.st",
  ...LEAK_SEARCH_TARGETS.map((t) => {
    try {
      return new URL(t.home).hostname;
    } catch {
      return "";
    }
  }),
].filter(Boolean);

export function isAllowedMediaHost(host: string): boolean {
  const h = (host || "").toLowerCase();
  return _PROXY_BASE.includes(h) || _PROXY_BASE.some((b) => h.endsWith("." + b));
}

// Wrap a media URL so it is fetched/streamed by our server (same-origin),
// bypassing the cross-origin header/hotlink restrictions the source enforces.
export function proxiedMediaUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if ((u.protocol === "http:" || u.protocol === "https:") && isAllowedMediaHost(u.hostname)) {
      return "/api/leak/media?url=" + encodeURIComponent(raw);
    }
  } catch {
    /* not a url */
  }
  return raw;
}

/** Injectable egress for source-site fetches. Server routes pass a proxy +
 *  cookie-aware implementation (see lib/leak-egress); the default uses the
 *  plain global fetch so this module stays client-safe (no node: built-ins)
 *  for the browser bundle that imports e.g. proxiedMediaUrl. */
export type SourceEgress = (url: string, base: string) => Promise<Response | null>;

const plainSourceFetch: SourceEgress = (url, base) =>
  fetch(url, { headers: siteHeaders(base) }).catch(() => null);

interface CreatorRow {
  id: string;
  name: string;
  service: string;
  indexed: number;
  updated: number;
  favorited: number;
}

export interface LeakCreator {
  site: string;
  service: string;
  id: string;
  name: string;
  favorited: number;
  updated: number;
  score: number;
  url: string;
}

interface Attachment {
  name?: string;
  path?: string;
}
interface PostRow {
  id: string;
  user: string;
  service: string;
  title: string;
  published: string;
  file?: Attachment;
  attachments?: Attachment[];
}

export interface LeakMediaItem {
  name: string;
  url: string;
  kind: MediaKind;
}
export interface LeakPost {
  postId: string;
  title: string;
  published: string;
  items: LeakMediaItem[];
}

// In-process TTL cache (single server instance). Cheap stand-in for KV here;
// the Cloudflare Worker route uses its own KV-backed cache.
const _cache = new Map<string, { expires: number; value: unknown }>();
export async function cachedJson<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await compute();
  _cache.set(key, { expires: Date.now() + ttlMs, value });
  return value;
}

async function fetchCreators(site: LeakSite, egress: SourceEgress = plainSourceFetch): Promise<CreatorRow[]> {
  return cachedJson<CreatorRow[]>(`creators:${site.key}`, 30 * 60 * 1000, async () => {
    try {
      const resp = await egress(`${site.base}/api/v1/creators`, site.base);
      if (!resp || !resp.ok) return [];
      return (await resp.json()) as CreatorRow[];
    } catch {
      return [];
    }
  });
}

function scoreName(haystack: string, q: string): number {
  const h = (haystack || "").toLowerCase();
  const toks = q.split(/\s+/).filter(Boolean);
  // Multi-word queries require EVERY token to be present (logical AND), so a
  // search for "zoey sinn" matches only creators containing both words, not the
  // union of every "zoey" or "sinn" creator.
  if (toks.length > 1 && !toks.every((t) => h.includes(t))) return 0;
  let s = 0;
  if (h === q) s += 100;
  else if (h.startsWith(q)) s += 60;
  else if (h.includes(q)) s += 30;
  for (const t of toks) {
    if (h.includes(t)) s += 8;
  }
  return s;
}

export async function searchLeak(qRaw: string, egress: SourceEgress = plainSourceFetch): Promise<{
  query: string;
  degraded: boolean;
  results: LeakCreator[];
  total: number;
}> {
  const q = qRaw.trim().toLowerCase();
  if (!q) return { query: "", degraded: false, results: [], total: 0 };

  const lists = await Promise.all(LEAK_SITES.map((s) => fetchCreators(s, egress)));
  const degraded = lists.some((l) => l.length === 0);

  const results: LeakCreator[] = [];
  lists.forEach((creators, i) => {
    const site = LEAK_SITES[i];
    for (const c of creators) {
      const sc = scoreName(c.name, q);
      if (sc > 0) {
        results.push({
          site: site.key,
          service: c.service,
          id: c.id,
          name: c.name,
          favorited: c.favorited || 0,
          updated: c.updated || 0,
          score: sc,
          url: `${site.base}/${c.service}/user/${c.id}`,
        });
      }
    }
  });

  // Relevance first (exact / prefix matches rise to the top), popularity as tiebreak.
  results.sort((a, b) => b.score - a.score || b.favorited - a.favorited);
  const top = results.slice(0, 60);
  return { query: q, degraded, results: top, total: results.length };
}

export async function getLeakPosts(opts: {
  site: string;
  service: string;
  id: string;
  type: "all" | "video" | "photo";
}, egress: SourceEgress = plainSourceFetch): Promise<{
  site: string;
  service: string;
  id: string;
  type: string;
  degraded: boolean;
  creator: { url: string };
  posts: LeakPost[];
  total: number;
}> {
  const site = LEAK_SITES.find((s) => s.key === opts.site) || LEAK_SITES[0];
  if (!opts.service || !opts.id) {
    return {
      site: site.key,
      service: opts.service,
      id: opts.id,
      type: opts.type,
      degraded: false,
      creator: { url: "" },
      posts: [],
      total: 0,
    };
  }

  let raw: PostRow[] = [];
  let ok = true;
  try {
    raw = await cachedJson<PostRow[]>(`posts:${site.key}:${opts.service}:${opts.id}`, 5 * 60 * 1000, async () => {
      try {
        const resp = await egress(
          `${site.base}/api/v1/${opts.service}/user/${opts.id}/posts?limit=50`,
          site.base,
        );
        if (!resp || !resp.ok) return [];
        return (await resp.json()) as PostRow[];
      } catch {
        return [];
      }
    });
  } catch {
    ok = false;
  }

  const posts: LeakPost[] = raw
    .map((p) => {
      const items: LeakMediaItem[] = [];
      const push = (a?: Attachment) => {
        if (!a || !a.path) return;
        const kind = classify(a.name || a.path);
        if (opts.type !== "all" && kind !== opts.type) return;
        items.push({ name: a.name || a.path, url: dataUrl(site.base, a.path), kind });
      };
      push(p.file);
      (p.attachments || []).forEach(push);
      return { postId: p.id, title: p.title, published: p.published, items };
    })
    .filter((p) => p.items.length > 0);

  const total = posts.reduce((n, p) => n + p.items.length, 0);
  return {
    site: site.key,
    service: opts.service,
    id: opts.id,
    type: opts.type,
    degraded: !ok,
    creator: { url: `${site.base}/${opts.service}/user/${opts.id}` },
    posts,
    total,
  };
}
