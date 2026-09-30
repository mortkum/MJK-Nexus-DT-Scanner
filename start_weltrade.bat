@echo off
REM ============================================================
REM ⚡ Nexus Weltrade Scanner - 1-Click Launcher (Windows)
REM ============================================================
REM Auto-installs Python + Node deps and starts the scanner with
REM live Weltrade MT5 data feed. Uses random high ports (50000+)
REM to avoid conflicts with other dev servers (React/Vue/Angular).

echo.
echo ============================================================
echo   ⚡ NEXUS WELTRADE SCANNER
echo ============================================================
echo.

REM --- Node.js check ---
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ❌ Node.js not found!
  echo    Download from https://nodejs.org/ ^& install LTS version
  pause
  exit /b
)

REM --- Python check ---
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ❌ Python not found!
  echo    Download from https://python.org/downloads/
  echo    IMPORTANT: tick "Add to PATH" during install
  pause
  exit /b
)

REM --- Install Node deps ---
if not exist node_modules (
  echo 📦 Installing Node.js dependencies...
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install failed
    pause
    exit /b
  )
)

REM --- Install Python deps ---
echo 📦 Installing Python dependencies (MetaTrader5, Flask, pandas)...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ⚠️  Python pip install failed. You can:
  echo    1. Try manually:  python -m pip install MetaTrader5 flask flask-cors pandas numpy
  echo    2. The scanner will still start, but use simulated data until MT5 bridge is up.
  echo.
)

REM --- Launch ---
REM Note: We use random high ports to avoid clashing with React/Vue/Angular.
REM To pin to specific ports: set PORT=8080 PORT_WELTRADE=8081 PORT_DERIV=8082
echo.
echo ============================================================
echo   🚀 Launching scanner... (URLs will print below)
echo ============================================================
echo.
node server.js
pause
