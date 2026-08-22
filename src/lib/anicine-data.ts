// CornCine curated data layer.
// - Provider catalog with per-site search URL patterns (so the UI can fire the
//   user's query at every indexed site in one click).
// - Real authentic CDN poster artwork from TMDB, Kitsu, TVMaze with local genre
//   poster fallbacks.
// - 5 distinct categories: Movies & TV, Anime, Manga, Adult Media, and Art & Wallpapers.

export type ProviderCategory = "torrents" | "adult";
export type ModeKey = "adult" | "all";

export interface Provider {
  name: string;
  url: string;
  domain: string;
  category: ProviderCategory;
  blurb: string;
  searchPattern?: string;
  subcategory?: "hentai" | "live_action";
}

export interface MediaItem {
  id: string;
  title: string;
  year: number;
  type: "adult";
  poster: string;
  backdrop?: string;
  rating: number;
  quality: "4K" | "1080p" | "720p";
  seeds: number;
  provider: string;
  providerUrl: string;
  genre: string[];
  overview: string;
  streamUrl?: string;
  tmdbId?: string;
  imdbId?: string;
  subcategory?: "hentai" | "live_action";
  mediaKind?: "video" | "photo" | "set";
  images?: string[];
}

export interface Topic {
  key: string;
  label: string;
  emoji: string;
  query: string;
  mode: ModeKey;
}

// ---------------------------------------------------------------------------
// Local genre poster artwork fallback (see /public/posters/*.png)
// ---------------------------------------------------------------------------
const POSTER = (g: string) => `/posters/${g}.png`;

export function genrePoster(genre: string[]): string {
  const has = (...keys: string[]) => keys.some((k) => genre.includes(k));
  if (has("Sci-Fi", "Epic")) return POSTER("scifi");
  if (has("Action")) return has("Animation", "Shonen") ? POSTER("anime-shonen") : POSTER("action");
  if (has("Animation", "Shonen")) return POSTER("anime-shonen");
  if (has("Supernatural", "Fantasy")) return POSTER("anime-fantasy");
  if (has("Dark Fantasy", "Horror")) return POSTER("dark-fantasy");
  if (has("Adventure")) return POSTER("adventure");
  if (has("Thriller", "Crime", "Mystery", "Noir")) return POSTER("thriller");
  return POSTER("drama");
}

