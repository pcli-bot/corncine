"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ArrowLeft, Play, Image as ImageIcon, Loader2, Users, AlertTriangle, ExternalLink, X, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LEAK_SEARCH_TARGETS, leakSearchUrl, proxiedMediaUrl } from "@/lib/leak";

// Points at the Cloudflare Worker when NEXT_PUBLIC_API_BASE is set; otherwise
// hits the same-origin Next.js API routes. Both implement the same contract.
// API_BASE imported from @/lib/api

type LeakCreator = {
  site: string;
  service: string;
  id: string;
  name: string;
  favorited: number;
  updated: number;
  score: number;
  url: string;
};
type ScrapedItem = { site: string; name: string; url: string; thumb?: string };
type LeakMediaItem = { name: string; url: string; kind: "video" | "photo" | "archive" | "other" };
type LeakPost = { postId: string; title: string; published: string; items: LeakMediaItem[] };
type MediaType = "all" | "video" | "photo";

export function LeakBrowser() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("all");
  const [selected, setSelected] = useState<LeakCreator | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  const creators = useQuery({
    queryKey: ["leak-search", debounced],
    queryFn: async (): Promise<{ degraded: boolean; results: LeakCreator[]; total: number; web: ScrapedItem[] }> => {
      const r = await fetch(`${API_BASE}/api/leak/search?q=${encodeURIComponent(debounced)}`);
      if (!r.ok) throw new Error("search failed");
      return r.json();
    },
    enabled: !!debounced.trim() && !selected,
  });

  const posts = useQuery({
    queryKey: ["leak-posts", selected?.site, selected?.service, selected?.id],
    queryFn: async (): Promise<{ degraded: boolean; creator: { url: string }; posts: LeakPost[]; total: number }> => {
      const r = await fetch(
        `${API_BASE}/api/leak/posts?site=${selected!.site}&service=${selected!.service}&id=${selected!.id}&type=all`
      );
      if (!r.ok) throw new Error("posts failed");
      return r.json();
    },
    enabled: !!selected,
  });

  const visiblePosts = useMemo(() => {
    const all = posts.data?.posts ?? [];
    if (mediaType === "all") return all;
    return all
      .map((p) => ({ ...p, items: p.items.filter((i) => i.kind === mediaType) }))
      .filter((p) => p.items.length > 0);
  }, [posts.data, mediaType]);

  const filteredTotal = useMemo(
    () => visiblePosts.reduce((n, p) => n + p.items.length, 0),
    [visiblePosts]
  );

  return (
    <section id="leaks" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[#1E2A3C]">
      <div className="flex flex-col items-center text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">Model &amp; Leak Search</h2>
        <p className="text-sm text-[#94A3B8] mt-2 max-w-2xl">
          Search any model across <span className="text-[#3B82F6] font-semibold">Kemono</span> &amp;{" "}
          <span className="text-[#3B82F6] font-semibold">Coomer</span> — the archives of Patreon, OnlyFans, Fanbox &amp; Gumroad
          creators. Filter their content by video or photo, or search every other leak site below.
        </p>
      </div>

      {!selected ? (
        <>
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative bg-[#131A26] rounded-xl p-1.5 border border-[#2D3D54] shadow-xl focus-within:ring-2 focus-within:ring-[#3B82F6]/40">
              <div className="flex items-center">
                <div className="pl-3 text-[#64748B]"><Search className="w-5 h-5" /></div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  placeholder="Search a model or creator name (e.g. emma, derpixon)…"
                  className="w-full bg-transparent border-0 px-3 py-3 text-white font-semibold text-sm placeholder:text-[#64748B] focus:outline-none"
                />
                {creators.isFetching && <Loader2 className="w-4 h-4 mr-3 text-[#64748B] animate-spin" />}
              </div>
            </div>
          </div>

          {creators.isError && (
            <div className="text-center text-[#F87171] text-sm py-8">Search failed — check your connection and retry.</div>
          )}

          {creators.data?.degraded && (
            <div className="max-w-2xl mx-auto mb-4 flex items-center gap-2 text-[#F59E0B] text-xs bg-[#1B2433] border border-[#2D3D54] rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4" /> One or more sites were unreachable — showing results from the sites that responded.
            </div>
          )}

          {creators.data && creators.data.results.length > 0 && (
            <div className="text-center text-[#64748B] text-xs mb-4 font-mono">
              {creators.data.total} matches across sites · showing top {creators.data.results.length}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(creators.data?.results ?? []).map((c) => (
              <button
                key={`${c.site}-${c.service}-${c.id}`}
                onClick={() => setSelected(c)}
                className="text-left rounded-xl border border-[#1E2A3C] bg-[#131A26] hover:border-[#3B82F6]/60 hover:bg-[#16203a] transition-colors p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-[#F8FAFC] font-bold truncate">{c.name}</div>
                  <div className="text-[11px] text-[#64748B] font-mono mt-0.5 capitalize">{c.service}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    c.site === "kemono" ? "bg-[#3B82F6]/15 text-[#3B82F6]" : "bg-[#06B6D4]/15 text-[#06B6D4]")}>
                    {c.site}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[#94A3B8] font-mono">
                    <Users className="w-3 h-3" /> {(c.favorited || 0).toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {creators.data && creators.data.results.length === 0 && !creators.isFetching && (
            <div className="text-center text-[#64748B] text-sm py-10">
              No models found on Kemono/Coomer. Try a different name — or search the other leak sites below.
            </div>
          )}

          {creators.data?.web && creators.data.web.length > 0 && (
            <div className="max-w-3xl mx-auto mt-10">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-sm font-semibold text-[#F8FAFC]">Also on other leak sites</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {creators.data.web.slice(0, 16).map((w, i) => (
                  <a
                    key={i}
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-lg border border-[#1E2A3C] bg-[#131A26] hover:border-[#3B82F6]/60 p-2"
                  >
                    {w.thumb ? (
                      <img src={proxiedMediaUrl(w.thumb)} alt="" loading="lazy" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[#1B2433] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-[#F8FAFC] text-xs font-semibold truncate">{w.name}</div>
                      <div className="text-[10px] text-[#64748B] font-mono truncate">{w.site}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          <AllSitesPanel query={debounced} />
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to search
            </button>
            <div className="flex items-center gap-2">
              {(["all", "video", "photo"] as MediaType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMediaType(t)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors",
                    mediaType === t ? "bg-[#3B82F6] text-white" : "bg-[#1B2433] text-[#94A3B8] hover:text-[#F8FAFC]"
                  )}
                >
                  {t === "video" && <Play className="w-3 h-3 inline mr-1" />}
                  {t === "photo" && <ImageIcon className="w-3 h-3 inline mr-1" />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 text-[#64748B] text-xs font-mono">
            <span className="text-[#F8FAFC] font-bold text-sm">{selected.name}</span>
            <span>
              {filteredTotal} {mediaType === "all" ? "items" : mediaType + "s"} · {selected.site}/{selected.service}
            </span>
          </div>

          {posts.data?.degraded && (
            <div className="mb-4 flex items-center gap-2 text-[#F59E0B] text-xs bg-[#1B2433] border border-[#2D3D54] rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4" /> This site was slow/unreachable — results may be incomplete.
            </div>
          )}

          {posts.isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-[#1B2433] animate-pulse-soft" />
              ))}
            </div>
          )}

          {posts.isError && (
            <div className="text-center text-[#F87171] text-sm py-8">Could not load this model&apos;s content.</div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {visiblePosts.flatMap((p) =>
              p.items.map((it, idx) => <MediaTile key={`${p.postId}-${idx}`} item={it} onPlay={setVideoUrl} />)
            )}
          </div>

          {posts.data && visiblePosts.length === 0 && !posts.isLoading && (
            <div className="text-center text-[#64748B] text-sm py-10">
              No {mediaType === "all" ? "" : mediaType + " "}content found for this model.
            </div>
          )}
        </>
      )}

      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}
    </section>
  );
}

function AllSitesPanel({ query }: { query: string }) {
  if (!query.trim()) return null;
  return (
    <div className="max-w-3xl mx-auto mt-10 rounded-xl border border-[#1E2A3C] bg-[#131A26] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-[#3B82F6]" />
        <span className="text-sm font-semibold text-[#F8FAFC]">
          Can&apos;t find them here? Search &quot;{query}&quot; on every leak site
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {LEAK_SEARCH_TARGETS.map((t) => (
          <a
            key={t.name}
            href={leakSearchUrl(t, query)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1B2433] border border-[#1E2A3C] text-[#94A3B8] hover:text-white hover:border-[#3B82F6]/60 text-xs font-medium transition-colors"
          >
            {t.name} <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
      <p className="text-[11px] text-[#64748B] mt-3 leading-relaxed">
        Kemono &amp; Coomer results above are live. The chips open each site&apos;s own search in a new tab —
        most have no public API to aggregate, so the <span className="text-[#94A3B8]">Leak CSE</span> does the true cross-site sweep.
      </p>
    </div>
  );
}

function MediaTile({ item, onPlay }: { item: LeakMediaItem; onPlay: (u: string) => void }) {
  const [err, setErr] = useState(false);
  if (item.kind === "video") {
    return (
      <div className="group relative aspect-square rounded-xl overflow-hidden border border-[#1E2A3C] bg-[#0B0F17]">
        <button
          onClick={() => onPlay(item.url)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 group-hover:bg-black/40 transition-colors p-2"
        >
          <Play className="w-10 h-10 fill-current" />
          <span className="text-[10px] font-mono text-center line-clamp-2">{item.name}</span>
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-1 right-1 p-1 rounded bg-[#0B0F17]/80 text-white/70 hover:text-white"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-square rounded-xl overflow-hidden border border-[#1E2A3C] bg-[#0B0F17] block"
    >
      {!err ? (
        <img
          src={proxiedMediaUrl(item.url)}
          alt={item.name}
          loading="lazy"
          onError={() => setErr(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-white/60 p-2">
          <ImageIcon className="w-6 h-6" />
          <span className="text-[10px] font-mono text-center line-clamp-2">{item.name}</span>
        </div>
      )}
    </a>
  );
}

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={onClose} aria-label="Close">
        <X className="w-7 h-7" />
      </button>
      <video src={proxiedMediaUrl(url)} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
