# Development Guide — Plainview Phase 2

## Prerequisites

- Python 3.11+
- Node.js 20+
- A Neon PostgreSQL database (free tier works)
- An OpenAI API key (for AI chat feature)

---

## Local Setup

### 1. Clone and configure environment

```bash
cd vie013-dashboard/backend
cp .env.example .env
# Edit .env with your actual values
```

### 2. Backend setup

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Database migrations

```bash
# With your .env DATABASE_URL configured:
alembic upgrade head
```

This creates all 5 tables. On a fresh database, the app also seeds the first admin user from env vars on startup.

### 4. Frontend setup

```bash
cd frontend
npm install
```

### 5. Run development servers

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
# /api/* proxied to http://localhost:8001
```

Open `http://localhost:3000`

---

## Environment Variables

### Backend `.env`

```env
# ── Required ──────────────────────────────
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
SECRET_KEY=change-this-to-a-long-random-string-in-production

# ── AI Chat (optional — feature disabled if missing) ──
OPENAI_API_KEY=sk-...

# ── Initial admin seed (used once on first startup) ──
ADMIN_EMAIL=peter@eliseenterprise.com
ADMIN_PASSWORD=Elise@2024!
ADMIN_NAME=Peter
COMPANY_NAME=Plainview
COMPANY_SLUG=plainview
```

### Frontend `.env.local`

```env
# Only needed if running frontend standalone (not via proxy)
NEXT_PUBLIC_API_URL=http://localhost:8001
```

---

## Project Structure

```
backend/
  main.py          — App entry point, startup hooks, router registration
  database.py      — SQLAlchemy async engine + session factory
  models.py        — ORM table definitions
  schemas.py       — Pydantic request/response schemas
  auth.py          — JWT encode/decode, password hashing
  analytics.py     — XER analytics engine (8 + Gantt sections)
  xer_parser.py    — Primavera XER file parser
  routers/
    auth_router.py     — Login, me, register, password change
    analyze_router.py  — XER upload + analysis (saves to DB)
    history_router.py  — CRUD for saved analyses
    company_router.py  — Company info + logo upload
    chat_router.py     — AI chat (OpenAI GPT-4o)
    admin_router.py    — Admin stats + user management
  alembic/
    env.py             — Alembic async configuration
    versions/          — Migration scripts

frontend/
  next.config.ts   — SSR mode, /api/* proxy rewrites
  src/
    app/
      page.tsx               — Landing page
      login/page.tsx         — Login
      dashboard/page.tsx     — Main dashboard (with history sidebar + AI chat)
      [slug]/page.tsx        — Company-branded upload page
      [slug]/dashboard/page.tsx — Company-branded dashboard
    components/
      FileHistorySidebar.tsx — ChatGPT-style history panel
      GanttChart.tsx         — Collapsible WBS Gantt
      AIChatPanel.tsx        — AI assistant chat panel
      KPISummary.tsx         — KPI metric cards
      SCurve.tsx             — S-Curve chart
      ... (existing components)
    lib/
      api.ts    — API client + TypeScript types
      auth.ts   — JWT token storage helpers
```

---

## Adding a New User

Via API (requires admin JWT):
```bash
curl -X POST https://your-domain/api/auth/register \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@company.com","password":"secret","name":"John","role":"user","company_id":1}'
```

---

## Adding a New Company

1. Create company in DB (via admin API or directly in Neon console):
   ```sql
   INSERT INTO companies (slug, name) VALUES ('newclient', 'New Client Ltd');
   ```
2. Upload logo via API:
   ```bash
   curl -X POST https://your-domain/api/companies/newclient/logo \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -F "file=@logo.png"
   ```
3. Create users linked to the company.

---

## Deployment (Railway)

### Single Service (Recommended)

Railway runs a single container from the root `Dockerfile`.

- FastAPI runs on internal port 8001
- Next.js runs on `$PORT` (Railway injects this)
- Next.js proxies `/api/*` → `http://127.0.0.1:8001`

**Railway Environment Variables:**
```
DATABASE_URL      — Neon connection string
SECRET_KEY        — Random 64-char string
OPENAI_API_KEY    — OpenAI key
ADMIN_EMAIL       — First admin email
ADMIN_PASSWORD    — First admin password
ADMIN_NAME        — First admin name
COMPANY_NAME      — First company name
COMPANY_SLUG      — First company slug (e.g. "plainview")
```

**Volume:** Mount a Railway volume at `/app/uploads` to persist logo files across deployments.

### Database Migrations on Deploy

Add to Railway start command:
```
sh -c "cd /app && alembic upgrade head && /start.sh"
```

Or add the migration to `start.sh`.

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Store full analysis JSON in DB | Fast retrieval, no complex joins, XER files don't need to be re-parsed |
| JWT in localStorage | Simpler than httpOnly cookies for this SPA-like app; acceptable for internal tool |
| Next.js rewrites for /api | Avoids CORS issues, single origin for browser |
| bcrypt with 12 rounds | Good security/performance balance |
| SSR for [slug] pages | Allows server-side branding, better SEO, simpler data fetching |
| Single Railway container | Simpler deployment; two services would need Railway networking setup |

---

## Running Tests

```bash
# Backend (pytest)
cd backend
pytest

# Frontend (TypeScript check)
cd frontend
npx tsc --noEmit
npm run lint
```
