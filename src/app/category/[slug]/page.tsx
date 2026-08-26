import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATALOG_MODES, PROVIDERS, type ProviderCategory } from "@/lib/anicine-data";
import { ALL_TOP } from "@/lib/seo-top";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://corncine.pages.dev";

export function generateStaticParams() {
  return CATALOG_MODES.map((m) => ({ slug: m.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mode = CATALOG_MODES.find((m) => m.key === slug);
  if (!mode) return { title: "Category not found — CornCine" };
  const isAdult = mode.key === "adult";
  const title = `${mode.label} — Stream, Search & Download on CornCine | ${mode.count}+ Sources 4K/1080p`;
  const topQ = ALL_TOP.filter((e) => e.mode === mode.key || (mode.key === "all" && e.mode === "adult")).slice(0, 4).map((e) => e.q).join(", ");
  const description = `${mode.desc} Browse ${mode.count}+ indexed ${mode.label.toLowerCase()} sources and download in 4K / 1080p across CornCine. Top: ${topQ}.`;
  return {
    title,
    description,
    alternates: { canonical: `/category/${mode.key}` },
    openGraph: { title, description, url: `/category/${mode.key}`, siteName: "CornCine", type: "website" },
    twitter: { card: "summary_large_image", title, description },
    robots: isAdult ? { index: true, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mode = CATALOG_MODES.find((m) => m.key === slug);
  if (!mode) notFound();

  const providers = PROVIDERS.filter((p) => (mode.categories as ProviderCategory[]).includes(p.category));
  const topForMode = ALL_TOP.filter((e) => e.mode === mode.key || (mode.key === "all" && e.mode === "adult")).slice(0, 12);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: mode.title,
    description: mode.desc,
    url: `${BASE}/category/${mode.key}`,
    isPartOf: { "@type": "WebSite", name: "CornCine", url: BASE },
    hasPart: providers.map((p) => ({
      "@type": "WebSite",
      name: p.name,
      url: `${BASE}/sites/${p.domain}`,
    })),
    mainEntity: topForMode.map((e) => ({
      "@type": "SearchAction",
      target: `${BASE}/search?q=${encodeURIComponent(e.q)}&mode=${e.mode}`,
      query: e.q,
    })),
  };

  return (
    <main className="min-h-screen bg-[#0B0E15] text-[#F8FAFC] px-4 py-10 max-w-5xl mx-auto">
      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/" className="hover:text-[#F8FAFC]">CornCine</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">Categories</span>
        <span className="mx-2">/</span>
        <span className="text-slate-200">{mode.label}</span>
      </nav>

      <h1 className="text-3xl font-extrabold mb-2">{mode.title}</h1>
      <p className="text-slate-400 mb-8 max-w-2xl">{mode.desc}</p>

      <h2 className="text-lg font-semibold mb-4 text-slate-200">
        Indexed sources ({providers.length})
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {providers.map((p) => (
          <li key={p.domain}>
            <Link
              href={`/sites/${p.domain}`}
              className="block rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                <span className="text-xs text-slate-500">{p.domain}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{p.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Top searched for this category — crawlable internal links for SEO */}
      {topForMode.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Top searched in {mode.label}</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topForMode.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/search?q=${encodeURIComponent(e.q)}&mode=${e.mode}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 transition p-3"
                >
                  <span className="font-medium text-[#F8FAFC] text-sm">{e.title}</span>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{e.desc}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 flex flex-wrap gap-2">
        {CATALOG_MODES.filter((m) => m.key !== mode.key).map((m) => (
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
