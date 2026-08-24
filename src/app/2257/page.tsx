import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "18 U.S.C. § 2257 Compliance Statement — CornCine",
  description: "18 U.S.C. 2257 Record-Keeping Requirements Compliance Statement for CornCine.",
  alternates: { canonical: "/2257" },
  robots: { index: true, follow: true },
};

export default function CompliancePage() {
  return (
    <main className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold">18 U.S.C. § 2257 Record-Keeping Requirements Compliance Statement</h1>

        <div className="rounded-2xl border border-white/10 bg-[#131A26] p-6 space-y-4 text-sm leading-relaxed text-[#CBD5E1]">
          <p className="font-semibold text-[#F8FAFC]">
            All models, actors, actresses and other persons that appear in any visual portrayal of
            actual or simulated sexually explicit conduct appearing on or otherwise contained in
            this website were over the age of eighteen (18) years at the time the visual imagery was
            created.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131A26] p-6 space-y-4 text-sm leading-relaxed text-[#CBD5E1]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Producer &amp; Records</h2>
          <p>
            CornCine is <strong>not</strong> a &ldquo;producer&rdquo; (primary or secondary) of any
            content found on this website as defined in 18 U.S.C. § 2257 and 28 C.F.R. § 75.
          </p>
          <p>
            With respect to all visual media displayed on or referenced by this website, whether of
            actual sexually explicit conduct, simulated sexual content, or otherwise, all persons
            were at least 18 years of age when said visual media was created. All records required
            by 18 U.S.C. § 2257 and 28 C.F.R. § 75 are kept by the respective <strong>producers of
            the content</strong>. CornCine is an index/search aggregator that references
            third-party websites; it does not produce, host, or own the depicted media, and
            therefore relies on the said producers&rsquo; representations of compliance.
          </p>
          <p>
            The date of reproduction or republication of non-exempt visual media depicted on this
            website is current as of the date of publication by the respective third-party
            producer. Records required to be maintained for such materials are located with the
            producers, whose contact information is available on the pages of the websites where
            the content is hosted.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131A26] p-6 space-y-4 text-sm leading-relaxed text-[#CBD5E1]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Exemption Statement</h2>
          <p>
            To the extent any content on this website falls within the exemption set forth in
            18 U.S.C. § 2257(c) (depictions of no sexual conduct) or 28 C.F.R. § 75.4 (c)-(d), the
            operators of this website are exempt from the record-keeping requirements for such
            content.
          </p>
          <p>
            Any content that appears in violation of this policy, or of applicable law, will be
            removed promptly upon notice — see our{" "}
            <a href="/dmca" className="text-[#3B82F6] underline">DMCA / Takedown Policy</a>.
          </p>
        </div>

        <p className="text-xs text-[#64748B]">Last updated: August 2026</p>
      </div>
    </main>
  );
}
