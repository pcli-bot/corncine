import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://corncine.pages.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/", // JSON endpoints (download, search, leak, trending) are not for indexing
        ],
      },
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Bingbot",
          "Applebot",
          "DuckDuckBot",
          "YandexBot",
          "Baiduspider",
          "GPTBot",
          "ClaudeBot",
          "PerplexityBot",
        ],
        allow: ["/", "/category/", "/sites/", "/search", "/posters/"],
        disallow: ["/api/"],
      },
      // Adult crawlers — allow but no explicit disallow; rely on meta robots per page
      {
        userAgent: ["AhrefsBot", "SemrushBot", "DotBot"],
        allow: ["/", "/category/", "/sites/", "/search"],
        disallow: ["/api/"],
        crawlDelay: 2,
      },
    ],
    sitemap: [
      `${BASE}/sitemap.xml`,
      "https://anicine.duckdns.org/sitemap.xml",
      "https://anicine.github.io/sitemap.xml",
    ],
    host: BASE,
  };
}
