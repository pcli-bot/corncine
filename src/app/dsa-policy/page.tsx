import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DSA Policy — CornCine",
  description: "Digital Services Act (DSA) transparency and contact for CornCine.",
  alternates: { canonical: "/dsa-policy" },
  robots: { index: true, follow: true },
};

export default function DsaPage() {
  return (
    <main className="min-h-screen bg-[#0B0E15] text-[#F8FAFC] px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold">Digital Services Act (DSA) Information</h1>
        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-4 text-sm leading-relaxed text-[#B3B7C1]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">EU Contact Point</h2>
          <p>In accordance with the EU Digital Services Act (Regulation (EU) 2022/2065), the contact point for communications with EU Member State authorities, the European Commission, and the European Board for Digital Services is:</p>
          <div className="rounded-xl bg-[#0B0E15] border border-white/10 p-4 font-mono text-xs text-[#B3B7C1]">
            <p>Email: <a href="mailto:name-roman-aviator@duck.com" className="text-[#EC69AE] underline">name-roman-aviator@duck.com</a></p>
            <p className="mt-1">Languages: English</p>
            <p className="mt-1">Response time: within 48 hours</p>
          </div>
          <p className="text-xs text-[#949AA5]">This contact point is for authorities and does not handle general user support or copyright reports — please use the DMCA contact for copyright matters.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-4 text-sm leading-relaxed text-[#B3B7C1]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Transparency</h2>
          <p>CornCine is a search and index aggregator. It does not host media files. Content moderation consists of:</p>
          <ul className="list-disc list-inside space-y-1 text-[#B3B7C1]">
            <li>Automated filtering of search inputs for illegal terms</li>
            <li>Manual review of reports submitted via DMCA / CSAM contacts</li>
            <li>Removal or delisting of reported content within 48 hours of a valid notice</li>
          </ul>
          <p className="text-xs text-[#949AA5]">Annual transparency reports will be published here if required by applicable law.</p>
        </div>
        <p className="text-xs text-[#949AA5]">Last updated: August 2026</p>
      </div>
    </main>
  );
}
