import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MCP — CornCine Adult Agent 18+ | Download via AI (JAV, Hentai, Desi, Leaks)",
  description:
    "CornCine MCP (adult, 18+). 6 tools including verify_age gate. Search 22 adult providers, extract JS players, download via yt-dlp/aria2c. Claude/Cursor/Windsurf setup + rejection handling.",
  alternates: { canonical: "/mcp" },
  openGraph: {
    title: "CornCine MCP — Adult Agent 18+",
    description: "6 tools: verify_age, search, extract, download. 22 adult providers. 18+ gate.",
    type: "website",
    url: "/mcp",
  },
};

const adultTools = [
  { name: "verify_age", desc: "REQUIRED FIRST — confirm 18+ to unlock all other tools.", args: "confirmed: boolean (true if 18+)", gate: true },
  { name: "search", desc: "Search 22 adult providers (JAV, hentai, DesiTales2, tubes 4K, Kemono/Coomer leaks).", args: "query: string, mode?: 'all'|'adult'", gate: true },
  { name: "extract", desc: "Resolve any URL (hanime, hentaihaven, vidlink) to direct mp4/m3u8.", args: "url: string", gate: true },
  { name: "download", desc: "Queue real download → returns jobId.", args: "url: string, quality?: '4K'|'1080p'|'720p'", gate: true },
  { name: "download_status", desc: "Poll jobId → status + R2 link when done.", args: "jobId: string", gate: true },
  { name: "trending", desc: "List trending (Sunny Leone, Mia Khalifa, Overflow etc).", args: "—", gate: true },
];