// ---------------------------------------------------------------------------
// Provider catalog (curated across 5 categories)
// ---------------------------------------------------------------------------
export const PROVIDERS: Provider[] = [
  // ---- Adult tubes ----
  { name: "Pornhub", url: "https://www.pornhub.com/", domain: "pornhub.com", subcategory: "live_action", category: "adult", blurb: "Full-length HD media tube", searchPattern: "https://www.pornhub.com/video/search?search={q}" },
  { name: "XHamster", url: "https://xhamster.com/", domain: "xhamster.com", subcategory: "live_action", category: "adult", blurb: "Verified 1080p/4K tube streams", searchPattern: "https://xhamster.com/search/{q}" },
  { name: "XVideos", url: "https://www.xvideos.com/", domain: "xvideos.com", subcategory: "live_action", category: "adult", blurb: "Global high-speed video network", searchPattern: "https://www.xvideos.com/?k={q}" },
  { name: "Eporner", url: "https://www.eporner.com/", domain: "eporner.com", subcategory: "live_action", category: "adult", blurb: "4K 60FPS Ultra HD streams", searchPattern: "https://www.eporner.com/search/{q}/" },
  { name: "SpankBang", url: "https://spankbang.com/", domain: "spankbang.com", subcategory: "live_action", category: "adult", blurb: "Ultra-fast direct 1080p MP4", searchPattern: "https://spankbang.com/s/{q}/" },
  { name: "PornTrex", url: "https://www.porntrex.com/", domain: "porntrex.com", subcategory: "live_action", category: "adult", blurb: "HD tubes in full length", searchPattern: "https://www.porntrex.com/search/{q}/" },
  { name: "Beeg", url: "https://beeg.com/", domain: "beeg.com", subcategory: "live_action", category: "adult", blurb: "Clean HD tube interface", searchPattern: "https://beeg.com/?q={q}" },

  // ---- Hentai / anime adult ----
  { name: "Hanime", url: "https://hanime.tv/", domain: "hanime.tv", subcategory: "hentai", category: "adult", blurb: "1080p subbed anime episodes", searchPattern: "https://hanime.tv/browse/search?q={q}" },
  { name: "HentaiHaven", url: "https://hentaihaven.xxx/", domain: "hentaihaven.xxx", subcategory: "hentai", category: "adult", blurb: "Classic HD anime releases", searchPattern: "https://hentaihaven.xxx/?s={q}" },
  { name: "Nhentai", url: "https://nhentai.net/", domain: "nhentai.net", subcategory: "hentai", category: "adult", blurb: "Manga & doujinshi archive", searchPattern: "https://nhentai.net/search/?q={q}" },

  // ---- JAV ----
  { name: "MissAV", url: "https://missav.ai/", domain: "missav.ai", subcategory: "live_action", category: "adult", blurb: "Asian cinema & JAV streams", searchPattern: "https://missav.ai/search/{q}" },
  { name: "JAVGuru", url: "https://jav.guru/", domain: "jav.guru", subcategory: "live_action", category: "adult", blurb: "Censored + uncensored JAV library", searchPattern: "https://jav.guru/?s={q}" },
  { name: "JAVLibrary", url: "https://www.javlibrary.com/", domain: "javlibrary.com", subcategory: "live_action", category: "adult", blurb: "JAV database & release index", searchPattern: "https://www.javlibrary.com/en/vl_searchbyid.php?keyword={q}" },
  { name: "SupJAV", url: "https://supjav.com/", domain: "supjav.com", subcategory: "live_action", category: "adult", blurb: "JAV streams, multi-server", searchPattern: "https://supjav.com/?s={q}" },

  // ---- Creator / Leak platforms ----
  { name: "OnlyFans", url: "https://onlyfans.com/", domain: "onlyfans.com", category: "adult", subcategory: "live_action", blurb: "Free & premium creator subscriptions index", searchPattern: "https://onlyfans.com/search/{q}" },
  { name: "Patreon", url: "https://www.patreon.com/", domain: "patreon.com", category: "adult", subcategory: "live_action", blurb: "Creator membership posts & early drops", searchPattern: "https://www.patreon.com/search?q={q}" },
  { name: "Fansly", url: "https://fansly.com/", domain: "fansly.com", category: "adult", subcategory: "live_action", blurb: "Creator subscription platform index", searchPattern: "https://fansly.com/search?q={q}" },
  { name: "Kemono", url: "https://kemono.cr/", domain: "kemono.cr", category: "adult", subcategory: "live_action", blurb: "Leaked creator posts index (OnlyFans / Patreon / Fansly)", searchPattern: "https://kemono.cr/search?q={q}" },
  { name: "Coomer", url: "https://coomer.st/", domain: "coomer.st", category: "adult", subcategory: "live_action", blurb: "Leaked creator media index (OnlyFans / Patreon)", searchPattern: "https://coomer.st/search?q={q}" },

  // ---- Adult torrents ----
  { name: "1337x XXX", url: "https://1337x.to/", domain: "1337x.to", category: "torrents", blurb: "Adult torrent packs via 1337x XXX category", searchPattern: "https://1337x.to/category-search/{q}/XXX/1/" },
];

export function buildSearchUrl(provider: Provider, query: string): string {
  const q = (query || "").trim();
  if (!provider.searchPattern) return provider.url;
  if (!q) return provider.url;
  const isPathStyle = !provider.searchPattern.includes("=");
  const encoded = isPathStyle
    ? encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))
    : encodeURIComponent(q);
  return provider.searchPattern.replace("{q}", encoded);
}

// ---------------------------------------------------------------------------
// Embed players. Each server declares which id scheme it needs; the player
// filters the list to servers we can actually build a URL for with the ids a
// title has. Keeps TMDB ids and IMDb tt-codes strictly separate.
// ---------------------------------------------------------------------------
export type EmbedServerKey = "vidlink" | "anyembed" | "2embed" | "vidsrc" | "direct";

export interface EmbedServerInfo {
  key: EmbedServerKey;
  label: string;
  note: string;
  requires: "tmdb" | "imdb" | "file";
}

export const EMBED_SERVERS: EmbedServerInfo[] = [
  { key: "vidlink", label: "VidLink", note: "Fast HD", requires: "tmdb" },
  { key: "anyembed", label: "AnyEmbed", note: "Smashy successor", requires: "tmdb" },
  { key: "2embed", label: "2Embed", note: "Backup", requires: "tmdb" },
  { key: "vidsrc", label: "VidSrc", note: "IMDb source", requires: "imdb" },
  { key: "direct", label: "Direct file", note: "MP4 / HLS", requires: "file" },
];

export interface EmbedTarget {
  tmdbId?: string;
  imdbId?: string;
  type?: string;
  streamUrl?: string;
  season?: number;
  episode?: number;
}

