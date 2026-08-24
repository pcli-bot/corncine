#!/usr/bin/env python3
"""
Headless-browser media extractor.

Given an embed/player page URL, render it in headless Chromium, trigger
playback, and capture the REAL media URL the player actually requests
(DASH .mpd / HLS .m3u8 / direct .mp4). Print a single JSON line:
    {"url": "<real media url>"}   or   {"url": null}

This is the universal fallback for JS-driven players (vidlink.pro,
smashystream, hanime.tv, …) whose source URLs are generated client-side and
therefore invisible to plain HTTP scrapers or yt-dlp. The resolved URL is
meant to be consumed server-side (e.g. by the download engine) — it should
never be returned to the end user.

Invoked from src/lib/extract.ts via child_process. Degrades to {"url": null}
if Chromium/playwright is unavailable.
"""
import sys
import json
import os
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

MEDIA = (".mpd", ".m3u8", ".mp4", ".m4v", ".webm", ".ts")
# Skip thumbnails, previews, ads, subtitles and raw segments (we want the manifest).
SKIP = (
    "preview", "thumb", "heatmap", "storyboard", "poster", "jwplayer",
    "fonts.", "/js/", "googletag", "adsystem", "subtitle", ".srt", ".vtt", ".m4s",
    "challenges.cloudflare.com", "/ads/", "adserver", "doubleclick",
)


def build_proxy() -> dict | None:
    """Route the headless browser through EXTRACT_PROXY (set by the Node caller
    from PROXY_POOL) so extraction works from any egress IP, not just the
    server's own. Parses http(s)://user:pass@host:port."""
    raw = os.environ.get("EXTRACT_PROXY")
    if not raw:
        return None
    p = urlparse(raw)
    proxy = {"server": f"{p.scheme or 'http'}://{p.netloc}"}
    if p.username:
        proxy["username"] = p.username
    if p.password:
        proxy["password"] = p.password
    return proxy


def rank(u: str) -> int:
    ul = u.lower()
    if ".mpd" in ul:
        return 0
    if ".m3u8" in ul:
        return 1
    if ".mp4" in ul:
        return 2
    return 3


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"url": None}))
        return
    url = sys.argv[1]
    captured = []

    def sniff(r):
        u = r.url
        ul = u.lower()
        if any(k in ul for k in MEDIA) and not any(x in ul for x in SKIP):
            captured.append(u)

    try:
        proxy = build_proxy()
        with sync_playwright() as p:
            b = p.chromium.launch(
                args=["--no-sandbox", "--disable-dev-shm-usage",
                      "--autoplay-policy=no-user-gesture-required"]
            )
            UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            ctx = b.new_context(user_agent=UA, proxy=proxy) if proxy else b.new_context(user_agent=UA)
            pg = ctx.new_page()
            pg.on("request", sniff)

            def attempt_play() -> None:
                try:
                    pg.evaluate(
                        "() => { document.querySelectorAll('video').forEach(v => { v.muted = true; try { v.play(); } catch (e) {} }); }"
                    )
                except Exception:
                    pass
                try:
                    pg.mouse.click(640, 360)
                except Exception:
                    pass
                try:
                    pg.evaluate(
                        "() => { document.querySelectorAll('button,.jw-icon-play,.play-btn').forEach(e => { try { e.click(); } catch (_) {} }); }"
                    )
                except Exception:
                    pass
                pg.wait_for_timeout(9000)

            pg.goto(url, wait_until="domcontentloaded", timeout=30000)
            pg.wait_for_timeout(4000)
            attempt_play()

            # SPA search/listing pages (e.g. hanime.tv/browse/search?q=...) never
            # play anything themselves. If nothing was captured, click through to
            # the first plausible video link on the same site and retry there.
            if not captured:
                try:
                    href = pg.evaluate(
                        """() => {
                            const pat = /(\\/videos?\\/[^\\/]+|\\/watch\\/|\\/video-[A-Za-z0-9]+)/i;
                            const bad = /(browse|search|tag|category|login|signup|\\.(jpg|png|webp|gif|css|js)(\\?|$))/i;
                            const links = [...document.querySelectorAll('a[href]')]
                                .map(a => a.href)
                                .filter(h => h.startsWith(location.origin) && pat.test(new URL(h).pathname) && !bad.test(h));
                            return links[0] || null;
                        }"""
                    )
                    if href and href.rstrip("/") != url.rstrip("/"):
                        captured.clear()
                        pg.goto(href, wait_until="domcontentloaded", timeout=30000)
                        pg.wait_for_timeout(4000)
                        attempt_play()
                except Exception:
                    pass

            ctx.close()
            b.close()
    except Exception:
        pass

    captured = [m for m in dict.fromkeys(captured) if not any(x in m.lower() for x in SKIP)]
    captured.sort(key=rank)
    best = captured[0] if captured else None
    print(json.dumps({"url": best}))


if __name__ == "__main__":
    main()
