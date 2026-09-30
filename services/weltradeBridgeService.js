// services/weltradeBridgeService.js - Node.js orchestrator for the Python MT5 bridge
//
// Responsibilities:
//  1. Auto-spawn weltrade_mt5_bridge.py if it isn't already running
//  2. Forward /api/weltrade/* requests from the Node server to the Python bridge
//  3. Persist Weltrade credentials to a local JSON file (~/.weltrade-credentials.json)
//     so the bridge can auto-reconnect on every server restart.
//  4. Expose a graceful fallback: if the bridge is unreachable, return
//     {"connected": false} instead of throwing so the rest of the scanner
//     continues to work in demo/simulation mode.

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const BRIDGE_PORT = parseInt(process.env.WELTRADE_BRIDGE_PORT || '5555', 10);
const BRIDGE_HOST = process.env.WELTRADE_BRIDGE_HOST || '127.0.0.1';
const BRIDGE_URL  = `http://${BRIDGE_HOST}:${BRIDGE_PORT}`;

const CRED_FILE = path.join(os.homedir(), '.weltrade-credentials.json');
const BRIDGE_SCRIPT = path.join(__dirname, '..', 'weltrade_mt5_bridge.py');
const PYTHON_BIN   = process.env.WELTRADE_PYTHON || findPython();

/**
 * Discover Python on the system. Tries (in order):
 *   1. WELTRADE_PYTHON env var
 *   2. `python` / `python3` on PATH (via `where` on Windows, `which` on Unix)
 *   3. Common Windows install paths (C:\Python314, C:\Python313, etc.)
 *   4. py launcher (Windows)
 * Returns the absolute path to the python executable, or just 'python' as fallback.
 */
function findPython() {
  const { execSync } = require('child_process');
  const candidates = [];
  const platform = process.platform;

  // 1. PATH lookup
  try {
    const cmd = platform === 'win32' ? 'where python' : 'which python3 python';
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (out) {
      const first = out.split(/\r?\n/)[0].trim();
      if (first) candidates.push(first);
    }
  } catch (_) {}

  // 2. Common Windows install paths (try in order of recency)
  if (platform === 'win32') {
    const commonPaths = [
      'C:\\Python314\\python.exe',
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python39\\python.exe',
      'C:\\Python38\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python314\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python313\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python312\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python311\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python310\\python.exe',
      'C:\\Program Files\\Python314\\python.exe',
      'C:\\Program Files\\Python313\\python.exe',
      'C:\\Program Files\\Python312\\python.exe',
      'C:\\Program Files\\Python311\\python.exe',
    ];
    for (const p of commonPaths) {
      try { if (fs.existsSync(p)) { candidates.push(p); break; } } catch (_) {}
    }
    // 3. Try `py` launcher as a last resort
    try {
      const out = execSync('py -3 -c "import sys; print(sys.executable)"', {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000,
      }).trim();
      if (out && fs.existsSync(out)) candidates.push(out);
    } catch (_) {}
  }

  const chosen = candidates[0] || (platform === 'win32' ? 'python' : 'python3');
  if (process.env.WELTRADE_BRIDGE_DEBUG) {
    console.log(`[weltrade-bridge] Python candidates: ${JSON.stringify(candidates)}`);
    console.log(`[weltrade-bridge] Using: ${chosen}`);
  }
  return chosen;
}

let bridgeProcess = null;
let bridgeStarted = false;
let lastHealth = null;
let lastHealthAt = 0;
const HEALTH_TTL_MS = 5000;

