@echo off
:: Stop Server.bat — Kills the PWSGMM Node.js server on port 3000
title PWSGMM — Stop Server
color 0C
echo.
echo  Stopping PWSGMM server on port 3000...
echo.

set "killed=0"
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /C:":3000 "') do (
    if not "%%A"=="0" (
        taskkill /f /pid %%A >nul 2>&1
        if not errorlevel 1 (
            echo  [OK] Stopped process PID %%A
            set "killed=1"
        )
    )
)

if "%killed%"=="0" (
    echo  [INFO] No server was running on port 3000.
) else (
    echo.
    echo  Server stopped successfully.
)

echo.
pause
