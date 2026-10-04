@echo off
setlocal enabledelayedexpansion
title DocOS - OPD Clinic Management SaaS Launcher
color 0A

echo =========================================================
echo       DocOS - OPD Clinic Management SaaS Launcher
echo =========================================================
echo.

REM 1. Check if dotnet is installed
where dotnet >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] .NET SDK is not installed or not in PATH.
    echo Please install .NET 10 SDK: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

REM 2. Check if node/npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    echo Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 3. Check Microsoft SQL Server service
set SQL_STATUS=Detected
sc query MSSQLSERVER >nul 2>nul
if %errorlevel% equ 0 (
    set SQL_STATUS=Running (MSSQLSERVER service)
) else (
    sc query MSSQL$SQLEXPRESS >nul 2>nul
    if %errorlevel% equ 0 (
        set SQL_STATUS=Running (SQLEXPRESS service)
    ) else (
        set SQL_STATUS=Active (Ensure Microsoft SQL Server is running)
    )
)

REM 4. Check if stale DocOS processes are running on ports 5107 or 5173
netstat -ano | findstr ":5107 :5173" | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Previous DocOS processes detected on port 5107 or 5173.
    echo Cleaning up stale processes before starting fresh...
    if exist "%~dp0stop.bat" call "%~dp0stop.bat" /q
    timeout /t 2 /nobreak >nul
)

echo Active Configuration Profile: Local Development (Phase 2A)
echo  - Database Engine : Microsoft SQL Server (!SQL_STATUS!)
echo  - Database Name   : DocOS_Dev
echo  - Backend Config  : appsettings.Local.json
echo  - Frontend Config : Local Vite Proxy (/api -^> http://localhost:5107)
echo.

echo [1/2] Launching .NET 10 Web API Backend (using appsettings.Local.json)...
start "DocOS Backend API (.NET 10)" cmd /k "cd /d "%~dp0backend\src\DocOS.API" && dotnet run --launch-profile http"

<nul set /p="Waiting for Backend API to initialize on port 5107"
set /a WAIT_SECONDS=0
:WAIT_BACKEND_LOOP
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":5107" | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo  [READY]
    goto LAUNCH_FRONTEND
)
set /a WAIT_SECONDS+=1
<nul set /p=.
if !WAIT_SECONDS! geq 35 (
    echo.
    echo [WARNING] Backend API startup took longer than 35s. Launching frontend anyway...
    goto LAUNCH_FRONTEND
)
goto WAIT_BACKEND_LOOP

:LAUNCH_FRONTEND
echo.
echo [2/2] Launching React + Vite Frontend (connecting locally)...
start "DocOS Frontend (React + Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo =========================================================
echo  DocOS Services Started!
echo =========================================================
echo  - Frontend Web UI : http://localhost:5173
echo  - Backend API     : http://localhost:5107
echo  - Swagger Docs    : http://localhost:5107/swagger
echo  - Database        : Microsoft SQL Server (DocOS_Dev)
echo =========================================================
echo.
echo Leave this window open, or run stop.bat to stop all services.
echo.
echo Press 'S' and Enter to stop all services now, or press Enter to exit this launcher.
set /p USER_CHOICE="Selection: "
if /i "%USER_CHOICE%"=="S" (
    if exist "%~dp0stop.bat" call "%~dp0stop.bat"
)
