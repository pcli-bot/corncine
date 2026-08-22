/**
 * Managed egress: proxy pool + per-source cookie store.
 *
 * This is SERVER INFRASTRUCTURE. End users never see it — they paste a URL or
 * run a search and it just works. The operator provisions a residential/mobile
 * proxy pool (commercial provider or self-run) and points PROXY_POOL at it.
 *
 * Every byte we pull from a source site (leak-search API, leak-media proxy,
 * downloads) routes through here, rotating IPs and recovering from bans, so the
 * product survives the source-site IP blocks (Kemono DDoS-Guard, Coomer 503,
 * YouTube anti-bot) that datacenter IPs hit instantly.
 *
 * Provider-agnostic: configured purely via env, no A/B/C decision needed.
 *   PROXY_POOL        = "http://u:p@h:port, socks5://h:port, ..." (or newline/space)
 *   PROXY_MANAGER_URL = optional upstream that returns a fresh proxy per GET
 * With neither set, everything falls back to direct egress (current behavior).
 */
import fs from "node:fs";
import path from "node:path";

export class ProxyPool {
  private proxies: string[] = [];
  private idx = 0;
  private failures = new Map<string, number>();
  private cooldownUntil = new Map<string, number>();
  private managerUrl?: string;
  private sticky = new Map<string, string>();
  private readonly maxFailures = 3;
  private readonly cooldownMs = 5 * 60 * 1000;

  constructor(opts?: { pool?: string; managerUrl?: string; stickyPerSource?: boolean }) {
    const raw = opts?.pool ?? process.env.PROXY_POOL ?? "";
    this.proxies = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    this.managerUrl = opts?.managerUrl ?? process.env.PROXY_MANAGER_URL ?? undefined;
    if (opts?.stickyPerSource) this.sticky = new Map();
  }

  get size() {
    return this.proxies.length;
  }
  get enabled() {
    return this.proxies.length > 0 || !!this.managerUrl;
  }

  /** Next proxy URL for a source. Returns "" when no pool is configured. */
  async next(source?: string): Promise<string> {
    if (source && this.sticky.has(source)) {
      const p = this.sticky.get(source)!;
      if (!this.isCooling(p)) return p;
    }
    if (this.proxies.length === 0) return this.managerUrl ? await this.fromManager() : "";
    const healthy = this.proxies.filter((p) => !this.isCooling(p));
    const pool = healthy.length ? healthy : this.proxies;
    const p = pool[this.idx % pool.length];
    this.idx = (this.idx + 1) % pool.length;
    if (source) this.sticky.set(source, p);
    return p;
  }

  private isCooling(p: string) {
    const until = this.cooldownUntil.get(p);
    return until !== undefined && until > Date.now();
  }

  markFailure(p: string) {
    if (!p) return;
    const f = (this.failures.get(p) ?? 0) + 1;
    this.failures.set(p, f);
    if (f >= this.maxFailures) {
      this.cooldownUntil.set(p, Date.now() + this.cooldownMs);
      this.failures.set(p, 0);
    }
  }
  markSuccess(p: string) {
    if (p) this.failures.set(p, 0);
  }

  private async fromManager(): Promise<string> {
    try {
      const r = await fetch(this.managerUrl!, { cache: "no-store" });
      return (await r.text()).trim();
    } catch {
      return "";
    }
  }

  /** undici dispatcher for fetch()-based egress (http/https proxies only).
   *  Lazy: if undici isn't resolvable in this runtime, returns undefined and
   *  fetch falls back to direct egress (yt-dlp/aria2c still get the proxy). */
  async dispatcherFor(proxy: string): Promise<unknown> {
    if (!proxy || !/^https?:\/\//i.test(proxy)) return undefined; // socks needs a different agent
    try {
      const { ProxyAgent } = await import("undici");
      return new ProxyAgent(proxy);
    } catch {
      return undefined;
    }
  }
}

/**
 * Per-source cookie jar. Source sites (notably Kemono's DDoS-Guard) set session
 * cookies on first contact; replaying them on later requests passes the gate.
 * Stored on disk in Netscape format so yt-dlp's --cookies can use them too.
 */
export class CookieJar {
  private dir = path.join(process.cwd(), ".cookies");
  private file(host: string) {
    return path.join(this.dir, `${host.replace(/[^a-z0-9.\-]/gi, "_")}.txt`);
  }
  cookieFile(host: string): string | undefined {
    const f = this.file(host);
    return fs.existsSync(f) ? f : undefined;
  }
  header(host: string): string {
    const f = this.file(host);
    if (!fs.existsSync(f)) return "";
    const out: Record<string, string> = {};
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      if (!line || line.startsWith("#")) continue;
      const c = line.split("\t");
      if (c.length >= 7) out[c[5]] = c[6];
    }
    return Object.entries(out).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  saveFromResponse(host: string, setCookie: string[]) {
    if (!setCookie?.length) return;
    fs.mkdirSync(this.dir, { recursive: true });
    const merged: Record<string, { value: string; domain: string }> = {};
    for (const sc of setCookie) {
      const first = sc.split(";")[0];
      const eq = first.indexOf("=");
      if (eq < 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      let domain = host;
      const dm = sc.match(/domain=([^;]+)/i);
      if (dm) domain = dm[1].trim().replace(/^\./, "");
      merged[name] = { value, domain };
    }
    const lines = [
      "# Netscape HTTP Cookie File",
      "# https://curl.se/docs/http-cookies.html",
      "",
      ...Object.entries(merged).map(
        ([k, v]) => ["#HttpOnly_" + v.domain, v.domain, "FALSE", "/", "0", k, v.value].join("\t"),
      ),
    ];
    fs.writeFileSync(this.file(host), lines.join("\n"));
  }
}

export const proxyPool = new ProxyPool();
export const cookieJars = new CookieJar();
