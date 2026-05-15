@echo off
title PWSGMM - Website Launcher
cd /d "%~dp0"

echo.
echo =====================================================
echo  PWSGMM - Patelwadi Ganesh Mitramandal
echo  Website Launcher
echo =====================================================
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found.

:: Kill any old process on port 3000
echo Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /C:":3000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo [OK] Port 3000 is clear.

:: Start the server in a new visible window
echo Starting server...
start "PWSGMM Server" cmd /k "node server.js"

:: Wait up to 10 seconds for it to listen
set count=0
:wait_loop
timeout /t 1 /nobreak >nul
netstat -aon 2>nul | findstr /C:":3000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto ready
set /a count+=1
if %count% lss 10 goto wait_loop
echo WARNING: Server slow to start. Opening browser anyway...
goto open_browser

:ready
echo [OK] Server is running!

:open_browser
echo.
echo =====================================================
echo  Open this address in your browser:
echo  http://localhost:3000
echo =====================================================
echo.

start "" "http://localhost:3000"

echo Browser opened.
echo.
echo NOTE: Keep the "PWSGMM Server" window open.
echo Closing it will stop the server.
echo.
pause >nul