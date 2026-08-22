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

// Minimum score to consider a curated item relevant (filters out stop-word-only matches like "new"/"day")
const CURATED_MIN_SCORE = 12;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function getJson(url: string, timeoutMs = 5000): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
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
// 5. Live Adult Media Search (Eporner 4K/1080p API)
// ---------------------------------------------------------------------------
async function searchAdultLive(query: string): Promise<MediaItem[]> {
  const data = await getJson(`https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(query)}&per_page=20&thumbsize=medium`);
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
    mode: sp.get("mode") || "movies",
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
    // CornCine is adult-only: every mode resolves to the live Eporner search.
    media = await searchAdultLive(query);

    // Also match bundled trending catalog for high-relevance matches (strict threshold)
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

  // Apply sorting — universal uses relevance score, mode-specific uses requested sort
  if (sort === "rating") media = [...media].sort((a, b) => b.rating - a.rating);
  else if (sort === "title") media = [...media].sort((a, b) => a.title.localeCompare(b.title));
  else media = [...media].sort((a, b) => b.seeds - a.seeds);

  // Provider catalog matches with per-site search URLs — strict for filtered modes, all for universal
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
