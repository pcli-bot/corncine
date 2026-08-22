import { z } from "zod";

export const ModeKeySchema = z.enum(["adult"]);

export const SearchQuerySchema = z.object({
  q: z.string().max(200).optional().default(""),
  mode: z.string().optional().default("adult").transform((v) => {
    const allowed = ["adult", "all", "universal"];
    const low = (v || "adult").toLowerCase();
    if (low === "all" || low === "universal") return "all";
    return allowed.includes(low) ? low : "adult";
  }),
  filter: z.enum(["all", "4k", "1080p"]).optional().default("all"),
  sort: z.enum(["seeds", "rating", "title"]).optional().default("seeds"),
  provider: z.string().max(50).optional().default("all"),
  subDub: z.enum(["all", "sub", "dub"]).optional().default("all"),
});

export const TrendingQuerySchema = z.object({
  mode: z.string().optional().default("adult").transform((v) => {
    const allowed = ["adult", "all", "universal"];
    const low = (v || "adult").toLowerCase();
    if (low === "all" || low === "universal") return "all";
    return allowed.includes(low) ? low : "adult";
  }),
});

export const DownloadBodySchema = z.object({
  url: z.string().trim().min(1).max(2048).refine((v) => /^(https?:\/\/|magnet:)/i.test(v), "url must be http(s) or magnet:"),
  title: z.string().max(300).optional(),
  source: z.string().max(100).optional(),
  format: z.enum(["video", "audio", "lossless"]).optional().default("video"),
  quality: z.string().max(20).optional().default("best"),
  engine: z.string().max(30).optional(),
});

export const LeakSearchSchema = z.object({
  q: z.string().max(200).optional().default(""),
});

export const JobIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9-_]+$/);

export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
