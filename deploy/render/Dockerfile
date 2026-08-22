# Render web-service image for AniCine.
#
# Runs the Next.js *standalone* server (the app's `npm start` uses `bun
# .next/standalone/server.js`) with the in-process download engine
# (yt-dlp / ffmpeg / aria2c) and optional headless-Chromium embed extraction.
#
# Cloudflare hosts the Worker/D1/R2 (user-state + storage). This container is
# just the web app + download worker. Build context must be the repo root, with
# dockerfilePath: ./deploy/render/Dockerfile.
FROM node:20-slim

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

# Runtime + download-engine toolchain. The lib* packages are what headless
# Chromium needs at *runtime* (only used if you enable the optional block below).
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates python3 python3-pip ffmpeg aria2 \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libpango-1.0-0 libpangocairo-1.0-0 libasound2 libgtk-3-0 \
      fonts-liberation libxshmfence1 \
  && rm -rf /var/lib/apt/lists/*

# bun — the app's start command is `bun .next/standalone/server.js`.
RUN npm install -g bun

# yt-dlp + curl_cffi (Cloudflare impersonation) + webtorrent engines
RUN pip3 install --break-system-packages yt-dlp curl_cffi && \
    npm install -g webtorrent webtorrent-hybrid || true

# ---------------------------------------------------------------------------
# OPTIONAL: headless Chromium for embed extraction (vidlink.pro / smashystream /
# hanime.tv / any JS-driven player). Uncomment to enable. Needs ~1GB+ RAM, so
# use the Render *starter* plan (not free) — the free tier will OOM. The
# extractor degrades gracefully (returns null) if Chromium is absent, so the
# app still runs without this; you only lose JS-embed extraction.
# ---------------------------------------------------------------------------
# RUN python3 -m pip install --break-system-packages playwright \
#   && python3 -m playwright install chromium

# Install node deps (better layer caching) — handles bun.lock (preferred) or npm.
COPY package.json bun.lock package-lock.json* ./
RUN if [ -f bun.lock ]; then \
      bun install; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# App source. .dockerignore already drops node_modules/.next.
COPY . .

# Production build (emits .next/standalone per the project's build script).
RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["sh", "-c", "NODE_ENV=production bun .next/standalone/server.js"]
