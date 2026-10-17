@echo off
echo ⚡ Nexus / Travel Marketing Studio - Starting...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ❌ Node.js not found! Install from https://nodejs.org/
  pause
  exit /b
)
if not exist node_modules (
  echo 📦 Installing dependencies...
  call npm install
)
echo.
echo 🚀 Starting servers (localhost is never blocked by Symantec):
echo    Travel Marketing Studio: http://localhost:3002
echo    Studio (hub alias):      http://localhost:3000/travelpulse
echo    Scanner hub:             http://localhost:3000
echo    Weltrade:                http://localhost:3000/?broker=weltrade
echo    Deriv:                   http://localhost:3000/?broker=deriv
echo.
start http://localhost:3002
node server.js
pause
