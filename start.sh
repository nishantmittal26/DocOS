#!/usr/bin/env bash

# DocOS launcher script for macOS / Linux
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================================="
echo "      DocOS - OPD Clinic Management SaaS Launcher"
echo "========================================================="
echo ""

if ! command -v dotnet &> /dev/null; then
    echo "[ERROR] .NET SDK is not found in PATH."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not found in PATH."
    exit 1
fi

echo "Active Configuration Profile: Local Development"
echo " - Backend Config : appsettings.Local.json"
echo " - Frontend Config: Local Vite Proxy (/api -> http://localhost:5107)"
echo ""

echo "[1/2] Starting .NET 10 Web API Backend..."
(cd "$SCRIPT_DIR/backend" && ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/DocOS.API --launch-profile http) &
BACKEND_PID=$!

echo "[2/2] Starting React + Vite Frontend..."
(cd "$SCRIPT_DIR/frontend" && VITE_API_URL=/api npm run dev) &
FRONTEND_PID=$!

echo ""
echo "========================================================="
echo " DocOS Services Started!"
echo "========================================================="
echo " - Frontend Web UI : http://localhost:5173"
echo " - Backend API     : http://localhost:5107"
echo " - Swagger Docs    : http://localhost:5107/swagger"
echo "========================================================="
echo ""
echo "Press Ctrl+C to stop both services."

# Trap SIGINT to kill background processes on exit
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
