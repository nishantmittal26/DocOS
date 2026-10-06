@echo off
setlocal enabledelayedexpansion
title DocOS — OPD Clinic Management SaaS Launcher
color 0A

echo =========================================================
echo       DocOS - OPD Clinic Management SaaS Launcher
echo =========================================================
echo.

REM Check if dotnet is installed
where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] .NET SDK is not installed or not in PATH.
    echo Please install .NET 10 SDK: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

REM Check if node/npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    echo Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM Ensure ports 5107, 5173, 7234 are free before launching new instances
if exist "%~dp0stop.bat" (
    echo [0/2] Clearing previous DocOS processes and freeing ports...
    call "%~dp0stop.bat" /silent
    title DocOS — OPD Clinic Management SaaS Launcher
    color 0A
    echo.
)

echo Active Configuration Profile: Local Development
echo  - Backend Config : appsettings.Local.json
echo  - Frontend Config: Local Vite Proxy (/api -^> http://localhost:5107)
echo.

echo [1/2] Launching .NET 10 Web API Backend (using appsettings.Local.json)...
start "DocOS Backend API (.NET 10)" cmd /k "cd /d "%~dp0backend\src\DocOS.API" && dotnet run --environment Development"

echo.
echo Waiting for Backend API to load and initialize (http://localhost:5107)...
set /a ATTEMPTS=0
set /a MAX_ATTEMPTS=90

set HAS_CURL=0
where curl.exe >nul 2>nul
if !errorlevel! equ 0 set HAS_CURL=1

:WAIT_BACKEND_LOOP
set /a ATTEMPTS+=1

rem Health check using curl (fast) or PowerShell (fallback)
if !HAS_CURL! equ 1 (
    curl.exe -s -f -o nul --connect-timeout 1 --max-time 2 http://127.0.0.1:5107/ >nul 2>nul
    if !errorlevel! equ 0 goto BACKEND_READY
) else (
    powershell -NoProfile -Command "(Invoke-WebRequest -Uri 'http://127.0.0.1:5107/' -UseBasicParsing -TimeoutSec 2).StatusCode" >nul 2>nul
    if !errorlevel! equ 0 goto BACKEND_READY
)

if !ATTEMPTS! geq !MAX_ATTEMPTS! (
    echo.
    echo [WARNING] Backend API did not respond within !MAX_ATTEMPTS!s.
    echo Check the "DocOS Backend API (.NET 10)" window for build or startup logs.
    echo Launching frontend anyway...
    goto LAUNCH_FRONTEND
)

<nul set /p=.
ping 127.0.0.1 -n 2 >nul
goto WAIT_BACKEND_LOOP

:BACKEND_READY
echo.
echo  [OK] Backend API is loaded and ready! (HTTP 200 from http://localhost:5107)
echo.

:LAUNCH_FRONTEND
echo [2/2] Launching React + Vite Frontend (connecting locally)...
start "DocOS Frontend (React + Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo =========================================================
echo  DocOS Services Started!
echo =========================================================
echo  - Frontend Web UI : http://localhost:5173
echo  - Backend API     : http://localhost:5107
echo  - Swagger Docs    : http://localhost:5107/swagger
echo  - Stop Services   : Double-click stop.bat (or run stop.bat)
echo =========================================================
echo.
echo Leave this window open or press any key to close this launcher.
pause >nul
