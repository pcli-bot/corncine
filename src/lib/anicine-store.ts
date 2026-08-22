"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaItem, CatalogMode } from "./anicine-data";

export type { CatalogMode };
export type MainTool = "search" | "downloader";

export type DownloadStatus = "queued" | "active" | "paused" | "done" | "error";

export interface DownloadTask {
  id: string;
  jobId?: string; // server-side job id (real downloads); absent = legacy task
  url: string; // original source URL — needed to retry / resume server jobs
  title: string;
  source: string; // platform or provider
  format: "video" | "audio" | "lossless";
  quality: string;
  size: string;
  progress: number; // 0..100
  speed: number; // MB/s
  status: DownloadStatus;
  error?: string; // last server-side error message (shown in the drawer)
  addedAt: number;
}

export interface PlayerState {
  open: boolean;
  title: string;
  url?: string;
  isMagnet?: boolean;
  tmdbId?: string;
  imdbId?: string;
  type?: string;
}

interface AppState {
  // Tool / catalog selection
  mainTool: MainTool;
  mode: CatalogMode;
  query: string;
  setMainTool: (t: MainTool) => void;
  setMode: (m: CatalogMode) => void;
  setQuery: (q: string) => void;

  // Overlays
  drawerOpen: boolean;
  player: PlayerState;
  paletteOpen: boolean;
  setDrawer: (v: boolean) => void;
  setPlayer: (p: PlayerState) => void;
  setPalette: (v: boolean) => void;

  // Downloads queue
  tasks: DownloadTask[];
  addTask: (t: Omit<DownloadTask, "id" | "addedAt" | "progress" | "speed" | "status">) => string;
  tickTasks: () => void | Promise<void>;
  pauseTask: (id: string) => void | Promise<void>;
  resumeTask: (id: string) => void | Promise<void>;
  removeTask: (id: string) => void | Promise<void>;
  clearTasks: () => void;

  // Currently selected media (for detail)
  selected: MediaItem | null;
  setSelected: (m: MediaItem | null) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Rough size formatter
export function formatSpeed(mb: number) {
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB/s`;
  return `${mb.toFixed(1)} MB/s`;
}

export const useAnicineStore = create<AppState>()(
  persist(
    (set, get) => ({
      mainTool: "search",
      mode: "adult",
      query: "",
      setMainTool: (t) => set({ mainTool: t }),
      setMode: (m) => set({ mode: m }),
      setQuery: (q: string) => set({ query: q }),

      drawerOpen: false,
      player: { open: false, title: "" },
      paletteOpen: false,
      setDrawer: (v) => set({ drawerOpen: v }),
      setPlayer: (p) => set({ player: p }),
      setPalette: (v) => set({ paletteOpen: v }),

      tasks: [],
      addTask: (t) => {
        const id = uid();
        const task: DownloadTask = {
          ...t,
          id,
          addedAt: Date.now(),
          progress: 0,
          speed: 0,
          status: "queued",
        };
        set({ tasks: [task, ...get().tasks] });
        return id;
      },
      // Poll the server for live progress on real jobs. There is NO local
      // simulation: a task without a server job id is dead on arrival.
      tickTasks: async () => {
        const tasks = get().tasks;
        const next = await Promise.all(
          tasks.map(async (t) => {
            if (t.status !== "active" && t.status !== "queued") return t;
            if (!t.url) {
              return { ...t, status: "error" as DownloadStatus, error: "Legacy task missing URL — remove and re-add." };
            }
            if (!t.jobId) {
              // Legacy task persisted from before server-backed downloads.
              return { ...t, status: "error" as DownloadStatus, error: "Queued before the download backend existed — remove and re-add this task." };
            }
            try {
              const res = await fetch(`/api/download/${t.jobId}`, { cache: "no-store" });
              if (res.status === 404) {
                // Server restarted and lost the job (in-memory state).
                return { ...t, status: "error" as DownloadStatus, error: "Server job vanished (backend restart). Retry to restart the download.", speed: 0 };
              }
              if (res.ok) {
                const j = await res.json();
                const status: DownloadStatus =
                  j.status === "done" ? "done"
                  : j.status === "failed" || j.status === "canceled" ? "error"
                  : j.status === "active" ? "active"
                  : "queued";
                return {
                  ...t,
                  progress: j.progress ?? t.progress,
                  speed: (j.speedBps ?? 0) / (1024 * 1024),
                  status,
                  size: j.size ?? t.size,
                  error: j.error ?? undefined,
                };
              }
            } catch {
              /* keep last known state if the API is briefly unreachable */
            }
            return t;
          })
        );
        set({ tasks: next });
      },
      // Pause = cancel the server job. yt-dlp runs with -c (continue), so
      // resubmitting the same URL picks the partial file back up. Allow pausing queued jobs too.
      pauseTask: async (id) => {
        const t = get().tasks.find((x) => x.id === id);
        if (!t || (t.status !== "active" && t.status !== "queued")) return;
        if (t.jobId) {
          try { await fetch(`/api/download/${t.jobId}`, { method: "DELETE" }); } catch { /* server gone; local state still flips */ }
        }
        set({ tasks: get().tasks.map((x) => (x.id === id ? { ...x, status: "paused", speed: 0 } : x)) });
      },
      // Resume = resubmit the original URL as a fresh server job.
      resumeTask: async (id) => {
        const t = get().tasks.find((x) => x.id === id);
        if (!t || t.status !== "paused") return;
        try {
          const res = await fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: t.url, title: t.title, source: t.source, format: t.format, quality: t.quality }),
          });
          const data = await res.json();
          if (data?.ok) {
            set({ tasks: get().tasks.map((x) => (x.id === id ? { ...x, jobId: data.id, status: "queued", error: undefined } : x)) });
          }
        } catch {
          /* leave paused; user can retry */
        }
      },
      removeTask: async (id) => {
        const t = get().tasks.find((x) => x.id === id);
        if (t?.jobId) {
          try { await fetch(`/api/download/${t.jobId}`, { method: "DELETE" }); } catch { /* noop */ }
        }
        set({ tasks: get().tasks.filter((x) => x.id !== id) });
      },
      clearTasks: () => set({ tasks: [] }),

      selected: null,
      setSelected: (m) => set({ selected: m }),
    }),
    {
      name: "anicine-store",
      partialize: (s) => ({ tasks: s.tasks }),
    }
  )
);
