@echo off
title 3D Text Module Studio
echo ===================================================
echo             3D Text Module Studio Launcher
echo ===================================================
echo.

cd /d "%~dp03d-text-module-phase5-quality\3d-text-module"

if not exist "www\main.bundle.js" (
    echo [1/2] Building JavaScript bundle...
    call npm run build
)

echo [2/2] Starting local server at http://localhost:8000...
echo.
echo Opening browser...
start http://localhost:8000

python -m http.server 8000 -d www
if %ERRORLEVEL% NEQ 0 (
    python3 -m http.server 8000 -d www
)

pause
