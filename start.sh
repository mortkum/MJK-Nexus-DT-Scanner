#!/bin/bash
echo "⚡ Nexus DT/DB Scanner - Starting..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found! Install from https://nodejs.org/"
  exit 1
fi
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi
echo "🚀 Starting on http://localhost:3000"
echo "Main Hub: http://localhost:3000"
echo "Weltrade: http://localhost:3000/?broker=weltrade"
echo "Deriv: http://localhost:3000/?broker=deriv"
# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then open http://localhost:3000; 
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then xdg-open http://localhost:3000 &> /dev/null &
fi
node server.js