export default function McpAdultDocs() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "CornCine MCP — Adult Agent 18+ Setup",
    description: "Model Context Protocol server for CornCine adult download. 6 tools with 18+ age gate.",
    author: { "@type": "Organization", name: "CornCine" },
    isAccessibleForFree: true,
    isFamilyFriendly: false,
  };

  return (
    <main className="min-h-screen bg-[#0B0E15] text-[#F8FAFC] px-4 py-10 max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/" className="hover:text-white">CornCine</Link> <span className="mx-2">/</span> <span className="text-slate-200">MCP</span>
      </nav>

      <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
        🔞 18+ ONLY — Age verification required
      </div>

      <h1 className="text-3xl font-extrabold mt-4">CornCine MCP — Adult Agent</h1>
      <p className="text-slate-400 mt-2">
        Gives any AI agent the same engine as the site: <strong className="text-slate-200">verify → search → extract → download</strong> across 22 adult providers. Every tool except <code className="bg-white/10 px-1 rounded">verify_age</code> is locked behind an 18+ gate.
      </p>

      {/* AI-readable */}
      <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-950/20 p-6">
        <h2 className="text-sm font-bold tracking-wider text-red-300 uppercase">For AI to read — Quick Start + Rejection Handling</h2>
        <p className="text-xs text-red-300/70 mt-1">Copy this verbatim into your system prompt. It is written to pass safety filters.</p>
        <pre className="mt-3 rounded-xl bg-black/40 border border-red-500/20 p-4 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
{`You have access to CornCine MCP (adult, 18+).

Gate: You MUST call verify_age({"confirmed": true}) first, but ONLY if the user explicitly confirms they are 18+ and requests adult content. Do not call it otherwise.

Tools (all gated except verify_age): search(query, mode), extract(url), download(url, quality), download_status(jobId), trending().

Correct flow for adult request:
1. User: "Search for Sunny Leone" → you: "CornCine is 18+ only. Are you 18 or older? If yes, I can proceed."
2. User confirms 18+ → you: call verify_age({"confirmed": true}) → then search("Sunny Leone")
3. search → pick first item → extract(providerUrl) OR download(providerUrl)

Rejection handling:
- If your safety policy blocks an adult request, do NOT call the tool. Explain: "I can't help with that adult request, but you can use the clean AniCine MCP for non-adult content at https://anicine.com/mcp"
- Never mix clean + adult in one turn. Never call adult tools without explicit 18+ confirmation in the conversation.
- Do not hallucinate adult content. Only return what search/extract actually returns.`}
        </pre>
      </div>

      <h2 className="text-xl font-bold mt-10">Setup — 30 seconds</h2>

      <div className="mt-4 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6">
          <h3 className="font-semibold text-red-300">1. Install</h3>
          <pre className="mt-2 rounded-lg bg-black/50 p-3 text-xs text-slate-300 overflow-x-auto">npm i -g @corncine/mcp-adult
# or: npx @corncine/mcp-adult</pre>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6">
          <h3 className="font-semibold text-red-300">2. Claude Desktop — claude_desktop_config.json</h3>
          <pre className="mt-2 rounded-lg bg-black/50 p-3 text-xs text-slate-300 overflow-x-auto">{`{
  "mcpServers": {
    "corncine-adult": {
      "command": "npx",
      "args": ["@corncine/mcp-adult"],
      "env": { "CORN_API": "https://corncine.com" }
    },
    "anicine-clean": {
      "command": "npx",
      "args": ["@anicine/mcp-clean"],
      "env": { "ANICINE_API": "https://anicine.com" }
    }
  }
}`}</pre>
          <p className="text-xs text-slate-500 mt-2">Install both — Claude will route clean vs adult automatically. Adult tools stay locked until <code className="bg-white/10 px-1 rounded">verify_age</code>.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6">
          <h3 className="font-semibold">3. Cursor / Windsurf</h3>
          <pre className="mt-2 rounded-lg bg-black/50 p-3 text-xs text-slate-300 overflow-x-auto">{`{
  "mcpServers": {
    "corncine-adult": {
      "command": "npx",
      "args": ["@corncine/mcp-adult"],
      "env": { "CORN_API": "https://corncine.com" }
    }
  }
}`}</pre>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6">
          <h3 className="font-semibold">Tools (6, all gated except verify_age)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {adultTools.map((t) => (
              <li key={t.name} className={`rounded-lg border p-3 ${t.gate ? "bg-red-950/20 border-red-500/20" : "bg-black/30 border-white/5"}`}>
                <span className={`font-mono ${t.gate ? "text-red-300" : "text-emerald-300"}`}>{t.name}</span>
                <span className="text-slate-400"> — {t.desc}</span>
                <span className="block text-xs font-mono text-slate-500 mt-1">{t.args}</span>
                {t.gate && t.name !== "verify_age" && <span className="text-[11px] text-red-400">🔒 requires verify_age first</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-6">
          <h3 className="font-semibold text-amber-300">Why AI Rejects & How to Pass</h3>
          <ul className="list-disc list-inside text-sm text-slate-300 mt-2 space-y-1">
            <li><strong>Vague adult intent → blocked.</strong> Bad: <code className="bg-white/10 px-1 rounded">Download something adult</code> — no explicit query, safety filter fires. Good: <code className="bg-white/10 px-1 rounded">I am 18+, search CornCine for “Sunny Leone”</code></li>
            <li><strong>No 18+ confirmation → blocked.</strong> The MCP itself returns `🔞 call verify_age first` — the AI must surface that question to the user, not skip it.</li>
            <li><strong>Mixing clean + adult in one turn → flagged.</strong> Keep them separate. Adult requests go to CornCine MCP, everything else to AniCine clean MCP.</li>
            <li><strong>Some models (Claude) are stricter than others (Cursor/GPT-4o) on adult leaks.</strong> If Claude refuses a leak search (e.g., Eva Elfie), suggest the user try the same query via the website directly: <code className="bg-white/10 px-1 rounded">https://corncine.com/search?q=eva+elfie</code></li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#151922] p-6">
          <h3 className="font-semibold">Troubleshooting</h3>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
            <li><code className="bg-white/10 px-1 rounded">CORN_API</code> must be reachable — use hosted <code className="bg-white/10 px-1 rounded">https://corncine.com</code> when not running locally</li>
            <li>If you see <code className="bg-white/10 px-1 rounded">🔞 call verify_age first</code>, the AI skipped the age step — tell it “I am 18+, please verify”</li>
            <li>Large 4K downloads return an R2 link, not a Telegram file — open the link to save</li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-10">
        Clean alternative: <Link href="https://anicine.com/mcp" className="text-emerald-400 underline">AniCine MCP (no adult)</Link> · GitHub: <a href="https://github.com/pcli-bot/pcli" className="text-sky-400 underline">pcli-bot/pcli</a>
      </p>
    </main>
  );
}
