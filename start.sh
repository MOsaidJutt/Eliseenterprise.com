#!/bin/sh
# Run Alembic migrations then start both FastAPI (internal) and Next.js (public)
set -e

# Run DB migrations
echo "[start] Running database migrations..."
alembic upgrade head
echo "[start] Migrations complete."

# Start FastAPI on internal port 8001 (proxied by Next.js)
uvicorn main:app --host 127.0.0.1 --port 8001 &
FASTAPI_PID=$!
echo "[start] FastAPI started (PID $FASTAPI_PID) on :8001"

# Start Next.js SSR server on $PORT (Railway injects this)
cd /app/frontend
echo "[start] Starting Next.js on port ${PORT:-3000}..."
exec node_modules/.bin/next start -p "${PORT:-3000}"
