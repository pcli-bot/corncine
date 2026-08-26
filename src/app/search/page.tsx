"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ALL_TOP } from "@/lib/seo-top";
import { CATALOG_MODES } from "@/lib/anicine-data";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const mode = searchParams.get("mode") || "adult";
  const query = q.trim();
  const m = mode.toLowerCase();
  const top = ALL_TOP.slice(0, 12);

  return (
    <main className="min-h-screen bg-[#0B0E15] text-[#F8FAFC] px-4 py-10 max-w-5xl mx-auto">
      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/" className="hover:text-[#F8FAFC]">CornCine</Link> <span className="mx-2">/</span> <span className="text-slate-200">Search</span>
      </nav>
      <h1 className="text-3xl font-extrabold mb-2">{query ? `Search: ${query}` : "Search CornCine"}</h1>
      <p className="text-slate-400 mb-6">
        {query ? `Top results for "${query}" across ${m} — direct stream & high-speed downloads.` : "Try top searches below — search across 27+ adult providers."}
      </p>

      {query && (
        <div className="mb-8 flex flex-wrap gap-2">
          {CATALOG_MODES.map((c) => (
            <Link key={c.key} href={`/search?q=${encodeURIComponent(query)}&mode=${c.key}`} className={`text-sm rounded-full border px-3 py-1 ${m === c.key ? "bg-[#EC69AE] text-[#0B0E15] border-[#EC69AE]" : "border-white/10 hover:bg-white/10"}`}>
              {c.label}
            </Link>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Top searches</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        {top.map((item) => (
          <Link key={item.slug} href={`/search?q=${encodeURIComponent(item.title)}`} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#EC69AE] transition flex flex-col">
            <span className="font-semibold text-sm">{item.title}</span>
            <span className="text-xs text-slate-400 mt-1 line-clamp-2">{item.desc}</span>
          </Link>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
        <p className="text-sm text-slate-300 mb-2">Want universal search across all 27+ adult indexers?</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-lg bg-[#EC69AE] text-[#0B0E15] font-bold text-sm hover:bg-[#2563EB] transition">
          Open Homepage Player & Grabber →
        </Link>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0E15] flex items-center justify-center text-slate-400">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
