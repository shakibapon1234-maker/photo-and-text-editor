@echo off
title 3D Text Studio Launcher
echo ===================================================
echo               3D Text Studio Launcher
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Building 3D Text Module bundle...
cd "3d-text-module-phase5-quality\3d-text-module"
if not exist "node_modules" (
    echo [INFO] Installing 3D Text Module dependencies...
    call npm install
)
call npm run build
if %errorlevel% neq 0 (
    echo [WARNING] 3D Text Module build reported warnings or errors. Continuing...
)
cd /d "%~dp0"

echo [2/2] Starting local server at http://localhost:8000...
echo.
echo Opening 3D Text Studio...
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000/3d-text-module-phase5-quality/3d-text-module/www/index.html"

node server.js

pause
