import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { AgeGate } from "@/components/corncine/age-gate";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://corncine.pages.dev"),
  alternates: { canonical: "/" },
  title: {
    default: "CornCine — JAV, Hentai, Desi & OnlyFans Leaks 4K Downloader | 22 Providers",
    template: "%s — CornCine",
  },
  description:
    "CornCine: 22+ adult providers at once — JAV uncensored (MissAV/JAVGuru/SupJAV), hentai (Hanime/HentaiHaven/Nhentai), Indian Desi (DesiTales2), tubes (Pornhub/Eporner/SpankBang 4K), OnlyFans leaks (Kemono/Coomer) and XXX torrents. Download via yt-dlp/aria2c. 18+ only.",
  category: "adult",
  classification: "Adult",
  other: { rating: "adult", "RTA": "RTA-5042-1996-1400-0005" },
  keywords: [
    "corncine",
    "jav download",
    "jav guru download",
    "jav uncensored download",
    "missav download 1080p",
    "hanime download",
    "hentai download uncensored",
    "nhentai doujinshi",
    "onlyfans leak search",
    "kemono coomer archive",
    "pornhub download 4k",
    "eporner 4k download",
    "spankbang direct mp4",
    "adult torrent search",
    "1337x xxx",
    "desitales2",
    "desi kahani",
    "indian sex stories",
    "desi chudai kahani",
    "savita bhabhi",
    "sunny leone 4k download",
    "mia khalifa viral download",
    "dani daniels 4k download",
    "johnny sins most searched",
    "eva elfie onlyfans leak",
    "angela white pornhub #1",
    "lana rhoades viral archive",
    "bonnie blue 2025",
    "creator leak archive",
  ],
  authors: [{ name: "CornCine open source collective", url: "https://corncine.pages.dev" }],
  creator: "CornCine",
  publisher: "CornCine",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    title: "CornCine — JAV, Hentai, Desi & OnlyFans Leaks 4K | 22 Providers",
    description:
      "CornCine: 22+ adult providers — JAV uncensored, hentai sub/dub, DesiTales2 Indian stories, tubes 4K, OnlyFans/Kemono leaks, XXX torrents via yt-dlp/aria2c. 18+ only.",
    siteName: "CornCine",
    type: "website",
    locale: "en_US",
    url: "/",
    images: [{ url: "/og-corncine.jpg", width: 1200, height: 630, alt: "CornCine — 22 Adult Providers" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CornCine — JAV, Hentai, Desi & OnlyFans Leaks 4K",
    description: "JAV, hentai, DesiTales2, tubes 4K, OnlyFans leaks — 22+ adult providers.",
    images: ["/og-corncine.jpg"],
  },
  icons: {
    // .ico first: it carries hand-checked 16-48px rasters, which is the size
    // Google draws in a result row. The SVG is offered to browsers that
    // prefer it.
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    // iOS does not render SVG touch icons; it needs a PNG or it silently
    // falls back to a screenshot of the page.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
  },
};

const jsonLdWebsite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CornCine",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://corncine.pages.dev",
  description: "22+ adult providers — JAV, hentai, Desi, tubes 4K, OnlyFans leaks, XXX torrents",
  inLanguage: "en-US",
  isFamilyFriendly: false,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || "https://corncine.pages.dev"}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  publisher: { "@type": "Organization", name: "CornCine", url: process.env.NEXT_PUBLIC_SITE_URL || "https://corncine.pages.dev" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      {/* TrafficStars Popunder — $0.30–$2.47 per pop (NL/US premium).
          Params set in dashboard: 1 pop/session, 10s first delay, 30m between,
          12h session duration, blind clicks disabled, Chrome NOT excluded. */}
      <Script
        src="https://cdn.tsyndicate.com/sdk/v1/p.js"
        data-ts-spot="91984ba499b941f791b6ee0b4a38000f"
        data-ts-mode="selective"
        data-ts-count="1"
        data-ts-first-delay="10"
        data-ts-delay="30"
        data-ts-session-duration="12"
        strategy="afterInteractive"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
      <body
        className={`${inter.variable} ${jetbrains.variable} antialiased font-sans bg-[#0B0E15] text-[#F8FAFC] min-h-screen flex flex-col overflow-x-hidden`}
      >
        <ErrorBoundary>
          <AgeGate />
          {children}
        </ErrorBoundary>
        {/* The site footer is rendered by <Footer /> at page level. A second
            footer used to live here, so every page shipped two <footer>
            landmarks: duplicated links, and an ambiguous landmark for screen
            readers. Its catalog and sitemap links all exist in <Footer />,
            which also carries the Legal column. Its text-[#949AA5] body copy
            measured 4.06:1 on this surface, under the 4.5 AA floor. */}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
