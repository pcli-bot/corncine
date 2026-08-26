import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — CornCine",
  description: "Privacy Policy for CornCine.",
  alternates: { canonical: "/privacy-policy" },
  robots: { index: true, follow: true },
};

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Minimal Data Collection",
    p: [
      "CornCine is designed to work without accounts and without personal data. We do not require registration and do not collect names, emails, or payment details from visitors. Preferences (such as age confirmation and favorites) are stored locally in your own browser and never transmitted to us.",
    ],
  },
  {
    h: "2. Automatic Technical Data",
    p: [
      "Like nearly all websites, our hosting provider may process standard server logs (IP address, user agent, requested URL, timestamp) for security, rate limiting, and abuse prevention. These logs are retained for a short period by the host and are not used to build profiles.",
    ],
  },
  {
    h: "3. Third-Party Advertising",
    p: [
      "CornCine may display advertisements served by third-party ad networks. These networks may use cookies or similar technologies subject to their own privacy policies. You can opt out of many ad cookies via your browser settings or industry opt-out tools. We do not share any data we do not possess — because we do not possess personal data.",
    ],
  },
  {
    h: "4. Third-Party Content",
    p: [
      "The Service references third-party websites. Once you leave CornCine (or load embedded content), the receiving site's own privacy policy applies. We encourage you to review the policies of any third-party site you visit.",
    ],
  },
  {
    h: "5. Your Rights",
    p: [
      "Since we do not maintain user databases, there is generally no personal data for us to export or delete. For any privacy question, contact name-roman-aviator@duck.com and we will respond within 30 days.",
    ],
  },
  {
    h: "6. Changes",
    p: [
      "This policy may be updated to reflect changes in the Service or applicable law. The \"last updated\" date below will always reflect the current version.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0B0E15] text-[#F8FAFC] px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold">Privacy Policy</h1>
        {SECTIONS.map((s) => (
          <div key={s.h} className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-3 text-sm leading-relaxed text-[#B3B7C1]">
            <h2 className="text-lg font-bold text-[#F8FAFC]">{s.h}</h2>
            {s.p.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        ))}
        <p className="text-xs text-[#878C97]">Last updated: August 2026</p>
      </div>
    </main>
  );
}
