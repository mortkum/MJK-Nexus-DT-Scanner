MJK Nexus workspace — local run guide

This archive contains the complete project source as it currently exists in the Arena workspace, including the travel content engine and the original trading scanner. It omits Git internals (.git) and installed dependencies (node_modules) to keep the download small.

Requirements: Node.js (LTS recommended) and npm.

Windows:
  1. Extract this ZIP to a folder you can write to.
  2. Open Command Prompt or PowerShell in that folder.
  3. Run: npm ci
  4. Run: npm start
  5. Open http://localhost:3000

Mac/Linux:
  1. Extract this ZIP to a folder you can write to.
  2. Open Terminal in that folder.
  3. Run: npm ci
  4. Run: npm start
  5. Open http://localhost:3000

The travel content engine is at http://localhost:3000/ (also /content-engine).
The original trading scanner is at http://localhost:3000/scanner.

Keep the terminal window open while using the app. Press Ctrl+C in that window to stop the server.

This ZIP contains the current working files, not Git history or a Git repository. If npm ci is blocked by your network policy, contact your IT team or use a network approved for npm package downloads.
