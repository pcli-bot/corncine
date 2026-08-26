"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnicineStore } from "@/lib/anicine-store";
import { TRENDING_MEDIA, CATALOG_MODES, PROVIDERS, type CatalogMode } from "@/lib/anicine-data";
import { Search, Film, Link2, Download, Layers, CornerDownLeft, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type CmdKind = "nav" | "title" | "provider" | "mode";

interface Cmd {
  id: string;
  kind: CmdKind;
  label: string;
  hint?: string;
  shortcut?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const open = useAnicineStore((s) => s.paletteOpen);
  const setOpen = useAnicineStore((s) => s.setPalette);
  const setMainTool = useAnicineStore((s) => s.setMainTool);
  const setMode = useAnicineStore((s) => s.setMode);
  const setQuery = useAnicineStore((s) => s.setQuery);
  const setPlayer = useAnicineStore((s) => s.setPlayer);
  const setDrawer = useAnicineStore((s) => s.setDrawer);
  const [input, setInput] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => setOpen(false);

  const goto = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const commands: Cmd[] = useMemo(() => {
    const nav: Cmd[] = [
      { id: "n-search", kind: "nav", label: "Open Search Catalogs", shortcut: "S", icon: <Search className="w-4 h-4 text-[#EC69AE]" />, run: () => { setMainTool("search"); goto("hero"); } },
      { id: "n-downloader", kind: "nav", label: "Open Link Downloader", shortcut: "D", icon: <Link2 className="w-4 h-4 text-[#F997C6]" />, run: () => { setMainTool("downloader"); goto("hero"); } },
      { id: "n-catalog", kind: "nav", label: "Jump to Media Catalog", shortcut: "C", icon: <Layers className="w-4 h-4 text-[#6AB27A]" />, run: () => goto("catalog") },
      { id: "n-desktop", kind: "nav", label: "Jump to Desktop Apps", shortcut: "A", icon: <Download className="w-4 h-4 text-[#F59E0B]" />, run: () => goto("desktop-apps") },
      { id: "n-faq", kind: "nav", label: "Jump to FAQ", shortcut: "F", icon: <Film className="w-4 h-4 text-[#B3B7C1]" />, run: () => goto("faq-section") },
      { id: "n-queue", kind: "nav", label: "Open Downloads Monitor", shortcut: "Q", icon: <Download className="w-4 h-4 text-[#F997C6]" />, run: () => setDrawer(true) },
    ];
    const modes: Cmd[] = CATALOG_MODES.map((c) => ({
      id: `m-${c.key}`,
      kind: "mode",
      label: `Switch to ${c.label}`,
      hint: `${c.count} providers`,
      icon: <Layers className="w-4 h-4 text-[#EC69AE]" />,
      run: () => { setMode(c.key as CatalogMode); setMainTool("search"); goto("catalog"); },
    }));
    const titles: Cmd[] = TRENDING_MEDIA.slice(0, 12).map((t) => ({
      id: `t-${t.id}`,
      kind: "title",
      label: `${t.title} (${t.year})`,
      hint: `${t.quality} • ${t.provider}`,
      icon: <Film className="w-4 h-4 text-[#B3B7C1]" />,
      run: () => {
        const isMagnet = !!t.streamUrl?.startsWith("magnet:");
        setMode("adult");
        setMainTool("search");
        setQuery(t.title);
        setPlayer({ open: true, title: t.title, url: t.streamUrl || t.providerUrl, isMagnet, tmdbId: t.tmdbId, imdbId: t.imdbId, type: t.type });
      },
    }));
    const providers: Cmd[] = PROVIDERS.slice(0, 12).map((p) => ({
      id: `p-${p.name}`,
      kind: "provider",
      label: p.name,
      hint: p.domain,
      icon: <Link2 className="w-4 h-4 text-[#F997C6]" />,
      run: () => { window.open(p.url, "_blank"); },
    }));
    return [...nav, ...modes, ...titles, ...providers];
  }, [setMainTool, setMode, setQuery, setPlayer, setDrawer]);

  const q = input.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return commands;
    return commands.filter((c) => (c.label + " " + (c.hint || "")).toLowerCase().includes(q));
  }, [q, commands]);

  // ESC closes; ⌘K toggles
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); const r = results[active]; if (r) { r.run(); close(); } }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active]);

  useEffect(() => {
    if (open) {
      setInput("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => { setActive((a) => Math.min(a, Math.max(0, results.length - 1))); }, [results.length]);

  if (!open) return null;

  // group results
  const groups: Array<{ kind: CmdKind; label: string; items: Cmd[] }> = [
    { kind: "nav" as CmdKind, label: "Navigation", items: results.filter((r) => r.kind === "nav") },
    { kind: "mode" as CmdKind, label: "Modes", items: results.filter((r) => r.kind === "mode") },
    { kind: "title" as CmdKind, label: "Titles", items: results.filter((r) => r.kind === "title") },
    { kind: "provider" as CmdKind, label: "Providers", items: results.filter((r) => r.kind === "provider") },
  ].filter((g) => g.items.length > 0);

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-[#0B0E15]/90 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-[#202530] border border-[#4D5566] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in flex flex-col">
        {/* Input */}
        <div className="relative flex items-center border-b border-[#323947] p-3">
          <Search className="w-4 h-4 text-[#EC69AE] ml-1 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command or search catalogs..."
            className="w-full bg-transparent border-0 text-white placeholder:text-[#878C97] focus:outline-none text-sm font-semibold"
          />
          <kbd className="px-2 py-0.5 rounded bg-[#151922] border border-[#323947] text-[10px] font-mono text-[#878C97]">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto scrollbar-thin p-2">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#878C97]">
              No matches for &quot;{input}&quot;. Try a movie, anime, or provider name.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.kind} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#878C97]">{g.label}</div>
                {g.items.map((c) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => { c.run(); close(); }}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-lg text-left spring-transition",
                        active === idx ? "bg-[#2A303D]" : "hover:bg-[#2A303D]/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.icon}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#F8FAFC] truncate">{c.label}</div>
                          {c.hint && <div className="text-[10px] font-mono text-[#878C97] truncate">{c.hint}</div>}
                        </div>
                      </div>
                      {c.shortcut && (
                        <span className="text-[10px] font-mono text-[#878C97] bg-[#151922] border border-[#323947] px-1.5 py-0.5 rounded shrink-0">
                          {c.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#151922] border-t border-[#323947] flex items-center justify-between text-[11px] text-[#878C97]">
          <span className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3 h-3" />
            <span>Navigate</span>
            <CornerDownLeft className="w-3 h-3 ml-2" />
            <span>Select</span>
          </span>
          <span>Press <code className="text-[#F8FAFC] font-mono">ESC</code> to exit</span>
        </div>
      </div>
    </div>
  );
}
