# Deploy AniCine on Render (backend) + Cloudflare (frontend edge)

Topology (per the constraint that the backend can't run on Cloudflare's runtime):
- **Cloudflare** = edge in front. Serves/caches the **frontend** and runs the
  lightweight `anicine-api` **Worker** (D1 user-state). See
  `deploy/cloudflare/frontend-cdn.md` for the DNS + cache-rule setup.
- **Render** = the **backend**. Runs the full Next.js app (SSR frontend as origin
  + the in-process download engine + embed extraction + search/leak API). It is
  the hidden origin Cloudflare proxies to.

Why this split: the backend uses node:fs, child_process, yt-dlp, ffmpeg and
headless Chromium — none of which exist in Cloudflare Workers. So Render must be
backend; Cloudflare serves the frontend at the edge. No code change needed.

For very low traffic this is the cheapest viable setup — no Raspberry Pi, no
always-on metal. The Pi artifacts in `deploy/pi/` are now unnecessary.

## 1. Cloudflare (edge + Worker) first
```bash
cd /opt/corncine
wrangler login
bash deploy/cloudflare/setup.sh      # creates D1/KV/R2/Queue, migrates, deploys Worker
```
`wrangler deploy` prints the Worker URL — you need it for the next step.

## 2. Render (web app)
1. Push the repo to GitHub.
2. Render → *New* → *Blueprint* → connect the repo. It reads `deploy/render/render.yaml`.
3. Set the `sync: false` env vars:
   - `NEXT_PUBLIC_API_URL` = the Cloudflare Worker URL from step 1.
   - `NEXT_PUBLIC_SITE_URL` = your Render URL (e.g. `https://anicine-web.onrender.com`).
   - `PROXY_POOL` = **residential/mobile** proxy, `http://user:pass@host:port`
     (one, or comma-separated). Needed for Coomer/OnlyFans and for embed
     extraction when the source blocks Render's IP.
   - `FLEET_TOKEN` = only if you enable the optional fleet service.
4. Deploy. The Dockerfile builds the standalone Next server + yt-dlp/ffmpeg/aria2c.

## Plans / RAM note
- `plan: free` (default in the blueprint): fine for **yt-dlp-only** downloads
  (YouTube, tubes, social, hanime.tv natively, …). Caveats: sleeps after 15 min
  idle (cold start on first visit), and **cannot run headless Chromium**.
- Headless **embed extraction** (vidlink.pro / smashystream / hanime.tv / any
  JS player) needs Chromium → uncomment the `playwright install chromium` block
  in `deploy/render/Dockerfile` and bump the service to **starter** ($7/mo,
  ~2 GB RAM). Otherwise those specific JS-embed hosts fall back to yt-dlp and may
  fail. The extractor degrades gracefully either way.

## What "download anything" covers here
- Direct files, ~1,000s of yt-dlp hosts, and (on starter) any JS-embed player
  via headless-Chromium capture. Non-DRM only. DRM/paid-login streams are out of
  scope.
- `PROXY_POOL` is the real variable at every stage — residential bandwidth is the
  dominant cost. Dedup (fetch-once → R2 → CDN) keeps it low.

## Scale-out (later, optional)
When a single web service isn't enough, uncomment the `anicine-fleet` service in
`render.yaml` (or use `fleet/docker-compose.yml`). The Worker enqueues; the
fleet fetches via yt-dlp/ffmpeg and PATCHes status. You don't need this at low
traffic.
