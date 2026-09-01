@echo off
title Presentation Player Launcher (Chrome Auto-Detect)
cd /d "%~dp0"
echo ======================================================
echo           Presentation Player (Voice Enabled)
echo ======================================================
echo.
echo [1] Checking local server...

:: Function to open URL in Google Chrome specifically
set "CHROME_BIN="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_BIN=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_BIN=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

:: Check if Python is available
python --version >nul 2>&1
if %errorlevel%==0 (
    echo [2] Starting server with Python at http://localhost:8000...
    if defined CHROME_BIN (
        echo [3] Launching Google Chrome...
        start "" "%CHROME_BIN%" "http://localhost:8000/presentation-player.html"
    ) else (
        start http://localhost:8000/presentation-player.html
    )
    python -m http.server 8000
    exit /b
)

:: Check if Node is available
node --version >nul 2>&1
if %errorlevel%==0 (
    echo [2] Starting server with Node.js at http://localhost:8000...
    if defined CHROME_BIN (
        echo [3] Launching Google Chrome...
        start "" "%CHROME_BIN%" "http://localhost:8000/presentation-player.html"
    ) else (
        start http://localhost:8000/presentation-player.html
    )
    node server.js
    exit /b
)

:: Fallback to Windows built-in PowerShell HTTP Server (Zero extra software needed)
echo [2] Starting server with Windows PowerShell at http://localhost:8000...
if defined CHROME_BIN (
    echo [3] Launching Google Chrome...
    start "" "%CHROME_BIN%" "http://localhost:8000/presentation-player.html"
) else (
    start http://localhost:8000/presentation-player.html
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8000/'); $listener.Start(); Write-Host 'Server active at http://localhost:8000/presentation-player.html'; while ($listener.IsListening) { try { $context = $listener.GetContext(); $req = $context.Request; $res = $context.Response; $urlPath = $req.Url.LocalPath; if ($urlPath -eq '/') { $urlPath = '/presentation-player.html' }; $filePath = Join-Path (Get-Location) $urlPath; if (Test-Path $filePath -PathType Leaf) { $bytes = [System.IO.File]::ReadAllBytes($filePath); $res.ContentLength64 = $bytes.Length; if ($filePath.EndsWith('.html')) { $res.ContentType = 'text/html; charset=utf-8' } elseif ($filePath.EndsWith('.json')) { $res.ContentType = 'application/json; charset=utf-8' } elseif ($filePath.EndsWith('.js')) { $res.ContentType = 'application/javascript; charset=utf-8' }; $res.OutputStream.Write($bytes, 0, $bytes.Length) } else { $res.StatusCode = 404 }; $res.Close() } catch {} }"
pause
