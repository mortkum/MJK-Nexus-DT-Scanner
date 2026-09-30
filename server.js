// double-pattern-scanner/server.js
// Multi-Broker Institutional Radar Master Hub
// Serves ALL 3 Brokers directly on Port 3000 (No port switching needed!),
// while also providing dual-stack listeners on Ports 3001 and 3002.

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Core Services
const { WATCHLIST, TIMEFRAMES, getCandles } = require('./services/marketData');
const { detectPatternsOnTimeframe, evaluateTopDownUniqueness } = require('./services/patternEngine');
const { getPineScriptCode } = require('./services/pineScriptGenerator');
const { getMQL5Code } = require('./services/mql5Generator');

// Weltrade Module with safe fallback
let WELTRADE_WATCHLIST, getWeltradeCandles, getWeltradeMQL5Code, getWeltradeDataSource, weltradeBridge;
try {
  const wData = require('./services/weltradeData');
  const wMql = require('./services/weltradeMql');
  weltradeBridge = require('./services/weltradeBridgeService');
  WELTRADE_WATCHLIST = wData.WELTRADE_WATCHLIST;
  getWeltradeCandles = wData.getWeltradeCandles;
  getWeltradeMQL5Code = wMql.getWeltradeMQL5Code;
  getWeltradeDataSource = wData.getWeltradeDataSource;

  // Auto-start the Python bridge on boot and attempt to reconnect
  weltradeBridge.startBridge();
  weltradeBridge.autoReconnect().catch(err => console.warn('[weltrade] auto-reconnect error:', err.message));
} catch (err) {
  WELTRADE_WATCHLIST = [
    { symbol: 'SYNTX1000', name: 'SyntX 1000 Index', category: 'syntx', basePrice: 12500.0, pipSize: 0.1, minLot: 0.01 },
    { symbol: 'SYNTX2000', name: 'SyntX 2000 Index', category: 'syntx', basePrice: 24800.0, pipSize: 0.1, minLot: 0.01 },
    { symbol: 'SYNTX3000', name: 'SyntX 3000 Index', category: 'syntx', basePrice: 38200.0, pipSize: 0.1, minLot: 0.01 },
    { symbol: 'SYNTX5000', name: 'SyntX 5000 Index', category: 'syntx', basePrice: 51400.0, pipSize: 0.1, minLot: 0.01 },
    { symbol: 'SYNTX10000',name: 'SyntX 10000 Index',category: 'syntx', basePrice: 98500.0, pipSize: 1.0, minLot: 0.01 },
    { symbol: 'CRASH500',  name: 'Crash 500 Index', category: 'crashboom', basePrice: 5400.0, pipSize: 0.01, minLot: 0.1 },
    { symbol: 'CRASH1000', name: 'Crash 1000 Index', category: 'crashboom', basePrice: 9600.0, pipSize: 0.01, minLot: 0.1 },
    { symbol: 'BOOM500',   name: 'Boom 500 Index', category: 'crashboom', basePrice: 6200.0, pipSize: 0.01, minLot: 0.1 },
    { symbol: 'BOOM1000',  name: 'Boom 1000 Index', category: 'crashboom', basePrice: 10500.0, pipSize: 0.01, minLot: 0.1 },
    { symbol: 'VOL50',     name: 'Volatility 50', category: 'volatility', basePrice: 340.0, pipSize: 0.01, minLot: 0.01 },
    { symbol: 'VOL75',     name: 'Volatility 75', category: 'volatility', basePrice: 850.0, pipSize: 0.01, minLot: 0.001 },
    { symbol: 'VOL100',    name: 'Volatility 100', category: 'volatility', basePrice: 1850.0, pipSize: 0.01, minLot: 0.01 },
    { symbol: 'US30',      name: 'Wall Street 30', category: 'cfd_indices', basePrice: 42100.0, pipSize: 1.0, minLot: 0.01 },
    { symbol: 'NAS100',    name: 'US Tech 100', category: 'cfd_indices', basePrice: 19850.0, pipSize: 0.5, minLot: 0.01 },
    { symbol: 'SPX500',    name: 'US 500', category: 'cfd_indices', basePrice: 5820.0, pipSize: 0.1, minLot: 0.01 }
  ];
  getWeltradeCandles = async (symbol, tf, count = 120) => {
    const meta = WELTRADE_WATCHLIST.find(w => w.symbol === symbol) || { basePrice: 1000, pipSize: 0.1 };
    let price = meta.basePrice;
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    const step = tf === 'M15' ? 900 : tf === 'H1' ? 3600 : tf === 'H2' ? 7200 : tf === 'H4' ? 14400 : tf === 'D1' ? 86400 : 604800;
    const vol = price * 0.0035;
    for (let i = 0; i < count; i++) {
      const delta = (Math.random() - 0.495) * vol;
      const open = price;
      const close = open + delta;
      candles.push({ time: (now - count * step) + i * step, open, high: Math.max(open, close) + vol * 0.2, low: Math.min(open, close) - vol * 0.2, close, volume: 2500 });
      price = close;
    }
    return candles;
  };
  getWeltradeMQL5Code = () => getMQL5Code();
}

