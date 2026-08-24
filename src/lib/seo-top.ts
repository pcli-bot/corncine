// Top-searched SEO data — used by sitemap, category pages, and directory.
// Curated from real trending + high-volume search terms. Each entry becomes a crawlable /search?q= URL and a sitemap entry.


export interface SeoEntry {
  slug: string;
  q: string;
  mode: "adult" | "all";
  title: string;
  desc: string;
}

// Top searched adult terms — JAV, hentai, leaks, tubes
export const TOP_HENTAI: SeoEntry[] = [
  { slug: "overflow", q: "Overflow", mode: "adult", title: "Overflow Uncensored Hentai Download 1080p", desc: "Download Overflow uncensored hentai 1080p via Hanime." },
  { slug: "mankitsu-happening", q: "Mankitsu Happening", mode: "adult", title: "Mankitsu Happening Hentai Download", desc: "Download Mankitsu Happening hentai." },
  { slug: "metamorphosis-177013", q: "177013", mode: "adult", title: "Metamorphosis 177013 Doujin Download", desc: "Download Metamorphosis 177013 manga via Nhentai." },
  { slug: "my-mother-hentai", q: "my mother", mode: "adult", title: "My Mother Hentai Search — Eporner 1080p", desc: "Search my mother hentai via Eporner/SpankBang Hanime." },
];

export const TOP_ADULT: SeoEntry[] = [
  { slug: "pornhub-top", q: "Pornhub", mode: "adult", title: "Pornhub Top Videos Download 4K", desc: "Index Pornhub 4K via PornHub, XHamster, XVideos — direct MP4." },
  { slug: "jav-guru", q: "JAV uncensored", mode: "all", title: "JAV Guru Download — MissAV JAVGuru SupJAV 1080p", desc: "JAV streaming & download via MissAV, JAVGuru, SupJAV — censored + uncensored 1080p." },
  { slug: "jav-missav", q: "MissAV JAV", mode: "all", title: "MissAV JAV Streams Download", desc: "Asian cinema & JAV streams via MissAV 1080p direct." },
  { slug: "onlyfans-eva-elfie", q: "Eva Elfie", mode: "all", title: "Eva Elfie OnlyFans Leak Search — Kemono Coomer", desc: "Search Eva Elfie leak via Kemono/Coomer — OnlyFans Patreon archive." },
  { slug: "eporner-4k", q: "4K HDR", mode: "adult", title: "Eporner 4K 60FPS Download", desc: "Download Eporner 4K 60FPS Ultra HD via direct MP4." },
  { slug: "spankbang-4k", q: "SpankBang 4K", mode: "adult", title: "SpankBang 4K HDR Direct Download", desc: "SpankBang 4K HDR direct MP4." },
  { slug: "hanime-top", q: "Hanime uncensored", mode: "adult", title: "Hanime Uncensored Subbed Download", desc: "Hanime 1080p subbed uncensored episodes." },
  { slug: "hentai-haven-classic", q: "Hentai Haven", mode: "adult", title: "Hentai Haven HD Download", desc: "Classic HD hentai via HentaiHaven." },
  { slug: "desitales2-desi", q: "DesiTales2", mode: "adult", title: "DesiTales2 Desi Kahani Download — Indian Sex Stories", desc: "Download DesiTales2 Indian desi chudai kahaniyan & sex videos — Hindi erotica via DesiTales2." },
  { slug: "sunny-leone", q: "Sunny Leone", mode: "adult", title: "Sunny Leone Download 4K — Most Searched Indian Icon", desc: "Download Sunny Leone 4K via Pornhub/XHamster — India's most searched icon." },
  { slug: "mia-khalifa", q: "Mia Khalifa", mode: "adult", title: "Mia Khalifa Viral Download — Most Searched Worldwide", desc: "Download Mia Khalifa viral archive via Pornhub — most searched worldwide." },
  { slug: "dani-daniels", q: "Dani Daniels", mode: "adult", title: "Dani Daniels 4K Download — Top Rated", desc: "Download Dani Daniels 4K top-rated collection via Pornhub." },
  { slug: "johnny-sins", q: "Johnny Sins", mode: "adult", title: "Johnny Sins Download — Most Popular Male 4K", desc: "Download Johnny Sins full archive via Pornhub — world's most searched male performer." },
  { slug: "eva-elfie", q: "Eva Elfie", mode: "all", title: "Eva Elfie OnlyFans Leak Download — Kemono Coomer 4K", desc: "Download Eva Elfie OnlyFans leak via Kemono/Coomer — top leak 2025." },
  { slug: "angela-white", q: "Angela White", mode: "adult", title: "Angela White Download 4K — Pornhub #1 2025", desc: "Download Angela White Pornhub #1 2025 4K collection." },
  { slug: "lana-rhoades", q: "Lana Rhoades", mode: "adult", title: "Lana Rhoades Download — Viral Archive", desc: "Download Lana Rhoades viral archive via Pornhub — former #1." },
  { slug: "bonnie-blue", q: "Bonnie Blue", mode: "adult", title: "Bonnie Blue Download 4K — Breakout #2 2025", desc: "Download Bonnie Blue breakout #2 2025 4K collection." },
];

export const ALL_TOP = [...TOP_HENTAI, ...TOP_ADULT];

