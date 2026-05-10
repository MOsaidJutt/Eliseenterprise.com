import os
from dotenv import load_dotenv
load_dotenv()  # Load .env before any other module reads env vars

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from database import engine, AsyncSessionLocal, Base
from auth import hash_password
import models
from routers import auth_router, analyze_router, history_router, company_router, chat_router, admin_router


# ── Startup: create tables + seed first admin/company ────────────────────────

async def _seed_initial_data():
    """Creates the first company + admin user from env vars if no users exist."""
    async with AsyncSessionLocal() as db:
        user_count = (await db.execute(select(models.User))).first()
        if user_count:
            return  # Already seeded

        admin_email = os.getenv("ADMIN_EMAIL", "peter@eliseenterprise.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "Elise@2024!")
        admin_name = os.getenv("ADMIN_NAME", "Peter")
        company_name = os.getenv("COMPANY_NAME", "Plainview")
        company_slug = os.getenv("COMPANY_SLUG", "plainview")

        company = models.Company(slug=company_slug, name=company_name)
        db.add(company)
        await db.flush()

        admin = models.User(
            email=admin_email.lower(),
            hashed_password=hash_password(admin_password),
            name=admin_name,
            role="admin",
            company_id=company.id,
        )
        db.add(admin)
        await db.commit()
        print(f"[seed] Created company '{company_slug}' and admin '{admin_email}'")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables (safe if they already exist)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_initial_data()
    yield


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(title="Plainview Schedule Analytics API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

app.include_router(auth_router.router)
app.include_router(analyze_router.router)
app.include_router(history_router.router)
app.include_router(company_router.router)
app.include_router(chat_router.router)
app.include_router(admin_router.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
