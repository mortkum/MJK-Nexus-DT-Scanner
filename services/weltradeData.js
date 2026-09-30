// services/weltradeData.js - Weltrade data fetcher with MT5 bridge support
//
// This module exposes the same async function signature the rest of the
// scanner expects:  getWeltradeCandles(symbol, timeframe, count) -> [candles]
//
// On startup it tries the MT5 bridge (Python sidecar). If the bridge is
// reachable and connected, real Weltrade OHLCV data is returned. Otherwise
// it gracefully falls back to a deterministic simulator so the scanner UI
// remains usable for demos / development.
//
// The simulator is no longer pure Math.random - it uses the canonical
// Weltrade instrument profile (volatility class, drift) so candles look
// realistic across SyntX / FXvol / Volatility / Crash-Boom instruments.

const bridge = require('./weltradeBridgeService');

// Complete Weltrade instrument list (broker symbol -> metadata).
// This list is the source of truth used by both the live MT5 bridge and the
// fallback simulator. The Python bridge keeps a parallel canonical list.
const WELTRADE_WATCHLIST = [
  // ---- SyntX Indices (Weltrade's flagship synthetic line) ----
  { symbol: 'SYNTX1000',  name: 'SyntX 1000 Index',  category: 'syntx',   basePrice: 12500.0, pipSize: 0.1,   minLot: 0.01 },
  { symbol: 'SYNTX2000',  name: 'SyntX 2000 Index',  category: 'syntx',   basePrice: 24800.0, pipSize: 0.1,   minLot: 0.01 },
  { symbol: 'SYNTX3000',  name: 'SyntX 3000 Index',  category: 'syntx',   basePrice: 38200.0, pipSize: 0.1,   minLot: 0.01 },
  { symbol: 'SYNTX5000',  name: 'SyntX 5000 Index',  category: 'syntx',   basePrice: 51400.0, pipSize: 0.1,   minLot: 0.01 },
  { symbol: 'SYNTX10000', name: 'SyntX 10000 Index', category: 'syntx',   basePrice: 98500.0, pipSize: 1.0,   minLot: 0.01 },

  // ---- FX Vol Series (Weltrade actual MT5 names have SPACES) ----
  { symbol: 'FX Vol 20',  name: 'FX Vol 20',  category: 'fxvol', basePrice: 1025.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FX Vol 40',  name: 'FX Vol 40',  category: 'fxvol', basePrice: 2045.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FX Vol 60',  name: 'FX Vol 60',  category: 'fxvol', basePrice: 3120.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FX Vol 80',  name: 'FX Vol 80',  category: 'fxvol', basePrice: 4250.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FX Vol 99',  name: 'FX Vol 99',  category: 'fxvol', basePrice: 5890.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'SFX Vol 20', name: 'SFX Vol 20', category: 'fxvol', basePrice: 1030.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'SFX Vol 40', name: 'SFX Vol 40', category: 'fxvol', basePrice: 2050.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'SFX Vol 60', name: 'SFX Vol 60', category: 'fxvol', basePrice: 3130.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'SFX Vol 80', name: 'SFX Vol 80', category: 'fxvol', basePrice: 4260.0,  pipSize: 0.01, minLot: 0.01 },
  { symbol: 'SFX Vol 99', name: 'SFX Vol 99', category: 'fxvol', basePrice: 5910.0,  pipSize: 0.01, minLot: 0.01 },

  // ---- FlipX Series ----
  { symbol: 'FlipX 1', name: 'FlipX 1', category: 'flipx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FlipX 2', name: 'FlipX 2', category: 'flipx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FlipX 3', name: 'FlipX 3', category: 'flipx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FlipX 4', name: 'FlipX 4', category: 'flipx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FlipX 5', name: 'FlipX 5', category: 'flipx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },

  // ---- PainX / GainX Series ----
  { symbol: 'PainX 400',  name: 'PainX 400',  category: 'painx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'PainX 600',  name: 'PainX 600',  category: 'painx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'PainX 800',  name: 'PainX 800',  category: 'painx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'PainX 999',  name: 'PainX 999',  category: 'painx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'PainX 1200', name: 'PainX 1200', category: 'painx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX 400',  name: 'GainX 400',  category: 'gainx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX 600',  name: 'GainX 600',  category: 'gainx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX 800',  name: 'GainX 800',  category: 'gainx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX 999',  name: 'GainX 999',  category: 'gainx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX 1200', name: 'GainX 1200', category: 'gainx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },

  // ---- SwitchX / BreakX / TrendX Series ----
  { symbol: 'SwitchX 600',  name: 'SwitchX 600',  category: 'switchx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'SwitchX 1200', name: 'SwitchX 1200', category: 'switchx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'SwitchX 1800', name: 'SwitchX 1800', category: 'switchx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'BreakX 600',   name: 'BreakX 600',   category: 'breakx',  basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'BreakX 1200',  name: 'BreakX 1200',  category: 'breakx',  basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'BreakX 1800',  name: 'BreakX 1800',  category: 'breakx',  basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'TrendX 600',   name: 'TrendX 600',   category: 'trendx',  basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'TrendX 1200',  name: 'TrendX 1200',  category: 'trendx',  basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'TrendX 1800',  name: 'TrendX 1800',  category: 'trendx',  basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },

  // ---- Step Growth Variants ----
  { symbol: 'PlusX 1', name: 'PlusX 1', category: 'step', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FiboX',   name: 'FiboX',   category: 'step', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'QuadX',   name: 'QuadX',   category: 'step', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },

  // ---- MAX PainX / GainX (3-digit precision, growing jumps) ----
  { symbol: 'MAX PainX 1000', name: 'MAX PainX 1000', category: 'maxpainx', basePrice: 1000.0, pipSize: 0.001, minLot: 0.01 },
  { symbol: 'MAX GainX 1000', name: 'MAX GainX 1000', category: 'maxgainx', basePrice: 1000.0, pipSize: 0.001, minLot: 0.01 },
  { symbol: 'MAX PainX 2000', name: 'MAX PainX 2000', category: 'maxpainx', basePrice: 1000.0, pipSize: 0.001, minLot: 0.01 },
  { symbol: 'MAX GainX 2000', name: 'MAX GainX 2000', category: 'maxgainx', basePrice: 1000.0, pipSize: 0.001, minLot: 0.01 },

  // ---- Volatility Indices ----
  { symbol: 'Volatility 10 Index',  name: 'Volatility 10 Index',  category: 'volatility', basePrice: 6540.0,   pipSize: 0.001, minLot: 0.5   },
  { symbol: 'Volatility 25 Index',  name: 'Volatility 25 Index',  category: 'volatility', basePrice: 2150.0,   pipSize: 0.001, minLot: 0.5   },
  { symbol: 'Volatility 50 Index',  name: 'Volatility 50 Index',  category: 'volatility', basePrice: 298.0,    pipSize: 0.0001,minLot: 4.0   },
  { symbol: 'Volatility 75 Index',  name: 'Volatility 75 Index',  category: 'volatility', basePrice: 485200.0, pipSize: 0.01,  minLot: 0.001 },
  { symbol: 'Volatility 100 Index', name: 'Volatility 100 Index', category: 'volatility', basePrice: 1680.0,   pipSize: 0.01,  minLot: 0.2   },

  // ---- Crash & Boom ----
  { symbol: 'Crash 300 Index',  name: 'Crash 300 Index',  category: 'crashboom', basePrice: 1850.0,  pipSize: 0.01, minLot: 0.1 },
  { symbol: 'Crash 500 Index',  name: 'Crash 500 Index',  category: 'crashboom', basePrice: 5400.0,  pipSize: 0.01, minLot: 0.1 },
  { symbol: 'Crash 1000 Index', name: 'Crash 1000 Index', category: 'crashboom', basePrice: 9600.0,  pipSize: 0.01, minLot: 0.1 },
  { symbol: 'Boom 300 Index',   name: 'Boom 300 Index',   category: 'crashboom', basePrice: 2100.0,  pipSize: 0.01, minLot: 0.1 },
  { symbol: 'Boom 500 Index',   name: 'Boom 500 Index',   category: 'crashboom', basePrice: 6200.0,  pipSize: 0.01, minLot: 0.1 },
  { symbol: 'Boom 1000 Index',  name: 'Boom 1000 Index',  category: 'crashboom', basePrice: 10500.0, pipSize: 0.01, minLot: 0.1 },

  // ---- PainX Series (steady drift up, sharp drops) ----
  { symbol: 'PainX400',  name: 'PainX 400',  category: 'painx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'PainX600',  name: 'PainX 600',  category: 'painx', basePrice: 1500.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'PainX800',  name: 'PainX 800',  category: 'painx', basePrice: 2000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'PainX999',  name: 'PainX 999',  category: 'painx', basePrice: 2500.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'PainX1200', name: 'PainX 1200', category: 'painx', basePrice: 3000.0, pipSize: 0.01, minLot: 0.01 },

  // ---- GainX Series (steady drift down, sharp spikes up) ----
  { symbol: 'GainX400',  name: 'GainX 400',  category: 'gainx', basePrice: 1000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX600',  name: 'GainX 600',  category: 'gainx', basePrice: 1500.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX800',  name: 'GainX 800',  category: 'gainx', basePrice: 2000.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX999',  name: 'GainX 999',  category: 'gainx', basePrice: 2500.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'GainX1200', name: 'GainX 1200', category: 'gainx', basePrice: 3000.0, pipSize: 0.01, minLot: 0.01 },

  // ---- Regime Shift Synthetics ----
  { symbol: 'SwitchX', name: 'SwitchX Index', category: 'regime', basePrice: 1500.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'BreakX',  name: 'BreakX Index',  category: 'regime', basePrice: 1800.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'TrendX',  name: 'TrendX Index',  category: 'regime', basePrice: 2200.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FlipX',   name: 'FlipX Index',   category: 'regime', basePrice: 1700.0, pipSize: 0.01, minLot: 0.01 },

  // ---- CFD Stock Indices ----
  { symbol: 'US30',    name: 'Wall Street 30',     category: 'cfd_indices', basePrice: 42100.0, pipSize: 1.0,  minLot: 0.01 },
  { symbol: 'NAS100',  name: 'US Tech 100',        category: 'cfd_indices', basePrice: 19850.0, pipSize: 0.5,  minLot: 0.01 },
  { symbol: 'SPX500',  name: 'US 500 (S&P)',       category: 'cfd_indices', basePrice: 5820.0,  pipSize: 0.1,  minLot: 0.01 },
  { symbol: 'GER40',   name: 'Germany 40 (DAX)',   category: 'cfd_indices', basePrice: 19250.0, pipSize: 0.5,  minLot: 0.01 },
  { symbol: 'UK100',   name: 'UK 100 (FTSE)',      category: 'cfd_indices', basePrice: 8200.0,  pipSize: 0.5,  minLot: 0.01 },
  { symbol: 'JPN225',  name: 'Japan 225 (Nikkei)', category: 'cfd_indices', basePrice: 38500.0, pipSize: 1.0,  minLot: 0.01 },
  { symbol: 'AUS200',  name: 'Australia 200',      category: 'cfd_indices', basePrice: 8100.0,  pipSize: 0.5,  minLot: 0.01 },
  { symbol: 'FRA40',   name: 'France 40 (CAC)',    category: 'cfd_indices', basePrice: 7450.0,  pipSize: 0.5,  minLot: 0.01 },
  { symbol: 'EUSTX50', name: 'Euro Stoxx 50',      category: 'cfd_indices', basePrice: 4950.0,  pipSize: 0.5,  minLot: 0.01 },

  // ---- Forex Majors (Weltrade offers) ----
  { symbol: 'EURUSD', name: 'EUR / USD', category: 'forex', basePrice: 1.0850, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'GBPUSD', name: 'GBP / USD', category: 'forex', basePrice: 1.2750, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'USDJPY', name: 'USD / JPY', category: 'forex', basePrice: 149.20, pipSize: 0.01,   minLot: 0.01 },
  { symbol: 'AUDUSD', name: 'AUD / USD', category: 'forex', basePrice: 0.6620, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'USDCAD', name: 'USD / CAD', category: 'forex', basePrice: 1.3650, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'USDCHF', name: 'USD / CHF', category: 'forex', basePrice: 0.8950, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'NZDUSD', name: 'NZD / USD', category: 'forex', basePrice: 0.6150, pipSize: 0.0001, minLot: 0.01 },

  // ---- Metals ----
  { symbol: 'XAUUSD', name: 'Gold / USD',   category: 'commodities', basePrice: 2650.0, pipSize: 0.1,  minLot: 0.01 },
  { symbol: 'XAGUSD', name: 'Silver / USD', category: 'commodities', basePrice: 31.20,  pipSize: 0.01, minLot: 0.01 },

  // ---- Crypto ----
  { symbol: 'BTCUSD', name: 'Bitcoin / USD',  category: 'crypto', basePrice: 68450.0, pipSize: 0.5,  minLot: 0.001 },
  { symbol: 'ETHUSD', name: 'Ethereum / USD', category: 'crypto', basePrice: 2620.0,  pipSize: 0.05, minLot: 0.01 },
];

// ----------------------------------------------------------------------
// Category-specific volatility profiles (used by the simulator only).
// Values are *per-candle* stddev as a fraction of price.
// ----------------------------------------------------------------------
const VOL_PROFILES = {
  syntx:       0.0040,   // proprietary synthetics
  fxvol:       0.0025,   // FX-vol steady
  volatility:  0.0028,
  crashboom:   0.0055,   // crash/boom has bigger candles
  painx:       0.0030,
  gainx:       0.0030,
  regime:      0.0035,
  cfd_indices: 0.0030,
  forex:       0.0018,
  commodities: 0.0045,
  crypto:      0.0090,
  other:       0.0035,
};

// Per-timeframe multiplier on the candle variance
const TF_MULT = { M15: 0.45, H1: 0.75, H2: 1.0, H4: 1.4, D1: 2.6, W1: 5.2 };

// ----------------------------------------------------------------------
// Simulator (deterministic per symbol+tf)
// ----------------------------------------------------------------------
function seededRand(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function simulateCandles(symbol, tf, count, meta) {
  const seed = hashStr(symbol + tf);
  const basePrice = meta.basePrice;
  // Use a TIGHTER volatility profile so random walk doesn't create false
  // pattern detections on timeframes where we did not inject a pattern.
  const baseVol = (VOL_PROFILES[meta.category] || 0.003) * (TF_MULT[tf] || 1);
  const vol = baseVol * 0.3;
  const step = { M15: 900, H1: 3600, H2: 7200, H4: 14400, D1: 86400, W1: 604800 }[tf] || 3600;

  let price = basePrice;
  const trendBias = (seededRand(seed) - 0.5) * 0.0002;
  // Inject hidden DT/DB structures ONLY on one timeframe per symbol so the
  // pattern is "isolated" (appears on exactly 1 of 6 TFs = HIGH PROB).
  // Use a per-symbol hash (NOT per-symbol+tf) to pick the one TF.
  const symbolSeed = hashStr(symbol);
  const TFS_LIST = ['M15','H1','H2','H4','D1','W1'];
  const pickedTfIdx = Math.floor(seededRand(symbolSeed + 111) * TFS_LIST.length);
  const pickedTf = TFS_LIST[pickedTfIdx];
  const isPickedTf = (tf === pickedTf);
  const willFormPattern = isPickedTf && seededRand(symbolSeed + 222) < 0.85;
  const patternKind = willFormPattern ? (seededRand(symbolSeed + 333) < 0.5 ? 'DT' : 'DB') : null;
  // Pattern timing: somewhere in the last 60% of the chart so it's "recent"
  const patternStart = willFormPattern
    ? Math.floor(count * 0.35 + seededRand(symbolSeed + 444) * count * 0.35)
    : -1;

  // We pre-compute a "target price" series for the pattern window, then
  // generate candles using that as the close. This makes the swing structure
  // smooth and detectable.
  const patternPrices = [];
  if (willFormPattern) {
    // Build a target price trajectory that creates a clean DT or DB.
    // Pattern amplitude is intentionally LARGE (10-15% above noise) so the
    // pattern engine can detect it reliably.
    const ampUp   = 0.10;   // peak/trough swing = 10% (tighter pattern, better RR)
    const ampDown = 0.005;  // breakout candle closes just 0.5% below neckline (tight break)
    const p1 = basePrice * (1 + ampUp);                       // peak 1 height
    const neckline = basePrice;                                // neckline at base
    const p2 = basePrice * (1 + ampUp * 0.99);                // peak 2 within 1% of p1

    const t1 = basePrice * (1 - ampUp);
    const t2 = basePrice * (1 - ampUp * 0.99);
    const breakoutUp = basePrice * (1 + ampDown);             // mirror for DB
    const breakoutTarget = basePrice * (1 - ampDown);

    // 5 climb, 5 pullback, 5 climb, 5 break = 20 bars for the pattern
    for (let j = 0; j < 20; j++) {
      let target;
      if (patternKind === 'DT') {
        if (j < 5)        target = basePrice + (p1 - basePrice) * ((j + 1) / 5);          // climb to p1
        else if (j < 10)  target = p1 - (p1 - neckline) * ((j - 4) / 5);                   // pullback
        else if (j < 15)  target = neckline + (p2 - neckline) * ((j - 9) / 5);             // climb to p2
        else              target = p2 - (p2 - breakoutTarget) * ((j - 14) / 5);            // break
      } else {
        if (j < 5)        target = basePrice - (basePrice - t1) * ((j + 1) / 5);
        else if (j < 10)  target = t1 + (neckline - t1) * ((j - 4) / 5);
        else if (j < 15)  target = neckline - (neckline - t2) * ((j - 9) / 5);
        else              target = t2 + (breakoutUp - t2) * ((j - 14) / 5);
      }
      patternPrices.push(target);
    }
  }

  const candles = [];
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < count; i++) {
    const r1 = seededRand(seed + i * 1.7);
    const r2 = seededRand(seed + i * 2.3 + 999);

    const inPatternWindow = willFormPattern && i >= patternStart && i < patternStart + patternPrices.length;

    // Base random walk (reduce noise in pattern window for clean swings)
    let open = price;
    const noiseScale = inPatternWindow ? 0.15 : 1.0;
    let delta = (r1 - 0.5) * basePrice * vol * 2 * noiseScale + trendBias * basePrice;
    let close = open + delta;

    // Override with pattern target if in pattern window
    if (inPatternWindow) {
      close = patternPrices[i - patternStart];
    }

    if (close < basePrice * 0.3) close = basePrice * 0.35;
    if (close > basePrice * 1.7) close = basePrice * 1.65;

    const range = basePrice * vol * (0.5 + r2 * 0.5) * (inPatternWindow ? 0.3 : 1.0);
    const high = Math.max(open, close) + range * (0.2 + seededRand(seed + i * 3.1) * 0.5);
    const low  = Math.min(open, close) - range * (0.2 + seededRand(seed + i * 4.7) * 0.5);

    // Volume contraction at the second peak/trough, expansion at breakout
    let volumeBoost = 1.0;
    if (willFormPattern && i >= patternStart && i < patternStart + patternPrices.length) {
      const local = i - patternStart;
      if (local >= 10 && local < 15)  volumeBoost = 0.65;       // contraction at peak/trough 2
      else if (local >= 15)           volumeBoost = 2.2;         // expansion at breakout
    }
    const volume = Math.floor((2500 + seededRand(seed + i * 5.5) * 3000) * volumeBoost);
    candles.push({
      time:   now - (count - i) * step,
      open:   +open.toFixed(6),
      high:   +high.toFixed(6),
      low:    +low.toFixed(6),
      close:  +close.toFixed(6),
      volume,
    });
    price = close;
  }
  return candles;
}

// ----------------------------------------------------------------------
// Public fetcher: bridge first, simulator fallback
// ----------------------------------------------------------------------
let bridgeHealthy = null;
let lastBridgeCheck = 0;
async function isBridgeAvailable() {
  if (bridgeHealthy !== null && Date.now() - lastBridgeCheck < 30000) return bridgeHealthy;
  try {
    const h = await bridge.health();
    bridgeHealthy = !!(h && (h.connected || h.mt5_available));
    lastBridgeCheck = Date.now();
  } catch (_) {
    bridgeHealthy = false;
    lastBridgeCheck = Date.now();
  }
  return bridgeHealthy;
}

async function getWeltradeCandles(symbol, tf, count = 120) {
  const meta = WELTRADE_WATCHLIST.find(w => w.symbol === symbol) || {
    symbol, name: symbol, category: 'other', basePrice: 1000, pipSize: 0.01, minLot: 0.01,
  };

  // Try bridge up to 3 times with short backoff to handle transient hiccups
  if (await isBridgeAvailable()) {
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await bridge.fetchCandles(symbol, tf, count);
        if (data && Array.isArray(data.candles) && data.candles.length > 0) {
          return data.candles;
        }
        lastErr = new Error('bridge returned no candles');
      } catch (e) {
        lastErr = e;
      }
      // brief backoff: 200ms, 600ms
      await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
    }
    console.warn(`[weltradeData] bridge fetch failed for ${symbol} ${tf} after 3 attempts: ${lastErr?.message}, falling back to simulator`);
  }

  // Fallback: deterministic simulator
  return simulateCandles(symbol, tf, count, meta);
}

// Status getter so the UI can display "live" vs "simulated"
async function getWeltradeDataSource() {
  if (await isBridgeAvailable()) {
    const h = await bridge.health();
    return { source: h.connected ? 'weltrade-mt5-live' : 'weltrade-mt5-bridge', connected: !!h.connected, health: h };
  }
  return { source: 'simulated-fallback', connected: false };
}

module.exports = {
  WELTRADE_WATCHLIST,
  getWeltradeCandles,
  getWeltradeDataSource,
};
