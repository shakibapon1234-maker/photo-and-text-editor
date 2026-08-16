@echo off
title Photo & 3D Text Studio (Desktop App)
echo ===================================================
echo        Photo ^& 3D Text Studio (Desktop App)
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking 3D Text Module bundle...
if not exist "3d-text-module-phase5-quality\3d-text-module\www\bundle.js" (
    echo Building bundle...
    cd "3d-text-module-phase5-quality\3d-text-module"
    call npm run build
    cd /d "%~dp0"
)

echo [2/2] Launching Desktop Application...
set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
set "MAIN_JS=%~dp0main-electron.js"
"%ELECTRON_EXE%" "%MAIN_JS%"

exit
