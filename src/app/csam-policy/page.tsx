import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CSAM Policy — CornCine",
  description: "Child Sexual Abuse Material (CSAM) Policy and reporting for CornCine.",
  alternates: { canonical: "/csam-policy" },
  robots: { index: true, follow: true },
};

export default function CsamPage() {
  return (
    <main className="min-h-screen bg-[#0B0E15] text-[#F8FAFC] px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold">CSAM Policy — Zero Tolerance</h1>
        <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6 space-y-4 text-sm leading-relaxed text-[#FCA5A5]">
          <p className="font-bold text-[#F87171]">This site has a strict zero-tolerance policy regarding Child Sexual Abuse Material (CSAM).</p>
          <p>We forbid any content, depiction, or description involving minors (persons under 18 years of age) in a sexual context — whether real, fictional, illustrated, or simulated.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-4 text-sm leading-relaxed text-[#B3B7C1]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">What is Prohibited</h2>
          <ul className="list-disc list-inside space-y-1 text-[#B3B7C1]">
            <li>Any visual or textual depiction of a minor in a sexual context</li>
            <li>Content that sexualizes, grooms, or exploits minors</li>
            <li>Links, search terms, or tags that reference minors sexually</li>
            <li>AI-generated or illustrated content depicting minors sexually</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-4 text-sm leading-relaxed text-[#B3B7C1]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Reporting</h2>
          <p>If you encounter any content that you believe violates this policy:</p>
          <ul className="list-disc list-inside space-y-1 text-[#B3B7C1]">
            <li>Email: <a href="mailto:name-roman-aviator@duck.com" className="text-[#EC69AE] underline">name-roman-aviator@duck.com</a> (subject: "CSAM Report")</li>
            <li>US: National Center for Missing & Exploited Children (NCMEC) — CyberTipline: https://report.cybertip.org</li>
            <li>EU: INHOPE network — https://inhope.org</li>
            <li>UK: Internet Watch Foundation — https://www.iwf.org.uk</li>
          </ul>
          <p>Reports are reviewed within 24 hours. Confirmed violations result in immediate removal and, where required, reporting to law enforcement. We cooperate fully with law enforcement investigations.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 text-sm leading-relaxed text-[#B3B7C1]">
          <p className="text-xs text-[#878C97]">All performers depicted in adult material referenced by CornCine are represented by the original producers as being 18 years of age or older at the time of creation. See our <a href="/2257" className="text-[#EC69AE] underline">2257 Compliance Statement</a>.</p>
        </div>
        <p className="text-xs text-[#878C97]">Last updated: August 2026</p>
      </div>
    </main>
  );
}
