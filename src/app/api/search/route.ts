import { NextRequest, NextResponse } from "next/server";
import {
  TRENDING_MEDIA,
  PROVIDERS,
  CATALOG_MODES,
  buildSearchUrl,
  type ProviderCategory,
  type Provider,
  type MediaItem,
  type ModeKey,
} from "@/lib/anicine-data";
import { SearchQuerySchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, RL_PRESETS } from "@/lib/rate-limit";
import { searchTorrents as searchTorrentsReal, formatSize } from "@/lib/providers/torrents";
import { searchLeak } from "@/lib/leak";

export const dynamic = "force-dynamic";

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function score(haystack: string, q: string): number {
  if (!q) return 0;
  const h = normalizeForMatch(haystack);
  const nq = normalizeForMatch(q);
  if (!nq) return 0;
  const hNoSpace = h.replace(/\s+/g, "");
  const qNoSpace = nq.replace(/\s+/g, "");
  let s = 0;
  if (h === nq || hNoSpace === qNoSpace) s += 100;
  if (h.startsWith(nq) || hNoSpace.startsWith(qNoSpace)) s += 60;
  if (h.includes(nq) || hNoSpace.includes(qNoSpace)) s += 30;
  const tokens = nq.split(/\s+/).filter((t) => t.length >= 3);
  const stop = new Set(["the", "and", "for", "new", "day", "brand"]);
  for (const t of tokens) {
    if (stop.has(t)) continue;
    if (h.includes(t) || hNoSpace.includes(t.replace(/\s+/g, ""))) s += 12;
  }
  return s;
}

const CURATED_MIN_SCORE = 12;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/**
 * Upstream indexes reset connections under load -- Eporner in particular
 * throws ECONNRESET on a noticeable fraction of requests. A single attempt
 * that swallowed the error made one blip look like "no adult results", so the
 * grid silently fell back to torrent rows with placeholder art and the whole
 * page read as broken thumbnails.
 *
 * Retries are read-only and idempotent, so they are safe here. The failure is
 * logged rather than discarded: a provider that starts failing constantly
 * should be visible in the server log, not inferred from an empty grid.
 */
async function getJson(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 5000,
  attempts = 3,
): Promise<any | null> {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
      // 4xx is a real answer -- retrying will not change it.
      if (res.status >= 400 && res.status < 500) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 250 * 2 ** i)); // 250ms, 500ms
      }
    }
  }
  console.warn(`[search] upstream failed after ${attempts} attempts: ${new URL(url).host} -- ${lastErr}`);
  return null;
}

// ---------------------------------------------------------------------------
// 1. Live Adult Media Search (Eporner 4K/1080p API)
// ---------------------------------------------------------------------------
async function searchAdultLive(query: string): Promise<MediaItem[]> {
  // `format=json` is required. Without it the endpoint does not negotiate a
  // JSON body and the request fails outright, so every adult search silently
  // fell through to torrent magnets with placeholder art -- which is what made
  // the grid look like "thumbnails not loading".
  const data = await getJson(`https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(query)}&per_page=20&thumbsize=big&format=json`);
  const videos = data?.videos;
  if (!Array.isArray(videos) || videos.length === 0) return [];
  return videos.map((v: any): MediaItem => {
    const is4K = (v.keywords || "").includes("4k") || (v.title || "").toLowerCase().includes("4k");
    return {
      id: `ep-${v.id || Math.random().toString(36).slice(2)}`,
      title: v.title || query,
      year: new Date().getFullYear(),
      type: "adult",
      mediaKind: "video",
      poster: v.default_thumb?.src || v.thumbs?.[0]?.src || "/posters/action.png",
      rating: parseFloat(v.rate || "8.5") || 8.0,
      quality: is4K ? "4K" : "1080p",
      seeds: v.views || 0,
      provider: "Eporner",
      providerUrl: v.url || "https://www.eporner.com",
      genre: ["Adult", "Ultra HD", "Direct Video"],
      overview: `Duration: ${v.length_min || "24"} mins. Direct 4K/1080p stream available with zero popups.`,
      streamUrl: v.embed || v.url,
      subcategory: "live_action",
    };
  });
}

// ---------------------------------------------------------------------------
// 2. High-Quality Creator & Model Media Generator (Photos & Videos)
// ---------------------------------------------------------------------------
// 3. Live Adult Torrent & Scene Indexer (SolidTorrents API)
// ---------------------------------------------------------------------------
async function searchAdultTorrentsLive(query: string): Promise<MediaItem[]> {
  // Was solidtorrents.to — that endpoint timed out during testing. apibay
  // (category 500 = XXX) plus BTDig's DHT index are live and return real
  // swarm data + working magnets.
  const rows = await searchTorrentsReal(query, 500, 12);
  return rows.map((t): MediaItem => ({
    id: t.id,
    title: t.title,
    year: new Date().getFullYear(),
    type: "adult",
    mediaKind: "video",
    poster: "/posters/action.png",
    rating: 8.0,
    quality: /2160p|4k/i.test(t.title) ? "4K" : /1080p/i.test(t.title) ? "1080p" : "720p",
    seeds: t.seeders,
    provider: t.source,
    providerUrl: t.detailsUrl || "https://btdig.com/",
    genre: ["Torrent", t.source],
    overview: `${formatSize(t.sizeBytes)} · ${t.seeders} seeders. Magnet download.`,
    streamUrl: t.magnet,
    subcategory: "live_action",
  }));
}

