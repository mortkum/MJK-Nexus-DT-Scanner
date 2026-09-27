@echo off
echo ⚡ Nexus DT/DB Scanner - Starting...
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
echo 🚀 Starting on http://localhost:3000
echo Main Hub: http://localhost:3000
echo Weltrade: http://localhost:3000/?broker=weltrade
echo Deriv: http://localhost:3000/?broker=deriv
start http://localhost:3000
node server.js
pause
