"use client";

import { Heart } from "lucide-react";
import { useUserStore, type StoredFavorite } from "@/lib/user-store";
import { cn } from "@/lib/utils";

export interface Favoriteable {
  id: string;
  title: string;
  poster?: string;
  provider?: string;
  providerUrl?: string;
  type?: string;
  year?: number;
  rating?: number;
  seeds?: number;
  quality?: string;
  genre?: string[];
}

export function FavoriteButton({ item, className }: { item: Favoriteable; className?: string }) {
  const isFav = useUserStore((s) => s.favorites.some((f) => f.id === item.id));
  const toggle = useUserStore((s) => s.toggleFavorite);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const payload: StoredFavorite = {
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
    };
    void toggle(payload);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={isFav ? "Remove from favorites" : "Add to favorites"}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "grid place-items-center w-7 h-7 rounded-lg bg-[#0B0F17]/85 border border-[#1E2A3C] backdrop-blur-sm hover:bg-[#1B2433] active:scale-95 spring-transition",
        className,
      )}
    >
      <Heart
        className={cn("w-3.5 h-3.5 spring-transition", isFav ? "fill-[#EF4444] text-[#EF4444]" : "text-[#94A3B8]")}
      />
    </button>
  );
}
