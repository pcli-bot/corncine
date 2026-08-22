import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVIDERS, CATALOG_MODES, buildSearchUrl } from "@/lib/anicine-data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://anicine.pages.dev";

export function generateStaticParams() {
  return PROVIDERS.map((p) => ({ slug: p.domain }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = PROVIDERS.find((x) => x.domain === slug);
  if (!p) return { title: "Source not found — CornCine" };
  const title = `${p.name} — Search, Stream & Download Index on CornCine`;
  const description = `${p.blurb} Find, stream, and download ${p.name} (${p.domain}) content in 4K / 1080p. Part of CornCine's ${PROVIDERS.length} indexed sources.`;
  return {
    title,
    description,
    alternates: { canonical: `/sites/${p.domain}` },
    openGraph: { title, description, url: `/sites/${p.domain}`, siteName: "CornCine", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PROVIDERS.find((x) => x.domain === slug);
  if (!p) notFound();

  const mode = CATALOG_MODES.find((m) => m.categories.includes(p.category));
  const searchUrl = buildSearchUrl(p, p.name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: p.name,
    url: p.url,
    sameAs: [p.url],
    description: p.blurb,
    publisher: { "@type": "Organization", name: "CornCine" },
  };

  return (
    <main className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] px-4 py-10 max-w-3xl mx-auto">
      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/" className="hover:text-[#F8FAFC]">CornCine</Link>
        <span className="mx-2">/</span>
        {mode ? (
          <Link href={`/category/${mode.key}`} className="hover:text-[#F8FAFC]">{mode.label}</Link>
        ) : (
          <span className="text-slate-300">Sources</span>
        )}
        <span className="mx-2">/</span>
        <span className="text-slate-200">{p.name}</span>
      </nav>

      <h1 className="text-3xl font-extrabold mb-2">{p.name}</h1>
      <p className="text-slate-500 text-sm mb-4">{p.domain}</p>
      <p className="text-slate-300 mb-8 max-w-2xl">{p.blurb}</p>

      <div className="flex flex-wrap gap-3 mb-10">
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2.5"
        >
          Visit {p.name} ↗
        </a>
        <Link
          href={`/?q=${encodeURIComponent(p.name)}`}
          className="rounded-xl border border-white/15 hover:bg-white/10 px-5 py-2.5 font-medium"
        >
          Search on CornCine
        </Link>
        {p.searchPattern ? (
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/15 hover:bg-white/10 px-5 py-2.5 font-medium"
          >
            Open {p.name} search ↗
          </a>
        ) : null}
      </div>

      <p className="text-slate-400 text-sm max-w-2xl">
        {p.name} is one of {PROVIDERS.length} sources indexed by CornCine. Use the search above to resolve
        direct streams and downloads across every indexed provider in one place.
      </p>

      <section className="mt-10 flex flex-wrap gap-2">
        {CATALOG_MODES.map((m) => (
          <Link
            key={m.key}
            href={`/category/${m.key}`}
            className="text-sm rounded-full border border-white/10 px-3 py-1 hover:bg-white/10"
          >
            {m.label}
          </Link>
        ))}
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
