"use client";

import { useState } from "react";
import { Copy, Check, Terminal, Cpu, Gauge, Radio, Shield } from "lucide-react";
import { DESKTOP_FEATURES, INSTALL_PACKAGES } from "@/lib/anicine-data";
import { showToast } from "@/lib/anicine-toast";
import { cn } from "@/lib/utils";

const INSTALL_CMD = "git clone https://github.com/pcli-bot/pcli.git && cd pcli/pcli-rs && cargo build --release";

const toneMap: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  emerald: { text: "text-[#6AB27A]", bg: "bg-[#6AB27A]/10", border: "border-[#6AB27A]/30", dot: "bg-[#6AB27A]" },
  blue: { text: "text-[#EC69AE]", bg: "bg-[#EC69AE]/10", border: "border-[#EC69AE]/30", dot: "bg-[#EC69AE]" },
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
    <section id="desktop-apps" className="border-t border-[#323947] bg-[#151922]/40 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* CRITICAL: this grid + its children are properly closed. The original
            static site forgot to close these tags, which caused everything
            after this point to render inside the right column. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* LEFT: install info */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#202530] border border-[#323947]">
              <span className="w-2 h-2 rounded-full bg-[#EC69AE]" />
              <span className="text-xs font-medium text-[#B3B7C1]">Native Terminal Client</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight">
              Compile local or run client binaries.
            </h2>
            <p className="text-sm text-[#B3B7C1] leading-relaxed">
              CornCine ships a blazing-fast Command Line Interface and a hardware-accelerated GUI
              client for multithreaded downloads and automated media extraction. Zero telemetry,
              zero daemons — just one Rust binary.
            </p>

            {/* Terminal */}
            <div className="bg-[#0B0E15] border border-[#4D5566] rounded-xl p-4 font-mono text-xs text-[#F8FAFC] relative overflow-hidden">
              <div className="flex items-center justify-between mb-2 text-[#949AA5] border-b border-[#323947]/60 pb-2">
                <span className="text-xs font-semibold text-[#B3B7C1] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> INSTALL FROM SOURCE
                </span>
                <span className="text-[10px]">Rust / Cargo</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <code className="text-[#6AB27A] break-all font-mono">{INSTALL_CMD}</code>
                <button
                  onClick={copy}
                  className="px-2.5 py-1 rounded bg-[#202530] border border-[#323947] text-xs font-medium text-[#B3B7C1] hover:text-[#F8FAFC] spring-transition active:scale-95 shrink-0 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-[#6AB27A]" /> : <Copy className="w-3 h-3" />}
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
                  className="p-3 rounded-lg bg-[#202530] border border-[#323947] hover:border-[#4D5566] text-center spring-transition group"
                >
                  <div className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#EC69AE]">{pkg.os}</div>
                  <div className="text-[10px] font-mono text-[#949AA5]">{pkg.ext}</div>
                </a>
              ))}
            </div>
          </div>

          {/* RIGHT: feature panel — properly self-contained */}
          <div className="bg-[#202530] border border-[#323947] rounded-xl p-6 flex flex-col gap-4 self-stretch">
            <div className="flex items-center justify-between border-b border-[#323947] pb-3">
              <span className="text-xs font-semibold text-[#B3B7C1]">Core Features</span>
              <span className="text-xs font-mono text-[#6AB27A]">Active</span>
            </div>
            <div className="space-y-2.5">
              {DESKTOP_FEATURES.map((f) => {
                const t = toneMap[f.tone];
                return (
                  <div key={f.label} className="flex items-center justify-between p-2.5 rounded-lg bg-[#151922] border border-[#323947]">
                    <span className="text-xs font-medium text-[#F8FAFC] flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full", t.dot)} />
                      {f.label}
                    </span>
                    <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border", t.bg, t.border, t.text)}>{f.status}</span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#323947]">
              <Metric icon={<Cpu className="w-3.5 h-3.5" />} label="CPU" value="2%" />
              <Metric icon={<Gauge className="w-3.5 h-3.5" />} label="Throughput" value="48 MB/s" />
              <Metric icon={<Radio className="w-3.5 h-3.5" />} label="Peers" value="1,204" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#323947] text-[11px] text-[#949AA5]">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#6AB27A]" /> Ad-block filter engine active</span>
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
    <div className="rounded-lg bg-[#151922] border border-[#323947] p-2 text-center">
      <div className="flex items-center justify-center text-[#949AA5] mb-1">{icon}</div>
      <div className="text-[10px] text-[#949AA5] font-mono uppercase tracking-wider">{label}</div>
      <div className="text-xs font-bold text-[#F8FAFC] font-mono">{value}</div>
    </div>
  );
}
