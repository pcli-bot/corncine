import type { MetadataRoute } from "next";
import { PROVIDERS, CATALOG_MODES } from "@/lib/anicine-data";
import { ALL_TOP } from "@/lib/seo-top";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://corncine.pages.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
  ];

  // 7 category pages
  for (const mode of CATALOG_MODES) {
    urls.push({
      url: `${BASE}/category/${mode.key}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // 60+ provider pages
  for (const p of PROVIDERS) {
    urls.push({
      url: `${BASE}/sites/${p.domain}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  // Top-searched adult download pages
  for (const e of ALL_TOP) {
    urls.push({
      url: `${BASE}/search?q=${encodeURIComponent(e.q)}&mode=${e.mode}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    });
    // Also expose /download/books, /download/movies style via query param alias for fetcher
    urls.push({
      url: `${BASE}/category/${e.mode}?q=${encodeURIComponent(e.q)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.65,
    });
  }

  // Trending per mode + universal + top books live (best-effort, no await blocker — use ALL_TOP as source of truth)
  // This ensures sitemap is always fast; live fetch is for category pages, not sitemap generation.

  return urls;
}
