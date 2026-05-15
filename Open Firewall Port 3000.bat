@echo off
:: Open Firewall Port 3000.bat
:: Run this ONCE, as Administrator, to allow phones/tablets to reach the server.
:: Right-click → "Run as administrator"
title PWSGMM — Open Firewall Port 3000
color 0E
echo.
echo  =========================================================
echo   Opening Windows Firewall for port 3000 (TCP inbound)
echo   This allows phones on your Wi-Fi to reach the server.
echo  =========================================================
echo.

:: Check for admin privileges
net session >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] This script must be run as Administrator.
    echo.
    echo  Right-click "Open Firewall Port 3000.bat" and choose
    echo  "Run as administrator", then try again.
    echo.
    pause
    exit /b 1
)

:: Remove old rule if it exists (so we don't get duplicates)
netsh advfirewall firewall delete rule name="PWSGMM Node Server Port 3000" >nul 2>&1

:: Add inbound rule for TCP port 3000
netsh advfirewall firewall add rule ^
    name="PWSGMM Node Server Port 3000" ^
    dir=in ^
    action=allow ^
    protocol=TCP ^
    localport=3000 ^
    description="Allows LAN access to the Patelwadi Ganesh Mitramandal local server"

if errorlevel 1 (
    echo.
    echo  [ERROR] Could not add the firewall rule. Please try again as Administrator.
) else (
    echo.
    echo  [OK] Firewall rule added successfully!
    echo.
    echo  Your phone can now reach the server.
    echo  Make sure it is connected to the SAME Wi-Fi as this PC.
    echo.
    echo  Get your PC IP:  run "ipconfig" and look for IPv4 Address.
    echo  Then on your phone open:  http://<your-PC-IP>:3000
)

echo.
pause
