# ── Stage 1: Build Next.js (SSR mode) ─────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Next.js SSR build — produces .next/ server bundle (not static /out/)
RUN npm run build

# ── Stage 2: Final image (Python + Node.js) ───────────────────────────────────
FROM python:3.11-slim

# Install Node.js 20 for running Next.js SSR server
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get purge -y --auto-remove curl gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Backend ──
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# ── Frontend ──
COPY frontend/package*.json ./frontend/
COPY --from=builder /build/.next ./frontend/.next
COPY --from=builder /build/public ./frontend/public
# Install only production deps for Next.js runtime
RUN cd frontend && npm ci --only=production

# ── Startup ──
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000
CMD ["./start.sh"]
