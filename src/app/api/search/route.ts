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

async function getJson(url: string, headers: Record<string, string> = {}, timeoutMs = 5000): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Live Adult Media Search (Eporner 4K/1080p API)
// ---------------------------------------------------------------------------
async function searchAdultLive(query: string): Promise<MediaItem[]> {
  const data = await getJson(`https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(query)}&per_page=20&thumbsize=big`);
  const videos = data?.videos;
  if (!Array.isArray(videos) || videos.length === 0) return [];
  return videos.map((v: any): MediaItem => {
    const is4K = (v.keywords || "").includes("4k") || (v.title || "").toLowerCase().includes("4k");
    return {
      id: `ep-${v.id || Math.random().toString(36).slice(2)}`,
      title: v.title || query,
      year: new Date().getFullYear(),
      type: "adult",
      poster: v.default_thumb?.src || v.thumbs?.[0]?.src || "/posters/action.png",
      rating: parseFloat(v.rate || "8.5") || 8.0,
      quality: is4K ? "4K" : "1080p",
      seeds: v.views || 0,
      provider: "Eporner",
      providerUrl: v.url || "https://www.eporner.com",
      genre: ["Adult", "Ultra HD"],
      overview: `Duration: ${v.length_min || "24"} mins. Direct 4K/1080p stream available with zero popups.`,
      streamUrl: v.url,
      subcategory: "live_action",
    };
  });
}

// ---------------------------------------------------------------------------
// 2. Live Creator & Leaks Search (OnlyFans, Fansly, Patreon, Kemono/Coomer)
// ---------------------------------------------------------------------------
async function searchCreatorsLive(query: string): Promise<MediaItem[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];
  const qSlug = cleanQ.toLowerCase().replace(/[^a-z0-9]+/g, "");
  
  const platforms = [
    { name: "OnlyFans", base: "https://coomer.st/onlyfans/user", tag: "OnlyFans Model" },
    { name: "Fansly", base: "https://coomer.st/fansly/user", tag: "Fansly Creator" },
    { name: "Patreon", base: "https://kemono.cr/patreon/user", tag: "Patreon Sets" },
  ];

  const results: MediaItem[] = [];

  for (const plat of platforms) {
    results.push({
      id: `cr-${plat.name.toLowerCase()}-${qSlug}`,
      title: `${cleanQ} (${plat.name} Full Archive & Photo Sets)`,
      year: new Date().getFullYear(),
      type: "adult",
      poster: `https://avatar.vercel.sh/${encodeURIComponent(cleanQ)}.svg?text=${encodeURIComponent(plat.name.slice(0,2))}`,
      rating: 9.8,
      quality: "4K",
      seeds: 8500,
      provider: plat.name,
      providerUrl: `${plat.base}/${qSlug}`,
      genre: ["Creator Leaks", plat.tag, "OnlyFans/Fansly"],
      overview: `Full direct media archives, 4K photo sets, and exclusive leaked videos for ${cleanQ} on ${plat.name}. Direct streaming & unthrottled batch downloads.`,
      streamUrl: `${plat.base}/${qSlug}`,
      subcategory: "live_action",
    });
  }

  // Also query booru / cosplay archives
  const booruData = await getJson(
    `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=10&tags=${encodeURIComponent(cleanQ.toLowerCase().replace(/\s+/g, "_"))}`
  );
  if (Array.isArray(booruData)) {
    for (const item of booruData) {
      if (item.file_url || item.image) {
        results.push({
          id: `booru-${item.id}`,
          title: `${cleanQ} — HD Gallery Photo #${item.id}`,
          year: new Date().getFullYear(),
          type: "adult",
          poster: `https://safebooru.org/thumbnails/${item.directory}/thumbnail_${item.image}`,
          rating: 9.2,
          quality: "1080p",
          seeds: 1200,
          provider: "Safebooru",
          providerUrl: `https://safebooru.org/index.php?page=post&s=view&id=${item.id}`,
          genre: ["Cosplay", "Gallery", "High-Res"],
          overview: `High-resolution cosplay & model image set for ${cleanQ}. Resolution: ${item.width || 1920}x${item.height || 1080}.`,
          streamUrl: item.file_url || `https://safebooru.org/images/${item.directory}/${item.image}`,
          subcategory: "live_action",
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 3. Live Adult Torrent & Scene Indexer (SolidTorrents API)
// ---------------------------------------------------------------------------
async function searchAdultTorrentsLive(query: string): Promise<MediaItem[]> {
  const data = await getJson(
    `https://solidtorrents.to/api/v1/search?q=${encodeURIComponent(query)}&category=xxx&sort=seeders&fuv=yes`
  );
  const results = data?.results;
  if (!Array.isArray(results) || results.length === 0) return [];
  return results.slice(0, 10).map((t: any): MediaItem => {
    const is4K = (t.title || "").toLowerCase().includes("4k") || (t.title || "").toLowerCase().includes("2160p");
    return {
      id: `st-${t.swarm?.hash || Math.random().toString(36).slice(2)}`,
      title: t.title || query,
      year: new Date().getFullYear(),
      type: "adult",
      poster: "/posters/action.png",
      rating: 9.0,
      quality: is4K ? "4K" : "1080p",
      seeds: t.swarm?.seeders || 10,
      provider: "SolidTorrents",
      providerUrl: `https://solidtorrents.to/torrents/${t.title}`,
      genre: ["Adult Torrents", "Scene Release"],
      overview: `Size: ${((t.size || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB • Seeders: ${t.swarm?.seeders || 0} • Magnet stream ready.`,
      streamUrl: t.magnet,
      subcategory: "live_action",
    };
  });
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
  const filter = parsed.data.filter as "all" | "4k" | "1080p";
  const sort = parsed.data.sort as "seeds" | "rating" | "title";
  const providerFilter = parsed.data.provider || "all";

  let media: MediaItem[] = [];

  if (query) {
    // Run parallel live queries across Eporner, Creator Leaks (Coomer/Kemono), and Adult Torrents
    const [epornerResults, creatorResults, torrentResults] = await Promise.all([
      searchAdultLive(query),
      searchCreatorsLive(query),
      searchAdultTorrentsLive(query),
    ]);

    media = [...creatorResults, ...epornerResults, ...torrentResults];

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
        media.unshift(cur);
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
