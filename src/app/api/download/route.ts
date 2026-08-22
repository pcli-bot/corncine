import { engine } from "@/lib/download-engine";
import { extractVideoUrl } from "@/lib/extract";
import { DownloadBodySchema } from "@/lib/validation";
import { checkRateLimit, getClientIp, RL_PRESETS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/download  — submit a "paste any URL" download.
 * Expected body: { url, title?, source?, format?, quality?, engine? }
 * Returns: { ok, id, title, source, format, quality, size }
 * (This is the real backend the LinkDownloader panel posts to.)
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`download:${ip}`, RL_PRESETS.download)) {
    return Response.json({ ok: false, error: "rate limited — try again in a minute" }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = DownloadBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message || "invalid input" }, { status: 400 });
  }
  let url = parsed.data.url.trim();
  // SSRF guard: block private / loopback / link-local hosts (server would fetch them)
  if (url.startsWith("http")) {
    try {
      const h = new URL(url).hostname.toLowerCase();
      if (
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "::1" ||
        h.startsWith("10.") ||
        h.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(h) ||
        h.endsWith(".local") ||
        h === "0.0.0.0"
      ) {
        return Response.json({ ok: false, error: "private host blocked" }, { status: 400 });
      }
    } catch {
      return Response.json({ ok: false, error: "invalid url" }, { status: 400 });
    }
  }

  // If it's an embed/player URL, extract the real video URL server-side.
  // The client never sees the extracted URL (privacy + no public download API).
  const isEmbedUrl = /^https?:\/\/(vidlink\.pro|embed\.smashystream\.com|smashystream\.com|anyembed\.xyz|www\.2embed\.skin|2embed\.skin|vidsrc\.to|vidsrc\.xyz|hanime\.tv)\//i.test(url);
  if (isEmbedUrl) {
    try {
      const extracted = await extractVideoUrl(url);
      if (extracted) {
        url = extracted; // Use the real video URL internally
      }
    } catch (err) {
      // Extraction failed, but submit the embed URL anyway (yt-dlp may handle it).
      console.warn("[extract] failed for", url, err instanceof Error ? err.message : String(err));
    }
  }

  const job = engine.submit({
    url,
    title: parsed.data.title,
    source: parsed.data.source,
    format: parsed.data.format,
    quality: parsed.data.quality,
    engine: parsed.data.engine,
  });

  return Response.json({
    ok: true,
    id: job.id,
    title: job.title,
    source: job.source,
    format: job.format,
    quality: job.quality,
    size: "—",
  });
}

/** GET /api/download — list recent jobs (debug / status board). */
export async function GET() {
  return Response.json({ items: engine.list().map((j) => ({ id: j.id, title: j.title, status: j.status, progress: j.progress })) });
}
