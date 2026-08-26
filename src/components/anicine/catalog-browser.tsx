"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Download, Star, Users, Search as SearchIcon, Loader2, Film, Heart, ExternalLink, SlidersHorizontal, Image as ImageIcon, Sparkles, Video } from "lucide-react";
import { useAnicineStore } from "@/lib/anicine-store";
import {
  CATALOG_MODES,
  PROVIDERS,
  type CatalogMode,
  type MediaItem,
  type Provider,
} from "@/lib/anicine-data";
import { useUserStore, type StoredFavorite } from "@/lib/user-store";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/anicine-toast";

type FilterType = "all" | "video" | "photo" | "4k" | "1080p";

interface SearchResponse {
  query: string;
  mode: string;
  items: MediaItem[];
  providers: Array<Provider & { searchUrl: string; hasSearch: boolean; score: number }>;
  total: number;
  providerCount: number;
}

function favoriteToMediaItem(f: StoredFavorite): MediaItem {
  return {
    id: f.id,
    title: f.title,
    poster: f.poster || "/posters/action.png",
    provider: f.provider || "Direct",
    type: (f.type as "adult") || "adult",
    year: f.year ?? new Date().getFullYear(),
    rating: f.rating ?? 8.5,
    seeds: f.seeds ?? 0,
    quality: (f.quality as "4K" | "1080p") ?? "1080p",
    providerUrl: f.providerUrl ?? "#",
    genre: f.genre ?? [],
    overview: "",
    mediaKind: "video",
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
  const res = await fetch(`${API_BASE}/api/search?${sp.toString()}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export function CatalogBrowser() {
  const mode = useAnicineStore((s) => s.mode);
  const setMode = useAnicineStore((s) => s.setMode);
  const query = useAnicineStore((s) => s.query);

  const showFavorites = useUserStore((s) => s.showFavorites);
  const setShowFavorites = useUserStore((s) => s.setShowFavorites);
  const favorites = useUserStore((s) => s.favorites);

  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<"seeds" | "rating" | "title">("seeds");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [subDub, setSubDub] = useState<"all" | "sub" | "dub">("all");

  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isError, isFetching } = useQuery<SearchResponse>({
    queryKey: ["search", debounced, mode, filter, sort, providerFilter, subDub],
    queryFn: () =>
      fetchSearch({
        q: debounced,
        mode,
        filter,
        sort,
        provider: providerFilter,
        subDub,
      }),
    staleTime: 30_000,
  });

  const availableProviders = useMemo(() => {
    return PROVIDERS.filter((p) => p.category === "adult" || p.category === "torrents");
  }, []);

  const activeModeMeta = CATALOG_MODES.find((c) => c.key === mode) || CATALOG_MODES[0];

  const gridItems: MediaItem[] = useMemo(() => {
    if (showFavorites) {
      let list = favorites.map(favoriteToMediaItem);
      if (filter === "4k") list = list.filter((m) => m.quality === "4K");
      if (filter === "1080p") list = list.filter((m) => m.quality === "1080p");
      if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
      else if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
      else list.sort((a, b) => b.seeds - a.seeds);
      return list;
    }
    return data?.items ?? [];
  }, [showFavorites, favorites, data, filter, sort]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* 3-Mode Slider / Switcher */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative bg-[#151922] p-1 rounded-xl border border-[#323947] flex items-center space-x-1 max-w-full overflow-x-auto scrollbar-none">
          {CATALOG_MODES.map((tab) => {
            const active = mode === tab.key && !showFavorites;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setShowFavorites(false);
                  setMode(tab.key);
                }}
                className={cn(
                  "relative px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold spring-transition flex items-center space-x-2 whitespace-nowrap z-10",
                  active
                    ? "text-[#0B0E15] bg-[#EC69AE] shadow-lg shadow-blue-500/20"
                    : "text-[#B3B7C1] hover:text-[#F8FAFC]"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                    active ? "bg-white/20 text-white" : "bg-[#202530] text-[#878C97]"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Filter and Query Counter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#323947]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              {showFavorites ? "Saved Favorites" : activeModeMeta.label}
            </h2>
            {!showFavorites && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#151922] border border-[#323947] text-[#EC69AE]">
                {availableProviders.length} PROVIDERS ONLINE
              </span>
            )}
          </div>
          <p className="text-xs text-[#B3B7C1]">
            {showFavorites
              ? `${favorites.length} saved titles stored in local storage`
              : activeModeMeta.desc}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Favorites tab */}
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold spring-transition flex items-center gap-1.5 border",
              showFavorites
                ? "bg-[#EF4444] border-[#EF4444] text-white shadow-lg shadow-red-500/20"
                : "bg-[#151922] border-[#323947] text-[#B3B7C1] hover:text-[#F8FAFC]"
            )}
          >
            <Heart className={cn("w-3.5 h-3.5", showFavorites && "fill-current")} />
            <span>Favorites</span>
            <span className="text-[10px] font-mono font-bold ml-0.5 px-1.5 py-0.2 rounded bg-black/30">
              {favorites.length}
            </span>
          </button>

          {/* Provider selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#878C97]">Provider:</span>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="bg-[#151922] border border-[#323947] text-xs rounded-lg px-2.5 py-1.5 text-[#F8FAFC] font-medium focus:outline-none focus:border-[#EC69AE]"
            >
              <option value="all">All Providers</option>
              {availableProviders.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#878C97]">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-[#151922] border border-[#323947] text-xs rounded-lg px-2.5 py-1.5 text-[#F8FAFC] font-medium focus:outline-none focus:border-[#EC69AE]"
            >
              <option value="seeds">Most Seeders</option>
              <option value="rating">Highest Rated</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          {/* Media Kind and Quality Filter Buttons */}
          <div className="flex items-center gap-1 pl-2 border-l border-[#323947]">
            {[
              { key: "all", label: "All" },
              { key: "video", label: "🎬 Videos" },
              { key: "photo", label: "📸 Photos" },
              { key: "4k", label: "✨ 4K" },
              { key: "1080p", label: "1080p" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as FilterType)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-semibold spring-transition",
                  filter === f.key
                    ? "bg-[#EC69AE] text-[#0B0E15] shadow-md shadow-blue-500/20"
                    : "bg-[#151922] border border-[#323947] text-[#B3B7C1] hover:text-[#F8FAFC]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search-across-all-sites panel */}
      {!showFavorites && data && data.providers.length > 0 && (
        <SearchAcrossSites query={data.query} providers={data.providers} mode={mode} />
      )}

      {/* Status row */}
      <div className="flex items-center justify-between mb-4 text-[11px] text-[#878C97] font-mono">
        <span>
          {!showFavorites && isFetching ? "Scanning providers..." : `${gridItems.length} results`}
          {!showFavorites && debounced ? ` for "${debounced}"` : ""}
          {showFavorites ? " • Favorites" : ""}
        </span>
        <span className="hidden sm:inline">
          {showFavorites
            ? "favorites view"
            : `mode: ${mode} • filter: ${filter} • sort: ${sort}`}
        </span>
      </div>

      {/* Media grid */}
      {!showFavorites && isLoading ? (
        <GridSkeleton />
      ) : !showFavorites && isError ? (
        <EmptyState message="Search backend unreachable. Check your connection and retry." />
      ) : gridItems.length === 0 ? (
        <EmptyState
          message={
            showFavorites
              ? "No favorites yet. Tap the heart on any title to save it here."
              : debounced
              ? `No media found for "${debounced}". Try a different query or filter.`
              : "No media items in this view."
          }
        />
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
// Media card — with Photo Lightbox & Video Player In-App
// ---------------------------------------------------------------------------
export function MediaCard({ item }: { item: MediaItem }) {
  const [imgError, setImgError] = useState(false);
  const addTask = useAnicineStore((s) => s.addTask);
  const setDrawer = useAnicineStore((s) => s.setDrawer);
  const setPlayer = useAnicineStore((s) => s.setPlayer);
  const setImageViewer = useAnicineStore((s) => s.setImageViewer);
  const ref = useRef<HTMLDivElement>(null);

  const isPhoto = item.mediaKind === "photo";

  // Gradient fallback keyed on title
  const fallback = useMemo(() => {
    const palette = [
      ["#EC69AE", "#F997C6"],
      ["#6AB27A", "#F997C6"],
      ["#F59E0B", "#EF4444"],
      ["#DB3E98", "#EC69AE"],
      ["#F997C6", "#6AB27A"],
    ] as const;
    let h = 0;
    for (let i = 0; i < item.title.length; i++) h = (h * 31 + item.title.charCodeAt(i)) >>> 0;
    const [a, b] = palette[h % palette.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }, [item.title]);

  const handleOpenMedia = () => {
    if (isPhoto) {
      setImageViewer({
        open: true,
        title: item.title,
        url: item.streamUrl || item.poster,
        images: item.images || [item.streamUrl || item.poster],
        currentIndex: 0,
      });
      return;
    }

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

    const isMagnet = !!item.streamUrl?.startsWith("magnet:") || item.provider === "YTS" || item.provider === "1337x" || item.provider === "SolidTorrents";
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If it's a photo, trigger direct instant browser download of the image
    if (isPhoto) {
      const url = item.streamUrl || item.poster;
      try {
        showToast("Saving full resolution photo...", "info");
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error("Fetch failed");
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        showToast("Photo saved directly!", "success");
      } catch {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Photo opened for save", "info");
      }
      return;
    }

    // Video download via download engine
    let url: string = item.streamUrl || item.providerUrl;
    let source: string = item.provider;
    try {
      const res = await fetch(`${API_BASE}/api/download`, {
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
      if (!data?.ok) {
        showToast(data?.error || "Download failed", "error");
        return;
      }
      addTask({
        url,
        title: data.title,
        source: data.source,
        format: data.format,
        quality: data.quality,
        size: data.size,
        jobId: data.id,
      });
      showToast("Added video to download queue", "success");
      setDrawer(true);
    } catch {
      showToast("Network error", "error");
    }
  };

  return (
    <article
      ref={ref}
      onClick={handleOpenMedia}
      className="group relative rounded-xl border border-[#323947] bg-[#151922] overflow-hidden card-hover cursor-pointer"
    >
      {/* Poster / Thumbnail */}
      <div className="relative aspect-[2/3] overflow-hidden bg-black/40">
        {!imgError ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center text-center p-3"
            style={{ background: fallback }}
          >
            {isPhoto ? <ImageIcon className="w-8 h-8 text-white/70 mb-2" /> : <Film className="w-8 h-8 text-white/70 mb-2" />}
            <span className="text-sm font-bold text-[#F8FAFC] leading-tight">{item.title}</span>
            <span className="text-[10px] font-mono text-white/70 mt-1">{item.year}</span>
          </div>
        )}

        {/* Badges */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#0B0E15]/85 text-[#F8FAFC] border border-[#323947] backdrop-blur-sm">
          {item.provider}
        </span>
        <FavoriteButton item={item} className="absolute top-2 right-2 z-10" />
        <span
          className={cn(
            "absolute top-2 right-9 pr-7 px-1.5 py-0.5 rounded text-[10px] font-mono text-white border backdrop-blur-sm",
            isPhoto ? "bg-[#6AB27A]/80 border-[#6AB27A]" : "bg-[#0B0E15]/85 border-[#323947]"
          )}
        >
          {isPhoto ? "PHOTO" : item.quality}
        </span>

        {/* Center Hover Play/View Icon */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-200",
              isPhoto ? "bg-[#6AB27A] text-black" : "bg-[#EC69AE] text-[#0B0E15]"
            )}
          >
            {isPhoto ? <ImageIcon className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="p-3 space-y-1.5">
        <h3
          className="text-sm font-bold text-[#F8FAFC] leading-tight line-clamp-1 group-hover:text-[#EC69AE] transition-colors"
          title={item.title}
        >
          {item.title}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-[#878C97] font-mono">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" /> {item.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-[#6AB27A]" /> {item.seeds.toLocaleString()}
          </span>
          <span className="font-semibold text-[10px]">{isPhoto ? "HD Set" : item.quality}</span>
        </div>

        <div className="flex flex-wrap gap-1 pt-1">
          {item.genre.slice(0, 2).map((g) => (
            <span
              key={g}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#202530] border border-[#323947] text-[#B3B7C1]"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Action Buttons (100% In-App with zero external redirect) */}
        <div className="flex items-center gap-2 pt-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenMedia();
            }}
            className={cn(
              "flex-1 px-2 py-1.5 rounded-lg text-xs font-bold active:scale-95 spring-transition flex items-center justify-center gap-1 shadow-md",
              isPhoto
                ? "bg-[#6AB27A] hover:bg-[#059669] text-black"
                : "bg-[#EC69AE] hover:bg-blue-600 text-[#0B0E15] shadow-blue-500/20"
            )}
          >
            {isPhoto ? (
              <>
                <ImageIcon className="w-3.5 h-3.5" /> View Photo
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Stream
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 px-2 py-1.5 rounded-lg bg-[#202530] border border-[#323947] text-[#F8FAFC] text-xs font-semibold hover:bg-[#2A303D] active:scale-95 spring-transition flex items-center justify-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>
    </article>
  );
}

function FavoriteButton({ item, className }: { item: MediaItem; className?: string }) {
  const isFavorite = useUserStore((s) => s.isFavorite(item.id));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite({
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
    showToast(isFavorite ? "Removed from favorites" : "Saved to favorites", "info");
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "p-1.5 rounded-full bg-[#0B0E15]/85 border border-[#323947] text-[#B3B7C1] hover:text-[#EF4444] spring-transition backdrop-blur-sm",
        isFavorite && "text-[#EF4444] border-red-500/50",
        className
      )}
      title={isFavorite ? "Remove favorite" : "Save favorite"}
    >
      <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
    </button>
  );
}

function SearchAcrossSites({
  query,
  providers,
  mode,
}: {
  query: string;
  providers: Array<Provider & { searchUrl: string; hasSearch: boolean; score: number }>;
  mode: CatalogMode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const matchedProviders = useMemo(() => {
    if (!query) return providers.slice(0, 8);
    return providers.filter((p) => p.score > 0 || !p.searchPattern).slice(0, 12);
  }, [providers, query]);

  if (matchedProviders.length === 0) return null;

  return (
    <div className="bg-[#151922] border border-[#323947] rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#EC69AE]" />
          <h3 className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
            {query ? `Indexed Search Providers for "${query}"` : "Direct Index Providers"}
          </h3>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-[#B3B7C1] hover:text-[#F8FAFC] font-medium"
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {matchedProviders.map((p) => (
            <a
              key={p.name}
              href={p.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg bg-[#202530]/70 hover:bg-[#202530] border border-[#323947] hover:border-[#EC69AE] spring-transition flex items-center justify-between text-xs group"
            >
              <div className="truncate">
                <div className="font-semibold text-[#F8FAFC] truncate group-hover:text-[#EC69AE]">
                  {p.name}
                </div>
                <div className="text-[10px] text-[#878C97] font-mono truncate">{p.domain}</div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#878C97] group-hover:text-[#EC69AE] shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[#323947] bg-[#151922] overflow-hidden">
          <div className="aspect-[2/3] bg-[#202530] animate-pulse-soft flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#878C97] animate-spin" />
          </div>
          <div className="p-3 space-y-2">
            <div className="h-3 w-3/4 rounded bg-[#202530]" />
            <div className="h-2 w-1/2 rounded bg-[#202530]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center bg-[#151922] rounded-xl border border-[#323947] border-dashed">
      <div className="inline-grid place-items-center w-12 h-12 rounded-xl bg-[#202530] border border-[#323947] mb-3">
        <SearchIcon className="w-5 h-5 text-[#878C97]" />
      </div>
      <p className="text-xs font-medium text-[#B3B7C1]">{message}</p>
    </div>
  );
}
