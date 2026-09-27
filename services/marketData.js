// services/marketData.js - Multi-asset fetcher & timeframe aggregator
const TIMEFRAMES = ['W1', 'D1', 'H4', 'H2', 'H1', 'M15'];

const WATCHLIST = [
  // Forex Majors (7)
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'forex', basePrice: 1.0850, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'forex', basePrice: 1.2750, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'forex', basePrice: 149.20, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', category: 'forex', basePrice: 0.6620, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'forex', basePrice: 1.3650, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'forex', basePrice: 0.8950, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', category: 'forex', basePrice: 0.6150, pipSize: 0.0001, minLot: 0.01 },

  // Additional Forex Minors / Crosses (8)
  { symbol: 'EURJPY', name: 'Euro / Yen', category: 'forex', basePrice: 161.80, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'EURGBP', name: 'Euro / Pound', category: 'forex', basePrice: 0.8510, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'GBPJPY', name: 'Pound / Yen', category: 'forex', basePrice: 190.20, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'AUDJPY', name: 'Aussie / Yen', category: 'forex', basePrice: 98.75, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'EURCHF', name: 'Euro / Swiss', category: 'forex', basePrice: 0.9710, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'EURAUD', name: 'Euro / Aussie', category: 'forex', basePrice: 1.6380, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'GBPAUD', name: 'Pound / Aussie', category: 'forex', basePrice: 1.9250, pipSize: 0.0001, minLot: 0.01 },
  { symbol: 'NZDCAD', name: 'Kiwi / Loonie', category: 'forex', basePrice: 0.8390, pipSize: 0.0001, minLot: 0.01 },

  // Commodities (4)
  { symbol: 'XAUUSD', name: 'Gold / US Dollar', category: 'commodities', basePrice: 2650.0, pipSize: 0.1, minLot: 0.01 },
  { symbol: 'XAGUSD', name: 'Silver / US Dollar', category: 'commodities', basePrice: 31.20, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'USOIL', name: 'US Crude Oil', category: 'commodities', basePrice: 71.50, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'UKOIL', name: 'Brent Crude Oil', category: 'commodities', basePrice: 75.20, pipSize: 0.01, minLot: 0.01 },

  // Indices (4)
  { symbol: 'SPX500', name: 'S&P 500', category: 'indices', basePrice: 5820.0, pipSize: 0.1, minLot: 0.01 },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'indices', basePrice: 19850.0, pipSize: 0.5, minLot: 0.01 },
  { symbol: 'US30', name: 'Dow Jones 30', category: 'indices', basePrice: 42100.0, pipSize: 1.0, minLot: 0.01 },
  { symbol: 'GER40', name: 'Germany 40', category: 'indices', basePrice: 19250.0, pipSize: 0.5, minLot: 0.01 },

  // Crypto Majors (20)
  { symbol: 'BTCUSD', name: 'Bitcoin', category: 'crypto', basePrice: 68450.0, pipSize: 0.5, minLot: 0.001 },
  { symbol: 'ETHUSD', name: 'Ethereum', category: 'crypto', basePrice: 2620.0, pipSize: 0.05, minLot: 0.01 },
  { symbol: 'SOLUSD', name: 'Solana', category: 'crypto', basePrice: 148.50, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'BNBUSD', name: 'BNB', category: 'crypto', basePrice: 605.0, pipSize: 0.1, minLot: 0.01 },
  { symbol: 'XRPUSD', name: 'XRP', category: 'crypto', basePrice: 0.5850, pipSize: 0.0001, minLot: 1.0 },
  { symbol: 'ADAUSD', name: 'Cardano', category: 'crypto', basePrice: 0.3520, pipSize: 0.0001, minLot: 1.0 },
  { symbol: 'AVAXUSD', name: 'Avalanche', category: 'crypto', basePrice: 27.80, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'DOGEUSD', name: 'Dogecoin', category: 'crypto', basePrice: 0.1350, pipSize: 0.00001, minLot: 1.0 },
  { symbol: 'DOTUSD', name: 'Polkadot', category: 'crypto', basePrice: 4.35, pipSize: 0.001, minLot: 1.0 },
  { symbol: 'LINKUSD', name: 'Chainlink', category: 'crypto', basePrice: 11.20, pipSize: 0.01, minLot: 1.0 },
  { symbol: 'LTCUSD', name: 'Litecoin', category: 'crypto', basePrice: 68.50, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'MATICUSD', name: 'Polygon', category: 'crypto', basePrice: 0.4250, pipSize: 0.0001, minLot: 1.0 },
  { symbol: 'UNIUSD', name: 'Uniswap', category: 'crypto', basePrice: 7.85, pipSize: 0.01, minLot: 1.0 },
  { symbol: 'ATOMUSD', name: 'Cosmos', category: 'crypto', basePrice: 4.52, pipSize: 0.01, minLot: 1.0 },
  { symbol: 'ETCUSD', name: 'Ethereum Classic', category: 'crypto', basePrice: 22.15, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'XLMUSD', name: 'Stellar', category: 'crypto', basePrice: 0.0950, pipSize: 0.00001, minLot: 1.0 },
  { symbol: 'FILUSD', name: 'Filecoin', category: 'crypto', basePrice: 3.65, pipSize: 0.01, minLot: 1.0 },
  { symbol: 'TRXUSD', name: 'Tron', category: 'crypto', basePrice: 0.1650, pipSize: 0.00001, minLot: 1.0 },
  { symbol: 'NEARUSD', name: 'Near Protocol', category: 'crypto', basePrice: 4.85, pipSize: 0.01, minLot: 1.0 },
  { symbol: 'APTUSD', name: 'Aptos', category: 'crypto', basePrice: 8.95, pipSize: 0.01, minLot: 1.0 },

  // Additional Crypto (8 to reach 51 total)
  { symbol: 'ARBUS', name: 'Arbitrum', category: 'crypto', basePrice: 0.52, pipSize: 0.0001, minLot: 1.0 },
  { symbol: 'OPUSD', name: 'Optimism', category: 'crypto', basePrice: 1.45, pipSize: 0.001, minLot: 1.0 },
  { symbol: 'INJUSD', name: 'Injective', category: 'crypto', basePrice: 18.20, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'SUIUSD', name: 'Sui', category: 'crypto', basePrice: 1.85, pipSize: 0.001, minLot: 1.0 },
  { symbol: 'PEPEUSD', name: 'Pepe', category: 'crypto', basePrice: 0.0000085, pipSize: 0.00000001, minLot: 1000 },
  { symbol: 'SHIBUSD', name: 'Shiba Inu', category: 'crypto', basePrice: 0.0000185, pipSize: 0.00000001, minLot: 1000 },
  { symbol: 'RNDRUSD', name: 'Render', category: 'crypto', basePrice: 6.20, pipSize: 0.01, minLot: 1.0 },
  { symbol: 'FETUSD', name: 'Fetch.ai', category: 'crypto', basePrice: 1.35, pipSize: 0.001, minLot: 1.0 },
];

