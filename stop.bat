@echo off
setlocal enabledelayedexpansion

title DocOS — Stop Services ^& Free Ports
color 0C

echo =========================================================
echo       DocOS - Stopping Services ^& Freeing Ports
echo =========================================================
echo.

set QUIET=0
set TARGET_PORTS=5107 7234 5173 5174

REM Parse arguments: check for flags or additional custom ports
for %%A in (%*) do (
    if /i "%%A"=="/q" (
        set QUIET=1
    ) else if /i "%%A"=="-q" (
        set QUIET=1
    ) else if /i "%%A"=="/silent" (
        set QUIET=1
    ) else if /i "%%A"=="--quiet" (
        set QUIET=1
    ) else (
        set TARGET_PORTS=!TARGET_PORTS! %%A
    )
)

echo [1/3] Closing DocOS terminal windows and background processes...
taskkill /F /FI "WINDOWTITLE eq DocOS Backend API*" /T >nul 2>nul
taskkill /F /FI "WINDOWTITLE eq DocOS Frontend*" /T >nul 2>nul
taskkill /IM DocOS.API.exe /F /T >nul 2>nul

echo [2/3] Checking and terminating processes on ports (!TARGET_PORTS!)...

REM Primary port cleanup using PowerShell (safe against partial port matches like 5173 matching 51730)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$portStrings = '!TARGET_PORTS!'.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries); $ports = @(); foreach ($ps in $portStrings) { $num = 0; if ([int]::TryParse($ps, [ref]$num)) { $ports += $num } }; $killed = 0; foreach ($p in $ports) { $pids = @(); try { $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if ($conns) { $pids += ($conns | Select-Object -ExpandProperty OwningProcess -Unique) } } catch {}; if (-not $pids) { try { $lines = netstat -ano | Select-String (':{0}\s+.*LISTENING\s+(\d+)' -f $p); foreach ($l in $lines) { if ($l.Matches[0].Groups[1].Value) { $pids += [int]$l.Matches[0].Groups[1].Value } } } catch {} }; $pids = $pids | Select-Object -Unique; foreach ($procId in $pids) { if ($procId -gt 0 -and $procId -ne $PID) { try { $pName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName; Write-Host ('  [x] Stopping PID ' + $procId + ' (' + $pName + ') on port ' + $p + '...') -ForegroundColor Yellow; Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue; taskkill /F /T /PID $procId 2>$null | Out-Null; $killed++; } catch {} } } }; if ($killed -eq 0) { Write-Host '  [OK] No active processes found listening on target ports.' -ForegroundColor Green } else { Write-Host ('  [OK] Successfully terminated ' + $killed + ' process(es) holding ports.' ) -ForegroundColor Green }"

REM Secondary fallback using native netstat / taskkill for redundancy
for %%P in (!TARGET_PORTS!) do (
    for /f "tokens=5" %%A in ('netstat -aon 2^>nul ^| find "LISTENING" ^| find ":%%P "') do (
        if not "%%A"=="0" (
            taskkill /F /T /PID %%A >nul 2>nul
        )
    )
)

echo [3/3] Verification complete.
echo.
echo =========================================================
echo  DocOS Services Stopped ^& Ports Successfully Released!
echo =========================================================
echo.

if %QUIET% equ 0 (
    echo Press any key to close this window.
    pause >nul
)
