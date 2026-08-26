"use client";

import { API_BASE } from "@/lib/api";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAnicineStore } from "@/lib/anicine-store";
import { EMBED_SERVERS, buildEmbedUrl, isDirectMediaFile, type EmbedServerKey } from "@/lib/anicine-data";
import { X, Gauge, Magnet, Film, Download, Image as ImageIcon, Maximize2, Minimize2, Settings, Loader2, PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/anicine-toast";

// Lazy-loaded hls.js (only imported when an .m3u8 stream is actually played)
type HlsJs = InstanceType<(typeof import("hls.js"))["default"]>;
let hlsCtor: (typeof import("hls.js"))["default"] | null = null;
async function loadHls(): Promise<typeof import("hls.js")["default"] | null> {
  if (hlsCtor) return hlsCtor;
  try {
    const mod = await import("hls.js");
    hlsCtor = mod.default;
    return hlsCtor;
  } catch {
    return null;
  }
}

export function PlayerModal() {
  const player = useAnicineStore((s) => s.player);
  const setPlayer = useAnicineStore((s) => s.setPlayer);
  const setDrawer = useAnicineStore((s) => s.setDrawer);
  const addTask = useAnicineStore((s) => s.addTask);
  const [speed, setSpeed] = useState(1);
  const [server, setServer] = useState<EmbedServerKey>("vidlink");

  // Server-resolved direct stream (adult catalog: no TMDB id -> /api/stream).
  const [resolvedStream, setResolvedStream] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [theater, setTheater] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaWrapRef = useRef<HTMLDivElement>(null); // fullscreen target for video + iframe
  const hlsRef = useRef<HlsJs | null>(null);

  // HLS state
  const [isHls, setIsHls] = useState(false);
  const [levels, setLevels] = useState<Array<{ index: number; height: number; bitrate: number }>>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  // Playback state
  const [buffering, setBuffering] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const close = () => setPlayer({ open: false, title: "" });

  const isTv = player.type === "tv";
  const isMagnet = !!player.isMagnet || (player.url?.startsWith("magnet:") ?? false);
  const isArt = player.type === "art";
  const isBook = player.type === "book";
  const effUrl = resolvedStream ?? player.url ?? "";
  const isDirectHls = /\.(m3u8|mpd)(\?|#|$)/i.test(effUrl);
  const showNativeVideo = !isBook && !isArt && !isMagnet && (server === "direct" || (isDirectMediaFile(effUrl) && !isDirectHls));

  const target = useMemo(
    () => ({
      tmdbId: player.tmdbId,
      imdbId: player.imdbId,
      type: player.type,
      streamUrl: resolvedStream ?? player.url,
      season,
      episode,
    }),
    [player.tmdbId, player.imdbId, player.type, player.url, resolvedStream, season, episode],
  );

  // ------------------- Server-side stream resolution -------------------
  // Adult catalog entries carry provider/search pages instead of TMDB ids.
  // When no embed can be built, ask our server to extract the real media URL.
  useEffect(() => {
    setResolvedStream(null);
    setResolveFailed(false);
    setResolving(false);

    const url = player.url || "";
    if (
      !player.open ||
      player.tmdbId ||
      player.isMagnet ||
      player.type === "book" ||
      player.type === "art" ||
      !/^https?:\/\//i.test(url) ||
      isDirectMediaFile(url)
    ) {
      return; // embeds handle tmdb titles; magnets/books/art/direct files have their own paths
    }

    let canceled = false;
    setResolving(true);
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (canceled) return;
        if (data?.ok && data.playUrl) {
          setResolvedStream(data.playUrl as string);
        } else {
          setResolveFailed(true);
        }
      } catch {
        if (!canceled) setResolveFailed(true);
      } finally {
        if (!canceled) setResolving(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [player.open, player.url, player.tmdbId, player.isMagnet, player.type]);

  // Only offer servers we can actually build a URL for with the ids this title has.
  const usableServers = useMemo(
    () => EMBED_SERVERS.filter((s) => buildEmbedUrl(s.key, target) !== null),
    [target],
  );

  // Keep the selected server valid whenever the title changes.
  useEffect(() => {
    if (usableServers.length > 0 && !usableServers.some((s) => s.key === server)) {
      setServer(usableServers[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usableServers]);

  useEffect(() => {
    if (!player.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.open]);

  useEffect(() => {
    if (videoRef.current) {
      try { videoRef.current.playbackRate = speed; } catch { /* noop */ }
    }
  }, [speed, player.url]);

  // ------------------- HLS attach / detach -------------------
  const detachHls = useCallback(() => {
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch { /* already gone */ }
      hlsRef.current = null;
    }
    setIsHls(false);
    setLevels([]);
    setCurrentLevel(-1);
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    const src = resolvedStream ?? (player.url || "");
    const isHlsSrc = /\.(m3u8)(\?|#|$)/i.test(src);
    setVideoError(null);

    // Clean up previous instance first
    detachHls();

    if (!videoEl || !src || !isHlsSrc) return; // native <video> handles mp4/webm

    let canceled = false;

    void (async () => {
      const Hls = await loadHls();
      if (!Hls) {
        // Safari has native HLS — leave it alone
        if (!canceled && videoEl.canPlayType("application/vnd.apple.mpegurl")) return;
        if (!canceled) setVideoError("HLS engine failed to load. Try a different server or download.");
        return;
      }
      if (!Hls.isSupported()) {
        // Safari native HLS path — just set src
        videoEl.src = src;
        return;
      }
      if (canceled) return;
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        enableWorker: true,
        lowLatencyMode: false,
        startLevel: -1, // ABR auto
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        if (canceled) return;
        setIsHls(true);
        const lv = data.levels.map((l, i) => ({ index: i, height: l.height || 0, bitrate: l.bitrate }));
        setLevels(lv);
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        if (!canceled) setCurrentLevel(data.level);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (canceled || !data.fatal) return;
        switch (data.type) {
          case "networkError":
            try { hls.startLoad(); } catch { setVideoError("Network error loading stream."); }
            break;
          case "mediaError":
            try { hls.recoverMediaError(); } catch { setVideoError("Stream codec error."); }
            break;
          default:
            detachHls();
            setVideoError("Fatal stream error — try another server.");
            break;
        }
      });
    })();

    return () => {
      canceled = true;
      detachHls();
    };
     
  }, [player.url, resolvedStream, detachHls]);

  // Track fullscreen state so icon toggles reactively
  useEffect(() => {
    if (!player.open) return;
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [player.open]);

  // Buffering indicator events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("canplay", onCanPlay);
    return () => {
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("canplay", onCanPlay);
    };
  }, [player.url]);

  // Video error → auto-switch to next usable server
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onError = () => {
      setVideoError("Playback error — switching server…");
      const idx = usableServers.findIndex((s) => s.key === server);
      const next = usableServers[idx + 1] ?? usableServers[0];
      if (next && next.key !== server) {
        showToast(`Server failed, switching to ${next.label}`, "info");
        setTimeout(() => setServer(next.key), 600);
      }
    };
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
     
  }, [server, usableServers]);

  // ------------------- Fullscreen + PiP -------------------
  const toggleFullscreen = async () => {
    const el = mediaWrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      showToast("Fullscreen blocked by browser", "error");
    }
  };

  const togglePiP = async () => {
    const el = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null;
    if (!el?.requestPictureInPicture) { showToast("Picture-in-Picture not supported", "error"); return; }
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch {
      showToast("PiP failed", "error");
    }
  };

  const setQuality = (idx: number) => {
    setCurrentLevel(idx);
    if (hlsRef.current) hlsRef.current.currentLevel = idx;
  };

  if (!player.open) return null;

  const embedUrlFinal = buildEmbedUrl(server, target);

  const handleDownload = async () => {
    // Prefer the currently selected embed server's URL; fall back to the raw
    // stream URL (magnet / direct file / source page) when no embed exists.
    const url = embedUrlFinal && server !== "direct" ? embedUrlFinal : (resolvedStream ?? player.url);
    if (!url) { showToast("No downloadable source for this title", "error"); return; }
    try {
      const res = await fetch(`${API_BASE}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title: player.title,
          source: usableServers.find((s) => s.key === server)?.label ?? "Player",
          format: "video",
          quality: "1080p",
          engine: "yt-dlp",
        }),
      });
      const data = await res.json();
      if (!data?.ok) { showToast(data?.error || "Download failed to start", "error"); return; }
      addTask({
        url,
        title: data.title,
        source: data.source,
        format: data.format,
        quality: data.quality,
        size: data.size,
        jobId: data.id,
      });
      showToast("Added to download queue", "success");
      setDrawer(true);
    } catch {
      showToast("Network error", "error");
    }
  };

  const qualityLabel = (h: number) => (h ? `${h}p` : "?");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={close} className="absolute inset-0 bg-[#0B0E15]/95 backdrop-blur-md" />
      <div className={cn("relative bg-[#151922] border border-[#4D5566] rounded-xl w-full overflow-hidden shadow-2xl animate-scale-in flex flex-col spring-transition", theater ? "max-w-6xl" : "max-w-4xl")}>

        {/* Header */}
        <div className="p-3.5 bg-[#202530] border-b border-[#323947] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EC69AE]/15 text-[#EC69AE] border border-[#EC69AE]/30 uppercase font-mono">
              {isBook ? "Book" : isArt ? "Image" : isMagnet ? "Torrent" : "Stream"}
            </span>
            <h4 className="text-xs sm:text-sm font-semibold text-[#F8FAFC] truncate" title={player.title}>{player.title}</h4>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setTheater(!theater)} className="px-2.5 py-1 rounded bg-[#2A303D] border border-[#323947] text-xs text-[#B3B7C1] hover:text-[#F8FAFC] spring-transition flex items-center gap-1">
              <Gauge className="w-3 h-3" /> {theater ? "Normal" : "Theater"}
            </button>
            <button onClick={close} className="p-1.5 rounded bg-[#2A303D] border border-[#323947] text-[#B3B7C1] hover:text-[#F8FAFC] spring-transition" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server Selector Bar */}
        <div className="px-3.5 py-2 bg-[#151922] border-b border-[#323947] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[#949AA5] font-mono text-[11px] uppercase mr-1">Server:</span>
            {usableServers.length === 0 ? (
              <span className="text-[11px] text-[#949AA5]">none available for this title</span>
            ) : (
              usableServers.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setServer(s.key)}
                  className={cn("px-2.5 py-1 rounded text-xs font-semibold spring-transition whitespace-nowrap", server === s.key ? "bg-[#EC69AE] text-[#0B0E15]" : "bg-[#202530] text-[#B3B7C1] border border-[#323947] hover:text-white")}
                  title={s.note}
                >
                  {s.label}
                </button>
              ))
            )}
            {isTv && (
              <span className="flex items-center gap-1 ml-2 text-[#B3B7C1] font-mono text-[11px]">
                S
                <input
                  type="number" min={1} max={99} value={season}
                  onChange={(e) => setSeason(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  className="w-10 bg-[#202530] border border-[#323947] rounded px-1 py-0.5 text-center"
                  aria-label="Season"
                />
                E
                <input
                  type="number" min={1} max={999} value={episode}
                  onChange={(e) => setEpisode(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  className="w-12 bg-[#202530] border border-[#323947] rounded px-1 py-0.5 text-center"
                  aria-label="Episode"
                />
              </span>
            )}
          </div>
          <button onClick={handleDownload} className="px-2.5 py-1 rounded bg-[#6AB27A]/15 text-[#6AB27A] border border-[#6AB27A]/30 text-xs font-semibold hover:bg-[#6AB27A]/25 spring-transition flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>

        {/* Media Display Container */}
        <div ref={mediaWrapRef} className="relative bg-black aspect-video flex flex-col items-center justify-center overflow-hidden group/media">
          {isBook ? (
            player.url ? (
              /\.(pdf)(\?|#|$)/i.test(player.url) ? (
                <iframe src={player.url} title={player.title} className="w-full h-full border-0 bg-white" />
              ) : (
                <div className="absolute inset-0 bg-[#202530]/95 flex flex-col items-center justify-center p-6 text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#DB3E98]/15 border border-[#DB3E98]/30 flex items-center justify-center">
                    <span className="text-xl">📚</span>
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-[#F8FAFC]">{player.title}</h5>
                    <p className="text-xs text-[#B3B7C1] max-w-md mx-auto">Book — PDF/EPUB available. Read online or download to your device.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={player.url} target="_blank" rel="noreferrer" className="px-3.5 py-1.5 rounded-lg bg-[#DB3E98] text-[#0B0E15] text-xs font-semibold hover:bg-violet-600">Read Online</a>
                    <button onClick={handleDownload} className="px-3.5 py-1.5 rounded-lg bg-[#2A303D] border border-[#323947] text-xs font-semibold text-[#F8FAFC] hover:border-[#4D5566]">Download</button>
                  </div>
                </div>
              )
            ) : (
              <EmptyState icon={<span className="text-2xl">📚</span>} text="No book source for this item." />
            )
          ) : isArt ? (
            player.url ? (
              <a href={player.url} target="_blank" rel="noreferrer" className="w-full h-full flex items-center justify-center">
                { }
                <img src={player.url} alt={player.title} className="max-w-full max-h-full object-contain" />
              </a>
            ) : (
              <EmptyState icon={<ImageIcon className="w-8 h-8 text-[#949AA5] mx-auto mb-2" />} text="No image source for this item." />
            )
          ) : isMagnet ? (
            <div className="absolute inset-0 bg-[#202530]/95 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center">
                <Magnet className="w-7 h-7 text-[#F59E0B]" />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm font-bold text-[#F8FAFC]">BitTorrent Magnet</h5>
                <p className="text-xs text-[#B3B7C1] max-w-md mx-auto">
                  This release is a BitTorrent URI. Launch your torrent client, or queue it on the server (requires aria2c or webtorrent installed).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href={player.url || "#"} className="px-3.5 py-1.5 rounded-lg bg-[#F59E0B] text-black text-xs font-semibold hover:bg-amber-400 spring-transition">Launch Client</a>
                <button onClick={handleDownload} className="px-3.5 py-1.5 rounded-lg bg-[#2A303D] border border-[#323947] text-xs font-semibold text-[#F8FAFC] hover:border-[#4D5566] spring-transition">Queue on Server</button>
              </div>
            </div>
          ) : resolving ? (
            <EmptyState
              icon={<Loader2 className="w-8 h-8 animate-spin text-[#949AA5] mx-auto mb-2" />}
              text="Resolving stream source…"
              sub="Extracting the real video URL from the provider (usually 5–30 seconds)."
            />
          ) : resolveFailed ? (
            <EmptyState
              icon={<Film className="w-8 h-8 text-[#949AA5] mx-auto mb-2" />}
              text="Couldn't extract a stream from this source."
              sub="The provider may be blocking server playback. Download still works — or open the source page directly."
            />
          ) : embedUrlFinal && (showNativeVideo || isDirectHls) ? (
            <>
              <video
                key={embedUrlFinal}
                ref={videoRef}
                src={!isDirectHls ? embedUrlFinal : undefined}
                controls
                preload="metadata"
                crossOrigin="anonymous"
                playsInline
                autoPlay
                className="w-full h-full object-contain"
              />
              {buffering && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
              )}
              {videoError && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[#EF4444]/90 text-white text-xs font-medium shadow-lg">{videoError}</div>
              )}
            </>
          ) : embedUrlFinal ? (
            <iframe
              key={embedUrlFinal}
              src={embedUrlFinal}
              referrerPolicy="origin"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <EmptyState
              icon={<Film className="w-8 h-8 text-[#949AA5] mx-auto mb-2" />}
              text="No stream source available for this title."
              sub="This catalog entry has no TMDB/IMDb id, so no embed server can be built for it. Use Download or search the title on a provider."
            />
          )}

          {/* Floating controls overlay — top-right of media area */}
          {(embedUrlFinal && (showNativeVideo || isDirectHls)) && (
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity z-10">
              {/* Quality selector (HLS only) */}
              {isHls && levels.length > 0 && (
                <div className="relative">
                  <label className="sr-only" htmlFor="quality-select">Quality</label>
                  <select
                    id="quality-select"
                    value={currentLevel}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="appearance-none bg-black/70 backdrop-blur-sm border border-white/20 text-white text-xs font-mono rounded px-2 py-1 pr-6 cursor-pointer hover:bg-black/85"
                    title="Quality"
                  >
                    <option value={-1}>Auto</option>
                    {levels.map((l) => (
                      <option key={l.index} value={l.index}>{qualityLabel(l.height)}</option>
                    ))}
                  </select>
                  <Settings className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/70" />
                </div>
              )}
              {/* PiP */}
              {!isDirectHls && (
                <button onClick={togglePiP} title="Picture-in-Picture" className="p-1.5 rounded bg-black/70 backdrop-blur-sm border border-white/20 text-white hover:bg-black/85 spring-transition">
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Fullscreen */}
              <button onClick={toggleFullscreen} title="Fullscreen" className="p-1.5 rounded bg-black/70 backdrop-blur-sm border border-white/20 text-white hover:bg-black/85 spring-transition">
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          {/* Fullscreen button also for iframe-based embeds */}
          {embedUrlFinal && !showNativeVideo && !isDirectHls && !isMagnet && !isBook && !isArt && (
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="absolute top-2 right-2 p-1.5 rounded bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-black/80 spring-transition opacity-100 transition-opacity z-10"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#202530] border-t border-[#323947] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#949AA5] font-mono text-[11px] min-w-0">
            <span className="truncate">
              {embedUrlFinal && server !== "direct"
                ? `Embed: ${new URL(embedUrlFinal).hostname}`
                : player.url
                  ? `Source: ${player.url.slice(0, 60)}${player.url.length > 60 ? "…" : ""}`
                  : "No source"}
              {isHls && currentLevel >= 0 && ` • ${qualityLabel(levels[currentLevel]?.height ?? 0)}${currentLevel === -1 ? " (auto)" : ""}`}
            </span>
          </div>
          {(showNativeVideo || isDirectHls) && (
            <div className="flex items-center gap-1 self-end sm:self-auto font-mono text-xs shrink-0">
              <span className="text-[#949AA5] mr-1">Speed:</span>
              {[1.0, 1.25, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "px-2 py-0.5 rounded border text-xs spring-transition",
                    speed === s ? "bg-[#EC69AE] text-[#0B0E15] border-[#EC69AE]" : "bg-[#2A303D] border-[#323947] text-[#B3B7C1] hover:text-white"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="px-6 text-center">
      {icon}
      <p className="text-sm text-[#B3B7C1]">{text}</p>
      {sub && <p className="text-xs text-[#949AA5] mt-1 max-w-md">{sub}</p>}
    </div>
  );
}
