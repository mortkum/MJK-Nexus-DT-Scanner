#!/bin/bash
echo "⚡ Nexus / Travel Marketing Studio - Starting..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found! Install from https://nodejs.org/"
  exit 1
fi
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi
echo ""
echo "🚀 Starting servers (localhost is never blocked by Symantec):"
echo "   Travel Marketing Studio: http://localhost:3002"
echo "   Studio (hub alias):      http://localhost:3000/travelpulse"
echo "   Scanner hub:             http://localhost:3000"
echo "   Weltrade:                http://localhost:3000/?broker=weltrade"
echo "   Deriv:                   http://localhost:3000/?broker=deriv"
echo ""
# Open the studio (port 3002 is the preview port)
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3002
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open http://localhost:3002 &> /dev/null &
fi
node server.js
