import json
import os
import secrets
from datetime import datetime
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from xer_parser import parse_xer
from analytics import compute_all

app = FastAPI(title="VIE013 Schedule Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Credentials (override via environment variables on Railway) ──────────────
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "Peter@eliseenterprise.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Elise@2024!")

# ── In-memory session store ──────────────────────────────────────────────────
active_sessions: set = set()

# ── File counter (persisted to counter.json beside this file) ────────────────
COUNTER_FILE = os.path.join(os.path.dirname(__file__), "counter.json")

def _get_count() -> int:
    try:
        if os.path.exists(COUNTER_FILE):
            with open(COUNTER_FILE) as f:
                return json.load(f).get("count", 0)
    except Exception:
        pass
    return 0

def _increment_count() -> int:
    count = _get_count() + 1
    try:
        with open(COUNTER_FILE, "w") as f:
            json.dump({"count": count, "updated": datetime.utcnow().isoformat()}, f)
    except Exception:
        pass
    return count

# ── Auth helpers ─────────────────────────────────────────────────────────────
def _require_auth(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if not token or token not in active_sessions:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return token


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


class LoginBody(BaseModel):
    email: str
    password: str

@app.post("/api/auth/login")
def login(body: LoginBody):
    if body.email.lower() == ADMIN_EMAIL.lower() and body.password == ADMIN_PASSWORD:
        token = secrets.token_urlsafe(32)
        active_sessions.add(token)
        return {"token": token}
    raise HTTPException(status_code=401, detail="Invalid email or password")


@app.post("/api/auth/logout")
def logout(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    active_sessions.discard(token)
    return {"ok": True}


@app.get("/api/admin/stats")
def admin_stats(request: Request):
    _require_auth(request)
    return {
        "files_processed": _get_count(),
        "active_sessions": len(active_sessions),
    }


@app.post("/api/analyze")
async def analyze(request: Request, files: List[UploadFile] = File(...)):
    _require_auth(request)

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    if len(files) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 XER files allowed")

    xers = []
    for f in files:
        if not f.filename.lower().endswith(".xer"):
            raise HTTPException(status_code=400, detail=f"{f.filename} is not an XER file")
        content = await f.read()
        xer = parse_xer(content, filename=f.filename)
        xers.append(xer)

    result = compute_all(xers)
    _increment_count()
    return result
