@echo off
title Presentation Player Launcher
cd /d "%~dp0"

echo =====================================================
echo    Presentation Player - Voice and Mobile Remote
echo =====================================================
echo.

:: 1. Find Google Chrome
set "CHROME="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

:: 2. Try Node.js if installed
node --version >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Node.js found. Starting server...
    if defined CHROME (
        start "" "%CHROME%" "http://localhost:8000/presentation-player.html"
    ) else (
        start http://localhost:8000/presentation-player.html
    )
    node server.js
    pause
    exit /b
)

:: 3. Run PowerShell server
echo [OK] Starting PowerShell Server...
if defined CHROME (
    start "" "%CHROME%" "http://localhost:8000/presentation-player.html"
) else (
    start http://localhost:8000/presentation-player.html
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_server_ps.ps1"
echo.
echo Press any key to exit.
pause
