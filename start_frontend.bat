@echo off
echo Starting NexusRAG Frontend Dev Server on port 5173...
cd /d "%~dp0\frontend"
call npm.cmd run dev
pause
