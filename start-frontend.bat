@echo off
echo ============================================
echo  Plainview Frontend (Next.js on :3000)
echo ============================================
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

echo Starting Next.js dev server...
echo Open http://localhost:3000 in your browser
npm run dev
pause
