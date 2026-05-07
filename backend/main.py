import json
import os
import secrets
from datetime import datetime
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

# ── Credentials ──────────────────────────────────────────────────────────────
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "Peter@eliseenterprise.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Elise@2024!")

# ── In-memory session store ───────────────────────────────────────────────────
active_sessions: set = set()

# ── Persistent analysis log (counter.json) ────────────────────────────────────
LOG_FILE = os.path.join(os.path.dirname(__file__), "counter.json")

def _read_log() -> dict:
    try:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE) as f:
                data = json.load(f)
                # migrate old format that only had "count"
                if "log" not in data:
                    data["log"] = []
                return data
    except Exception:
        pass
    return {"count": 0, "log": []}

def _write_log(data: dict) -> None:
    try:
        with open(LOG_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass

def _record_analysis(filenames: list[str], project: str) -> None:
    data = _read_log()
    data["count"] = data.get("count", 0) + 1
    data["log"].append({
        "id":        data["count"],
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "project":   project or "Unknown",
        "files":     filenames,
        "file_count": len(filenames),
    })
    _write_log(data)

# ── Auth helpers ──────────────────────────────────────────────────────────────
def _require_auth(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if not token or token not in active_sessions:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return token


# ── Routes ────────────────────────────────────────────────────────────────────

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
    data = _read_log()
    return {
        "files_processed": data.get("count", 0),
        "active_sessions": len(active_sessions),
        "log": list(reversed(data.get("log", []))),  # newest first
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
    _record_analysis(
        filenames=[f.filename for f in files],
        project=result.get("kpis", {}).get("project_name", ""),
    )
    return result


# ── Serve built Next.js frontend (must be LAST) ───────────────────────────────
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(STATIC_DIR):
    _next_dir = os.path.join(STATIC_DIR, "_next")
    if os.path.isdir(_next_dir):
        app.mount("/_next", StaticFiles(directory=_next_dir), name="next-assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        candidate = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        index = os.path.join(STATIC_DIR, full_path.strip("/"), "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
