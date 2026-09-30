#!/bin/bash
# ============================================================
# ⚡ Nexus DT/DB Scanner - 1-Click Launcher (macOS / Linux)
# ============================================================
# Uses random high ports (50000+) by default to avoid conflicts
# with React/Vue/Angular dev servers (which use 3000/3001/3002).
# Override with:  PORT=8080 ./start.sh

set -e

echo ""
echo "============================================================"
echo "  ⚡ NEXUS DT/DB SCANNER"
echo "============================================================"
echo ""

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found!"
  echo "   Install from https://nodejs.org/"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node.js dependencies..."
  npm install
fi

echo "🚀 Starting scanner... (URLs will be printed below)"
echo ""
node server.js