export function isDirectMediaFile(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mkv|mov|m4v|m3u8|mpd|pdf|epub|mobi|azw3|djvu|cbz|cbr|txt|fb2|zip)(\?|#|$)/i.test(url);
}

/** Build the embed iframe URL for a server, or null when the title lacks the
 *  id scheme that server needs (the player hides such servers). */
export function buildEmbedUrl(server: EmbedServerKey, t: EmbedTarget): string | null {
  const isTv = t.type === "tv";
  const season = Math.max(1, t.season ?? 1);
  const episode = Math.max(1, t.episode ?? 1);
  switch (server) {
    case "vidlink":
      if (!t.tmdbId) return null;
      return isTv ? `https://vidlink.pro/tv/${t.tmdbId}/${season}/${episode}` : `https://vidlink.pro/movie/${t.tmdbId}`;
    case "anyembed":
      if (!t.tmdbId) return null;
      return isTv
        ? `https://anyembed.xyz/embed/tmdb-tv-${t.tmdbId}-${season}-${episode}`
        : `https://anyembed.xyz/embed/tmdb-movie-${t.tmdbId}`;
    case "2embed":
      if (!t.tmdbId) return null;
      return isTv
        ? `https://www.2embed.skin/embedtv/${t.tmdbId}&s=${season}&e=${episode}`
        : `https://www.2embed.skin/embed/${t.tmdbId}`;
    case "vidsrc":
      if (!t.imdbId) return null;
      return isTv
        ? `https://vidsrc.to/embed/tv/${t.imdbId}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${t.imdbId}`;
    case "direct":
      return isDirectMediaFile(t.streamUrl) ? t.streamUrl! : null;
  }
}

// ---------------------------------------------------------------------------
// Trending catalog with real authentic CDN poster artwork & TMDB IDs
// ---------------------------------------------------------------------------
function makeItem(
  id: string,
  title: string,
  year: number,
  type: MediaItem["type"],
  rating: number,
  quality: MediaItem["quality"],
  seeds: number,
  provider: string,
  providerUrl: string,
  genre: string[],
  overview: string,
  realPoster?: string,
  tmdbId?: string,
  subcategory?: MediaItem["subcategory"]
): MediaItem {
  return {
    id,
    title,
    year,
    type,
    poster: realPoster || genrePoster(genre),
    rating,
    quality,
    seeds,
    provider,
    providerUrl,
    genre,
    overview,
    tmdbId,
    subcategory
  };
}

export const TRENDING_MEDIA: MediaItem[] = [
  makeItem("ad-overflow", "Overflow (Uncensored HD Series)", 2020, "adult", 9.2, "1080p", 28400, "Hanime", "https://hanime.tv/browse/search?q=overflow", ["Hentai", "Romance"], "Two childhood friends end up in an unconventional relationship with their neighbor.", "https://media.kitsu.app/anime/46541/poster_image/large-d91b36dfd493c11c800f344c1baaa367.jpeg", undefined, "hentai"),
  makeItem("ad-mankitsu", "Mankitsu Happening", 2015, "adult", 9.1, "1080p", 24500, "HentaiHaven", "https://hentaihaven.xxx/?s=mankitsu", ["Hentai", "Comedy"], "A comic cafe becomes the backdrop for unexpected encounters.", "https://media.kitsu.app/anime/poster_images/5497/large.jpg", undefined, "hentai"),
  makeItem("ad-rance", "Rance 01: The Quest for Hikari", 2014, "adult", 9.0, "1080p", 19800, "Hanime", "https://hanime.tv/browse/search?q=rance", ["Hentai", "Fantasy"], "The warrior Rance embarks on a quest across the kingdom of Leas.", "https://media.kitsu.app/anime/poster_images/6988/large.jpg", undefined, "hentai"),
  makeItem("ad-meta", "Metamorphosis (Emergence / 177013)", 2016, "adult", 9.3, "1080p", 35000, "Nhentai", "https://nhentai.net/g/177013/", ["Adult Manga", "Drama"], "Shindo L's dramatic and infamous serialized doujinshi manga work.", "https://cdn.myanimelist.net/images/manga/2/153177l.jpg", undefined, "hentai"),
  makeItem("ad-nozoki", "Nozoki Ana", 2009, "adult", 8.7, "1080p", 15800, "MangaDex", "https://mangadex.org/title/076da7fe-a78b-4b2a-8c54-7c27d89617b6/nozoki-ana", ["Adult Manga", "Ecchi"], "Tatsuhiko discovers a peephole in his apartment wall connecting to his neighbor.", "https://cdn.myanimelist.net/images/manga/1/158659l.jpg", undefined, "hentai"),
  makeItem("ad-4k-cinema", "Ultra HD 4K Cinema Collection 60FPS", 2024, "adult", 9.0, "4K", 26500, "Eporner (4K)", "https://www.eporner.com/search/4k/", ["4K Tube", "Ultra HD"], "Curated high-bitrate 60FPS Ultra HD video streams from verified studios.", "https://static-ca-cdn.eporner.com/thumbs/static4/1/17/179/17977963/5_240.jpg", undefined, "live_action"),
  makeItem("ad-spank-hdr", "SpankBang 4K HDR Direct Streams", 2024, "adult", 8.9, "4K", 23400, "SpankBang", "https://spankbang.com/s/4k", ["4K Tube", "Direct MP4"], "Ultra-fast direct MP4 video downloads and HD streaming playback.", "https://static-ca-cdn.eporner.com/thumbs/static4/1/17/179/17984135/10_240.jpg", undefined, "live_action"),
];

