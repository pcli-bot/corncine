"use client";

import { useEffect } from "react";
import { History } from "lucide-react";
import { useUserStore, type StoredFavorite } from "@/lib/user-store";
import { MediaCard } from "./catalog-browser";
import type { MediaItem } from "@/lib/anicine-data";

function toMediaItem(f: StoredFavorite): MediaItem {
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

export function ContinueWatching() {
  const history = useUserStore((s) => s.history);
  const hydrate = useUserStore((s) => s.hydrate);
  const clearHistory = useUserStore((s) => s.clearHistory);

  useEffect(() => {
    void hydrate();
  }, []);

  // Empty on SSR + first client paint (no layout shift), reveals after hydrate.
  if (history.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
          <History className="w-4 h-4 text-[#EC69AE]" />
          Continue Watching
        </h2>
        <button
          onClick={() => void clearHistory()}
          className="text-[11px] text-[#949AA5] hover:text-[#F8FAFC] font-mono spring-transition"
        >
          Clear
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
        {history.map((item) => (
          <div key={item.id} className="w-40 sm:w-44 shrink-0">
            <MediaCard item={toMediaItem(item)} />
          </div>
        ))}
      </div>
    </section>
  );
}
