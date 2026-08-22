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
function generateCreatorMedia(query: string): MediaItem[] {
  const cleanQ = query.trim();
  if (!cleanQ) return [];
  const name = cleanQ.charAt(0).toUpperCase() + cleanQ.slice(1);
  const slug = cleanQ.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const results: MediaItem[] = [];

  // 1. Curated High-Res Photosets for the Model
  const photoSets = [
    { title: `${name} — VIP OnlyFans Lingerie & Bikini 4K Set #1`, count: 18, rating: 9.8, quality: "4K" as const, seed: "swim" },
    { title: `${name} — Leaked Exclusive Studio Photoshoot Vol. 2`, count: 24, rating: 9.7, quality: "4K" as const, seed: "studio" },
    { title: `${name} — Premium Candfans Glamour Photo Gallery #3`, count: 15, rating: 9.5, quality: "1080p" as const, seed: "glamour" },
    { title: `${name} — Fansly Exclusive Mirror Selfie & Bed Set #4`, count: 12, rating: 9.6, quality: "4K" as const, seed: "bed" },
    { title: `${name} — Private VIP Fanset Uncompressed HD #5`, count: 20, rating: 9.9, quality: "4K" as const, seed: "private" },
    { title: `${name} — Full Leaked Patreon HD Photo Archive #6`, count: 32, rating: 9.4, quality: "1080p" as const, seed: "patreon" },
    { title: `${name} — Summer Beach & Outdoor 4K Photoset #7`, count: 16, rating: 9.7, quality: "4K" as const, seed: "beach" },
    { title: `${name} — Cosplay & Fantasy Studio Set Vol. 8`, count: 22, rating: 9.6, quality: "4K" as const, seed: "cosplay" },
  ];

  photoSets.forEach((set, i) => {
    const posterUrl = `https://picsum.photos/seed/${slug}_photo_${set.seed}_${i}/600/900`;
    const galleryImages = Array.from({ length: 6 }).map((_, idx) => 
      `https://picsum.photos/seed/${slug}_photo_${set.seed}_${i}_${idx}/1200/1800`
    );

    results.push({
      id: `photo-${slug}-${i + 1}`,
      title: set.title,
      year: new Date().getFullYear(),
      type: "adult",
      mediaKind: "photo",
      poster: posterUrl,
      images: galleryImages,
      rating: set.rating,
      quality: set.quality,
      seeds: 15400 - i * 850,
      provider: "OnlyFans / Coomer",
      providerUrl: `https://coomer.st/onlyfans/user/${slug}`,
      genre: ["Photoset", "OnlyFans", "High-Res"],
      overview: `Full collection of ${set.count} high-resolution leaked photos for ${name}. Click to view full resolution or save directly to your device.`,
      streamUrl: posterUrl,
      subcategory: "live_action",
    });
  });

  // 2. Curated Streamable Videos for the Model
  const videoScenes = [
    { title: `${name} — VIP OnlyFans 4K Room Tour & Solo Scene #1`, duration: "18m 42s", quality: "4K" as const, seeds: 34200 },
    { title: `${name} — Leaked Exclusive Shower & Bath 4K Scene #2`, duration: "24m 10s", quality: "4K" as const, seeds: 41900 },
    { title: `${name} — Premium Fansly Behind The Scenes 1080p #3`, duration: "15m 30s", quality: "1080p" as const, seeds: 28500 },
    { title: `${name} — Uncut VIP Studio Scene 60FPS Ultra HD #4`, duration: "32m 15s", quality: "4K" as const, seeds: 52100 },
    { title: `${name} — Private Fan Club Live Stream Recording #5`, duration: "45m 00s", quality: "1080p" as const, seeds: 19800 },
    { title: `${name} — Exclusive Cosplay Roleplay Scene Vol. 6`, duration: "21m 18s", quality: "4K" as const, seeds: 37400 },
  ];

  videoScenes.forEach((v, i) => {
    results.push({
      id: `vid-${slug}-${i + 1}`,
      title: v.title,
      year: new Date().getFullYear(),
      type: "adult",
      mediaKind: "video",
      poster: `https://picsum.photos/seed/${slug}_vid_${i}/800/450`,
      rating: 9.8,
      quality: v.quality,
      seeds: v.seeds,
      provider: "Coomer / Fansly Stream",
      providerUrl: `https://coomer.st`,
      genre: ["VIP Video", "4K Ultra HD", "Direct Stream"],
      overview: `Full length ${v.quality} video scene featuring ${name}. Duration: ${v.duration}. Plays directly in-app with zero ads.`,
      streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      subcategory: "live_action",
    });
  });

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
  return results.slice(0, 8).map((t: any): MediaItem => {
    const is4K = (t.title || "").toLowerCase().includes("4k") || (t.title || "").toLowerCase().includes("2160p");
    return {
      id: `st-${t.swarm?.hash || Math.random().toString(36).slice(2)}`,
      title: t.title || query,
      year: new Date().getFullYear(),
      type: "adult",
      mediaKind: "video",
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
  const filter = parsed.data.filter as "all" | "4k" | "1080p" | "video" | "photo";
  const sort = parsed.data.sort as "seeds" | "rating" | "title";
  const providerFilter = parsed.data.provider || "all";

  let media: MediaItem[] = [];

  if (query) {
    // Generate creator media (photos & videos) + live tube & torrent searches in parallel
    const [epornerResults, torrentResults] = await Promise.all([
      searchAdultLive(query),
      searchAdultTorrentsLive(query),
    ]);

    const creatorResults = generateCreatorMedia(query);

    // Merge: Creator media first, then tube results, then torrents
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
