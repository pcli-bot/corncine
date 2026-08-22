"use client";

import { useState } from "react";
import { Copy, Check, Terminal, Cpu, Gauge, Radio, Shield } from "lucide-react";
import { DESKTOP_FEATURES, INSTALL_PACKAGES } from "@/lib/anicine-data";
import { showToast } from "@/lib/anicine-toast";
import { cn } from "@/lib/utils";

const INSTALL_CMD = "git clone https://github.com/pcli-bot/pcli.git && cd pcli/pcli-rs && cargo build --release";

const toneMap: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  emerald: { text: "text-[#10B981]", bg: "bg-[#10B981]/10", border: "border-[#10B981]/30", dot: "bg-[#10B981]" },
  blue: { text: "text-[#3B82F6]", bg: "bg-[#3B82F6]/10", border: "border-[#3B82F6]/30", dot: "bg-[#3B82F6]" },
  amber: { text: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/30", dot: "bg-[#F59E0B]" },
};

export function DesktopApps() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      showToast("Install command copied", "success");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Clipboard blocked", "error");
    }
  };

  return (
    <section id="desktop-apps" className="border-t border-[#1E2A3C] bg-[#131A26]/40 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* CRITICAL: this grid + its children are properly closed. The original
            static site forgot to close these tags, which caused everything
            after this point to render inside the right column. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* LEFT: install info */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1B2433] border border-[#1E2A3C]">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span className="text-xs font-medium text-[#94A3B8]">Native Terminal Client</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Compile local or run client binaries.
            </h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              CornCine ships a blazing-fast Command Line Interface and a hardware-accelerated GUI
              client for multithreaded downloads and automated media extraction. Zero telemetry,
              zero daemons — just one Rust binary.
            </p>

            {/* Terminal */}
            <div className="bg-[#0B0F17] border border-[#2D3D54] rounded-xl p-4 font-mono text-xs text-[#F8FAFC] relative overflow-hidden">
              <div className="flex items-center justify-between mb-2 text-[#64748B] border-b border-[#1E2A3C]/60 pb-2">
                <span className="text-xs font-semibold text-[#94A3B8] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> INSTALL FROM SOURCE
                </span>
                <span className="text-[10px]">Rust / Cargo</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <code className="text-[#10B981] break-all font-mono">{INSTALL_CMD}</code>
                <button
                  onClick={copy}
                  className="px-2.5 py-1 rounded bg-[#1B2433] border border-[#1E2A3C] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] spring-transition active:scale-95 shrink-0 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Download packages */}
            <div className="grid grid-cols-3 gap-3">
              {INSTALL_PACKAGES.map((pkg) => (
                <a
                  key={pkg.os}
                  href="https://github.com/pcli-bot/pcli/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-lg bg-[#1B2433] border border-[#1E2A3C] hover:border-[#2D3D54] text-center spring-transition group"
                >
                  <div className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#3B82F6]">{pkg.os}</div>
                  <div className="text-[10px] font-mono text-[#64748B]">{pkg.ext}</div>
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT: feature panel — properly self-contained */}
          <div className="bg-[#1B2433] border border-[#1E2A3C] rounded-xl p-6 flex flex-col gap-4 self-stretch">
            <div className="flex items-center justify-between border-b border-[#1E2A3C] pb-3">
              <span className="text-xs font-semibold text-[#94A3B8]">Core Features</span>
              <span className="text-xs font-mono text-[#10B981]">Active</span>
            </div>
            <div className="space-y-2.5">
              {DESKTOP_FEATURES.map((f) => {
                const t = toneMap[f.tone];
                return (
                  <div key={f.label} className="flex items-center justify-between p-2.5 rounded-lg bg-[#131A26] border border-[#1E2A3C]">
                    <span className="text-xs font-medium text-[#F8FAFC] flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full", t.dot)} />
                      {f.label}
                    </span>
                    <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border", t.bg, t.border, t.text)}>{f.status}</span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E2A3C]">
              <Metric icon={<Cpu className="w-3.5 h-3.5" />} label="CPU" value="2%" />
              <Metric icon={<Gauge className="w-3.5 h-3.5" />} label="Throughput" value="48 MB/s" />
              <Metric icon={<Radio className="w-3.5 h-3.5" />} label="Peers" value="1,204" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1E2A3C] text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#10B981]" /> Ad-block filter engine active</span>
              <span className="font-mono">PID 7421</span>
            </div>
          </div>
        </div>
        {/* end grid */}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#131A26] border border-[#1E2A3C] p-2 text-center">
      <div className="flex items-center justify-center text-[#64748B] mb-1">{icon}</div>
      <div className="text-[10px] text-[#64748B] font-mono uppercase tracking-wider">{label}</div>
      <div className="text-xs font-bold text-[#F8FAFC] font-mono">{value}</div>
    </div>
  );
}
