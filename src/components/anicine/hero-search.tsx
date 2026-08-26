"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { Search, Link2, ClipboardPaste, Play, Download, ShieldCheck, Sparkles } from "lucide-react";
import { useAnicineStore } from "@/lib/anicine-store";
import { TOPICS, detectLink, type LinkDetection } from "@/lib/anicine-data";
import { showToast } from "@/lib/anicine-toast";
import { cn } from "@/lib/utils";

export function HeroSearch() {
  const mainTool = useAnicineStore((s) => s.mainTool);
  const setMainTool = useAnicineStore((s) => s.setMainTool);
  const query = useAnicineStore((s) => s.query);
  const setQuery = useAnicineStore((s) => s.setQuery);
  const setMode = useAnicineStore((s) => s.setMode);

  // Local input mirrors the shared query (debounced upstream by CatalogBrowser)
  const [input, setInput] = useState(query);
  useEffect(() => { setInput(query); }, [query]);

  // Sync input → store on every keystroke
  const onInput = (v: string) => {
    setInput(v);
    setQuery(v);
  };

  const triggerSearch = () => {
    setQuery(input);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const onTopic = (q: string, mode: import("@/lib/anicine-data").ModeKey) => {
    setMode(mode);
    setQuery(q);
    setMainTool("search");
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative anicine-grid-bg border-b border-[#323947] overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full bg-[#EC69AE]/10 blur-3xl" />
      <div className="pointer-events-none absolute top-40 right-10 w-72 h-72 rounded-full bg-[#F997C6]/10 blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151922] border border-[#323947] mb-5 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6AB27A] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6AB27A]" />
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#B3B7C1] uppercase tracking-wider">
            21+ adult providers indexed • ad-free • 18+
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F8FAFC] leading-[1.1] mb-3 animate-fade-in">
          Stream and download{" "}
          <span className="bg-gradient-to-r from-[#F997C6] via-[#EC69AE] to-[#DB3E98] bg-clip-text text-transparent">
            adult content.
          </span>
        </h1>
        <p className="text-sm sm:text-base text-[#B3B7C1] max-w-xl mx-auto mb-7 font-normal leading-relaxed">
          Index JAV (MissAV, JAVGuru), hentai (Hanime, Nhentai), 4K tubes (Pornhub, Eporner) and OnlyFans leaks (Kemono/Coomer) — one clean command center.
        </p>

        {/* Tool switcher */}
        <div className="inline-flex p-1 rounded-xl bg-[#151922] border border-[#323947] mb-6">
          <button
            onClick={() => setMainTool("search")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold spring-transition flex items-center gap-2",
              mainTool === "search" ? "bg-[#EC69AE] text-[#0B0E15] shadow-md shadow-blue-500/20" : "text-[#B3B7C1] hover:text-[#F8FAFC]"
            )}
          >
            <Search className="w-4 h-4" />
            <span>Search Catalogs</span>
          </button>
          <button
            onClick={() => setMainTool("downloader")}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold spring-transition flex items-center gap-2",
              mainTool === "downloader" ? "bg-[#EC69AE] text-[#0B0E15] shadow-md shadow-blue-500/20" : "text-[#B3B7C1] hover:text-[#F8FAFC]"
            )}
          >
            <Link2 className="w-4 h-4" />
            <span>Link Downloader</span>
          </button>
        </div>

        {mainTool === "search" ? (
          <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
            {/* Search input */}
            <div className="relative bg-[#151922] rounded-xl p-1.5 border border-[#4D5566] shadow-xl focus-within:ring-2 focus-within:ring-[#EC69AE]/40 focus-within:border-[#EC69AE] spring-transition">
              <div className="flex items-center">
                <div className="pl-3 text-[#949AA5]">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => onInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && triggerSearch()}
                  placeholder="Search JAV, hentai, tubes, creators, 4K releases..."
                  className="w-full bg-transparent border-0 px-3 py-3 text-white font-semibold text-sm sm:text-base placeholder:text-[#949AA5] focus:outline-none focus:ring-0"
                />
                <button
                  onClick={triggerSearch}
                  className="px-5 py-2.5 sm:py-3 rounded-lg bg-[#EC69AE] text-[#0B0E15] font-semibold text-sm hover:bg-blue-600 active:scale-95 spring-transition shrink-0"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Topic pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
              <span className="text-xs font-medium text-[#949AA5] mr-1">Topics:</span>
              {TOPICS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => onTopic(t.query, t.mode)}
                  className="px-3 py-1 rounded-full bg-[#202530] border border-[#323947] text-[#B3B7C1] hover:text-white hover:border-[#EC69AE] hover:bg-[#EC69AE]/15 font-medium spring-transition"
                >
                  <span className="mr-1">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <LinkDownloader />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Link Downloader panel (shown when mainTool === "downloader")
// ---------------------------------------------------------------------------
function LinkDownloader() {
  const [url, setUrl] = useState("");
  const [detection, setDetection] = useState<LinkDetection | null>(null);
  const [format, setFormat] = useState<"video" | "audio" | "lossless">("video");
  const [quality, setQuality] = useState("1080p");
  const [engine, setEngine] = useState("aria2c");
  const [busy, setBusy] = useState(false);

  const addTask = useAnicineStore((s) => s.addTask);
  const setDrawer = useAnicineStore((s) => s.setDrawer);

  // Live link inspection (client-side heuristics; no network needed)
  useEffect(() => {
    if (!url.trim()) { setDetection(null); return; }
    const t = setTimeout(() => setDetection(detectLink(url)), 180);
    return () => clearTimeout(t);
  }, [url]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { setUrl(text); showToast("Pasted from clipboard", "success"); }
      else showToast("Clipboard is empty", "info");
    } catch {
      showToast("Clipboard access blocked by browser", "error");
    }
  };

  const startDownload = useCallback(async () => {
    if (!url.trim()) { showToast("Paste a link first", "error"); return; }
    if (detection?.kind === "unknown") { showToast("Unrecognized link format", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title: detection?.platform ? `${detection.platform} stream` : "Direct stream", source: detection?.platform || "Direct", format, quality, engine }),
      });
      const data = await res.json();
      if (!data?.ok) { showToast(data?.error || "Download failed", "error"); return; }
      addTask({ url, title: data.title, source: data.source, format: data.format, quality: data.quality, size: data.size, jobId: data.id });
      showToast("Added to download queue", "success");
      setDrawer(true);
    } catch {
      showToast("Network error — retry", "error");
    } finally {
      setBusy(false);
    }
  }, [url, detection, format, quality, engine, addTask, setDrawer]);

  const playStream = () => {
    if (!url.trim()) { showToast("Paste a link first", "error"); return; }
    const player = useAnicineStore.getState().setPlayer;
    player({ open: true, title: detection?.platform || "Direct Stream", url, isMagnet: detection?.kind === "magnet" });
  };

  return (
    <div className="max-w-3xl mx-auto text-left animate-fade-in">
      <div className="bg-[#151922] rounded-xl p-5 border border-[#4D5566] shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#323947] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6AB27A] animate-pulse-soft" />
            <h3 className="text-sm sm:text-base font-semibold text-white">Universal Link & Magnet Extractor</h3>
          </div>
          <span className="text-[11px] font-mono text-[#B3B7C1] bg-[#202530] px-2 py-0.5 rounded border border-[#323947]">
            Auto-Detection
          </span>
        </div>

        {/* Paste input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#B3B7C1]">Target Link or Magnet URI</label>
            <span className={cn(
              "text-[10px] font-mono font-medium px-2 py-0.5 rounded border",
              detection && detection.kind !== "unknown"
                ? "bg-[#6AB27A]/10 border-[#6AB27A]/30 text-[#6AB27A]"
                : "bg-[#202530] border-[#323947] text-[#949AA5]"
            )}>
              {detection && detection.kind !== "unknown" ? detection.platform : "Awaiting link..."}
            </span>
          </div>
          <div className="flex items-center bg-[#202530] rounded-lg border border-[#4D5566] focus-within:border-[#EC69AE] p-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube, BitTorrent Magnet, TikTok, Twitter/X, Reddit, or MP4 URL..."
              className="w-full bg-transparent border-0 px-3 py-2.5 text-white font-semibold text-xs sm:text-sm placeholder:text-[#949AA5] focus:outline-none"
            />
            <button
              onClick={paste}
              className="px-3 py-1.5 rounded bg-[#2A303D] hover:bg-[#4D5566] border border-[#323947] text-xs font-medium text-[#B3B7C1] hover:text-white spring-transition shrink-0 flex items-center gap-1.5"
            >
              <ClipboardPaste className="w-3.5 h-3.5" /> Paste
            </button>
          </div>

          {/* Inspector card */}
          {detection && detection.kind !== "unknown" && (
            <div className="p-2.5 rounded-lg bg-[#0B0E15] border border-[#323947] text-xs font-mono flex items-center justify-between spring-transition animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-sm">{detection.icon}</span>
                <span className="text-[#EC69AE] font-semibold">{detection.platform}</span>
                <span className="text-[#949AA5]">•</span>
                <span className="text-[#B3B7C1]">{detection.type}</span>
              </div>
              <span className="text-[10px] text-[#6AB27A] font-semibold bg-[#6AB27A]/10 px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Ready
              </span>
            </div>
          )}
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#949AA5]">Download Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="w-full bg-[#202530] border border-[#323947] rounded-lg px-2.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-[#EC69AE]">
              <option value="video">Full Video (MP4 / MKV)</option>
              <option value="audio">Audio Only (MP3 320kbps)</option>
              <option value="lossless">Lossless Audio (FLAC)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#949AA5]">Quality Target</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full bg-[#202530] border border-[#323947] rounded-lg px-2.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-[#EC69AE]">
              <option value="1080p">1080p Full HD</option>
              <option value="4k">4K Ultra HD (2160p)</option>
              <option value="720p">720p HD</option>
              <option value="480p">480p SD</option>
              <option value="best">Best Available</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-[#949AA5]">Download Engine</label>
            <select value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full bg-[#202530] border border-[#323947] rounded-lg px-2.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-[#EC69AE]">
              <option value="aria2c">Multi-Thread (aria2c)</option>
              <option value="webtorrent">BitTorrent Swarm</option>
              <option value="browser">Browser Native</option>
            </select>
          </div>
        </div>

        {/* Action row */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#323947]">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#949AA5]">
            <span className="font-medium">Supported:</span>
            <span className="text-[#B3B7C1]">YouTube</span>•
            <span className="text-[#B3B7C1]">Magnets</span>•
            <span className="text-[#B3B7C1]">TikTok</span>•
            <span className="text-[#B3B7C1]">Twitter/X</span>•
            <span className="text-[#B3B7C1]">MP4</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={playStream}
              className="w-1/2 sm:w-auto px-4 py-2 rounded-lg bg-[#202530] hover:bg-[#2A303D] border border-[#323947] text-[#F8FAFC] font-semibold text-xs spring-transition flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Play Stream
            </button>
            <button
              onClick={startDownload}
              disabled={busy}
              className="w-1/2 sm:w-auto px-5 py-2 rounded-lg bg-[#EC69AE] text-[#0B0E15] font-semibold text-xs hover:bg-blue-600 active:scale-95 spring-transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-60"
            >
              {busy ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{busy ? "Queuing..." : "Download Now"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
