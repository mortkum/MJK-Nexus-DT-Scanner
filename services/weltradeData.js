// services/weltradeData.js - Weltrade SyntX Indices
const WELTRADE_WATCHLIST = [
  { symbol: 'SYNTX1000', name: 'SyntX 1000 Index', category: 'syntx', basePrice: 12500.0, pipSize: 0.1, minLot: 0.01 },
  { symbol: 'SYNTX2000', name: 'SyntX 2000 Index', category: 'syntx', basePrice: 24800.0, pipSize: 0.1, minLot: 0.01 },
  { symbol: 'SYNTX3000', name: 'SyntX 3000 Index', category: 'syntx', basePrice: 38200.0, pipSize: 0.1, minLot: 0.01 },
  { symbol: 'SYNTX5000', name: 'SyntX 5000 Index', category: 'syntx', basePrice: 51400.0, pipSize: 0.1, minLot: 0.01 },
  { symbol: 'SYNTX10000', name: 'SyntX 10000 Index', category: 'syntx', basePrice: 98500.0, pipSize: 1.0, minLot: 0.01 },
  { symbol: 'FXvol20', name: 'FX Vol 20', category: 'fxvol', basePrice: 1025.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FXvol40', name: 'FX Vol 40', category: 'fxvol', basePrice: 2045.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FXvol60', name: 'FX Vol 60', category: 'fxvol', basePrice: 3120.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FXvol80', name: 'FX Vol 80', category: 'fxvol', basePrice: 4250.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'FXvol99', name: 'FX Vol 99', category: 'fxvol', basePrice: 5890.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'CRASH500', name: 'Crash 500 Index', category: 'crashboom', basePrice: 5400.0, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'CRASH1000', name: 'Crash 1000 Index', category: 'crashboom', basePrice: 9600.0, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'BOOM500', name: 'Boom 500 Index', category: 'crashboom', basePrice: 6200.0, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'BOOM1000', name: 'Boom 1000 Index', category: 'crashboom', basePrice: 10500.0, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'VOL50', name: 'Volatility 50', category: 'volatility', basePrice: 340.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'VOL75', name: 'Volatility 75', category: 'volatility', basePrice: 850.0, pipSize: 0.01, minLot: 0.001 },
  { symbol: 'VOL100', name: 'Volatility 100', category: 'volatility', basePrice: 1850.0, pipSize: 0.01, minLot: 0.01 },
  { symbol: 'US30', name: 'Wall Street 30', category: 'cfd_indices', basePrice: 42100.0, pipSize: 1.0, minLot: 0.01 },
  { symbol: 'NAS100', name: 'US Tech 100', category: 'cfd_indices', basePrice: 19850.0, pipSize: 0.5, minLot: 0.01 },
  { symbol: 'SPX500', name: 'US 500', category: 'cfd_indices', basePrice: 5820.0, pipSize: 0.1, minLot: 0.01 }
];

async function getWeltradeCandles(symbol, tf, count = 120) {
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
    candles.push({
      time: (now - count * step) + i * step,
      open, high: Math.max(open, close) + vol * 0.2, low: Math.min(open, close) - vol * 0.2, close, volume: 2500
    });
    price = close;
  }
  return candles;
}

module.exports = { WELTRADE_WATCHLIST, getWeltradeCandles };
