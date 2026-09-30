@echo off
REM ============================================================
REM ⚡ Nexus DT/DB Scanner - 1-Click Launcher (Windows)
REM ============================================================
REM Uses random high ports (50000+) to avoid conflicts with
REM React/Vue/Angular dev servers. Override with PORT env var.

echo.
echo ============================================================
echo   ⚡ NEXUS DT/DB SCANNER
echo ============================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ❌ Node.js not found!
  echo    Download from https://nodejs.org/ ^& install LTS version
  pause
  exit /b
)

if not exist node_modules (
  echo 📦 Installing Node.js dependencies...
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install failed
    pause
    exit /b
  )
)

REM Default to a random high port to avoid clashing with other dev servers.
REM To pin to a specific port: set PORT=8080 before running this script.
if not defined PORT set PORT=0

REM Open browser to a reasonable default after startup; user can override
echo 🚀 Starting scanner... (URLs will be printed below)
echo.
node server.js
pause
