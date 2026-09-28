@echo off
title IMS-V2 Biometric Bridge

:: ============================================================
:: SETUP: Fill in your API key below (copy from HR Settings)
:: ============================================================
set IMS_API_KEY=PASTE_YOUR_KEY_HERE

:: Device IP — change only if your device has a different IP
set DEVICE_IP=192.168.1.224

:: Server URL — leave as-is
set IMS_API_URL=https://imsportal.3ftech.in/api/v1/hr/attendance/biometric

:: ============================================================
:: Don't edit below this line
:: ============================================================

echo.
echo  IMS-V2 Biometric Attendance Bridge
echo  ====================================
echo  Device : %DEVICE_IP%:4370
echo  Server : %IMS_API_URL%
echo.

:: Install dependency if missing
if not exist node_modules\zkteco-js (
    echo Installing zkteco-js...
    call npm install zkteco-js --no-save
    echo.
)

:: Run the bridge
node scripts\biometric-bridge.js

:: If it crashes, wait 5s and restart automatically
echo.
echo Bridge stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak
goto :eof
