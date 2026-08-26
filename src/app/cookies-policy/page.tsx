import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies Policy — CornCine",
  description: "Cookies and similar technologies used by CornCine.",
  alternates: { canonical: "/cookies-policy" },
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#0B0E15] text-[#F8FAFC] px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold">Cookies Policy</h1>
        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-4 text-sm leading-relaxed text-[#B3B7C1]">
          <p>CornCine uses cookies and similar technologies to provide core functionality, remember preferences (such as age confirmation), and, where advertising is displayed, to measure and personalize ads via third-party ad networks.</p>
          <h2 className="text-lg font-bold text-[#F8FAFC]">Types of Cookies</h2>
          <ul className="list-disc list-inside space-y-1 text-[#B3B7C1]">
            <li><strong className="text-[#F8FAFC]">Essential cookies</strong> — required for the site to function (e.g., age gate). Cannot be disabled.</li>
            <li><strong className="text-[#F8FAFC]">Preference cookies</strong> — store your choices locally (e.g., theme, favorites via localStorage).</li>
            <li><strong className="text-[#F8FAFC]">Advertising cookies</strong> — set by third-party ad networks (e.g., TrafficStars, ExoClick) to serve relevant ads and limit frequency. Subject to the respective network&apos;s privacy policy.</li>
            <li><strong className="text-[#F8FAFC]">Analytics cookies</strong> — if used, to understand aggregated usage (page views, referrer). No personal data is collected by CornCine directly.</li>
          </ul>
          <h2 className="text-lg font-bold text-[#F8FAFC]">Your Choices</h2>
          <p>You can control or delete cookies through your browser settings (Chrome: Settings → Privacy → Cookies; Firefox: Settings → Privacy & Security; Safari: Preferences → Privacy). Blocking essential cookies may affect site functionality. To opt out of interest-based advertising, visit <a href="https://www.youronlinechoices.eu" className="text-[#EC69AE] underline">youronlinechoices.eu</a> or <a href="https://optout.aboutads.info" className="text-[#EC69AE] underline">aboutads.info</a>.</p>
          <p>For questions about cookies, contact <a href="/privacy-policy" className="text-[#EC69AE] underline">Privacy Policy</a>.</p>
        </div>
        <p className="text-xs text-[#878C97]">Last updated: August 2026</p>
      </div>
    </main>
  );
}
