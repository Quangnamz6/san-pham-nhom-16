@echo off
chcp 65001 >nul
echo ========================================================
echo   KHỞI ĐỘNG FASTAPI BACKEND (GYM AI MANAGEMENT SYSTEM)
echo ========================================================
cd /d "%~dp0backend"
set PYTHONIOENCODING=utf-8
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000
pause
