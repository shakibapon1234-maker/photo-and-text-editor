@echo off
cd /d "%~dp0"
set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
set "MAIN_JS=%~dp0main-electron.js"

if exist "%ELECTRON_EXE%" (
    start "" "%ELECTRON_EXE%" "%MAIN_JS%"
    exit /b 0
)

exit /b 1