// ----------------------------------------------------------------------
// Bridge lifecycle
// ----------------------------------------------------------------------
function startBridge() {
  if (bridgeStarted) return;
  if (!fs.existsSync(BRIDGE_SCRIPT)) {
    console.warn('[weltrade-bridge] Python script not found:', BRIDGE_SCRIPT);
    return;
  }

  console.log('[weltrade-bridge] Spawning Python bridge on port', BRIDGE_PORT);
  console.log('[weltrade-bridge] Using Python:', PYTHON_BIN);

  try {
    bridgeProcess = spawn(PYTHON_BIN, [BRIDGE_SCRIPT], {
      cwd: path.dirname(BRIDGE_SCRIPT),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        WELTRADE_BRIDGE_PORT: String(BRIDGE_PORT),
        PYTHONIOENCODING: 'utf-8',         // force UTF-8 stdout on Windows
        PYTHONUTF8: '1',                   // Python 3.7+ UTF-8 mode
        PYTHONUNBUFFERED: '1',             // flush stdout immediately for real-time logs
      },
    });
  } catch (err) {
    console.error('[weltrade-bridge] Failed to spawn Python:', err.message);
    console.error('[weltrade-bridge] Set WELTRADE_PYTHON env var to the python.exe path');
    bridgeStarted = false;
    return;
  }

  bridgeProcess.on('error', (err) => {
    console.error('[weltrade-bridge] Spawn error:', err.message);
    if (err.code === 'ENOENT') {
      console.error('[weltrade-bridge] Python executable not found at:', PYTHON_BIN);
      console.error('[weltrade-bridge] Set WELTRADE_PYTHON env var to the correct python.exe path');
      console.error('[weltrade-bridge] Example: set WELTRADE_PYTHON=C:\\Python314\\python.exe');
    }
    bridgeStarted = false;
  });

  bridgeProcess.stdout.on('data', (chunk) => {
    process.stdout.write(`[bridge] ${chunk}`);
  });
  bridgeProcess.stderr.on('data', (chunk) => {
    process.stderr.write(`[bridge-err] ${chunk}`);
  });

  bridgeProcess.on('exit', (code, sig) => {
    console.warn(`[weltrade-bridge] exited code=${code} sig=${sig}`);
    bridgeStarted = false;
    bridgeProcess = null;
    // Only auto-restart if the process exited normally (code 0) or via signal.
    // Don't restart on crash loops (instant exit with non-zero) - that means
    // a real problem (e.g. missing Python deps) we don't want to spam logs.
    if (code === 0 || sig) {
      setTimeout(() => { if (!bridgeStarted) startBridge(); }, 3000);
    } else {
      console.warn('[weltrade-bridge] Not auto-restarting (install Python deps or run weltrade_mt5_bridge.py manually). Will retry in 60s.');
      setTimeout(() => { if (!bridgeStarted) startBridge(); }, 60000);
    }
  });

  bridgeStarted = true;
}

function stopBridge() {
  if (bridgeProcess) {
    try { bridgeProcess.kill('SIGTERM'); } catch (_) {}
    bridgeProcess = null;
    bridgeStarted = false;
  }
}

// ----------------------------------------------------------------------
// Credentials persistence
// ----------------------------------------------------------------------
function loadCredentials() {
  try {
    if (fs.existsSync(CRED_FILE)) {
      const raw = fs.readFileSync(CRED_FILE, 'utf8');
      const obj = JSON.parse(raw);
      // Never echo password back in plaintext except when explicitly asked
      return obj;
    }
  } catch (e) {
    console.warn('[weltrade-bridge] Could not load credentials:', e.message);
  }
  return null;
}

function saveCredentials(creds) {
  try {
    fs.writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
    return true;
  } catch (e) {
    console.error('[weltrade-bridge] Could not save credentials:', e.message);
    return false;
  }
}

function clearCredentials() {
  try { if (fs.existsSync(CRED_FILE)) fs.unlinkSync(CRED_FILE); } catch (_) {}
}

function hasCredentials() {
  const c = loadCredentials();
  return !!(c && c.login && c.password && c.server);
}