/** Real creator-leak results from Kemono/Coomer (replaces the fabricated set). */
async function searchLeaksLive(query: string): Promise<MediaItem[]> {
  try {
    const res = await searchLeak(query);
    const creators = (res?.results ?? []).slice(0, 12);
    return creators.map((c: any): MediaItem => ({
      id: `leak-${c.service ?? "kemono"}-${c.id}`,
      title: `${c.name} — ${String(c.service ?? "").replace(/^\w/, (m: string) => m.toUpperCase())}`,
      year: new Date().getFullYear(),
      type: "adult",
      mediaKind: "set",
      poster: "/posters/drama.png",
      rating: 8.5,
      quality: "1080p",
      seeds: Number(c.favorited) || 0,
      provider: c.site === "coomer" ? "Coomer" : "Kemono",
      providerUrl: c.url,
      genre: ["Creator", "Leak Archive"],
      overview: `Archived posts for ${c.name}. Opens the creator's post archive.`,
      subcategory: "live_action",
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main GET Handler
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`search:${ip}`, RL_PRESETS.search)) {
    return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429 });
  }
  const sp = req.nextUrl.searchParams;
  const parsed = SearchQuerySchema.safeParse({
    q: sp.get("q") || "",
    mode: sp.get("mode") || "adult",
    filter: sp.get("filter") || "all",
    sort: sp.get("sort") || "seeds",
    provider: sp.get("provider") || "all",
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid query", details: parsed.error.flatten() }, { status: 400 });
  }
  const query = (parsed.data.q || "").trim().slice(0, 200);
  const rawMode = parsed.data.mode as string;
  const mode = (rawMode === "all" ? "all" : rawMode) as ModeKey | "all";
  const filter = parsed.data.filter as "all" | "4k" | "1080p" | "video" | "photo";
  const sort = parsed.data.sort as "seeds" | "rating" | "title";
  const providerFilter = parsed.data.provider || "all";

  let media: MediaItem[] = [];

  if (query) {
    // Generate creator media (photos & videos) + live tube & torrent searches in parallel
    const [epornerResults, torrentResults, leakResults] = await Promise.all([
      searchAdultLive(query),
      searchAdultTorrentsLive(query),
      searchLeaksLive(query),
    ]);

    // NOTE: results are real provider data only.
    // A previous version synthesised ~14 fake "leaked" entries per query
    // (stock photos + a Big Buck Bunny sample video) attributed to whatever
    // name the user typed. That misled users, attached fabricated "leaks" to
    // real people, and contradicts our own DMCA/2257 policy pages, so it was
    // removed rather than expanded.
    media = [...epornerResults, ...leakResults, ...torrentResults];

    // Also match bundled trending catalog for high-relevance matches
    const qLower = query.toLowerCase();
    const curatedMatches = TRENDING_MEDIA
      .map((m) => ({ m, s: score(`${m.title} ${m.genre.join(" ")} ${m.overview} ${m.provider}`, qLower) }))
      .filter((r) => r.s >= CURATED_MIN_SCORE)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.m);

    // Merge curated matches with live results (avoiding duplicates)
    const seenIds = new Set(media.map((m) => m.id));
    const seenTitles = new Set(media.map((m) => normalizeForMatch(m.title).replace(/\s+/g, "")));
    for (const cur of curatedMatches) {
      const titleKey = normalizeForMatch(cur.title).replace(/\s+/g, "");
      if (!seenIds.has(cur.id) && !seenTitles.has(titleKey)) {
        media.push(cur);
        seenIds.add(cur.id);
        seenTitles.add(titleKey);
      }
    }
  } else {
    // No query: return curated trending media
    media = [...TRENDING_MEDIA].slice(0, 24);
  }

  // Apply filters
  if (filter === "4k") media = media.filter((m) => m.quality === "4K");
  if (filter === "1080p") media = media.filter((m) => m.quality === "1080p");
  if (filter === "video") media = media.filter((m) => m.mediaKind === "video" || !m.mediaKind);
  if (filter === "photo") media = media.filter((m) => m.mediaKind === "photo");

  if (providerFilter !== "all") {
    const provLower = providerFilter.toLowerCase();
    media = media.filter((m) => m.provider.toLowerCase().includes(provLower));
  }

  // Apply sorting
  if (sort === "rating") media = [...media].sort((a, b) => b.rating - a.rating);
  else if (sort === "title") media = [...media].sort((a, b) => a.title.localeCompare(b.title));
  else media = [...media].sort((a, b) => b.seeds - a.seeds);

  // Provider catalog matches with per-site search URLs
  let providerMatches: Provider[];
  if (mode === "all") {
    providerMatches = [...PROVIDERS];
  } else {
    const cats: ProviderCategory[] = CATALOG_MODES.find((c) => c.key === mode)?.categories || ["adult"];
    providerMatches = PROVIDERS.filter((p) => cats.includes(p.category));
  }
  if (providerFilter !== "all") providerMatches = providerMatches.filter((p) => p.name === providerFilter);

  if (query) {
    const q = query.toLowerCase();
    providerMatches = providerMatches
      .map((p) => ({ p, s: score(`${p.name} ${p.domain} ${p.blurb} ${p.category}`, q) }))
      .filter((r) => r.s >= 12 || !r.p.searchPattern)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.p);
  }

  const providersWithSearch = providerMatches.map((p) => ({
    name: p.name,
    domain: p.domain,
    url: p.url,
    category: p.category,
    blurb: p.blurb,
    searchUrl: buildSearchUrl(p, query),
    hasSearch: !p.searchPattern,
    score: query ? score(`${p.name} ${p.domain} ${p.blurb}`, query.toLowerCase()) : 0,
  }));

  return NextResponse.json({
    query,
    mode,
    items: media,
    providers: providersWithSearch,
    total: media.length,
    providerCount: providersWithSearch.length,
  });
}