function getTimeframeSeconds(tf) {
  switch (tf) {
    case 'M15': return 900;
    case 'H1': return 3600;
    case 'H2': return 7200;
    case 'H4': return 14400;
    case 'D1': return 86400;
    case 'W1': return 604800;
    default: return 3600;
  }
}

function seededRandom(seed) {
  // Simple LCG for deterministic but varied results per symbol+tf
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function getCandles(symbol, timeframe, count = 120) {
  const meta = WATCHLIST.find(w => w.symbol === symbol) || { basePrice: 1000, pipSize: 0.01, category: 'forex' };
  const seedBase = hashString(symbol + timeframe);
  
  let price = meta.basePrice;
  const candles = [];
  const now = Math.floor(Date.now() / 1000);
  const step = getTimeframeSeconds(timeframe);
  
  // Volatility adjustments per category
  let volFactor = 0.0035;
  if (meta.category === 'crypto') volFactor = 0.012;
  if (meta.category === 'commodities') volFactor = 0.006;
  if (meta.category === 'indices') volFactor = 0.0045;
  if (symbol === 'XAUUSD') volFactor = 0.005;
  if (symbol.includes('JPY')) volFactor = 0.0025;

  // Add timeframe scaling: higher TFs more volatile per candle
  const tfMultiplier = { 'M15': 0.4, 'H1': 0.7, 'H2': 1.0, 'H4': 1.5, 'D1': 2.8, 'W1': 5.5 }[timeframe] || 1.0;

  // Create a trend bias per symbol/timeframe to allow double tops to form naturally
  const trendSeed = seededRandom(seedBase) - 0.5; // -0.5 to 0.5

  for (let i = 0; i < count; i++) {
    const r = seededRandom(seedBase + i * 1.7);
    const r2 = seededRandom(seedBase + i * 2.3 + 999);
    
    // Random walk with slight mean reversion
    const randomDelta = (r - 0.5) * 2 * meta.basePrice * volFactor * tfMultiplier;
    const trendDelta = trendSeed * meta.basePrice * volFactor * 0.15 * tfMultiplier * Math.sin(i / 15);
    
    const open = price;
    let close = open + randomDelta + trendDelta;
    
    // Occasionally inject a double-top-like structure for demo purposes (5% chance of forming a peak)
    if (i > 20 && i < count - 10 && r2 > 0.92) {
      // Create a peak, then pullback, then second peak near same level
      if (candles.length > 2) {
        const lastPeakHigh = Math.max(...candles.slice(-10).map(c => c.high));
        if (Math.abs(open - lastPeakHigh) / lastPeakHigh < 0.02) {
          // Second peak - force similar high
          close = lastPeakHigh - (r - 0.5) * meta.basePrice * 0.001;
        }
      }
    }

    const highLowRange = meta.basePrice * volFactor * tfMultiplier * (0.5 + r2);
    const high = Math.max(open, close) + highLowRange * (0.2 + seededRandom(seedBase + i * 3.1) * 0.5);
    const low = Math.min(open, close) - highLowRange * (0.2 + seededRandom(seedBase + i * 4.7) * 0.5);
    
    // Volume simulation
    const baseVol = meta.category === 'crypto' ? 5000 : meta.category === 'forex' ? 2500 : 3000;
    const volume = baseVol * (0.5 + seededRandom(seedBase + i * 5.5));

    candles.push({
      time: (now - (count - i) * step),
      open: parseFloat(open.toFixed(6)),
      high: parseFloat(high.toFixed(6)),
      low: parseFloat(low.toFixed(6)),
      close: parseFloat(close.toFixed(6)),
      volume: Math.floor(volume)
    });
    
    price = close;
    
    // Prevent price from going negative or too far
    if (price < meta.basePrice * 0.5) price = meta.basePrice * 0.55;
    if (price > meta.basePrice * 1.5) price = meta.basePrice * 1.45;
  }

  return candles;
}

module.exports = { WATCHLIST, TIMEFRAMES, getCandles };
