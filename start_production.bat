@echo off
title NexusRAG - Unified Production Server
echo ========================================================
echo  NexusRAG - Building and Launching Production System
echo  (Single Port Mode: Frontend + Backend on Port 8000)
echo ========================================================

echo.
echo [1/2] Verifying Frontend Production Build...
cd /d "%~dp0\frontend"
if not exist "dist\index.html" (
    echo Building React production bundle...
    call npm.cmd run build
) else (
    echo Production build found in frontend\dist!
)

echo.
echo [2/2] Starting Unified Server on http://127.0.0.1:8000...
echo.
echo Access your app at:
echo   - Web App:      http://127.0.0.1:8000
echo   - API Docs:     http://127.0.0.1:8000/docs
echo   - Health Check: http://127.0.0.1:8000/api/health
echo.
cd /d "%~dp0\backend"
call .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
