/**
 * Real download engine.
 *
 * Turns "paste any URL" into an actual file on disk:
 *   - HTTP(S) / tube / social / direct-file  -> yt-dlp (with an escalation ladder
 *     that beats YouTube's anti-bot: player_client spoof -> proxy -> ...)
 *   - magnet: / *.torrent                    -> aria2c or webtorrent(-hybrid)
 *
 * Dev/standalone: files land in `.downloads/<id>/`. In production the same module
 * runs inside the download-fleet containers and writes to R2 instead (see
 * StorageAdapter). The Cloudflare Worker only orchestrates (enqueue + status).
 *
 * This file is server-only (child_process / fs). Never import it from a
 * "use client" module.
 */
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { proxyPool, cookieJars } from "./proxy-pool";

export type JobStatus = "queued" | "active" | "done" | "failed" | "canceled";
/** "file" = fetch the URL verbatim (images, archives, documents). */
export type DownloadFormat = "video" | "audio" | "lossless" | "file";

export interface DownloadJob {
  id: string;
  url: string;
  title: string;
  source: string;
  format: DownloadFormat;
  quality: string;
  engine: string; // requested engine hint from the UI
  status: JobStatus;
  progress: number; // 0..100
  speedBps: number; // bytes/sec
  totalBytes: number;
  downloadedBytes: number;
  filename?: string;
  filePath?: string;
  r2Key?: string; // R2 object key once the finished file is uploaded (for direct R2 delivery)
  contentType?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  finishedAt?: number;
  proc?: ChildProcessWithoutNullStreams;
  profile?: number; // current yt-dlp escalation rung
}

export interface SubmitInput {
  url: string;
  title?: string;
  source?: string;
  format?: DownloadFormat;
  quality?: string;
  engine?: string;
  id?: string; // optional stable id (e.g. the orchestrator's job id) so callers can cancel/track by it
}

const UNIT = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, KB: 1000, MB: 1e6, GB: 1e9, TiB: 1024 ** 4 };

function parseSize(s: string): number {
  const m = s.trim().match(/^([\d.]+)\s*([KMGT]?i?B)$/i);
  if (!m) return 0;
  return Math.round(parseFloat(m[1]) * (UNIT[m[2] as keyof typeof UNIT] ?? 1));
}

