// services/derivData.js
const DERIV_WATCHLIST = [
  { symbol: 'R_10', name: 'Volatility 10 Index', category: 'volatility', basePrice: 6540.0, pipSize: 0.001, minLot: 0.5 },
  { symbol: 'R_25', name: 'Volatility 25 Index', category: 'volatility', basePrice: 2150.0, pipSize: 0.001, minLot: 0.5 },
  { symbol: 'R_50', name: 'Volatility 50 Index', category: 'volatility', basePrice: 298.0, pipSize: 0.0001, minLot: 4.0 },
  { symbol: 'R_75', name: 'Volatility 75 Index', category: 'volatility', basePrice: 485200.0, pipSize: 0.01, minLot: 0.001 },
  { symbol: 'R_100', name: 'Volatility 100 Index', category: 'volatility', basePrice: 1680.0, pipSize: 0.01, minLot: 0.2 },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', category: 'volatility', basePrice: 345000.0, pipSize: 0.01, minLot: 0.005 },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', category: 'volatility', basePrice: 1240.0, pipSize: 0.01, minLot: 0.1 },
  { symbol: 'BOOM300', name: 'Boom 300 Index', category: 'crashboom', basePrice: 2100.0, pipSize: 0.001, minLot: 1.0 },
  { symbol: 'BOOM500', name: 'Boom 500 Index', category: 'crashboom', basePrice: 4200.0, pipSize: 0.001, minLot: 0.2 },
  { symbol: 'BOOM1000', name: 'Boom 1000 Index', category: 'crashboom', basePrice: 12400.0, pipSize: 0.01, minLot: 0.2 },
  { symbol: 'CRASH300', name: 'Crash 300 Index', category: 'crashboom', basePrice: 1850.0, pipSize: 0.001, minLot: 0.5 },
  { symbol: 'CRASH500', name: 'Crash 500 Index', category: 'crashboom', basePrice: 5300.0, pipSize: 0.001, minLot: 0.2 },
  { symbol: 'CRASH1000', name: 'Crash 1000 Index', category: 'crashboom', basePrice: 9100.0, pipSize: 0.01, minLot: 0.2 },
  { symbol: 'STP_IDX', name: 'Step Index', category: 'stepjump', basePrice: 8740.0, pipSize: 0.1, minLot: 0.1 }
];

async function getDerivCandles(symbol, tf, count = 120) {
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
    candles.push({
      time: (now - count * step) + i * step,
      open, high: Math.max(open, close) + vol * 0.2, low: Math.min(open, close) - vol * 0.2, close, volume: 3000
    });
    price = close;
  }
  return candles;
}

module.exports = { DERIV_WATCHLIST, getDerivCandles };
