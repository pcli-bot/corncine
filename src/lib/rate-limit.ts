// Shared in-memory rate limiter for API routes.
// Self-host single-instance: Map in module scope survives across requests.
// For fleet, replace with Redis/KV.

const buckets = new Map<string, number[]>();

export interface RateLimitOpts {
  windowMs: number;
  max: number;
}

export function checkRateLimit(key: string, opts: RateLimitOpts): boolean {
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < opts.windowMs);
  if (fresh.length >= opts.max) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}

export function getClientIp(req: Request): string {
  const h = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  const first = h.split(",")[0]?.trim();
  return first || "unknown";
}

// Presets
export const RL_PRESETS = {
  download: { windowMs: 60_000, max: 20 },
  search: { windowMs: 60_000, max: 60 },
  trending: { windowMs: 60_000, max: 60 },
  leak: { windowMs: 60_000, max: 30 },
} as const;

// Periodic cleanup to prevent unbounded growth (every 10min)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of buckets.entries()) {
      const fresh = arr.filter((t) => now - t < 60_000 * 10);
      if (fresh.length === 0) buckets.delete(k);
      else buckets.set(k, fresh);
    }
  }, 10 * 60 * 1000).unref?.();
}