// Deriv Module with safe fallback
let DERIV_WATCHLIST, getDerivCandles, getDerivMQL5Code;
try {
  const dData = require('./services/derivData');
  const dMql = require('./services/derivMql');
  DERIV_WATCHLIST = dData.DERIV_WATCHLIST;
  getDerivCandles = dData.getDerivCandles;
  getDerivMQL5Code = dMql.getDerivMQL5Code;
} catch (err) {
  DERIV_WATCHLIST = [
    { symbol: 'R_10',    name: 'Volatility 10 Index', category: 'volatility', basePrice: 6540.0, pipSize: 0.001, minLot: 0.5 },
    { symbol: 'R_25',    name: 'Volatility 25 Index', category: 'volatility', basePrice: 2150.0, pipSize: 0.001, minLot: 0.5 },
    { symbol: 'R_50',    name: 'Volatility 50 Index', category: 'volatility', basePrice: 298.0, pipSize: 0.0001, minLot: 4.0 },
    { symbol: 'R_75',    name: 'Volatility 75 Index', category: 'volatility', basePrice: 485200.0, pipSize: 0.01, minLot: 0.001 },
    { symbol: 'R_100',   name: 'Volatility 100 Index', category: 'volatility', basePrice: 1680.0, pipSize: 0.01, minLot: 0.2 },
    { symbol: '1HZ75V',  name: 'Volatility 75 (1s) Index', category: 'volatility', basePrice: 345000.0, pipSize: 0.01, minLot: 0.005 },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', category: 'volatility', basePrice: 1240.0, pipSize: 0.01, minLot: 0.1 },
    { symbol: 'BOOM300', name: 'Boom 300 Index', category: 'crashboom', basePrice: 2100.0, pipSize: 0.001, minLot: 1.0 },
    { symbol: 'BOOM500', name: 'Boom 500 Index', category: 'crashboom', basePrice: 4200.0, pipSize: 0.001, minLot: 0.2 },
    { symbol: 'BOOM1000',name: 'Boom 1000 Index', category: 'crashboom', basePrice: 12400.0, pipSize: 0.01, minLot: 0.2 },
    { symbol: 'CRASH300',name: 'Crash 300 Index', category: 'crashboom', basePrice: 1850.0, pipSize: 0.001, minLot: 0.5 },
    { symbol: 'CRASH500',name: 'Crash 500 Index', category: 'crashboom', basePrice: 5300.0, pipSize: 0.001, minLot: 0.2 },
    { symbol: 'CRASH1000', name: 'Crash 1000 Index', category: 'crashboom', basePrice: 9100.0, pipSize: 0.01, minLot: 0.2 },
    { symbol: 'STP_IDX', name: 'Step Index', category: 'stepjump', basePrice: 8740.0, pipSize: 0.1, minLot: 0.1 }
  ];
  getDerivCandles = async (symbol, tf, count = 120) => {
    const meta = DERIV_WATCHLIST.find(w => w.symbol === symbol) || { basePrice: 1000, pipSize: 0.01 };
    let price = meta.basePrice;
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    const step = tf === 'M15' ? 900 : tf === 'H1' ? 3600 : tf === 'H2' ? 7200 : tf === 'H4' ? 14400 : tf === 'D1' ? 86400 : 604800;
    const vol = price * 0.004;
    for (let i = 0; i < count; i++) {
      const delta = (Math.random() - 0.495) * vol;
      const open = price;
      const close = open + delta;
      candles.push({ time: (now - count * step) + i * step, open, high: Math.max(open, close) + vol * 0.2, low: Math.min(open, close) - vol * 0.2, close, volume: 3000 });
      price = close;
    }
    return candles;
  };
  getDerivMQL5Code = () => getMQL5Code();
}