function formatBytes(n: number): string {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function hasBin(name: string): boolean {
  // spawnSync does NOT throw on ENOENT (it returns an object with .error set),
  // so we must inspect .error rather than rely on a try/catch.
  const r = spawnSync(name, ["--version"], { stdio: "ignore" });
  if (r.error === undefined) return true;
  // Also check local node_modules/.bin (for webtorrent installed via npm/bun)
  const local = path.join(process.cwd(), "node_modules", ".bin", name);
  if (fs.existsSync(local)) {
    const r2 = spawnSync(local, ["--version"], { stdio: "ignore" });
    return r2.error === undefined;
  }
  return false;
}

function resolveBin(name: string): string {
  const r = spawnSync(name, ["--version"], { stdio: "ignore" });
  if (r.error === undefined) return name;
  const local = path.join(process.cwd(), "node_modules", ".bin", name);
  if (fs.existsSync(local)) return local;
  return name;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

const YTDLP = hasBin("yt-dlp");
const ARIA2 = hasBin("aria2c");
const HAS_WEBTORRENT = hasBin("webtorrent");
const HAS_WEBTORRENT_HYBRID = hasBin("webtorrent-hybrid");
const WEBTORRENT = HAS_WEBTORRENT || HAS_WEBTORRENT_HYBRID;
const WEBTORRENT_BIN = HAS_WEBTORRENT_HYBRID ? resolveBin("webtorrent-hybrid") : resolveBin("webtorrent");

const DOWNLOAD_DIR = path.join(process.cwd(), ".downloads");
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Best-effort GC: prune .downloads dirs older than 7 days on startup and every 6h.
// Prevents unbounded disk growth in long-running self-host deployments.
const GC_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
function gcOldDownloads(): void {
  try {
    for (const entry of fs.readdirSync(DOWNLOAD_DIR)) {
      const full = path.join(DOWNLOAD_DIR, entry);
      try {
        const stat = fs.statSync(full);
        if (Date.now() - stat.mtimeMs > GC_MAX_AGE_MS) {
          fs.rmSync(full, { recursive: true, force: true });
        }
      } catch { /* race */ }
    }
  } catch { /* .downloads missing */ }
}
gcOldDownloads();
if (typeof setInterval !== "undefined") setInterval(gcOldDownloads, 6 * 60 * 60 * 1000).unref?.();

function qualityHeight(q?: string): number | null {
  if (!q) return null;
  const map: Record<string, number> = { "4k": 2160, "2160p": 2160, "1080p": 1080, "720p": 720, "480p": 480, "360p": 360 };
  return map[q] ?? null;
}

/**
 * yt-dlp argument sets, one per escalation rung. Rung 0 is the default; higher
 * rungs add anti-bot countermeasures. We climb the ladder only when a download
 * fails with a bot/403-style error.
 */
function ytDlpArgs(job: DownloadJob, profile: number, opts: { proxy?: string; cookieFile?: string } = {}): string[] {
  const args = ["--no-playlist", "--newline", "--no-warnings", "-c"];
  if (job.format === "audio" || job.format === "lossless") {
    const audioFmt = job.format === "lossless" ? "flac" : "mp3";
    args.push("-x", "--audio-format", audioFmt);
  } else {
    const h = qualityHeight(job.quality);
    args.push("-f", h ? `bv*[height<=${h}]+ba/best[height<=${h}]/best` : "bv*+ba/best");
    args.push("--merge-output-format", "mp4");
  }
  args.push("-o", path.join(DOWNLOAD_DIR, job.id, "%(title)s.%(ext)s"));
  // Anti-bot: impersonate a browser for the generic extractor. This is what
  // fetches resolved DASH/HLS manifests and direct files that sit behind a
  // Cloudflare anti-bot challenge (vidlink/smashy CDNs). Requires curl_cffi.
  args.push("--extractor-args", "generic:impersonate");
  // Rung 1+: spoof a mobile/web client (beats a lot of YouTube 403s).
  if (profile >= 1) {
    const client = profile === 1 ? "android" : "web";
    args.push("--extractor-args", `youtube:player_client=${client}`);
  }
  if (opts.proxy) args.push("--proxy", opts.proxy);
  if (opts.cookieFile) args.push("--cookies", opts.cookieFile);
  args.push(job.url);
  return args;
}

const RETRYABLE = /403|forbidden|sign in to confirm|bot|po token|verify you are human|unavailable|please (?:try|sign)/i;

export class DownloadEngine {
  private jobs = new Map<string, DownloadJob>();
  private pending: string[] = [];
  private active = 0;
  private readonly maxConcurrent = Number(process.env.DL_MAX_CONCURRENT ?? 3);

  submit(input: SubmitInput): DownloadJob {
    const id = input.id || `job-${crypto.randomUUID().slice(0, 8)}`;
    const isTorrent = /^magnet:/i.test(input.url) || /\.torrent(\?.*)?$/i.test(input.url);
    // Signed CDN links (Bunkr) and plain documents/images must be fetched
    // verbatim: yt-dlp works for media but reports no byte counter, and it
    // cannot handle a PDF/zip at all. Query strings are stripped before the
    // extension test because signed URLs carry ?token=...&ex=...
    const isPlainFile =
      /\.(pdf|epub|mobi|azw3|djvu|cbz|cbr|txt|zip|rar|7z|jpe?g|png|webp|gif|mp4|m4v|mkv|webm|mov)$/i.test(
        (() => { try { return new URL(input.url).pathname; } catch { return input.url.split("?")[0]; } })(),
      );
    const job: DownloadJob = {
      id,
      url: input.url,
      title: input.title?.trim() || (isTorrent ? "Torrent" : "Direct stream"),
      source: input.source?.trim() || (isTorrent ? "BitTorrent" : "Direct"),
      format: input.format ?? (isPlainFile && !isTorrent ? "file" : "video"),
      quality: input.quality ?? "best",
      engine: input.engine ?? (isTorrent ? "aria2c" : isPlainFile ? "http" : "yt-dlp"),
      status: "queued",
      progress: 0,
      speedBps: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      profile: 0,
    };
    this.jobs.set(id, job);
    this.enqueue(job);
    return job;
  }

  get(id: string): DownloadJob | undefined {
    return this.jobs.get(id);
  }

  list(): DownloadJob[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  cancel(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    // Queued but not yet started → remove from pending queue
    if (job.status === "queued") {
      const idx = this.pending.indexOf(id);
      if (idx !== -1) {
        this.pending.splice(idx, 1);
        job.status = "canceled";
        job.updatedAt = Date.now();
        job.finishedAt = Date.now();
        return;
      }
    }
    // Active → mark canceled and kill child; active counter will be decremented
    // by the proc's close handler (which checks for canceled and avoids overwriting).
    if (job.status === "active" || job.status === "queued") {
      job.status = "canceled";
      job.updatedAt = Date.now();
      job.finishedAt = Date.now();
      job.proc?.kill("SIGKILL");
    }
  }

  /** Node Readable for streaming the finished file back to the client. */
  readFile(id: string): { stream: Readable; contentType: string; filename: string } | null {
    const job = this.jobs.get(id);
    if (!job?.filePath || !fs.existsSync(job.filePath)) return null;
    const ext = path.extname(job.filePath).slice(1).toLowerCase();
    const contentType =
      ext === "mp4" || ext === "m4v" ? "video/mp4"
      : ext === "webm" ? "video/webm"
      : ext === "mkv" ? "video/x-matroska"
      : ext === "mp3" || ext === "m4a" ? "audio/mpeg"
      : ext === "flac" ? "audio/flac"
      : ext === "pdf" ? "application/pdf"
      : ext === "epub" ? "application/epub+zip"
      : ext === "mobi" || ext === "azw3" ? "application/octet-stream"
      : ext === "djvu" ? "image/vnd.djvu"
      : ext === "png" ? "image/png"
      : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : "application/octet-stream";
    return { stream: fs.createReadStream(job.filePath), contentType, filename: path.basename(job.filePath) };
  }

  /** Fallback: serve file directly from .downloads/<id> even if job vanished after restart */
  readFileFromDisk(id: string): { stream: Readable; contentType: string; filename: string } | null {
    const dir = path.join(DOWNLOAD_DIR, id);
    const file = this.grabFile(dir);
    if (!file || !fs.existsSync(file)) return null;
    const ext = path.extname(file).slice(1).toLowerCase();
    const contentType =
      ext === "mp4" || ext === "m4v" ? "video/mp4"
      : ext === "webm" ? "video/webm"
      : ext === "mkv" ? "video/x-matroska"
      : ext === "mp3" || ext === "m4a" ? "audio/mpeg"
      : ext === "flac" ? "audio/flac"
      : ext === "pdf" ? "application/pdf"
      : ext === "epub" ? "application/epub+zip"
      : ext === "mobi" || ext === "azw3" ? "application/octet-stream"
      : ext === "djvu" ? "image/vnd.djvu"
      : ext === "png" ? "image/png"
      : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : "application/octet-stream";
    return { stream: fs.createReadStream(file), contentType, filename: path.basename(file) };
  }

  /** Start queued jobs up to the concurrency limit. */
  private pump(): void {
    while (this.active < this.maxConcurrent && this.pending.length) {
      const id = this.pending.shift()!;
      const job = this.jobs.get(id);
      if (job && job.status === "queued") this.start(job);
    }
  }

  private enqueue(job: DownloadJob): void {
    this.pending.push(job.id);
    this.pump();
  }

  private start(job: DownloadJob): void {
    this.active++;
    job.status = "queued";
    job.updatedAt = Date.now();
    const isTorrent = /^magnet:/i.test(job.url) || /\.torrent(\?.*)?$/i.test(job.url);
    const isDirectBook = /\.(pdf|epub|mobi|azw3|djvu|cbz|cbr|txt|fb2)(\.|$|\?|#)/i.test(job.url) || job.url.includes("gutenberg.org/ebooks/") || job.url.includes("archive.org/download/");

    if (isTorrent) {
      if (!ARIA2 && !WEBTORRENT) {
        this.finish(
          job,
          "failed",
          "No torrent engine installed. Install aria2c (Arch: sudo pacman -S aria2 | Debian: sudo apt install aria2) or add webtorrent (npm i webtorrent) and restart.",
        );
        return;
      }
      this.runTorrent(job);
    } else if (isDirectBook || job.format === "file") {
      // Direct book files (PDF/EPUB etc) — use generic fetch, not yt-dlp
      void this.runDirectFile(job);
    } else {
      if (!YTDLP) {
        this.finish(job, "failed", "yt-dlp is not installed in this environment.");
        return;
      }
      this.runYtDlp(job, job.profile ?? 0);
    }
  }

  private async runDirectFile(job: DownloadJob): Promise<void> {
    job.status = "active";
    job.startedAt = job.startedAt ?? Date.now();
    job.updatedAt = Date.now();
    const outDir = path.join(DOWNLOAD_DIR, job.id);
    fs.mkdirSync(outDir, { recursive: true });
    const fetched = await this.fetchDirectFile(job, outDir);
    if (fetched) {
      job.filename = path.basename(fetched);
      job.filePath = fetched;
      job.contentType = path.extname(fetched).slice(1).toLowerCase();
      job.progress = 100;
      job.speedBps = 0;
      this.finish(job, "done");
    } else {
      this.finish(job, "failed", "Failed to download direct file (host blocked or 404). Try another mirror or set PROXY_POOL.");
    }
  }

  private async runYtDlp(job: DownloadJob, profile: number): Promise<void> {
    job.profile = profile;
    job.status = "active";
    job.startedAt = job.startedAt ?? Date.now();
    job.updatedAt = Date.now();
    const outDir = path.join(DOWNLOAD_DIR, job.id);
    fs.mkdirSync(outDir, { recursive: true });
    const host = hostOf(job.url);
    const proxy = await proxyPool.next(host);
    const cookieFile = host ? cookieJars.cookieFile(host) : undefined;
    const proc = spawn("yt-dlp", ytDlpArgs(job, profile, { proxy, cookieFile }), { env: process.env });
    job.proc = proc;

    // Watchdog for yt-dlp: kill if stalled >5min or total >20min
    let lastProg = job.progress;
    let lastUp = Date.now();
    const ytWatch = setInterval(() => {
      if (job.status !== "active") { clearInterval(ytWatch); return; }
      if (job.progress !== lastProg) { lastProg = job.progress; lastUp = Date.now(); }
      const idle = Date.now() - lastUp;
      const total = Date.now() - (job.startedAt || Date.now());
      if (idle > 5 * 60 * 1000) {
        clearInterval(ytWatch);
        job.proc?.kill("SIGKILL");
        this.finish(job, "failed", "Timeout — no progress for 5 minutes (host throttled / 403). Try PROXY_POOL or different link.");
      } else if (total > 20 * 60 * 1000) {
        clearInterval(ytWatch);
        job.proc?.kill("SIGKILL");
        this.finish(job, "failed", "Timeout — job exceeded 20 minutes.");
      }
    }, 30_000);
    proc.on("close", () => clearInterval(ytWatch));
    proc.on("error", () => clearInterval(ytWatch));

    const onLine = (line: string) => {
      const m = line.match(/\[download\]\s+([\d.]+)%\s+of\s+([\d.]+ ?[KMGT]?i?B)(?:\s+at\s+([\d.]+ ?[KMGT]?i?B\/s))?/i);
      if (m) {
        job.progress = Math.min(100, parseFloat(m[1]));
        job.totalBytes = parseSize(m[2]);
        if (m[3]) job.speedBps = parseSize(m[3].replace("/s", ""));
        job.status = "active";
        job.updatedAt = Date.now();
      } else if (/\[Merger\]|\[ExtractAudio\]|\[ffmpeg\]/i.test(line)) {
        job.status = "active";
        job.updatedAt = Date.now();
      }
    };

    let stderr = "";
    proc.stdout.on("data", (d) => String(d).split("\n").forEach((l) => l.trim() && onLine(l)));
    proc.stderr.on("data", (d) => (stderr += String(d)));
    proc.on("error", (e) => {
      if (job.status === "canceled") {
        this.active = Math.max(0, this.active - 1);
        this.pump();
        return;
      }
      this.finish(job, "failed", `spawn error: ${e.message}`);
    });
    proc.on("close", async (code) => {
      if (job.status === "canceled") {
        // User canceled — don't overwrite status, just free the slot
        job.speedBps = 0;
        job.updatedAt = Date.now();
        this.active = Math.max(0, this.active - 1);
        this.pump();
        return;
      }
      const file = this.grabFile(outDir);
      const ok = code === 0 && !!file;
      if (proxy) (ok ? proxyPool.markSuccess(proxy) : proxyPool.markFailure(proxy));
      if (ok) {
        job.filename = path.basename(file!);
        job.filePath = file!;
        job.contentType = path.extname(file!).slice(1).toLowerCase();
        job.progress = 100;
        job.speedBps = 0;
        this.finish(job, "done");
      } else if (RETRYABLE.test(stderr) && profile < 3) {
        // Climb the escalation ladder (player_client spoof -> proxy).
        // Same concurrency slot stays occupied; just re-run the next profile.
        job.proc = undefined;
        void this.runYtDlp(job, profile + 1);
      } else if (!ok && this.isDirectMediaFile(job.url) && code !== 0) {
        // Direct .mp4/.m3u8 fallback: yt-dlp 403 on generic impersonate often means
        // Cloudflare managed challenge — try a plain fetch with browser UA as last resort.
        try {
          const fetched = await this.fetchDirectFile(job, outDir);
          if (fetched) {
            job.filename = path.basename(fetched);
            job.filePath = fetched;
            job.contentType = path.extname(fetched).slice(1).toLowerCase();
            job.progress = 100;
            job.speedBps = 0;
            this.finish(job, "done");
            return;
          }
        } catch { /* fallback failed, fall through to error */ }
        const rawErr = stderr.split("\n").filter((l) => /ERROR:/i.test(l)).slice(-1)[0]?.replace("ERROR:", "").trim() || `yt-dlp exited ${code}`;
        const hint = /403|forbidden/i.test(rawErr) ? " — host blocks datacenter IP (403). Set PROXY_POOL to a residential proxy or try a different mirror." : "";
        this.finish(job, "failed", rawErr + hint);
      } else {
        const rawErr = stderr.split("\n").filter((l) => /ERROR:/i.test(l)).slice(-1)[0]?.replace("ERROR:", "").trim() || `yt-dlp exited ${code}`;
        const hint = /403|forbidden/i.test(rawErr) ? " — host blocks datacenter IP (403). Set PROXY_POOL to a residential proxy." : "";
        this.finish(job, "failed", rawErr + hint);
      }
    });
  }

  private isDirectMediaFile(url: string): boolean {
    return /\.(mp4|webm|mkv|mov|m4v|m3u8|mpd)(\?|#|$)/i.test(url);
  }

  private async fetchDirectFile(job: DownloadJob, outDir: string): Promise<string | null> {
    try {
      const url = new URL(job.url);
      const ext = path.extname(url.pathname) || ".mp4";
      const dest = path.join(outDir, `direct${ext}`);
      const res = await fetch(job.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "*/*",
          Referer: `${url.protocol}//${url.host}/`,
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok || !res.body) return null;
      const fileStream = fs.createWriteStream(dest);
      const reader = res.body.getReader();
      let total = 0;
      const contentLength = Number(res.headers.get("content-length") || 0);
      if (contentLength) job.totalBytes = contentLength;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          fileStream.write(value);
          total += value.length;
          job.downloadedBytes = total;
          if (job.totalBytes) job.progress = Math.min(99, (total / job.totalBytes) * 100);
          job.updatedAt = Date.now();
        }
      }
      await new Promise<void>((resolve, reject) => {
        fileStream.end(() => resolve());
        fileStream.on("error", reject);
      });
      if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) return dest;
      return null;
    } catch {
      return null;
    }
  }

  private async runTorrent(job: DownloadJob): Promise<void> {
    job.status = "active";
    job.startedAt = job.startedAt ?? Date.now();
    job.updatedAt = Date.now();
    const outDir = path.join(DOWNLOAD_DIR, job.id);
    fs.mkdirSync(outDir, { recursive: true });

    const host = hostOf(job.url);
    const proxy = await proxyPool.next(host);
    let bin: string;
    let args: string[];
    if (ARIA2) {
      bin = "aria2c";
      // --bt-stop-timeout=120: if torrent stalls 2min with 0 peers, fail instead of hanging an hour
      // --bt-tracker-timeout=10, --connect-timeout=10 avoid hanging on dead trackers
      args = [
        "-d", outDir,
        "--seed-time=0",
        "--bt-stop-timeout=120",
        "--bt-tracker-timeout=10",
        "--connect-timeout=10",
        "--timeout=30",
        "--summary-interval=1",
        "--console-log-level=warn",
        "--max-tries=3",
      ];
      if (proxy) args.push("--all-proxy", proxy);
      args.push(job.url);
    } else {
      bin = WEBTORRENT_BIN;
      args = ["download", job.url, "-o", outDir];
    }
    const proc = spawn(bin, args, { env: process.env });
    job.proc = proc;

    // Watchdog: if no progress for 5min or total >30min, kill and fail — prevents hour-long zombie
    let lastProgress = job.progress;
    let lastUpdate = Date.now();
    const watchdog = setInterval(() => {
      if (job.status !== "active") { clearInterval(watchdog); return; }
      const idle = Date.now() - lastUpdate;
      const total = Date.now() - (job.startedAt || Date.now());
      if (job.progress !== lastProgress) { lastProgress = job.progress; lastUpdate = Date.now(); }
      if (idle > 5 * 60 * 1000) {
        clearInterval(watchdog);
        job.proc?.kill("SIGKILL");
        this.finish(job, "failed", "Timeout — no progress for 5 minutes (dead torrent / blocked host). Try another source or set PROXY_POOL.");
      } else if (total > 30 * 60 * 1000) {
        clearInterval(watchdog);
        job.proc?.kill("SIGKILL");
        this.finish(job, "failed", "Timeout — job exceeded 30 minutes. File may be too large or swarm dead.");
      }
    }, 30_000);
    const clearW = () => clearInterval(watchdog);
    proc.on("close", clearW);
    proc.on("error", clearW);

    const onLine = (line: string) => {
      const m = line.match(/\((\d+)%\)/);
      if (m) job.progress = Math.min(100, parseInt(m[1], 10));
      const sz = line.match(/([\d.]+[KMGT]?i?B)\/([\d.]+[KMGT]?i?B)/);
      if (sz) {
        job.downloadedBytes = parseSize(sz[1]);
        job.totalBytes = parseSize(sz[2]);
      }
      job.status = "active";
      job.updatedAt = Date.now();
    };
    let stderr = "";
    proc.stdout.on("data", (d) => String(d).split("\n").forEach((l) => l.trim() && onLine(l)));
    proc.stderr.on("data", (d) => (stderr += String(d)));
    proc.on("error", (e) => {
      if (job.status === "canceled") {
        this.active = Math.max(0, this.active - 1);
        this.pump();
        return;
      }
      this.finish(job, "failed", `spawn error: ${e.message}`);
    });
    proc.on("close", (code) => {
      if (job.status === "canceled") {
        job.speedBps = 0;
        job.updatedAt = Date.now();
        this.active = Math.max(0, this.active - 1);
        this.pump();
        return;
      }
      const file = this.grabFile(outDir);
      const ok = code === 0 && !!file;
      if (proxy) (ok ? proxyPool.markSuccess(proxy) : proxyPool.markFailure(proxy));
      if (ok) {
        job.filename = path.basename(file!);
        job.filePath = file!;
        job.contentType = path.extname(file!).slice(1).toLowerCase();
        job.progress = 100;
        this.finish(job, "done");
      } else {
        this.finish(job, "failed", stderr.split("\n").filter((l) => /error/i.test(l)).slice(-1)[0]?.trim() || `${bin} exited ${code}`);
      }
    });
  }

  private grabFile(dir: string): string | undefined {
    try {
      const files = fs.readdirSync(dir).filter((f) => !f.endsWith(".part") && !f.endsWith(".ytdl"));
      if (!files.length) return undefined;
      return path.join(dir, files.sort((a, b) => fs.statSync(path.join(dir, b)).size - fs.statSync(path.join(dir, a)).size)[0]);
    } catch {
      return undefined;
    }
  }

  private finish(job: DownloadJob, status: JobStatus, error?: string): void {
    job.status = status;
    if (error) job.error = error;
    job.speedBps = 0;
    job.updatedAt = Date.now();
    job.finishedAt = job.finishedAt ?? Date.now();
    // Once a file is on disk, push it to R2 so the user downloads directly from
    // R2's edge (no Cloudflare proxy 100MB cap). Fire-and-forget; the retrieval
    // route also lazy-uploads if the user clicks before this completes.
    if (status === "done" && job.filePath && !job.r2Key) {
      void this.uploadToR2(job);
    }
    this.active = Math.max(0, this.active - 1);
    this.pump();
  }

  /** Upload a finished job's file to R2 and record the object key on the job. */
  private async uploadToR2(job: DownloadJob): Promise<void> {
    try {
      const { isR2Configured, uploadFile } = await import("./storage");
      if (!isR2Configured() || !job.filePath) return;
      const key = `dl/${job.id}/${job.filename ?? "file"}`;
      job.r2Key = await uploadFile(job.filePath, key);
    } catch {
      /* local delivery fallback remains available */
    }
  }
}

/** Plain, JSON-safe view of a job (drops the live ChildProcess). */
export function serializeJob(j: DownloadJob) {
  return {
    id: j.id,
    url: j.url,
    title: j.title,
    source: j.source,
    format: j.format,
    quality: j.quality,
    engine: j.engine,
    status: j.status,
    progress: j.progress,
    speedBps: j.speedBps,
    totalBytes: j.totalBytes,
    downloadedBytes: j.downloadedBytes,
    filename: j.filename,
    contentType: j.contentType,
    r2Key: j.r2Key ?? null,
    size: formatBytes(j.totalBytes),
    error: j.error,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
    startedAt: j.startedAt,
    finishedAt: j.finishedAt,
  };
}

/**
 * Extract the real source URL via `yt-dlp --get-url` (universal: covers
 * hanime.tv and most embed/tube hosts). Returns the last non-empty line, or
 * null if yt-dlp can't resolve it. Proxy-aware. Used by the extractor so we can
 * turn an embed URL into a downloadable file without exposing the source.
 */
export async function runYtDlpGetUrl(url: string): Promise<string | null> {
  if (!YTDLP) return null;
  const host = hostOf(url);
  const proxy = await proxyPool.next(host);
  const cookieFile = host ? cookieJars.cookieFile(host) : undefined;
  const args = ["--get-url", "--no-warnings", "-c", "--socket-timeout", "15", "--retries", "1", "-f", "bv*+ba/b"];
  if (proxy) args.push("--proxy", proxy);
  if (cookieFile) args.push("--cookies", cookieFile);
  args.push("--extractor-args", "generic:impersonate");
  args.push(url);
  return new Promise((resolve) => {
    const proc = spawn("yt-dlp", args, { env: process.env });
    let out = "";
    proc.stdout.on("data", (d) => (out += String(d)));
    proc.stderr.on("data", () => {});
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => {
      if (proxy) (code === 0 ? proxyPool.markSuccess(proxy) : proxyPool.markFailure(proxy));
      if (code === 0 && out.trim()) {
        const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
        resolve(lines[lines.length - 1] || null);
      } else {
        resolve(null);
      }
    });
  });
}

// Module-level singleton so job state survives across API requests in dev.
export const engine = new DownloadEngine();
export { formatBytes };
