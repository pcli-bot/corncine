import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { CATALOG_MODES } from "@/lib/anicine-data";
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
  title: "CornCine — JAV, Hentai & OnlyFans Leaks 4K Downloader | MissAV, JAVGuru, Hanime, Kemono",
  description:
    "CornCine: 21+ adult providers at once — JAV uncensored (MissAV/JAVGuru/SupJAV), hentai (Hanime/HentaiHaven/Nhentai), tubes (Pornhub/Eporner/SpankBang 4K), OnlyFans leaks (Kemono/Coomer) and XXX torrents. Download via yt-dlp/aria2c. 18+ only.",
  other: { rating: "adult" },
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
    "creator leak archive",
  ],
  authors: [{ name: "CornCine open source collective" }],
  openGraph: {
    title: "CornCine — JAV, Hentai & OnlyFans Leaks 4K",
    description:
      "CornCine: 21+ adult providers — JAV uncensored, hentai sub/dub, tubes 4K, OnlyFans/Kemono leaks, XXX torrents via yt-dlp/aria2c. 18+ only.",
    siteName: "CornCine",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CornCine — JAV, Hentai & OnlyFans Leaks 4K",
    description:
      "JAV, hentai, tubes 4K, OnlyFans leaks — 21+ adult providers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrains.variable} antialiased font-sans bg-[#0B0F17] text-[#F8FAFC] min-h-screen flex flex-col overflow-x-hidden`}
      >
        <ErrorBoundary>
          <AgeGate />
          {children}
        </ErrorBoundary>
        <footer className="border-t border-white/10 mt-12 py-8 px-4 text-sm text-slate-500">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {CATALOG_MODES.map((m) => (
                <Link key={m.key} href={`/category/${m.key}`} className="hover:text-slate-200">
                  {m.label}
                </Link>
              ))}
              <Link href="/sitemap.xml" className="hover:text-slate-200">Sitemap</Link>
            </div>
            <p>© CornCine — universal stream &amp; download index across {CATALOG_MODES.reduce((n, m) => n + m.count, 0)}+ sources.</p>
          </div>
        </footer>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
