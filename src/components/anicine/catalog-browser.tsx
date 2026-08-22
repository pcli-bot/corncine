"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Download, Star, Users, Search as SearchIcon, Loader2, Film, ExternalLink, Layers, Zap, Heart } from "lucide-react";
import { useAnicineStore } from "@/lib/anicine-store";
import { useUserStore, type StoredFavorite } from "@/lib/user-store";
import { FavoriteButton } from "./favorite-button";
import {
  CATALOG_MODES,
  PROVIDERS,
  type MediaItem,
  type CatalogMode,
  type ProviderCategory,
} from "@/lib/anicine-data";
import { showToast } from "@/lib/anicine-toast";
import { cn } from "@/lib/utils";

interface ProviderResult {
  name: string;
  domain: string;
  url: string;
  category: ProviderCategory;
  blurb: string;
  searchUrl: string;
  hasSearch: boolean;
  score: number;
}

interface SearchResponse {
  query: string;
  mode: CatalogMode;
  items: MediaItem[];
  providers: ProviderResult[];
  total: number;
  providerCount: number;
}

function favToMediaItem(f: StoredFavorite): MediaItem {
  return {
    id: f.id,
    title: f.title,
    year: f.year ?? 0,
    type: (f.type as MediaItem["type"]) ?? "movie",
    poster: f.poster ?? "/posters/drama.png",
    rating: f.rating ?? 0,
    quality: (f.quality as MediaItem["quality"]) ?? "1080p",
    seeds: f.seeds ?? 0,
    provider: f.provider ?? "—",
    providerUrl: f.providerUrl ?? "#",
    genre: f.genre ?? [],
    overview: "",
  };
}

