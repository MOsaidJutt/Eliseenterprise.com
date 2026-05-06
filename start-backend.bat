@echo off
echo Starting backend...
cd /d "%~dp0backend"
pip install -r requirements.txt -q
uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
