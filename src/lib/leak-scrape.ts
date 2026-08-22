// Best-effort HTML scraping of the other "leak" sites (the ones with no public
// API). Returns model/profile links discovered from each site's search page.
// This is intentionally fuzzy: it pulls internal <a> links and cleans the label.
// Kemono/Coomer remain the only live, structured sources (see lib/leak.ts) — the
// media proxy (see /api/leak/media) lets their video/photo play on our site.

import { LEAK_SEARCH_TARGETS } from "./leak";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BLOCK_SEG = new Set([
  "assets", "static", "css", "js", "login", "signup", "rss", "latest-updates",
  "hot", "videos", "photos", "creators", "about", "contact", "tags", "category",
  "categories", "page", "wp-content", "wp-includes", "favicon", "apple-touch",
  "static/styles", "assets/css", "cart", "checkout", "privacy", "terms", "api",
  "cdn", "img", "images", "image", "wp-json", "feed", "sitemap", "author",
  "forum", "welcome", "upload", "search_v2", "new", "models", "most-popular",
  "albums", "playlists", "members", "archive", "dmca", "contacts", "english",
]);

const NAV_NAMES = new Set([
  "home", "forum", "search", "login", "sign up", "signup", "members", "models",
  "categories", "albums", "playlists", "popular", "latest", "dmca", "archive",
  "contact", "about", "tags", "privacy", "terms", "cart", "checkout", "welcome",
  "search_v2", "new models", "add model", "new", "most-popular", "vixenleaks",
  "english",
]);

// Per-site search-URL overrides where the default `?s={q}` is wrong.
const SEARCH_OVERRIDE: Record<string, string> = {
  "fapello.com": "https://fapello.com/search_v2/?q={q}",
};

export interface ScrapedItem {
  site: string;
  name: string;
  url: string;
  thumb?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function cleanName(raw: string): string {
  let n = decodeEntities(raw).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  // strip trailing "86M Views" / "1.2K views" style suffixes
  n = n.replace(/\s*[\d.,]+\s*(m|k|views?|subs?)\b.*$/i, "");
  // strip everything from the first @handle
  const at = n.indexOf("@");
  if (at >= 0) n = n.slice(0, at).trim();
  return n.replace(/\s+/g, " ").trim();
}

function extract(html: string, home: string, site: string): ScrapedItem[] {
  const out: ScrapedItem[] = [];
  const seen = new Set<string>();
  const re = /<a\s+[^>]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    const inner = m[2];
    let abs: string;
    try {
      abs = new URL(href, home).toString();
    } catch {
      continue;
    }
    const u = new URL(abs);
    if (u.hostname !== new URL(home).hostname) continue;
    if (u.pathname === "/") continue;
    const seg = u.pathname.split("/").filter(Boolean)[0] || "";
    if (BLOCK_SEG.has(seg.toLowerCase())) continue;
    const name = cleanName(inner);
    if (name.length < 2 || name.length > 50) continue;
    if (NAV_NAMES.has(name.toLowerCase())) continue;
    const img = /<img[^>]+src="([^"]+)"/i.exec(inner);
    const thumb = img
      ? img[1].startsWith("http")
        ? img[1]
        : new URL(img[1], home).toString()
      : undefined;
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push({ site, name, url: abs, thumb });
  }
  return out;
}

export async function scrapeLeakSites(
  qRaw: string
): Promise<{ degraded: boolean; results: ScrapedItem[] }> {
  const q = (qRaw || "").trim();
  if (!q) return { degraded: false, results: [] };
  const targets = LEAK_SEARCH_TARGETS.filter((t) => t.name !== "Leak CSE");
  const out: ScrapedItem[] = [];
  let degraded = false;
  await Promise.all(
    targets.map(async (t) => {
      try {
        const host = new URL(t.home).hostname;
        const searchUrl = (SEARCH_OVERRIDE[host] ?? t.search).replace(
          "{q}",
          encodeURIComponent(q)
        );
        const resp = await fetch(searchUrl, {
          headers: { "User-Agent": UA, Accept: "text/html", Referer: t.home },
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) {
          degraded = true;
          return;
        }
        const html = await resp.text();
        out.push(...extract(html, t.home, t.name));
      } catch {
        degraded = true;
      }
    })
  );
  return { degraded, results: out.slice(0, 80) };
}
