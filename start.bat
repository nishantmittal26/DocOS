@echo off
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

echo [1/2] Launching .NET 10 Web API Backend...
start "DocOS Backend API (.NET 10)" cmd /k "cd /d "%~dp0backend" && dotnet run --project src\DocOS.API"

echo [2/2] Launching React + Vite Frontend...
start "DocOS Frontend (React + Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo =========================================================
echo  DocOS Services Started!
echo =========================================================
echo  - Frontend Web UI : http://localhost:5173
echo  - Backend API     : http://localhost:5107
echo  - Swagger Docs    : http://localhost:5107/swagger
echo =========================================================
echo.
echo Leave this window open or press any key to close this launcher.
pause >nul
