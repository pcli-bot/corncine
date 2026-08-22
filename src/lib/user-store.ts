// User-state store (favorites + watch history). Hydrates from the Worker when
// available and gracefully falls back to localStorage otherwise. Writes are
// optimistic (localStorage updates immediately) with a best-effort sync to the
// Worker.
"use client";

import { create } from "zustand";
import {
  apiEnabled,
  ensureAccount,
  fetchFavorites,
  postFavorite,
  deleteFavorite,
  fetchHistory,
  postHistory,
  clearHistoryRemote,
  type FavoritePayload,
} from "./api";

export interface StoredFavorite {
  id: string;
  title: string;
  poster?: string | null;
  provider?: string | null;
  providerUrl?: string | null;
  type?: string | null;
  year?: number;
  rating?: number;
  seeds?: number;
  quality?: string;
  genre?: string[];
}

const LS_FAV = "anicine_favorites";
const LS_HIST = "anicine_history";

function loadLS(key: string): StoredFavorite[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as StoredFavorite[];
  } catch {
    return [];
  }
}

function saveLS(key: string, items: StoredFavorite[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* quota / private mode — ignore, in-memory state still works */
  }
}

function toPayload(f: StoredFavorite): FavoritePayload {
  return {
    item_id: f.id,
    title: f.title,
    poster: f.poster ?? null,
    provider: f.provider ?? null,
    provider_url: f.providerUrl ?? null,
    type: f.type ?? null,
  };
}

// Keep most-recent-first, one entry per id.
function dedupePrepend(list: StoredFavorite[], item: StoredFavorite): StoredFavorite[] {
  return [item, ...list.filter((f) => f.id !== item.id)];
}

interface UserState {
  favorites: StoredFavorite[];
  history: StoredFavorite[];
  hydrated: boolean;
  showFavorites: boolean;
  hydrate: () => Promise<void>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: StoredFavorite) => Promise<void>;
  addHistory: (item: StoredFavorite) => Promise<void>;
  clearHistory: () => Promise<void>;
  setShowFavorites: (v: boolean) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  favorites: [],
  history: [],
  hydrated: false,
  showFavorites: false,
  setShowFavorites: (v) => set({ showFavorites: v }),

  hydrate: async () => {
    if (get().hydrated) return;
    // Local cache is available instantly (no spinner, no layout shift).
    const localFav = loadLS(LS_FAV);
    const localHist = loadLS(LS_HIST);
    set({ favorites: localFav, history: localHist, hydrated: true });
    if (!apiEnabled) return;
    try {
      const token = await ensureAccount();
      if (!token) return;
      const [remoteFav, remoteHist] = await Promise.all([fetchFavorites(), fetchHistory()]);
      const fav = remoteFav.length
        ? remoteFav.map((r) => ({
            id: r.item_id,
            title: r.title,
            poster: r.poster ?? undefined,
            provider: r.provider ?? undefined,
            providerUrl: r.provider_url ?? undefined,
            type: r.type ?? undefined,
          }))
        : localFav;
      // History: server returns most-recent-first already; dedupe defensively.
      const histMap = new Map<string, StoredFavorite>();
      for (const h of [...localHist, ...remoteHist.map((r) => ({
        id: r.item_id,
        title: r.title,
        poster: r.poster ?? undefined,
        provider: r.provider ?? undefined,
        providerUrl: r.provider_url ?? undefined,
        type: r.type ?? undefined,
      }))]) {
        histMap.set(h.id, h);
      }
      const hist = [...histMap.values()].slice(0, 100);
      set({ favorites: fav, history: hist });
      saveLS(LS_FAV, fav);
      saveLS(LS_HIST, hist);
    } catch {
      /* keep local cache */
    }
  },

  isFavorite: (id) => get().favorites.some((f) => f.id === id),

  toggleFavorite: async (item) => {
    const exists = get().favorites.some((f) => f.id === item.id);
    const next = exists
      ? get().favorites.filter((f) => f.id !== item.id)
      : [item, ...get().favorites];
    set({ favorites: next });
    saveLS(LS_FAV, next); // optimistic — instant UI feedback
    if (!apiEnabled) return;
    try {
      if (exists) await deleteFavorite(item.id);
      else await postFavorite(toPayload(item));
    } catch {
      /* local state already updated; reconciles on next hydrate */
    }
  },

  addHistory: async (item) => {
    const next = dedupePrepend(get().history, item);
    set({ history: next });
    saveLS(LS_HIST, next); // optimistic
    if (!apiEnabled) return;
    try {
      await postHistory(toPayload(item));
    } catch {
      /* reconciles on next hydrate */
    }
  },

  clearHistory: async () => {
    set({ history: [] });
    saveLS(LS_HIST, []);
    if (!apiEnabled) return;
    try {
      await clearHistoryRemote();
    } catch {
      /* reconciles on next hydrate */
    }
  },
}));