// ---------------------------------------------------------------------------
// 5 Catalog modes
// ---------------------------------------------------------------------------
/** The mode key itself ("movies" | "anime" | ...). */
export type CatalogMode = ModeKey;

/** Descriptor for one catalog-mode tab. */
export interface CatalogModeInfo {
  key: ModeKey;
  label: string;
  count: number;
  title: string;
  desc: string;
  categories: ProviderCategory[];
}

export const CATALOG_MODES: CatalogModeInfo[] = [
  { key: "all", label: "Universal", count: 21, title: "Universal Adult Search", desc: "Search across all 21+ providers at once — JAV, hentai, OnlyFans leaks, tubes and torrents in one query.", categories: ["adult", "torrents"] },
  { key: "adult", label: "Adult Media", count: 19, title: "JAV, Hentai & Tube Catalogs", desc: "High-speed 4K networks: Pornhub, Eporner, SpankBang, MissAV, JAVGuru, Hanime, HentaiHaven, Kemono leaks.", categories: ["adult"] },
];

export const TOPICS: Topic[] = [
  { key: "jav", label: "JAV", emoji: "🇯🇵", query: "JAV uncensored", mode: "all" },
  { key: "hentai", label: "Hentai", emoji: "🔞", query: "hentai uncensored", mode: "all" },
  { key: "4kad", label: "4K Ultra HD", emoji: "✨", query: "4K HDR", mode: "adult" },
  { key: "onlyfans", label: "OnlyFans Leaks", emoji: "💎", query: "onlyfans leak", mode: "all" },
];

export const DESKTOP_FEATURES = [
  { label: "Direct Link Resolver", status: "50ms", tone: "emerald" as const },
  { label: "Ad-Block Filter Engine", status: "Active", tone: "blue" as const },
  { label: "BitTorrent DHT Swarm", status: "Ready", tone: "amber" as const },
  { label: "Multi-thread aria2c", status: "Active", tone: "emerald" as const },
];

export const INSTALL_PACKAGES = [
  { os: "Windows", ext: ".msi / .zip" },
  { os: "macOS", ext: "Universal .dmg" },
  { os: "Linux", ext: ".AppImage / .deb" },
];

export const PILLARS = [
  { emoji: "🇯🇵", title: "JAV Streaming & Download", body: "Censored and uncensored JAV from <strong>MissAV</strong>, <strong>JAVGuru</strong>, <strong>SupJAV</strong>, and <strong>JAVLibrary</strong> — 1080p multi-server streams with direct MP4.", tags: ["JAV", "Uncensored", "1080p"], tone: "blue" as const },
  { emoji: "🔞", title: "Hentai & Doujinshi", body: "Subbed uncensored hentai from <strong>Hanime</strong>, <strong>HentaiHaven</strong>, and doujinshi via <strong>Nhentai</strong> — direct 1080p episodes.", tags: ["Hentai", "Sub/Dub", "1080p"], tone: "emerald" as const },
  { emoji: "💎", title: "OnlyFans & Creator Leaks", body: "Search <strong>Kemono</strong> & <strong>Coomer</strong> archives for OnlyFans, Patreon, and Fansly creators — photos, videos, archives.", tags: ["Leaks", "Creators", "Archive"], tone: "cyan" as const },
  { emoji: "⚡", title: "Universal Adult Downloader", body: "Download 4K HDR from <strong>Pornhub</strong>, <strong>Eporner</strong>, <strong>SpankBang</strong>, and torrent packs via <strong>1337x XXX</strong> — yt-dlp + aria2c powered.", tags: ["4K HDR", "MP4 / MKV", "Torrent"], tone: "amber" as const },
];