async function fetchSearch(params: { q: string; mode: CatalogMode; filter: string; sort: string; provider: string; subDub: string }): Promise<SearchResponse> {
  const sp = new URLSearchParams({
    q: params.q,
    mode: params.mode,
    filter: params.filter,
    sort: params.sort,
    provider: params.provider,
    subDub: params.subDub,
  });
  const res = await fetch(`/api/search?${sp.toString()}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export function CatalogBrowser() {
  const mode = useAnicineStore((s) => s.mode);
  const setMode = useAnicineStore((s) => s.setMode);
  const query = useAnicineStore((s) => s.query);

  const showFavorites = useUserStore((s) => s.showFavorites);
  const setShowFavorites = useUserStore((s) => s.setShowFavorites);
  const favItems = useUserStore((s) => s.favorites);
  const hydrate = useUserStore((s) => s.hydrate);
  useEffect(() => { void hydrate(); }, []);

  const [filter, setFilter] = useState<"all" | "4k" | "1080p">("all");
  const [sort, setSort] = useState<"seeds" | "rating" | "title">("seeds");
  const [provider, setProvider] = useState<string>("all");
  const [subDub, setSubDub] = useState<"all" | "sub" | "dub">("all");

  // When the mode changes the provider list changes too, so reset to "all".
  // Using the render-time adjustment pattern (recommended by the React docs
  // over setState-in-effect) avoids cascading renders.
  const [prevMode, setPrevMode] = useState(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    setProvider("all");
  }

  // Debounce query: only update the search key after the user stops typing
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  const params = useMemo(() => ({
    q: debounced,
    mode,
    filter,
    sort,
    provider,
    subDub,
  }), [debounced, mode, filter, sort, provider, subDub]);

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["anicine-search", params],
    queryFn: () => fetchSearch(params),
    staleTime: 30_000,
  });

  const cfg = CATALOG_MODES.find((c) => c.key === mode)!;

  // Provider options for current mode
  const providerOptions = useMemo(() => {
    const cats = cfg.categories;
    return PROVIDERS.filter((p) => cats.includes(p.category));
  }, [cfg]);

  const gridItems: MediaItem[] = showFavorites ? favItems.map(favToMediaItem) : (data?.items ?? []);

  const modeTabs: CatalogMode[] = ["all", "adult"];

  return (
    <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col items-center">
        {/* Mode tabs */}
        <div className="relative bg-[#131A26] p-1 rounded-xl border border-[#1E2A3C] flex items-stretch gap-1 mb-6 max-w-full overflow-x-auto scrollbar-none">
          {modeTabs.map((m) => {
            const c = CATALOG_MODES.find((x) => x.key === m)!;
            const active = m === mode;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "relative px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold spring-transition flex items-center gap-2 whitespace-nowrap",
                  active ? "bg-[#1B2433] border border-[#2D3D54] text-white" : "text-[#64748B] hover:text-[#94A3B8]"
                )}
              >
                <span>{c.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#131A26] border border-[#1E2A3C]">{c.count}</span>
              </button>
            );
          })}
        </div>

        {/* Filter row */}
        <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1E2A3C]">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2 flex-wrap">
              <span>{cfg.title}</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[#131A26] border border-[#1E2A3C] text-[#94A3B8]">
                {providerOptions.length} Providers Online
              </span>
            </h2>
            <p className="text-xs text-[#94A3B8]">{cfg.desc}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold spring-transition",
                showFavorites ? "bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FCA5A5]" : "bg-[#131A26] border border-[#1E2A3C] text-[#94A3B8] hover:text-[#F8FAFC]"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", showFavorites && "fill-[#EF4444] text-[#EF4444]")} />
              Favorites
              <span className="text-[10px] font-mono px-1 rounded-full bg-[#0B0F17] border border-[#1E2A3C]">{favItems.length}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#64748B]">Provider:</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-[#131A26] border border-[#1E2A3C] text-xs rounded-lg px-2.5 py-1.5 text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="all">All Providers</option>
                {providerOptions.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#64748B]">Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="bg-[#131A26] border border-[#1E2A3C] text-xs rounded-lg px-2.5 py-1.5 text-[#F8FAFC] font-medium focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="seeds">Most Seeders</option>
                <option value="rating">Highest Rated</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center gap-1 pl-2 border-l border-[#1E2A3C]">
              {(["all", "4k", "1080p"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-semibold spring-transition",
                    filter === f ? "bg-[#3B82F6] text-white" : "bg-[#131A26] border border-[#1E2A3C] text-[#94A3B8] hover:text-[#F8FAFC]"
                  )}
                >
                  {f === "all" ? "All" : f === "4k" ? "4K" : "1080p"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search-across-all-sites panel (hidden in Favorites view) */}
      {!showFavorites && data && data.providers.length > 0 && (
        <SearchAcrossSites query={data.query} providers={data.providers} mode={mode} />
      )}

      {/* Status row */}
      <div className="flex items-center justify-between mb-4 text-[11px] text-[#64748B] font-mono">
        <span>
          {!showFavorites && isFetching ? "Scanning providers..." : `${gridItems.length} results`}
          {!showFavorites && debounced ? ` for "${debounced}"` : ""}
          {showFavorites ? " • Favorites" : ""}
        </span>
        <span className="hidden sm:inline">{showFavorites ? "favorites view" : `mode: ${mode} • filter: ${filter} • sort: ${sort}`}</span>
      </div>

      {/* Media grid */}
      {!showFavorites && isLoading ? (
        <GridSkeleton />
      ) : !showFavorites && isError ? (
        <EmptyState message="Search backend unreachable. Check your connection and retry." />
      ) : gridItems.length === 0 ? (
        <EmptyState message={showFavorites ? "No favorites yet. Tap the heart on any title to save it here." : debounced ? `No media found for "${debounced}". Try a different query or filter.` : "No media items in this view."} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {gridItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Media card — with graceful poster fallback
// ---------------------------------------------------------------------------
export function MediaCard({ item }: { item: MediaItem }) {
  const [imgError, setImgError] = useState(false);
  const addTask = useAnicineStore((s) => s.addTask);
  const setDrawer = useAnicineStore((s) => s.setDrawer);
  const setPlayer = useAnicineStore((s) => s.setPlayer);
  const ref = useRef<HTMLDivElement>(null);

  // Deterministic gradient fallback keyed on the title
  const fallback = useMemo(() => {
    const palette = [
      ["#3B82F6", "#06B6D4"],
      ["#10B981", "#06B6D4"],
      ["#F59E0B", "#EF4444"],
      ["#8B5CF6", "#3B82F6"],
      ["#06B6D4", "#10B981"],
    ] as const;
    let h = 0;
    for (let i = 0; i < item.title.length; i++) h = (h * 31 + item.title.charCodeAt(i)) >>> 0;
    const [a, b] = palette[h % palette.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }, [item.title]);

  const play = () => {
    void useUserStore.getState().addHistory({
      id: item.id,
      title: item.title,
      poster: item.poster,
      provider: item.provider,
      providerUrl: item.providerUrl,
      type: item.type,
      year: item.year,
      rating: item.rating,
      seeds: item.seeds,
      quality: item.quality,
      genre: item.genre,
    });
    const isMagnet = !!item.streamUrl?.startsWith("magnet:") || item.provider === "YTS" || item.provider === "1337x";
    setPlayer({
      open: true,
      title: item.title,
      url: item.streamUrl || item.providerUrl,
      isMagnet,
      tmdbId: item.tmdbId,
      imdbId: item.imdbId,
      type: item.type,
    });
  };

  const download = async () => {
    // Adult-only: direct streamUrl or providerUrl (no vidlink/vidsrc tmdb needed)
    let url: string;
    let source: string;
    if (item.streamUrl) {
      url = item.streamUrl;
      source = item.provider;
    } else {
      url = item.providerUrl;
      source = item.provider;
    }
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title: item.title,
          source,
          format: "video",
          quality: item.quality === "4K" ? "4k" : "1080p",
          engine: "yt-dlp",
        }),
      });
      const data = await res.json();
      if (!data?.ok) { showToast(data?.error || "Download failed", "error"); return; }
      addTask({ url, title: data.title, source: data.source, format: data.format, quality: data.quality, size: data.size, jobId: data.id });
      showToast("Added to download queue", "success");
      setDrawer(true);
    } catch {
      showToast("Network error", "error");
    }
  };

  return (
    <article
      ref={ref}
      className="group relative rounded-xl border border-[#1E2A3C] bg-[#131A26] overflow-hidden card-hover"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden">
        {!imgError ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-3" style={{ background: fallback }}>
            <Film className="w-8 h-8 text-white/70 mb-2" />
            <span className="text-sm font-bold text-white leading-tight">{item.title}</span>
            <span className="text-[10px] font-mono text-white/70 mt-1">{item.year}</span>
          </div>
        )}

        {/* Badges */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0B0F17]/85 text-[#F8FAFC] border border-[#1E2A3C] backdrop-blur-sm">
          {item.provider}
        </span>
        <FavoriteButton item={item} className="absolute top-2 right-2 z-10" />
        <span className="absolute top-2 right-9 pr-7 px-1.5 py-0.5 rounded text-[10px] font-mono text-[#F8FAFC] bg-[#0B0F17]/85 border border-[#1E2A3C] backdrop-blur-sm">
          {item.quality}
        </span>

        {/* Hover overlay (visual only; actions are in the always-visible row below) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Meta */}
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-bold text-[#F8FAFC] leading-tight line-clamp-1" title={item.title}>{item.title}</h3>
        <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" /> {item.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-[#10B981]" /> {item.seeds.toLocaleString()}
          </span>
          <span>{item.year}</span>
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {item.genre.slice(0, 2).map((g) => (
            <span key={g} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1B2433] border border-[#1E2A3C] text-[#94A3B8]">{g}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={play}
            className="flex-1 px-2 py-1.5 rounded-lg bg-[#3B82F6] text-white text-[11px] font-semibold hover:bg-blue-600 active:scale-95 spring-transition flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3 fill-current" /> Play
          </button>
          <button
            onClick={download}
            className="flex-1 px-2 py-1.5 rounded-lg bg-[#1B2433] border border-[#1E2A3C] text-[#F8FAFC] text-[11px] font-semibold hover:bg-[#243044] active:scale-95 spring-transition flex items-center justify-center gap-1"
          >
            <Download className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    </article>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[#1E2A3C] bg-[#131A26] overflow-hidden">
          <div className="aspect-[2/3] bg-[#1B2433] animate-pulse-soft flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#64748B] animate-spin" />
          </div>
          <div className="p-3 space-y-2">
            <div className="h-3 w-3/4 rounded bg-[#1B2433]" />
            <div className="h-2 w-1/2 rounded bg-[#1B2433]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center bg-[#131A26] rounded-xl border border-[#1E2A3C] border-dashed">
      <div className="inline-grid place-items-center w-12 h-12 rounded-xl bg-[#1B2433] border border-[#1E2A3C] mb-3">
        <SearchIcon className="w-5 h-5 text-[#64748B]" />
      </div>
      <p className="text-xs font-medium text-[#94A3B8]">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search-across-all-sites panel
// Shows every indexed provider that can accept the current query, each as a
// clickable chip that fires the query at that site in a new tab. The "Open top 5"
// button launches the highest-scoring provider search pages in parallel.
// ---------------------------------------------------------------------------
function SearchAcrossSites({ query, providers, mode }: {
  query: string;
  providers: ProviderResult[];
  mode: CatalogMode;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasQuery = query.trim().length > 0;

  // Sort: search-capable + higher score first; group by category for clarity.
  const ordered = [...providers].sort((a, b) => {
    if (a.hasSearch !== b.hasSearch) return a.hasSearch ? -1 : 1;
    return b.score - a.score;
  });

  const visible = expanded ? ordered : ordered.slice(0, 12);
  const hiddenCount = ordered.length - visible.length;

  const openTop5 = () => {
    if (!hasQuery) { showToast("Type a search query first", "info"); return; }
    const top = ordered.filter((p) => p.hasSearch).slice(0, 5);
    if (top.length === 0) { showToast("No providers support search for this mode", "error"); return; }
    top.forEach((p) => window.open(p.searchUrl, "_blank", "noopener,noreferrer"));
    showToast(`Launched "${query}" on ${top.length} sites`, "success");
  };

  const catLabel = "JAV/hentai/tube indexers";

  return (
    <div className="mb-6 rounded-xl border border-[#1E2A3C] bg-[#131A26] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-[#1E2A3C]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] shrink-0">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              Search across all {providers.length} sites
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              {hasQuery
                ? <>Fire <span className="font-mono text-[#3B82F6]">&quot;{query}&quot;</span> at every indexed {catLabel} in one click.</>
                : <>Pick any {catLabel} below to open its homepage, or type a query to enable one-click multi-search.</>}
            </p>
          </div>
        </div>
        <button
          onClick={openTop5}
          disabled={!hasQuery}
          className={cn(
            "shrink-0 px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 spring-transition",
            hasQuery
              ? "bg-[#3B82F6] text-white hover:bg-blue-600 shadow-md shadow-blue-500/20"
              : "bg-[#1B2433] border border-[#1E2A3C] text-[#64748B] cursor-not-allowed"
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          Open top 5
        </button>
      </div>

      {/* Chips */}
      <div className="p-4 flex flex-wrap gap-2">
        {visible.map((p) => (
          <a
            key={p.name}
            href={p.searchUrl}
            target="_blank"
            rel="noreferrer"
            title={p.hasSearch ? `Search ${p.name} for "${query}"` : `Open ${p.name} homepage`}
            className={cn(
              "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs spring-transition",
              p.hasSearch
                ? "bg-[#1B2433] border-[#2D3D54] text-[#F8FAFC] hover:border-[#3B82F6] hover:bg-[#3B82F6]/15"
                : "bg-[#131A26] border-[#1E2A3C] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#2D3D54]"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", p.hasSearch ? "bg-[#10B981]" : "bg-[#64748B]")} />
            <span className="font-medium">{p.name}</span>
            <span className="text-[10px] font-mono text-[#64748B] group-hover:text-[#3B82F6]">{p.domain}</span>
            {p.hasSearch && <ExternalLink className="w-3 h-3 text-[#64748B] group-hover:text-[#3B82F6]" />}
          </a>
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-3 py-1.5 rounded-full bg-[#0B0F17] border border-[#1E2A3C] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#2D3D54] spring-transition"
          >
            {expanded ? "Show less" : `+${hiddenCount} more`}
          </button>
        )}
      </div>
    </div>
  );
}
