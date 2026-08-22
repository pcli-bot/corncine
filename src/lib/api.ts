// Client-side API for the Worker backend (D1-backed user state: account,
// favorites, history). All calls are resilient: when NEXT_PUBLIC_API_URL is
// unset (or the Worker is unreachable) the callers fall back to localStorage so
// the UI never breaks.
//
// Auth model (mirrors backend/src/lib/auth.ts): the client mints a bearer token
// once via POST /api/account and stores it in localStorage. The token IS the
// credential — only its SHA-256 (account_id) lives server-side.

const RAW = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || "https://pcli.onrender.com";
export const API_BASE = RAW.replace(/\/+$/, "");
export const apiEnabled = API_BASE.length > 0;

// Silent background pre-warm to keep Render free backend active
if (typeof window !== "undefined" && apiEnabled) {
  setTimeout(() => {
    fetch(`${API_BASE}/api/health`).catch(() => {});
  }, 1000);
}

const TOKEN_KEY = "anicine_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

let tokenPromise: Promise<string | null> | null = null;

// Mint an account once and cache the token in localStorage. Returns null if the
// Worker is unreachable or disabled — callers then use the localStorage path.
export async function ensureAccount(): Promise<string | null> {
  if (!apiEnabled) return null;
  const existing = getToken();
  if (existing) return existing;
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/account`, { method: "POST" });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      if (!data.token) return null;
      localStorage.setItem(TOKEN_KEY, data.token);
      return data.token;
    } catch {
      return null;
    }
  })();
  const token = await tokenPromise;
  tokenPromise = null;
  return token;
}

async function authedFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = await ensureAccount();
  const headers = new Headers(opts.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

export interface FavoritePayload {
  item_id: string;
  title: string;
  poster?: string | null;
  provider?: string | null;
  provider_url?: string | null;
  type?: string | null;
}

export async function fetchFavorites(): Promise<FavoritePayload[]> {
  const res = await authedFetch("/api/favorites");
  if (!res.ok) throw new Error("favorites fetch failed");
  const data = (await res.json()) as { items: FavoritePayload[] };
  return data.items ?? [];
}

export async function postFavorite(item: FavoritePayload): Promise<void> {
  const res = await authedFetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("favorite add failed");
}

export async function deleteFavorite(itemId: string): Promise<void> {
  const res = await authedFetch(`/api/favorites/${encodeURIComponent(itemId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("favorite remove failed");
}

// --- Watch history (Continue Watching) — same payload shape as favorites ---
export async function fetchHistory(): Promise<FavoritePayload[]> {
  const res = await authedFetch("/api/history");
  if (!res.ok) throw new Error("history fetch failed");
  const data = (await res.json()) as { items: FavoritePayload[] };
  return data.items ?? [];
}

export async function postHistory(item: FavoritePayload): Promise<void> {
  const res = await authedFetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("history add failed");
}

export async function clearHistoryRemote(): Promise<void> {
  const res = await authedFetch("/api/history", { method: "DELETE" });
  if (!res.ok) throw new Error("history clear failed");
}
