"use client";

import { PILLARS, FAQS, DIRECTORY } from "@/lib/anicine-data";
import { IconByName } from "@/lib/anicine-icons";
import { useAnicineStore } from "@/lib/anicine-store";
import { cn } from "@/lib/utils";

const tone: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: "bg-[#EC69AE]/10", border: "border-[#EC69AE]/25", text: "text-[#EC69AE]" },
  emerald: { bg: "bg-[#6AB27A]/10", border: "border-[#6AB27A]/25", text: "text-[#6AB27A]" },
  cyan: { bg: "bg-[#F997C6]/10", border: "border-[#F997C6]/25", text: "text-[#F997C6]" },
  amber: { bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/25", text: "text-[#F59E0B]" },
};

export function KnowledgeBase() {
  return (
    <section id="faq-section" className="border-t border-[#323947] bg-[#0B0E15] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151922] border border-[#323947]">
            <span className="w-2 h-2 rounded-full bg-[#EC69AE]" />
            <span className="text-xs font-mono font-semibold text-[#B3B7C1] uppercase tracking-wider">
              Universal Media Knowledge Base
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
            Stream movies, watch anime, and grab video downloads.
          </h2>
          <p className="text-sm sm:text-base text-[#B3B7C1] leading-relaxed">
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
              <article key={p.title} className="bg-[#151922] border border-[#323947] rounded-xl p-5 space-y-3 card-hover">
                <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center border", t.bg, t.border)}>
                  <IconByName name={p.icon} className={cn("w-5 h-5", t.text)} />
                </div>
                <h3 className="text-base font-bold text-[#F8FAFC]">{p.title}</h3>
                <p className="text-xs text-[#B3B7C1] leading-relaxed" dangerouslySetInnerHTML={{ __html: p.body.replace(/<strong>/g, `<strong class="${t.text} font-semibold">`) }} />
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#202530] border border-[#323947] text-[#B3B7C1]">{tag}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {/* FAQ */}
        <div id="faq-list" className="pt-6 border-t border-[#323947] space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">Frequently Asked Questions</h3>
            <p className="text-xs text-[#B3B7C1] mt-1">Everything you need to know about streaming, downloading, and media indexing with CornCine.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {FAQS.map((f) => {
              const t = tone[f.tone];
              return (
                <div key={f.q} className="bg-[#151922] border border-[#323947] rounded-xl p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-[#F8FAFC] flex items-start gap-2">
                    <span className={cn("font-mono", t.text)}>Q:</span>
                    <span>{f.q}</span>
                  </h4>
                  <p className="text-xs text-[#B3B7C1] leading-relaxed pl-6">{f.a}</p>
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
    <div id="directory-hub" className="pt-8 border-t border-[#323947] space-y-6">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-[#949AA5] uppercase tracking-wider font-mono">
          CornCine Global Media Index &amp; Streaming Directory
        </h3>
        <p className="text-xs text-[#B3B7C1]">Direct index of trending titles, simulcasts, and high-speed extractors supported across all 1,896+ providers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
        {DIRECTORY.map((cat) => (
          <div key={cat.title} className="space-y-2.5">
            <div className="font-bold text-[#F8FAFC] flex items-center gap-1.5 border-b border-[#323947] pb-1.5">
              <IconByName name={cat.icon} className="w-3.5 h-3.5 text-[#EC69AE]" />
              <span>{cat.title}</span>
            </div>
            <ul className="space-y-1.5">
              {(cat.links as Array<{ label: string; q: string; mode: import("@/lib/anicine-data").ModeKey; action?: string }>)?.map((l, i) => (
                <li key={i}>
                  <button
                    onClick={() => onLink(l.q, l.mode, l.action)}
                    className="text-left text-[#B3B7C1] hover:text-[#EC69AE] spring-transition"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
              {(cat as { providers?: Array<{ name: string; note: string }> }).providers?.map((p, i) => (
                <li key={i}>
                  <span className="text-[#F8FAFC] font-medium">{p.name}</span>{" "}
                  <span className="text-[10px] text-[#949AA5]">({p.note})</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