export const FAQS = [
  { q: "How do I stream JAV or hentai on CornCine?", a: "Search any title, pick a provider card (MissAV, Hanime, Eporner...), hit Play. The player supports HLS quality switching, fullscreen and PiP.", tone: "blue" as const },
  { q: "How do I download videos from Pornhub or Eporner?", a: "Hit Save on any result — the server fetches the real MP4 via yt-dlp and serves it to your device. Torrent packs route through aria2c/webtorrent.", tone: "emerald" as const },
  { q: "Can I search OnlyFans leaks?", a: "Yes — the Leak Search section queries Kemono and Coomer live for any creator name, plus deep-links to 17 other leak sites.", tone: "cyan" as const },
  { q: "Is CornCine private?", a: "Yes. No accounts, no telemetry, no logs. All scraping runs server-side so your IP never touches source sites directly (proxy pool optional).", tone: "amber" as const },
];

export const DIRECTORY = [
  {
    emoji: "🔥", title: "Trending Adult (4K / 1080p)",
    links: [
      { label: "Overflow Uncensored HD", q: "overflow", mode: "adult" as ModeKey },
      { label: "Mankitsu Happening", q: "mankitsu", mode: "adult" as ModeKey },
      { label: "Metamorphosis 177013", q: "177013", mode: "adult" as ModeKey },
      { label: "Eporner 4K 60FPS", q: "4K", mode: "adult" as ModeKey },
    ],
  },
  {
    emoji: "🇯🇵", title: "JAV Index",
    links: [
      { label: "MissAV Search", q: "", mode: "all" as ModeKey },
      { label: "JAVGuru Censored/Uncensored", q: "", mode: "all" as ModeKey },
      { label: "SupJAV Multi-Server", q: "", mode: "all" as ModeKey },
    ],
  },
  {
    emoji: "💎", title: "Creator Leaks",
    links: [
      { label: "Kemono Archive", q: "", mode: "all" as ModeKey },
      { label: "Coomer Archive", q: "", mode: "all" as ModeKey },
      { label: "Eva Elfie Leak Search", q: "eva elfie", mode: "all" as ModeKey },
    ],
  },
  {
    emoji: "⚡", title: "Universal Extractors",
    links: [
      { label: "Pornhub to MP4 (4K)", q: "", mode: "all" as ModeKey, action: "downloader" },
      { label: "Torrent Magnet Player", q: "", mode: "all" as ModeKey, action: "downloader" },
    ],
  },
];

export interface LinkDetection {
  platform: string;
  icon: string;
  type: string;
  kind: "video" | "magnet" | "audio" | "unknown";
}

export function detectLink(input: string): LinkDetection {
  const v = (input || "").trim().toLowerCase();
  if (!v) return { platform: "Awaiting link", icon: "🎬", type: "—", kind: "unknown" };
  if (v.startsWith("magnet:?")) return { platform: "BitTorrent Magnet", icon: "🧲", type: "Swarm Stream", kind: "magnet" };
  if (v.includes("youtube.com") || v.includes("youtu.be")) return { platform: "YouTube", icon: "▶️", type: "Video", kind: "video" };
  if (v.includes("tiktok.com")) return { platform: "TikTok", icon: "🎵", type: "No-Watermark Video", kind: "video" };
  if (v.includes("twitter.com") || v.includes("x.com")) return { platform: "Twitter / X", icon: "🐦", type: "Video", kind: "video" };
  if (v.includes("reddit.com") || v.includes("redd.it")) return { platform: "Reddit", icon: "👽", type: "Video", kind: "video" };
  if (v.includes("vimeo.com")) return { platform: "Vimeo", icon: "🎥", type: "Video", kind: "video" };
  if (/\.(mp4|mkv|webm|mov|avi)(\?|$)/.test(v)) return { platform: "Direct Stream", icon: "📥", type: "MP4 / MKV", kind: "video" };
  if (/\.(mp3|flac|wav|m4a)(\?|$)/.test(v)) return { platform: "Audio File", icon: "🎧", type: "Audio", kind: "audio" };
  if (v.startsWith("http")) return { platform: "Generic URL", icon: "🔗", type: "Auto-Detect", kind: "video" };
  return { platform: "Unknown", icon: "❓", type: "—", kind: "unknown" };
}
