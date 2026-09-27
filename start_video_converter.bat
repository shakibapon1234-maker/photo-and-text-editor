@echo off
title Presentation Video Converter Tool
cd /d "%~dp0"
python video-converter-tool\gui.py
if errorlevel 1 (
    echo Python failed or interrupted. Press any key to exit...
    pause
)
