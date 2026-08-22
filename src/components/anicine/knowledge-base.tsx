"use client";

import { PILLARS, FAQS, DIRECTORY } from "@/lib/anicine-data";
import { useAnicineStore } from "@/lib/anicine-store";
import { cn } from "@/lib/utils";

const tone: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: "bg-[#3B82F6]/10", border: "border-[#3B82F6]/25", text: "text-[#3B82F6]" },
  emerald: { bg: "bg-[#10B981]/10", border: "border-[#10B981]/25", text: "text-[#10B981]" },
  cyan: { bg: "bg-[#06B6D4]/10", border: "border-[#06B6D4]/25", text: "text-[#06B6D4]" },
  amber: { bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/25", text: "text-[#F59E0B]" },
};

export function KnowledgeBase() {
  return (
    <section id="faq-section" className="border-t border-[#1E2A3C] bg-[#0B0F17] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131A26] border border-[#1E2A3C]">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            <span className="text-xs font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">
              Universal Media Knowledge Base
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            Stream movies, watch anime, and grab video downloads.
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
            CornCine is an open-source decentralized media indexer scanning 1,896+ FMHY verified
            streaming engines, torrent swarms, anime trackers, and video extractors with zero ads
            and zero tracking.
          </p>
        </div>

        {/* 4-pillar grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map((p) => {
            const t = tone[p.tone];
            return (
              <article key={p.title} className="bg-[#131A26] border border-[#1E2A3C] rounded-xl p-5 space-y-3 card-hover">
                <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center text-xl border", t.bg, t.border)}>
                  <span>{p.emoji}</span>
                </div>
                <h3 className="text-base font-bold text-[#F8FAFC]">{p.title}</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed" dangerouslySetInnerHTML={{ __html: p.body.replace(/<strong>/g, `<strong class="${t.text} font-semibold">`) }} />
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1B2433] border border-[#1E2A3C] text-[#94A3B8]">{tag}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {/* FAQ */}
        <div id="faq-list" className="pt-6 border-t border-[#1E2A3C] space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">Frequently Asked Questions</h3>
            <p className="text-xs text-[#94A3B8] mt-1">Everything you need to know about streaming, downloading, and media indexing with CornCine.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {FAQS.map((f) => {
              const t = tone[f.tone];
              return (
                <div key={f.q} className="bg-[#131A26] border border-[#1E2A3C] rounded-xl p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-[#F8FAFC] flex items-start gap-2">
                    <span className={cn("font-mono", t.text)}>Q:</span>
                    <span>{f.q}</span>
                  </h4>
                  <p className="text-xs text-[#94A3B8] leading-relaxed pl-6">{f.a}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Crawlable directory hub */}
        <DirectoryHub />
      </div>
    </section>
  );
}

function DirectoryHub() {
  const setQuery = useAnicineStore((s) => s.setQuery);
  const setMode = useAnicineStore((s) => s.setMode);
  const setMainTool = useAnicineStore((s) => s.setMainTool);

  const onLink = (q: string, mode: import("@/lib/anicine-data").ModeKey, action?: string) => {
    if (action === "downloader") {
      setMainTool("downloader");
    } else {
      setMainTool("search");
      setMode(mode);
      setQuery(q);
    }
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="directory-hub" className="pt-8 border-t border-[#1E2A3C] space-y-6">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-mono">
          CornCine Global Media Index &amp; Streaming Directory
        </h3>
        <p className="text-xs text-[#94A3B8]">Direct index of trending titles, simulcasts, and high-speed extractors supported across all 1,896+ providers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
        {DIRECTORY.map((cat) => (
          <div key={cat.title} className="space-y-2.5">
            <div className="font-bold text-[#F8FAFC] flex items-center gap-1.5 border-b border-[#1E2A3C] pb-1.5">
              <span>{cat.emoji}</span> <span>{cat.title}</span>
            </div>
            <ul className="space-y-1.5">
              {(cat.links as Array<{ label: string; q: string; mode: import("@/lib/anicine-data").ModeKey; action?: string }>)?.map((l, i) => (
                <li key={i}>
                  <button
                    onClick={() => onLink(l.q, l.mode, l.action)}
                    className="text-left text-[#94A3B8] hover:text-[#3B82F6] spring-transition"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
              {(cat as { providers?: Array<{ name: string; note: string }> }).providers?.map((p, i) => (
                <li key={i}>
                  <span className="text-[#F8FAFC] font-medium">{p.name}</span>{" "}
                  <span className="text-[10px] text-[#64748B]">({p.note})</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
