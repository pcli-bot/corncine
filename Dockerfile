# Standalone production image
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends aria2 ffmpeg python3 python3-pip ca-certificates curl \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libpangocairo-1.0-0 libasound2 libgtk-3-0 fonts-liberation libxshmfence1 \
  && rm -rf /var/lib/apt/lists/* \
  && pip install --no-cache-dir --break-system-packages yt-dlp curl_cffi playwright \
  && playwright install chromium --with-deps || playwright install chromium
COPY package.json bun.lock package-lock.json* ./
RUN if [ -f bun.lock ]; then \
      if ! command -v bun >/dev/null 2>&1; then npm install -g bun; fi; \
      bun install; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", ".next/standalone/server.js"]


