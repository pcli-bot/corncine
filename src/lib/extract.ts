// Server-only. Extracts the real video source URL from behind embed players
// (vidlink.pro, smashystream, hanime.tv, and any JS-driven player) and from any
// yt-dlp-supported site. Returns the resolved DIRECT media URL string, or null
// if it can't be resolved.
//
// Strategy (cheap-first, heavy-fallback):
//   1. Direct media file  -> return as-is.
//   2. yt-dlp --get-url   -> universal, covers hanime.tv + most tube/embed hosts.
//   3. Headless Chromium  -> renders the player, triggers playback, and captures
//      the real .mpd/.m3u8/.mp4 the player actually requests. This is the robust
//      fallback for sites whose source URL is generated client-side.
//
// The resolved URL is used INTERNALLY by the download route to fetch the file —
// it is never returned to the client, so we never expose source URLs or publish
// a generic download API. Only import this from API route handlers (Node runtime).
import { runYtDlpGetUrl } from "./download-engine";
import { proxyPool } from "./proxy-pool";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Resolve an embed/player URL to its real, downloadable media URL. */
export async function extractVideoUrl(input: string): Promise<string | null> {
  // Already a direct media file? Use it as-is.
  if (/\.(mp4|webm|mkv|mov|m4v|m3u8|mpd)(\?|$)/i.test(input)) return input;
  // 1) Universal yt-dlp extraction (covers many hosts natively).
  const yt = await runYtDlpGetUrl(input);
  if (yt) return yt;
  // 2) Headless-browser extraction for JS-driven players.
  return extractWithBrowser(input);
}

/** Render the page in headless Chromium and capture the real media URL. */
async function extractWithBrowser(input: string): Promise<string | null> {
  const script = path.join(process.cwd(), "scripts", "extract-media.py");
  if (!fs.existsSync(script)) return null;
  // Route the headless browser through PROXY_POOL (residential) so extraction
  // works from any egress IP, not just the server's own. The python script reads
  // it from EXTRACT_PROXY.
  const cleanEnv: NodeJS.ProcessEnv = { ...process.env } as NodeJS.ProcessEnv;
  try {
    const host = new URL(input).hostname;
    const proxy = await proxyPool.next(host);
    if (proxy) cleanEnv.EXTRACT_PROXY = proxy;
  } catch {
    /* extraction falls back to the server's own IP */
  }
  return new Promise((resolve) => {
    const proc = spawn("python3", [script, input], {
      env: cleanEnv,
      timeout: 60_000,
    }) as unknown as import("node:child_process").ChildProcessWithoutNullStreams;
    let out = "";
    let done = false;
    const finish = (val: string | null) => {
      if (done) return;
      done = true;
      try { proc.kill("SIGKILL"); } catch { /* already exited */ }
      resolve(val);
    };
    // Safety timeout to prevent hanging chromium
    const timer = setTimeout(() => finish(null), 65_000);
    proc.stdout.on("data", (d: Buffer) => (out += String(d)));
    proc.stderr.on("data", () => { /* ignore */ });
    proc.on("error", () => { clearTimeout(timer); finish(null); });
    proc.on("close", () => {
      clearTimeout(timer);
      try {
        const line = out.trim().split("\n").pop() || "{}";
        const j = JSON.parse(line);
        finish(typeof j.url === "string" && j.url ? j.url : null);
      } catch {
        finish(null);
      }
    });
  });
}
