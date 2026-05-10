@echo off
echo ============================================
echo  Plainview Backend (FastAPI on :8001)
echo ============================================
cd /d "%~dp0backend"

if not exist ".env" (
    echo ERROR: backend\.env not found!
    echo Copy backend\.env.example to backend\.env and fill in your credentials.
    pause
    exit /b 1
)

echo Installing dependencies...
pip install -r requirements.txt -q

echo Running database migrations...
alembic upgrade head

echo Starting FastAPI on port 8001...
uvicorn main:app --reload --host 127.0.0.1 --port 8001
pause
