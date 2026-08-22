import type { Metadata } from "next";
import Link from "next/link";
import { ALL_TOP } from "@/lib/seo-top";
import { CATALOG_MODES } from "@/lib/anicine-data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://anicine.pages.dev";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string }> }): Promise<Metadata> {
  const { q, mode } = await searchParams;
  if (q) {
    const title = `${q} — Download ${mode || "adult"} on CornCine`;
    const desc = `Download ${q} free — ${mode || "adult"} via 21+ adult providers. JAV uncensored, hentai sub/dub, Pornhub/Eporner 4K, OnlyFans leaks via Kemono/Coomer. 18+ only.`;
    return {
      title,
      description: desc,
      alternates: { canonical: `/search?q=${encodeURIComponent(q)}&mode=${mode || "adult"}` },
      openGraph: { title, description: desc, url: `/search?q=${encodeURIComponent(q)}&mode=${mode || "adult"}`, type: "website" },
    };
  }
  return {
    title: "Search — CornCine Universal Adult Search 21+ Providers",
    description: "Search JAV, hentai, tubes 4K, OnlyFans leaks across 21+ adult providers at once. 18+ only.",
    alternates: { canonical: "/search" },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string }> }) {
  const { q, mode } = await searchParams;
  const query = (q || "").trim();
  const m = (mode || "all").toLowerCase();
  const top = ALL_TOP.slice(0, 12);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: query ? `Search: ${query}` : "CornCine Search",
    url: `${BASE}/search${query ? `?q=${encodeURIComponent(query)}&mode=${m}` : ""}`,
  };

  return (
    <main className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] px-4 py-10 max-w-5xl mx-auto">
      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/" className="hover:text-[#F8FAFC]">CornCine</Link> <span className="mx-2">/</span> <span className="text-slate-200">Search</span>
      </nav>
      <h1 className="text-3xl font-extrabold mb-2">{query ? `Search: ${query}` : "Search CornCine"}</h1>
      <p className="text-slate-400 mb-6">
        {query ? `Top results for "${query}" across ${m} — also try universal search.` : "Try top searches below — every link is a crawlable download page."}
      </p>

      {query && (
        <div className="mb-8 flex flex-wrap gap-2">
          {CATALOG_MODES.map((c) => (
            <Link key={c.key} href={`/search?q=${encodeURIComponent(query)}&mode=${c.key}`} className={`text-sm rounded-full border px-3 py-1 ${m === c.key ? "bg-[#3B82F6] text-white border-[#3B82F6]" : "border-white/10 hover:bg-white/10"}`}>
              {c.label}
            </Link>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Top searches</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {top.map((e) => (
          <li key={e.slug}>
            <Link href={`/search?q=${encodeURIComponent(e.q)}&mode=${e.mode}`} className="block rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-4">
              <span className="font-semibold text-sm">{e.title}</span>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{e.desc}</p>
              <span className="text-[10px] font-mono text-slate-500 mt-2 block">{e.mode} • {e.q}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500 mt-8">Tip: Use <code className="text-slate-300">/api/search?q=&mode=adult</code> for JSON, <code className="text-slate-300">/category/adult</code> for adult catalog. All downloads via <code className="text-slate-300">POST /api/download</code> → <code className="text-slate-300">GET /api/download/:id?file=1</code>.</p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
