#!/usr/bin/env bash
# Rebuild + serve the standalone bundle reliably.
#
# Two failure modes this guards against, both hit repeatedly by hand:
#   1. `cp -r .next/static .next/standalone/.next/static` NESTS static/static
#      when the target already exists, so asset hashes stop matching the HTML.
#   2. A stale next-server left over from an earlier run keeps the port, the new
#      server fails to bind, and you keep testing the OLD build without noticing.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"
cd "$DIR"

echo "==> freeing port $PORT"
fuser -k "${PORT}/tcp" 2>/dev/null || true
pkill -9 -f "$DIR/.next/standalone/server.js" 2>/dev/null || true
sleep 2

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "==> building"
  npm run build >/tmp/serve-build.log 2>&1 || { tail -20 /tmp/serve-build.log; exit 1; }
fi

echo "==> syncing static assets (replace, never nest)"
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || true
[ -d scripts ] && mkdir -p .next/standalone/scripts && cp -f scripts/*.py .next/standalone/scripts/ 2>/dev/null || true

echo "==> starting"
PORT="$PORT" nohup node .next/standalone/server.js >/tmp/serve.log 2>&1 &
for i in $(seq 1 30); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/api/health" || true)
  [ "$code" = "200" ] && break
done
[ "$code" = "200" ] || { echo "server did not come up"; tail -20 /tmp/serve.log; exit 1; }

# Assert every referenced stylesheet actually resolves — this is the check that
# would have caught the silent unstyled-page state immediately.
bad=0
for c in $(curl -s "http://127.0.0.1:$PORT/" | grep -oE '/_next/static/chunks/[a-z0-9_-]+\.css' | sort -u); do
  s=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$c")
  echo "    $c -> $s"
  [ "$s" = "200" ] || bad=1
done
[ "$bad" = "0" ] && echo "==> ready on http://127.0.0.1:$PORT (assets verified)" || { echo "!! stylesheet 404/500 — build/static mismatch"; exit 1; }
