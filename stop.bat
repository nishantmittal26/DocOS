@echo off
setlocal enabledelayedexpansion
title DocOS - Service Stopper
color 0C

set QUIET=0
if "%1"=="/q" set QUIET=1
if "%1"=="-q" set QUIET=1

if %QUIET% equ 0 (
    echo =========================================================
    echo         DocOS - OPD Clinic Management SaaS Stopper
    echo =========================================================
    echo.
)

set STOPPED_BACKEND=0
set STOPPED_FRONTEND=0

REM 1. Stop any process listening on port 5107 (Backend API)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5107 ^| findstr LISTENING') do (
    if not "%%a"=="" (
        if %QUIET% equ 0 echo Stopping DocOS Backend API on port 5107 [PID %%a]...
        taskkill /F /PID %%a /T >nul 2>nul
        set STOPPED_BACKEND=1
    )
)

REM 2. Stop any process listening on port 5173 (Frontend Web UI)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    if not "%%a"=="" (
        if %QUIET% equ 0 echo Stopping DocOS Frontend Web UI on port 5173 [PID %%a]...
        taskkill /F /PID %%a /T >nul 2>nul
        set STOPPED_FRONTEND=1
    )
)

REM 3. Close launcher cmd windows by Window Title if they exist
taskkill /FI "WINDOWTITLE eq DocOS Backend API (.NET 10)*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq DocOS Frontend (React + Vite)*" /T /F >nul 2>nul

if %QUIET% equ 0 (
    echo.
    if !STOPPED_BACKEND! equ 1 (
        echo  [OK] Backend API [port 5107] has been stopped.
    ) else (
        echo  [--] Backend API was not running on port 5107.
    )

    if !STOPPED_FRONTEND! equ 1 (
        echo  [OK] Frontend UI [port 5173] has been stopped.
    ) else (
        echo  [--] Frontend UI was not running on port 5173.
    )

    echo.
    echo =========================================================
    echo  All DocOS services have been stopped.
    echo =========================================================
    echo.
    pause
)
