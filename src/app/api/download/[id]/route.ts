import { Readable } from "node:stream";
import { engine, serializeJob } from "@/lib/download-engine";
import { isR2Configured, uploadFile, getDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/download/[id]          — job status (polled by the downloads drawer).
 * GET /api/download/[id]?file=1   — redirect to a signed R2 URL (R2 edge delivery,
 *                                    bypassing the Cloudflare proxy 100MB cap). Falls back to
 *                                    streaming the local file when R2 is unconfigured.
 * DELETE /api/download/[id]       — cancel a running/queued job.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const isFile = url.searchParams.get("file") === "1" || url.pathname.endsWith("/file");
  const job = engine.get(id);

  // File delivery survives restarts: if job vanished but .downloads/<id> still exists, stream it directly
  if (isFile && !job) {
    const fallback = engine.readFileFromDisk(id);
    if (fallback) {
      const webStream = Readable.toWeb(fallback.stream) as unknown as ReadableStream;
      return new Response(webStream, {
        headers: {
          "Content-Type": fallback.contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fallback.filename)}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
  }

  if (!job) return Response.json({ ok: false, error: "job not found" }, { status: 404 });

  if (isFile) {
    // Prefer direct R2 delivery (no proxy size cap). Upload lazily if the
    // background upload hasn't finished yet, then 302 to a signed URL.
    if (job.status === "done" && job.filePath) {
      if (!job.r2Key && isR2Configured()) {
        try {
          job.r2Key = await uploadFile(job.filePath, `dl/${job.id}/${job.filename ?? "file"}`);
        } catch {
          /* fall back to local streaming */
        }
      }
      if (job.r2Key) {
        const dl = await getDownloadUrl(job.r2Key, job.filename ?? "download");
        return Response.redirect(dl, 302);
      }
    }
    // Fallback: stream the local file (dev / R2 not configured).
    const file = engine.readFile(id);
    if (!file) return Response.json({ ok: false, error: "file not ready" }, { status: 404 });
    const webStream = Readable.toWeb(file.stream) as unknown as ReadableStream;
    return new Response(webStream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return Response.json({ ok: true, ...serializeJob(job) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = engine.get(id);
  if (!job) return Response.json({ ok: false, error: "job not found" }, { status: 404 });
  engine.cancel(id);
  return Response.json({ ok: true });
}
