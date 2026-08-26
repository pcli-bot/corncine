"use client";

import { useEffect, useState } from "react";
import { Search, Download, ExternalLink, Menu, X, TerminalSquare } from "lucide-react";
import { useAnicineStore } from "@/lib/anicine-store";
import { cn } from "@/lib/utils";

export function Header() {
  const setDrawer = useAnicineStore((s) => s.setDrawer);
  const setPalette = useAnicineStore((s) => s.setPalette);
  const tasks = useAnicineStore((s) => s.tasks);
  const setMainTool = useAnicineStore((s) => s.setMainTool);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = tasks.filter((t) => t.status === "active" || t.status === "queued").length;

  // ⌘K / Ctrl+K to open palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPalette]);

  const nav = [
    { label: "Search Catalogs", onClick: () => { setMainTool("search"); document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Link Downloader", onClick: () => { setMainTool("downloader"); document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Desktop App", onClick: () => document.getElementById("desktop-apps")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "FAQ", onClick: () => document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#323947] bg-[#0B0E15]/85 backdrop-blur-md spring-transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <a href="#" className="flex items-center gap-2.5 shrink-0">
          <span className="relative grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#EC69AE] to-[#F997C6] shadow-lg shadow-blue-500/20">
            <TerminalSquare className="w-5 h-5 text-white" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#6AB27A] ring-2 ring-[#0B0E15]" />
          </span>
          <span className="text-xl font-bold tracking-tight text-[#F8FAFC]">CornCine</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <button
              key={n.label}
              onClick={n.onClick}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#B3B7C1] hover:text-[#F8FAFC] hover:bg-[#151922] spring-transition"
            >
              {n.label}
            </button>
          ))}
          <a
            href="https://github.com/pcli-bot/pcli"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#B3B7C1] hover:text-[#F8FAFC] hover:bg-[#151922] spring-transition flex items-center gap-1.5"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {/* Command palette trigger */}
          <button
            onClick={() => setPalette(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151922] border border-[#323947] text-xs text-[#949AA5] hover:border-[#4D5566] hover:text-[#B3B7C1] spring-transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#202530] border border-[#323947] text-[10px] font-mono">⌘K</kbd>
          </button>

          {/* Downloads */}
          <button
            onClick={() => setDrawer(true)}
            className="relative p-2 rounded-lg bg-[#151922] border border-[#323947] hover:bg-[#202530] hover:border-[#4D5566] text-[#F8FAFC] spring-transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-[#F997C6]" />
            <span className="hidden sm:inline text-xs font-semibold text-[#B3B7C1]">Downloads</span>
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EC69AE] text-[#0B0E15] text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                {activeCount}
              </span>
            )}
          </button>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg bg-[#151922] border border-[#323947] text-[#F8FAFC]"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "md:hidden overflow-hidden border-t border-[#323947] bg-[#0B0E15] transition-[max-height] duration-300",
          mobileOpen ? "max-h-80" : "max-h-0"
        )}
      >
        <nav className="px-4 py-3 flex flex-col gap-1">
          {nav.map((n) => (
            <button
              key={n.label}
              onClick={() => { n.onClick(); setMobileOpen(false); }}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-[#B3B7C1] hover:text-[#F8FAFC] hover:bg-[#151922] spring-transition"
            >
              {n.label}
            </button>
          ))}
          <a
            href="https://github.com/pcli-bot/pcli"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-lg text-sm font-medium text-[#B3B7C1] hover:text-[#F8FAFC] hover:bg-[#151922] spring-transition flex items-center gap-1.5"
          >
            GitHub <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
