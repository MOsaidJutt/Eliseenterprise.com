# Architecture — Plainview Phase 2

## Overview

Plainview is a multi-tenant Primavera P6 schedule analytics platform. Phase 2 upgrades the single-user proof-of-concept into a production-grade, multi-user SaaS with persistent storage, JWT auth, AI chat, and per-company branding.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Railway (Single Service)                  │
│                                                                   │
│  ┌──────────────────────┐      ┌──────────────────────────────┐  │
│  │   Next.js (SSR)      │      │   FastAPI (Uvicorn)          │  │
│  │   Port: $PORT        │─────▶│   Port: 8001 (internal)      │  │
│  │                      │      │                              │  │
│  │  /api/* → proxy      │      │  /api/auth/*                 │  │
│  │  /[slug] → SSR pages │      │  /api/analyze                │  │
│  │  /dashboard → SSR    │      │  /api/analyses/*             │  │
│  └──────────────────────┘      │  /api/companies/*            │  │
│                                │  /api/chat/*                 │  │
│                                │  /api/admin/*                │  │
│                                └──────────────────────────────┘  │
│                                            │                      │
└────────────────────────────────────────────│──────────────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │        Neon PostgreSQL       │
                              │  - companies                 │
                              │  - users                     │
                              │  - analyses (JSON result)    │
                              │  - ai_conversations          │
                              │  - ai_messages               │
                              └──────────────────────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │         OpenAI API           │
                              │  - GPT-4o (chat)            │
                              │  - text-embedding-3-small   │
                              └──────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16 (SSR) | Server-rendered React app |
| Styling | Tailwind CSS 4 | Utility-first styles |
| Charts | Recharts | S-Curve, SPI, Resource histograms |
| Backend | FastAPI + Uvicorn | REST API, file handling |
| Auth | JWT (python-jose) + bcrypt | Token-based authentication |
| Database | Neon PostgreSQL + SQLAlchemy | Persistent storage |
| Migrations | Alembic | Schema version control |
| AI | OpenAI GPT-4o | Schedule analytics chat assistant |
| Deployment | Railway | Cloud hosting |

---

## Request Flow

### Upload + Analyse
```
User → upload .xer files
  → POST /api/analyze (multipart)
  → FastAPI: parse XER → run analytics engine
  → Save Analysis to DB (with full JSON result)
  → Return result JSON
  → Next.js stores in sessionStorage + redirects to /dashboard
```

### Load Historical Analysis
```
User clicks history item
  → GET /api/analyses/{id}
  → FastAPI: fetch from DB
  → Return result JSON
  → Dashboard loads from response (not sessionStorage)
```

### AI Chat
```
User sends message
  → POST /api/chat
  → FastAPI: load analysis from DB
  → Build context string from KPIs + milestones + critical path
  → Call OpenAI GPT-4o with context + conversation history
  → Stream response back
  → Save message pair to DB
```

---

## Multi-tenancy Model

Each **Company** has:
- A unique `slug` (e.g., `plainview`, `elise`)
- A branded logo
- Multiple **Users** (admin or user role)
- All **Analyses** linked to that company

Users authenticate with JWT. Their `company_id` is embedded in the token payload, so every API call automatically scopes data to that company.

### Routes
- `/` — Public landing page
- `/login` — Login page
- `/dashboard` — Upload + dashboard (company determined by logged-in user)
- `/[slug]` — Company-branded upload page (same functionality, custom branding)
- `/[slug]/dashboard` — Company-branded dashboard

---

## File Structure

```
vie013-dashboard/
├── backend/
│   ├── main.py                 # FastAPI app + router registration
│   ├── database.py             # SQLAlchemy engine + session
│   ├── models.py               # ORM models
│   ├── schemas.py              # Pydantic schemas
│   ├── auth.py                 # JWT utilities
│   ├── analytics.py            # XER analytics engine
│   ├── xer_parser.py           # XER file parser
│   ├── requirements.txt
│   ├── .env.example
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   ├── routers/
│   │   ├── auth_router.py      # Login, me, register
│   │   ├── analyze_router.py   # XER upload + analysis
│   │   ├── history_router.py   # CRUD for saved analyses
│   │   ├── company_router.py   # Company info + logo upload
│   │   ├── chat_router.py      # AI chat (OpenAI)
│   │   └── admin_router.py     # Admin stats + user management
│   └── uploads/
│       └── logos/              # Company logo files
│
├── frontend/
│   ├── next.config.ts          # SSR mode + API rewrites
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                      # Landing page
│   │   │   ├── login/page.tsx                # Login
│   │   │   ├── dashboard/page.tsx            # Main dashboard
│   │   │   └── [slug]/
│   │   │       ├── page.tsx                  # Company upload
│   │   │       └── dashboard/page.tsx        # Company dashboard
│   │   ├── components/
│   │   │   ├── KPISummary.tsx
│   │   │   ├── ExecutiveSummary.tsx
│   │   │   ├── SCurve.tsx
│   │   │   ├── SPIByContractor.tsx
│   │   │   ├── PPCTable.tsx
│   │   │   ├── ResourceHistogram.tsx
│   │   │   ├── FloatErosion.tsx
│   │   │   ├── MilestoneTracker.tsx
│   │   │   ├── CriticalPath.tsx
│   │   │   ├── ObservationsPanel.tsx
│   │   │   ├── GanttChart.tsx               # NEW
│   │   │   ├── FileHistorySidebar.tsx       # NEW
│   │   │   └── AIChatPanel.tsx              # NEW
│   │   └── lib/
│   │       ├── api.ts
│   │       └── auth.ts
│
├── docs/
│   ├── ARCHITECTURE.md  (this file)
│   ├── API.md
│   ├── DATABASE.md
│   └── DEVELOPMENT.md
│
├── Dockerfile
└── start.sh
```
