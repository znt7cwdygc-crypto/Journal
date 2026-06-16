#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT=3000

echo "[stable] stopping processes on :$PORT"
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti tcp:$PORT || true)
  if [ -n "${PIDS:-}" ]; then
    echo "$PIDS" | xargs kill -9 || true
  fi
fi
pkill -f "next dev" || true

# robust cache cleanup
echo "[stable] cleaning build cache"
for i in 1 2 3; do
  rm -rf .next 2>/dev/null || true
  [ ! -e .next ] && break
  sleep 0.2
done

if [ -e .next ]; then
  echo "[stable] could not remove .next, forcing contents removal"
  find .next -mindepth 1 -exec rm -rf {} + 2>/dev/null || true
  rmdir .next 2>/dev/null || true
fi

echo "[stable] ensuring prisma client"
npx prisma generate >/dev/null

echo "[stable] building production assets"
npm run build
node scripts/ensure-webpack-runtime.mjs

if [ ! -d ".next/static" ]; then
  echo "[stable] ERROR: .next/static was not created; refusing to start without CSS/JS assets" >&2
  exit 1
fi

CSS_FILE="$(find .next/static/css -maxdepth 1 -type f -name '*.css' | head -n 1 || true)"
if [ -z "${CSS_FILE:-}" ] || [ ! -f "$CSS_FILE" ]; then
  echo "[stable] ERROR: production CSS file was not created; refusing to start without styles" >&2
  exit 1
fi

echo "[stable] refreshing legacy CSS fallback"
cp "$CSS_FILE" public/legacy-next-static.css

echo "[stable] starting next production server on :$PORT"
exec npx next start -p $PORT