// ----------------------------------------------------------------------
// HTTP client (no external deps)
// ----------------------------------------------------------------------
function httpJson(method, urlPath, body, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const url = new URL(BRIDGE_URL + urlPath);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port:     url.port || 80,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: timeoutMs,
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (_) {}
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on('timeout', () => { req.destroy(new Error('Bridge timeout')); });
    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

// ----------------------------------------------------------------------
// High-level operations
// ----------------------------------------------------------------------
async function health() {
  if (Date.now() - lastHealthAt < HEALTH_TTL_MS && lastHealth) return lastHealth;
  try {
    const res = await httpJson('GET', '/health', null, 3000);
    if (res.status === 200 && res.json) {
      lastHealth = res.json;
      lastHealthAt = Date.now();
      return res.json;
    }
    lastHealth = { status: 'unreachable', mt5_available: null, connected: false };
  } catch (e) {
    lastHealth = { status: 'unreachable', error: e.message, connected: false };
  }
  lastHealthAt = Date.now();
  return lastHealth;
}

async function connect(creds) {
  // creds: { login, password, server, path? }
  startBridge();
  // Give Python a moment to bind the port
  await new Promise(r => setTimeout(r, 1200));
  try {
    const res = await httpJson('POST', '/connect', creds, 15000);
    if (res.status === 200 && res.json && res.json.success) {
      saveCredentials(creds);
      lastHealth = null;  // invalidate cache
      return { success: true, ...res.json };
    }
    return { success: false, error: (res.json && res.json.error) || `HTTP ${res.status}`, details: res.text };
  } catch (e) {
    return { success: false, error: `Bridge unreachable: ${e.message}. Is Python + MetaTrader5 installed?` };
  }
}

async function disconnect() {
  try {
    const res = await httpJson('POST', '/disconnect', {}, 5000);
    clearCredentials();
    lastHealth = null;
    return res.json || { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function fetchCandles(symbol, timeframe, count = 120) {
  const params = `?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}&n=${count}`;
  const res = await httpJson('GET', '/candles' + params, null, 10000);
  if (res.status === 200 && res.json) return res.json;
  if (res.status === 503) {
    return { connected: false, symbol, timeframe, error: (res.json && res.json.error) || 'Bridge offline' };
  }
  throw new Error((res.json && res.json.error) || `Bridge HTTP ${res.status}`);
}

async function fetchAccount() {
  const res = await httpJson('GET', '/account', null, 5000);
  if (res.status === 200) return res.json;
  throw new Error((res.json && res.json.error) || `HTTP ${res.status}`);
}

async function fetchSymbols() {
  const res = await httpJson('GET', '/symbols', null, 5000);
  if (res.status === 200) return res.json;
  return null;
}

// ----------------------------------------------------------------------
// Auto-reconnect on startup if credentials are saved
// ----------------------------------------------------------------------
async function autoReconnect() {
  const creds = loadCredentials();
  if (!creds) return { attempted: false };
  console.log('[weltrade-bridge] Found saved credentials, attempting auto-reconnect to', creds.server);
  const result = await connect(creds);
  if (result.success) console.log('[weltrade-bridge] Auto-reconnect successful');
  else console.warn('[weltrade-bridge] Auto-reconnect failed:', result.error);
  return { attempted: true, result };
}

// ----------------------------------------------------------------------
// Express route registration
// ----------------------------------------------------------------------
function registerRoutes(app) {
  // Health
  app.get('/api/weltrade/bridge/health', async (req, res) => {
    const h = await health();
    res.json(h);
  });

  // Symbols (proxies Python bridge to mark "live" symbols; falls back to canonical list)
  app.get('/api/weltrade/bridge/symbols', async (req, res) => {
    try {
      const data = await fetchSymbols();
      if (data) return res.json(data);
    } catch (e) {
      // fall through to canonical list
    }
    const canon = require('./weltradeData').WELTRADE_WATCHLIST;
    res.json({ broker: 'Weltrade', count: canon.length, watchlist: canon, live: false });
  });

  // Candles
  app.get('/api/weltrade/bridge/candles', async (req, res) => {
    const { symbol, tf, n } = req.query;
    if (!symbol || !tf) return res.status(400).json({ error: 'symbol and tf required' });
    try {
      const data = await fetchCandles(symbol, tf, parseInt(n || '120', 10));
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message, symbol, timeframe: tf });
    }
  });

  // Connect
  app.post('/api/weltrade/bridge/connect', async (req, res) => {
    const { login, password, server, path } = req.body || {};
    if (!login || !password || !server) {
      return res.status(400).json({ error: 'login, password, and server are required' });
    }
    const result = await connect({ login, password, server, path });
    res.json(result);
  });

  // Disconnect
  app.post('/api/weltrade/bridge/disconnect', async (req, res) => {
    const result = await disconnect();
    res.json(result);
  });

  // Auto-detect: attach to running MT5 terminal (no password needed if already
  // logged in)
  app.post('/api/weltrade/bridge/detect', async (req, res) => {
    try {
      // Forward the path from the request body to the Python bridge so it
      // can find Weltrade MT5 (which installs to a non-standard folder)
      const res2 = await httpJson('POST', '/detect', req.body || {}, 10000);
      if (res2.status === 200 && res2.json && res2.json.success) {
        // Save credentials so auto-reconnect works on restart
        saveCredentials({
          login: res2.json.login,
          password: '',  // not needed for detect mode
          server: res2.json.server,
          path: req.body?.path || '',
        });
        lastHealth = null;
        return res.json(res2.json);
      }
      return res.status(res2.status).json(res2.json || { error: 'Bridge returned ' + res2.status });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Account info
  app.get('/api/weltrade/bridge/account', async (req, res) => {
    try {
      const data = await fetchAccount();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Credentials management
  app.get('/api/weltrade/bridge/credentials/status', (req, res) => {
    const c = loadCredentials();
    if (!c) return res.json({ saved: false });
    res.json({
      saved: true,
      login: c.login,
      server: c.server,
      has_password: !!c.password,
      path: c.path || null,
    });
  });

  app.delete('/api/weltrade/bridge/credentials', (req, res) => {
    clearCredentials();
    res.json({ success: true });
  });
}

module.exports = {
  registerRoutes,
  startBridge,
  stopBridge,
  autoReconnect,
  health,
  connect,
  disconnect,
  fetchCandles,
  fetchSymbols,
  fetchAccount,
  loadCredentials,
  saveCredentials,
  clearCredentials,
  hasCredentials,
  BRIDGE_PORT,
  BRIDGE_URL,
};
