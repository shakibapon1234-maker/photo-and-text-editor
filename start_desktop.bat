@echo off
title Photo & 3D Text Studio - Desktop Mode
cd /d "%~dp0"

if exist "%~dp0node_modules\electron\dist\electron.exe" (
    echo [OK] Launching Photo and 3D Text Studio with Electron...
    start "" cmd /c "call npm.cmd run desktop"
    exit /b 0
)

where electron >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Launching with global Electron...
    start "" electron "%~dp0main-electron.js"
    exit /b 0
)

echo [WARNING] Electron not found. Opening in browser...
start "" "%~dp0index.html"
exit /b 1
