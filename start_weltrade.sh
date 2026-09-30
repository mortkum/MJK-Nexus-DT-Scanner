#!/bin/bash
# ============================================================
# ⚡ Nexus Weltrade Scanner - 1-Click Launcher (macOS / Linux)
# ============================================================
# Auto-installs Python + Node deps and starts the scanner with
# live Weltrade MT5 data feed.

set -e

echo ""
echo "============================================================"
echo "  ⚡ NEXUS WELTRADE SCANNER"
echo "============================================================"
echo ""

# --- Node.js check ---
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found!"
  echo "   Install from https://nodejs.org/"
  exit 1
fi

# --- Python check ---
PY=""
for p in python3 python; do
  if command -v "$p" &> /dev/null; then PY="$p"; break; fi
done
if [ -z "$PY" ]; then
  echo "❌ Python not found!"
  echo "   macOS: brew install python3"
  echo "   Linux: sudo apt install python3 python3-pip"
  exit 1
fi

# --- Install Node deps ---
if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node.js dependencies..."
  npm install
fi

# --- Install Python deps ---
echo "📦 Installing Python dependencies (MetaTrader5, Flask, pandas)..."
$PY -m pip install --quiet --upgrade pip || true
$PY -m pip install --quiet -r requirements.txt || {
  echo ""
  echo "⚠️  Python pip install failed. You can:"
  echo "   1. Try manually:  $PY -m pip install MetaTrader5 flask flask-cors pandas numpy"
  echo "   2. The scanner will still start, but use simulated data until MT5 bridge is up."
  echo ""
}

# --- Launch ---
echo ""
echo "============================================================"
echo "  🚀 Launching scanner..."
echo "============================================================"
echo "  Web UI:       http://localhost:3001  (standalone Weltrade)"
echo "  Unified hub:  http://localhost:3000  (all brokers)"
echo "  MT5 setup:    http://localhost:3001/weltrade/settings.html"
echo "============================================================"
echo ""

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then open "http://localhost:3001/weltrade/settings.html" 2>/dev/null || true
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then xdg-open "http://localhost:3001/weltrade/settings.html" 2>/dev/null || true
fi

node server.js
