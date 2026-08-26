import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA / Copyright Takedown — CornCine",
  description: "Digital Millennium Copyright Act (DMCA) takedown policy and procedure for CornCine.",
  alternates: { canonical: "/dmca" },
  robots: { index: true, follow: true },
};

export default function DmcaPage() {
  return (
    <main className="min-h-screen bg-[#0B0E15] text-[#F8FAFC] px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-extrabold">DMCA / Copyright Takedown Policy</h1>

        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-4 text-sm leading-relaxed text-[#B3B7C1]">
          <p>
            CornCine is an <strong>index and search aggregator</strong>. We do not host, upload,
            store, or transmit any video, image, or media files on our servers. All content
            referenced by this site is located on third-party websites that are independent of
            CornCine and over which we exercise no control.
          </p>
          <p>
            We respect the intellectual property rights of others and respond promptly to valid
            notices under the Digital Millennium Copyright Act (&ldquo;DMCA&rdquo;), 17 U.S.C. § 512.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-4 text-sm leading-relaxed text-[#B3B7C1]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Filing a Takedown Notice</h2>
          <p>
            If you are a copyright owner (or authorized agent) and believe material accessible via
            CornCine infringes your copyright, send a written notice to:
          </p>
          <div className="rounded-xl bg-[#0B0E15] border border-white/10 p-4 font-mono text-xs text-[#B3B7C1]">
            <p><strong className="text-[#F8FAFC]">DMCA Agent</strong></p>
            <p>Email: <a href="mailto:name-roman-aviator@duck.com" className="text-[#EC69AE] underline">name-roman-aviator@duck.com</a></p>
            <p className="mt-2">Subject line: &ldquo;DMCA Takedown Request&rdquo;</p>
          </div>
          <p>Your notice must include:</p>
          <ol className="list-decimal list-inside space-y-1 text-[#B3B7C1]">
            <li>Identification of the copyrighted work claimed to be infringed.</li>
            <li>The exact URL(s) on CornCine referencing the material in question.</li>
            <li>Your full name, address, telephone number, and email address.</li>
            <li>A statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf.</li>
            <li>Your physical or electronic signature.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6 space-y-4 text-sm leading-relaxed text-[#B3B7C1]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">What We Will Do</h2>
          <p>
            Upon receiving a valid notice, we will <strong>remove or disable access to the referenced
            link(s) within 48 hours</strong> and, where appropriate, terminate repeat offenders&rsquo;
            access. Because we do not host the underlying files, removal from CornCine removes the
            reference/index entry only; the content itself remains the responsibility of the
            third-party host, which you may also contact directly.
          </p>
          <p className="text-[#878C97] text-xs">
            Note: a false DMCA statement is made under penalty of perjury and may expose you to
            liability for damages, including costs and attorneys&rsquo; fees, under 17 U.S.C. § 512(f).
          </p>
        </div>

        <p className="text-xs text-[#878C97]">Last updated: August 2026</p>
      </div>
    </main>
  );
}
