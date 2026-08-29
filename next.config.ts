import type { NextConfig } from "next";

const isCloudflarePages = process.env.CF_PAGES === "1" || process.env.CF_PAGES === "true";

const nextConfig: NextConfig = {
  output: isCloudflarePages ? "export" : "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    if (isCloudflarePages) return [];
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // The TrafficStars loader pulls its engine and beacons from sibling
              // hosts (jssdk.tsyndicate.com, and cdn over plain http), so pinning
              // only cdn.tsyndicate.com blocked every ad request and the slot
              // never filled. Wildcard the vendor and upgrade its http
              // sub-requests rather than widening script-src to https:.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.tsyndicate.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https: http:",
              "connect-src 'self' https: wss:", // tsyndicate beacons covered by https:
              "frame-src 'self' https://vidlink.pro https://anyembed.xyz https://www.2embed.skin https://vidsrc.to https://*.vidsrc.to https://*.vidsrc.net",
              "frame-ancestors 'none'",
              // Forces the ad SDK's http:// sub-resources to https so CSP keeps
              // them rather than dropping them as mixed content.
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
