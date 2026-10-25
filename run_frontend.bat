@echo off
chcp 65001 >nul
echo ========================================================
echo   KHỞI ĐỘNG REACT FRONTEND (GYM AI MANAGEMENT SYSTEM)
echo ========================================================
cd /d "%~dp0frontend"
npm run dev -- --host --port 5173
pause
