@echo off
title Validador Fiscal de Devoluções
set HTML_PATH="file:///%~dp0dist/index.html"

where msedge >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start msedge --app=%HTML_PATH%
    exit /b
)

where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start chrome --app=%HTML_PATH%
    exit /b
)

start "" %HTML_PATH%
