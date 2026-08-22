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
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131A26] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30">
          <span className="text-xl">🔞</span>
        </div>
        <h2 className="text-lg font-extrabold text-[#F8FAFC]">Adults only — 18+</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          CornCine indexes adult material (JAV, hentai, tubes, OnlyFans leaks). You must be 18 or older and consent to viewing adult content where legal.
        </p>
        <p className="mt-3 text-xs text-[#64748B]">
          By entering you confirm you are 18+ and have read our <Link href="/sites/pornhub.com" className="underline hover:text-[#94A3B8]">terms</Link>. No accounts, no tracking.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={leave} className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-[#F8FAFC] hover:bg-white/10">
            Leave
          </button>
          <button onClick={accept} className="rounded-xl bg-[#EF4444] py-2.5 text-sm font-bold text-white hover:bg-red-600">
            I am 18+ — Enter
          </button>
        </div>
        <p className="mt-3 text-[10px] font-mono text-[#475569]">CornCine — 21+ adult providers. 18+ only.</p>
      </div>
    </div>
  );
}
