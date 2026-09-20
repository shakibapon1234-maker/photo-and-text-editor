@echo off
title "Photo & 3D Text Studio - Desktop Mode"
cd /d "%~dp0"

set "ELECTRON_EXE="
set "MAIN_JS=%~dp0main-electron.js"

if exist "%~dp0node_modules\electron\dist\electron.exe" (
    set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
    goto :HAVE_ELECTRON
)
if exist "G:\all\app launcher\App-Launcher\node_modules\electron\dist\electron.exe" (
    set "ELECTRON_EXE=G:\all\app launcher\App-Launcher\node_modules\electron\dist\electron.exe"
    goto :HAVE_ELECTRON
)
if exist "G:\all\Video-Editor\node_modules\electron\dist\electron.exe" (
    set "ELECTRON_EXE=G:\all\Video-Editor\node_modules\electron\dist\electron.exe"
    goto :HAVE_ELECTRON
)
if exist "G:\all\SABRE\Sabre\node_modules\electron\dist\electron.exe" (
    set "ELECTRON_EXE=G:\all\SABRE\Sabre\node_modules\electron\dist\electron.exe"
    goto :HAVE_ELECTRON
)
if exist "G:\all\GELELIO\Gellelio-training-mode\node_modules\electron\dist\electron.exe" (
    set "ELECTRON_EXE=G:\all\GELELIO\Gellelio-training-mode\node_modules\electron\dist\electron.exe"
    goto :HAVE_ELECTRON
)

:HAVE_ELECTRON

if exist "%ELECTRON_EXE%" (
    echo [OK] Launching Photo and 3D Text Studio with Electron...
    start "" "%ELECTRON_EXE%" "%MAIN_JS%"
    exit /b 0
)

where electron >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Launching with global Electron...
    start "" electron "%MAIN_JS%"
    exit /b 0
)

echo [WARNING] Electron not found. Opening in browser...
start "" "%~dp0index.html"
exit /b 1