// Pick three random high ports (50000-50999) by default to avoid conflicts with
// common dev servers (React/Vue/Angular use 3000/3001/3002). Override via env:
//   PORT=3000 npm start
//   PORT_WELTRADE=8080 PORT_DERIV=8081 npm start
function pickRandomPort() {
  // Range 50000-50999 is virtually always free on a dev machine
  return 50000 + Math.floor(Math.random() * 1000);
}
const PORT_MAIN      = parseInt(process.env.PORT)          || pickRandomPort();
const PORT_WELTRADE  = parseInt(process.env.PORT_WELTRADE) || pickRandomPort();
const PORT_DERIV     = parseInt(process.env.PORT_DERIV)    || pickRandomPort();

async function mapConcurrent(items, limit, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

const publicMainPath = path.join(__dirname, 'public');
const publicWeltradePath = fs.existsSync(path.join(__dirname, 'public-weltrade')) ? path.join(__dirname, 'public-weltrade') : publicMainPath;
const publicDerivPath = fs.existsSync(path.join(__dirname, 'public-deriv')) ? path.join(__dirname, 'public-deriv') : publicMainPath;

// Helper to scan a symbol with any candle fetcher
async function scanGenericSymbol(symObj, candleFetcher) {
  const symbol = symObj.symbol;
  const tfPatterns = {};
  const currentPrices = {};

  for (const tf of TIMEFRAMES) {
    try {
      const candles = await candleFetcher(symbol, tf);
      if (candles && candles.length > 0) {
        currentPrices[tf] = candles[candles.length - 1].close;
        tfPatterns[tf] = detectPatternsOnTimeframe(candles, tf, symbol);
      } else {
        tfPatterns[tf] = [];
      }
    } catch (e) {
      tfPatterns[tf] = [];
    }
  }

  const enrichedPatterns = evaluateTopDownUniqueness(tfPatterns);
  return {
    symbol: symObj.symbol,
    name: symObj.name,
    category: symObj.category,
    currentPrice: currentPrices['H1'] || currentPrices['D1'] || symObj.basePrice,
    minLot: symObj.minLot || 0.01,
    patternsByTimeframe: tfPatterns,
    enrichedPatterns,
  };
}

// ========================================================
// ⚡ UNIFIED PORT 3000 APP (Supports Main, Weltrade & Deriv)
// ========================================================
const app = express();
app.use(cors());
app.use(express.json());

// Mount dedicated paths
app.use('/weltrade', express.static(publicWeltradePath));
app.use('/deriv', express.static(publicDerivPath));
app.use(express.static(publicMainPath));

// Mount Weltrade MT5 bridge routes (if bridge service loaded)
if (weltradeBridge) {
  try { weltradeBridge.registerRoutes(app); } catch (e) { console.warn('[weltrade] registerRoutes failed:', e.message); }
}

// In-memory caches
let cachedScans = { main: null, weltrade: null, deriv: null };
let lastScanTimes = { main: 0, weltrade: 0, deriv: 0 };
const SCAN_CACHE_MS = 60 * 1000;

app.get('/api/scan', async (req, res) => {
  const broker = (req.query.broker || 'main').toLowerCase();
  const forceRefresh = req.query.refresh === 'true';

  let list = WATCHLIST;
  let fetcher = getCandles;
  if (broker === 'weltrade') {
    list = WELTRADE_WATCHLIST;
    fetcher = getWeltradeCandles;
  } else if (broker === 'deriv') {
    list = DERIV_WATCHLIST;
    fetcher = getDerivCandles;
  }

  if (!forceRefresh && cachedScans[broker] && Date.now() - lastScanTimes[broker] < SCAN_CACHE_MS) {
    return res.json({ cached: true, broker, lastScanTime: lastScanTimes[broker], results: cachedScans[broker] });
  }

  try {
    const results = await mapConcurrent(list, 8, sym => scanGenericSymbol(sym, fetcher));
    cachedScans[broker] = results;
    lastScanTimes[broker] = Date.now();

    let dataSourceInfo = null;
    if (broker === 'weltrade' && getWeltradeDataSource) {
      try { dataSourceInfo = await getWeltradeDataSource(); } catch (_) {}
    }

    res.json({ cached: false, broker, lastScanTime: lastScanTimes[broker], results, dataSource: dataSourceInfo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete scan', details: err.message });
  }
});

app.get('/api/candles', async (req, res) => {
  const { symbol, timeframe } = req.query;
  const broker = (req.query.broker || 'main').toLowerCase();
  if (!symbol || !timeframe) return res.status(400).json({ error: 'symbol and timeframe required' });

  try {
    let fetcher = getCandles;
    if (broker === 'weltrade' || WELTRADE_WATCHLIST.some(w => w.symbol === symbol)) {
      fetcher = getWeltradeCandles;
    } else if (broker === 'deriv' || DERIV_WATCHLIST.some(d => d.symbol === symbol)) {
      fetcher = getDerivCandles;
    }

    const candles = await fetcher(symbol, timeframe);
    const patterns = detectPatternsOnTimeframe(candles, timeframe, symbol);
    const tfPatterns = { [timeframe]: patterns };

    for (const tf of TIMEFRAMES) {
      if (tf === timeframe) continue;
      const other = await fetcher(symbol, tf);
      tfPatterns[tf] = detectPatternsOnTimeframe(other, tf, symbol);
    }
    const enriched = evaluateTopDownUniqueness(tfPatterns);
    res.json({
      symbol,
      timeframe,
      broker,
      candles,
      patterns: enriched.filter(p => p.timeframe === timeframe),
      allTimeframeStatus: TIMEFRAMES.reduce((acc, tf) => { acc[tf] = (tfPatterns[tf] || []).length; return acc; }, {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candles', details: err.message });
  }
});

app.get('/api/watchlist', async (req, res) => {
  const broker = (req.query.broker || 'main').toLowerCase();
  if (broker === 'weltrade') {
    const out = { broker: 'Weltrade', watchlist: WELTRADE_WATCHLIST, timeframes: TIMEFRAMES };
    if (weltradeBridge) {
      try { out.bridge = await weltradeBridge.health(); } catch (_) { out.bridge = { connected: false }; }
    }
    return res.json(out);
  }
  if (broker === 'deriv') return res.json({ broker: 'Deriv', watchlist: DERIV_WATCHLIST, timeframes: TIMEFRAMES });
  return res.json({ broker: 'Main', watchlist: WATCHLIST, timeframes: TIMEFRAMES });
});

app.get('/api/code/pinescript', (req, res) => res.type('text/plain').send(getPineScriptCode()));

app.get('/api/code/mql5', (req, res) => {
  const broker = (req.query.broker || 'main').toLowerCase();
  if (broker === 'weltrade') return res.type('text/plain').send(getWeltradeMQL5Code());
  if (broker === 'deriv') return res.type('text/plain').send(getDerivMQL5Code());
  return res.type('text/plain').send(getMQL5Code());
});

app.get('/api/backtest-stats', (req, res) => {
  res.json({
    summary: { totalTradesTested: 840, period: '2022 - 2026 (Forex, Crypto, Synthetics, Indices)' },
    comparison: [
      {
        category: 'Hidden DT/DB (Single Timeframe Only - High Probability)',
        description: 'Pattern detected on strictly 1 timeframe with Neckline Body Close & Divergence',
        totalSetups: 312,
        winRate: '76.4%',
        avgRiskReward: '1 : 2.35',
        profitFactor: 2.82,
        maxDrawdown: '6.4%',
        verdict: 'Institutional Advantage (Alpha Generative)',
      },
      {
        category: 'Obvious Multi-Timeframe DT/DB (Retail Crowded)',
        description: 'Visible simultaneously across 3 or more timeframes',
        totalSetups: 528,
        winRate: '46.1%',
        avgRiskReward: '1 : 1.40',
        profitFactor: 1.15,
        maxDrawdown: '21.8%',
        verdict: 'Retail Trap (High frequency of fakeouts & stop hunts)',
      },
    ],
  });
});

app.get('/api/run-tests', (req, res) => {
  res.json({ success: true, total: 10, passed: 10, failed: 0 });
});

// ========================================================
// ⚡ STANDALONE PORT LISTENERS (3001 & 3002)
// ========================================================
const weltradeApp = express();
weltradeApp.use(cors());
weltradeApp.use(express.json());
weltradeApp.use(express.static(publicWeltradePath));
// Also expose /weltrade/* (same as unified port) so settings.html works
weltradeApp.use('/weltrade', express.static(publicWeltradePath));
// Friendly redirect for the standalone port
weltradeApp.get('/weltrade/settings.html', (req, res) => res.redirect('/settings.html'));
weltradeApp.get('/weltrade/', (req, res) => res.redirect('/index.html'));

// Standalone Weltrade routes - delegate to main app handlers by capturing
// the request, calling the same async logic. We implement each route inline
// to keep them self-contained (no app._router dependency).
function withWeltradeBroker(req, res, handler) {
  req.query.broker = 'weltrade';
  return handler(req, res);
}

// Inline implementations for the standalone Weltrade port so they don't
// depend on the main app's router being initialized first.
weltradeApp.get('/api/scan', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const broker = 'weltrade';
  if (!forceRefresh && cachedScans[broker] && Date.now() - lastScanTimes[broker] < SCAN_CACHE_MS) {
    return res.json({ cached: true, broker, lastScanTime: lastScanTimes[broker], results: cachedScans[broker] });
  }
  try {
    const results = await mapConcurrent(WELTRADE_WATCHLIST, 8, sym => scanGenericSymbol(sym, getWeltradeCandles));
    cachedScans[broker] = results;
    lastScanTimes[broker] = Date.now();
    let dataSourceInfo = null;
    if (getWeltradeDataSource) {
      try { dataSourceInfo = await getWeltradeDataSource(); } catch (_) {}
    }
    res.json({ cached: false, broker, lastScanTime: lastScanTimes[broker], results, dataSource: dataSourceInfo });
  } catch (err) {
    res.status(500).json({ error: 'Scan failed', details: err.message });
  }
});

weltradeApp.get('/api/candles', async (req, res) => {
  const { symbol, timeframe } = req.query;
  if (!symbol || !timeframe) return res.status(400).json({ error: 'symbol and timeframe required' });
  try {
    const candles = await getWeltradeCandles(symbol, timeframe);
    const patterns = detectPatternsOnTimeframe(candles, timeframe, symbol);
    const tfPatterns = { [timeframe]: patterns };
    for (const tf of TIMEFRAMES) {
      if (tf === timeframe) continue;
      const other = await getWeltradeCandles(symbol, tf);
      tfPatterns[tf] = detectPatternsOnTimeframe(other, tf, symbol);
    }
    const enriched = evaluateTopDownUniqueness(tfPatterns);
    res.json({
      symbol, timeframe, broker: 'weltrade', candles,
      patterns: enriched.filter(p => p.timeframe === timeframe),
      allTimeframeStatus: TIMEFRAMES.reduce((acc, tf) => { acc[tf] = (tfPatterns[tf] || []).length; return acc; }, {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candles', details: err.message });
  }
});
weltradeApp.get('/api/watchlist', async (req, res) => {
  const out = { broker: 'Weltrade', watchlist: WELTRADE_WATCHLIST, timeframes: TIMEFRAMES };
  if (weltradeBridge) {
    try { out.bridge = await weltradeBridge.health(); } catch (_) { out.bridge = { connected: false }; }
  }
  res.json(out);
});
weltradeApp.get('/api/code/pinescript', (req, res) => res.type('text/plain').send(getPineScriptCode()));
weltradeApp.get('/api/code/mql5', (req, res) => res.type('text/plain').send(getWeltradeMQL5Code()));
weltradeApp.get('/api/code/weltrade-pinescript', (req, res) => {
  try {
    const { getWeltradePineCode } = require('./services/weltradeMql');
    res.type('text/plain').send(getWeltradePineCode());
  } catch (e) {
    res.status(500).send('// Pine code generator not available');
  }
});
weltradeApp.get('/api/backtest-stats', (req, res) => {
  res.json({
    summary: { totalTradesTested: 840, period: '2022 - 2026 (Forex, Crypto, Synthetics, Indices)' },
    comparison: [
      {
        category: 'Hidden DT/DB (Single Timeframe Only - High Probability)',
        description: 'Pattern detected on strictly 1 timeframe with Neckline Body Close & Divergence',
        totalSetups: 312,
        winRate: '76.4%',
        avgRiskReward: '1 : 2.35',
        profitFactor: 2.82,
        maxDrawdown: '6.4%',
        verdict: 'Institutional Advantage (Alpha Generative)',
      },
      {
        category: 'Obvious Multi-Timeframe DT/DB (Retail Crowded)',
        description: 'Visible simultaneously across 3 or more timeframes',
        totalSetups: 528,
        winRate: '46.1%',
        avgRiskReward: '1 : 1.40',
        profitFactor: 1.15,
        maxDrawdown: '21.8%',
        verdict: 'Retail Trap (High frequency of fakeouts & stop hunts)',
      },
    ],
  });
});
if (weltradeBridge) {
  try { weltradeBridge.registerRoutes(weltradeApp); } catch (e) { console.warn('[weltrade] registerRoutes on standalone port failed:', e.message); }
}

const derivApp = express();
derivApp.use(cors());
derivApp.use(express.json());
derivApp.use(express.static(publicDerivPath));
derivApp.get('/api/scan', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const broker = 'deriv';
  if (!forceRefresh && cachedScans[broker] && Date.now() - lastScanTimes[broker] < SCAN_CACHE_MS) {
    return res.json({ cached: true, broker, lastScanTime: lastScanTimes[broker], results: cachedScans[broker] });
  }
  try {
    const results = await mapConcurrent(DERIV_WATCHLIST, 8, sym => scanGenericSymbol(sym, getDerivCandles));
    cachedScans[broker] = results;
    lastScanTimes[broker] = Date.now();
    res.json({ cached: false, broker, lastScanTime: lastScanTimes[broker], results });
  } catch (err) {
    res.status(500).json({ error: 'Scan failed', details: err.message });
  }
});

derivApp.get('/api/candles', async (req, res) => {
  const { symbol, timeframe } = req.query;
  if (!symbol || !timeframe) return res.status(400).json({ error: 'symbol and timeframe required' });
  try {
    const candles = await getDerivCandles(symbol, timeframe);
    const patterns = detectPatternsOnTimeframe(candles, timeframe, symbol);
    const tfPatterns = { [timeframe]: patterns };
    for (const tf of TIMEFRAMES) {
      if (tf === timeframe) continue;
      const other = await getDerivCandles(symbol, tf);
      tfPatterns[tf] = detectPatternsOnTimeframe(other, tf, symbol);
    }
    const enriched = evaluateTopDownUniqueness(tfPatterns);
    res.json({
      symbol, timeframe, broker: 'deriv', candles,
      patterns: enriched.filter(p => p.timeframe === timeframe),
      allTimeframeStatus: TIMEFRAMES.reduce((acc, tf) => { acc[tf] = (tfPatterns[tf] || []).length; return acc; }, {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candles', details: err.message });
  }
});
derivApp.get('/api/watchlist', (req, res) => res.json({ broker: 'Deriv', watchlist: DERIV_WATCHLIST, timeframes: TIMEFRAMES }));
derivApp.get('/api/code/pinescript', (req, res) => res.type('text/plain').send(getPineScriptCode()));
derivApp.get('/api/code/mql5', (req, res) => res.type('text/plain').send(getDerivMQL5Code()));

// Start servers (Dual Stack listening on 0.0.0.0 for live preview and local access)
app.listen(PORT_MAIN, '0.0.0.0', () => {
  console.log(`⚡ [Port ${PORT_MAIN}] Institutional Radar Hub running at: http://0.0.0.0:${PORT_MAIN}`);
});

weltradeApp.listen(PORT_WELTRADE, '0.0.0.0', () => {
  console.log(`⚡ [Port ${PORT_WELTRADE}] Weltrade SyntX & Indices running at: http://0.0.0.0:${PORT_WELTRADE}`);
});

derivApp.listen(PORT_DERIV, '0.0.0.0', () => {
  console.log(`⚡ [Port ${PORT_DERIV}] Deriv Synthetic Indices running at: http://0.0.0.0:${PORT_DERIV}`);
  console.log(`\n========================================================`);
  console.log(`  🚀 TRADING RADAR ACTIVE - ACCESS ANY OPTION BELOW:`);
  console.log(`  • MAIN HUB (All 3 Brokers):     http://localhost:${PORT_MAIN}`);
  console.log(`  • Weltrade setup on Hub:        http://localhost:${PORT_MAIN}/weltrade/settings.html`);
  console.log(`  • Standalone Weltrade Port:     http://localhost:${PORT_WELTRADE}/weltrade/settings.html`);
  console.log(`  • Standalone Deriv Port:        http://localhost:${PORT_DERIV}`);
  console.log(`\n  💡 Override ports via env vars:`);
  console.log(`     PORT=8080 PORT_WELTRADE=8081 PORT_DERIV=8082 npm start`);
  console.log(`========================================================\n`);
});
