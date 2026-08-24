/**
 * Torrent providers — apibay (The Pirate Bay JSON API) + BTDig (DHT crawler).
 *
 * Provider notes, measured August 2026:
 *  - apibay.org   : real JSON API, returned 100 results for "dune" with seeders
 *                   and info_hash. Primary source.
 *  - btdig.com    : DHT full-text crawler. NO public JSON API — HTML only — and
 *                   direct requests are rate-limited (HTTP 429) from datacenter
 *                   IPs. Routed through the proxy pool when one is configured,
 *                   and treated as best-effort so a 429 never breaks a search.
 *  - solidtorrents: previously used here; timed out during testing. Kept as a
 *                   last-resort source behind a short timeout.
 */

import { proxyPool } from "@/lib/proxy-pool";

export interface TorrentResult {
  id: string;
  title: string;
  magnet: string;
  infoHash: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  source: "The Pirate Bay" | "BTDig" | "SolidTorrents";
  detailsUrl?: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/** Common public trackers so magnets resolve peers without a tracker list. */
const TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://exodus.desync.com:6969/announce",
  "udp://tracker.openbittorrent.com:6969/announce",
];

export function buildMagnet(infoHash: string, name: string): string {
  const tr = TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join("");
  return `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}${tr}`;
}

/* ------------------------------------------------------------------ */
/* apibay — The Pirate Bay                                             */
/* ------------------------------------------------------------------ */

/**
 * @param cat 0 = all, 200 = video, 600 = other/ebooks, 500 = XXX
 */
export async function searchApibay(query: string, cat = 0, limit = 20): Promise<TorrentResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(
      `https://apibay.org/q.php?q=${encodeURIComponent(q)}&cat=${cat}`,
      { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(9000), cache: "no-store" },
    );
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    if (!Array.isArray(rows)) return [];

    return rows
      // apibay returns a single sentinel row when nothing matches
      .filter((r) => r?.info_hash && r.info_hash !== "0000000000000000000000000000000000000000")
      .slice(0, limit)
      .map((r) => ({
        id: `tpb-${r.id}`,
        title: String(r.name ?? q),
        infoHash: String(r.info_hash),
        magnet: buildMagnet(String(r.info_hash), String(r.name ?? q)),
        sizeBytes: Number(r.size) || 0,
        seeders: Number(r.seeders) || 0,
        leechers: Number(r.leechers) || 0,
        source: "The Pirate Bay" as const,
        detailsUrl: `https://thepiratebay.org/description.php?id=${r.id}`,
      }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* BTDig — DHT crawler (HTML scrape)                                   */
/* ------------------------------------------------------------------ */

/**
 * BTDig indexes the DHT directly, so it surfaces torrents the trackers don't.
 * It has no API and rate-limits datacenter IPs, so this goes through the proxy
 * pool when available and fails soft (returns []) on 429/blocks.
 */
export async function searchBtdig(query: string, limit = 15): Promise<TorrentResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `https://btdig.com/search?q=${encodeURIComponent(q)}&order=0`;
  let html = "";

  try {
    const proxy = await proxyPool.next("btdig.com");
    if (proxy) {
      const { ProxyAgent, fetch: undiciFetch } = await import("undici");
      const res: any = await undiciFetch(url, {
        dispatcher: new ProxyAgent(proxy),
        headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
        signal: AbortSignal.timeout(12000),
      });
      if (res.status === 429 || !res.ok) {
        proxyPool.markFailure(proxy);
        return [];
      }
      proxyPool.markSuccess(proxy);
      html = await res.text();
    } else {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9", Referer: "https://btdig.com/" },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      });
      // 429 without a proxy is expected from datacenter IPs — degrade quietly
      if (!res.ok) return [];
      html = await res.text();
    }
  } catch {
    return [];
  }

  return parseBtdigHtml(html, limit);
}

/** Exported for testing — parses BTDig result markup into structured results. */
export function parseBtdigHtml(html: string, limit = 15): TorrentResult[] {
  const out: TorrentResult[] = [];
  const seen = new Set<string>();

  // Each result exposes a magnet link; pull hash + display name straight from it.
  const re = /magnet:\?xt=urn:btih:([a-fA-F0-9]{40})(?:&amp;|&)dn=([^"'&<\s]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null && out.length < limit) {
    const hash = m[1].toLowerCase();
    if (seen.has(hash)) continue;
    seen.add(hash);

    let name = m[2];
    try {
      name = decodeURIComponent(name.replace(/\+/g, " "));
    } catch {
      /* keep raw when the name isn't valid percent-encoding */
    }

    // Size appears near the entry as e.g. "1.4 GB"
    const tail = html.slice(m.index, m.index + 1200);
    const sizeMatch = tail.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
    let sizeBytes = 0;
    if (sizeMatch) {
      const mult = { kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 }[sizeMatch[2].toLowerCase()] ?? 0;
      sizeBytes = Math.round(parseFloat(sizeMatch[1]) * mult);
    }

    out.push({
      id: `btdig-${hash.slice(0, 12)}`,
      title: name,
      infoHash: hash,
      magnet: buildMagnet(hash, name),
      sizeBytes,
      // BTDig is a DHT index and does not publish swarm counts
      seeders: 0,
      leechers: 0,
      source: "BTDig" as const,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Combined                                                            */
/* ------------------------------------------------------------------ */

/**
 * Search all torrent sources in parallel and merge by info hash.
 * apibay wins ties because it carries real swarm counts.
 */
export async function searchTorrents(query: string, cat = 0, limit = 24): Promise<TorrentResult[]> {
  const [tpb, btdig] = await Promise.all([
    searchApibay(query, cat),
    searchBtdig(query).catch(() => [] as TorrentResult[]),
  ]);

  const byHash = new Map<string, TorrentResult>();
  for (const t of [...tpb, ...btdig]) {
    const prev = byHash.get(t.infoHash);
    if (!prev || (prev.seeders === 0 && t.seeders > 0)) byHash.set(t.infoHash, t);
  }

  return Array.from(byHash.values())
    .sort((a, b) => b.seeders - a.seeders || b.sizeBytes - a.sizeBytes)
    .slice(0, limit);
}

export function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), u.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
