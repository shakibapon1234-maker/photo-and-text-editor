@echo off
title Photo & 3D Text Studio Suite Launcher
echo ===================================================
echo             Photo & 3D Text Studio Suite
echo ===================================================
echo.

cd /d "%~dp0"

if not exist "3d-text-module-phase5-quality\3d-text-module\www\main.bundle.js" (
    echo [1/2] Building 3D Text Module bundle...
    cd "3d-text-module-phase5-quality\3d-text-module"
    call npm run build
    cd /d "%~dp0"
)

echo [2/2] Starting local server at http://localhost:8000...
echo.
echo Opening browser...
start http://localhost:8000

python -m http.server 8000
if %ERRORLEVEL% NEQ 0 (
    python3 -m http.server 8000
)

pause
