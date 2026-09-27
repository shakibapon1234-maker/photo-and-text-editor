@echo off
title Video Converter GUI Tool
cd /d "%~dp0"
python gui.py
if errorlevel 1 (
    echo Error launching Video Converter GUI.
    pause
)
