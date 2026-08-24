import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — CornCine",
  description: "Terms of Service for CornCine.",
  alternates: { canonical: "/terms-of-service" },
  robots: { index: true, follow: true },
};

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Acceptance of Terms",
    p: [
      "By accessing or using CornCine (the \"Service\"), you confirm that you are at least 18 years of age (or the age of legal majority in your jurisdiction, whichever is higher) and that you accept these Terms of Service. If you do not agree, you must discontinue use immediately.",
    ],
  },
  {
    h: "2. Nature of the Service",
    p: [
      "CornCine is a search and index aggregator. It does not host, upload, produce, or store any media files. All content referenced by the Service resides on independent third-party websites over which CornCine has no control and assumes no responsibility.",
    ],
  },
  {
    h: "3. Adult Content",
    p: [
      "The Service indexes adult material intended solely for consenting adults. By using the Service you represent that viewing such material is legal in your jurisdiction and that you are doing so of your own volition.",
    ],
  },
  {
    h: "4. Acceptable Use",
    p: [
      "You agree not to use the Service for any unlawful purpose, not to attempt to circumvent security or rate limits, not to resell or commercialize access to the Service, and not to use automated systems to scrape or burden the Service without prior written consent.",
    ],
  },
  {
    h: "5. Copyright & Takedown",
    p: [
      "CornCine respects the rights of copyright holders. Valid takedown requests are processed per our DMCA policy, typically within 48 hours.",
    ],
  },
  {
    h: "6. No Warranties; Limitation of Liability",
    p: [
      "The Service is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, CornCine and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of, or reliance on, the Service or any third-party content it references.",
    ],
  },
  {
    h: "7. Changes",
    p: [
      "These Terms may be updated at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold">Terms of Service</h1>
        {SECTIONS.map((s) => (
          <div key={s.h} className="rounded-2xl border border-white/10 bg-[#131A26] p-6 space-y-3 text-sm leading-relaxed text-[#CBD5E1]">
            <h2 className="text-lg font-bold text-[#F8FAFC]">{s.h}</h2>
            {s.p.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        ))}
        <p className="text-xs text-[#64748B]">Last updated: August 2026</p>
      </div>
    </main>
  );
}
