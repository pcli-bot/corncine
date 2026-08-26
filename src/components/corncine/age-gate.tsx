"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ok = localStorage.getItem("corncine_age_ok");
    if (ok !== "1") setOpen(true);
  }, []);

  if (!open) return null;

  const accept = () => {
    localStorage.setItem("corncine_age_ok", "1");
    setOpen(false);
  };

  const leave = () => {
    window.location.href = "https://www.google.com/";
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151922] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30">
          <span className="text-xl">🔞</span>
        </div>
        <h2 className="text-lg font-extrabold text-[#F8FAFC]">Adults only — 18+</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#B3B7C1]">
          CornCine indexes adult material (JAV, hentai, tubes, OnlyFans leaks). You must be 18 or older and consent to viewing adult content where legal.
        </p>
        <p className="mt-3 text-xs text-[#878C97]">
          By entering you confirm you are 18+ and have read our <Link href="/sites/pornhub.com" className="underline hover:text-[#B3B7C1]">terms</Link>. No accounts, no tracking.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={leave} className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-[#F8FAFC] hover:bg-white/10">
            Leave
          </button>
          {/* The affirmative action carries the brand accent, not the
              destructive red this used to use: red reads as "danger/stop",
              which is the opposite of the button's meaning, and white on
              #EF4444 measured 3.76:1 -- under the 4.5 AA floor. Magenta with
              an ink label measures 6.62:1. The red stays on the warning
              badge above, where it belongs. */}
          <button onClick={accept} className="rounded-xl bg-[#EC69AE] py-2.5 text-sm font-bold text-[#0B0E15] hover:bg-[#F997C6]">
            I am 18+ — Enter
          </button>
        </div>
        <p className="mt-3 text-[10px] font-mono text-[#878C97]">CornCine — 21+ adult providers. 18+ only.</p>
      </div>
    </div>
  );
}
