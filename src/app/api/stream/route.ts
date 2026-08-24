import { NextRequest, NextResponse } from "next/server";
import { isDirectMediaFile } from "@/lib/anicine-data";
import { extractVideoUrl } from "@/lib/extract";

export const dynamic = "force-dynamic";

/** Listing/search page paths — these never contain one specific video. */
const LISTING_HINTS = ["/search", "/tag", "/browse", "/category", "listing", "/s/", "/c/"];
/** Listing/search page paths - these never contain one specific video. */
const isListingPath = (p: string) => LISTING_HINTS.some((h) => p.includes(h));

/** Same-domain links worth extracting (real video pages). */
const VIDEO_LINK_RE = /\/(video-[A-Za-z0-9]+|watch\/[^"]+|videos?\/[^"]+)/i;
const LINK_HREF_RE = /href="([^"]+)"/g;

async function findVideoLinks(pageUrl: string, max = 3): Promise<string[]> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36", Accept: "text/html" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const origin = new URL(pageUrl).origin;
    const out: string[] = [];
    for (const m of html.matchAll(LINK_HREF_RE)) {
      try {
        const abs = new URL(m[1], pageUrl);
        if (abs.origin !== origin) continue;
        if (!VIDEO_LINK_RE.test(abs.pathname)) continue;
        if (/\.(jpg|png|webp|gif|css|js)(\?|$)/i.test(abs.pathname)) continue;
        if (isListingPath(abs.pathname)) continue;
        const s = abs.toString();
        if (!out.includes(s)) out.push(s);
        if (out.length >= max) break;
      } catch { /* skip malformed */ }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * POST /api/stream  { url }
 *
 * Server-side stream resolver for titles that have no TMDB/IMDb embed
 * (the entire adult catalog). Takes any provider page — a video page, or even
 * a search/collection page — and returns a directly playable media URL:
 *
 *   - direct media file  -> returned as-is (mp4/webm/m3u8/mpd)
 *   - anything else      -> yt-dlp --get-url extraction, then headless-Chromium
 *                           capture fallback (src/lib/extract.ts ladder)
 *
 * The player modal feeds the result straight into its existing native
 * <video> / hls.js paths. The resolved URL is never exposed beyond this
 * response — same policy as downloads.
 */
export async function POST(req: NextRequest) {
  let url = "";
  try {
    const body = await req.json();
    url = String(body?.url ?? "").trim();
  } catch {
    /* invalid json handled below */
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: "Invalid or missing url" }, { status: 400 });
  }

  // Fast path: already a playable file.
  if (isDirectMediaFile(url)) {
    const kind = /\.(m3u8|mpd)(\?|#|$)/i.test(url) ? "hls" : "file";
    return NextResponse.json({ ok: true, playUrl: url, kind, resolvedVia: "direct" });
  }

  // Listing pages (search/tag/collection): the first thing yt-dlp grabs there is
  // usually a low-res PREVIEW clip, not a real video. Scrape the HTML for actual
  // same-domain video-page links and resolve those instead.
  const u = new URL(url);
  const isListing = isListingPath(u.pathname) || /^[^=]*=(.*)$/.test(u.search) && /search|s=|q=|query=/i.test(url);
  if (isListing) {
    const candidates = await findVideoLinks(url);
    for (const candidate of candidates) {
      try {
        const playUrl = await extractVideoUrl(candidate);
        if (playUrl) {
          const kind = /\.(m3u8|mpd)(\?|#|$)/i.test(playUrl) ? "hls" : "file";
          return NextResponse.json({ ok: true, playUrl, kind });
        }
      } catch { /* try next candidate */ }
    }
  }

  try {
    const playUrl = await extractVideoUrl(url);
    if (!playUrl) {
      return NextResponse.json({
        ok: false,
        error: "No stream could be extracted from this page. Try Download instead.",
      });
    }
    const kind = /\.(m3u8|mpd)(\?|#|$)/i.test(playUrl) ? "hls" : "file";
    return NextResponse.json({ ok: true, playUrl, kind });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Extraction failed" },
      { status: 500 },
    );
  }
}
