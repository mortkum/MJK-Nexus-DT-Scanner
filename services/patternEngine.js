// services/patternEngine.js - ZigZag, Double Top/Bottom, Decisive Close & Hidden Top-Down logic

function calculateRSI(candles, period = 14) {
  if (candles.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const diff = candles[i].close - candles[i-1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

function calculateATR(candles, period = 14) {
  if (candles.length < period + 1) return candles[0].high - candles[0].low;
  let trSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i-1].close),
      Math.abs(candles[i].low - candles[i-1].close)
    );
    trSum += tr;
  }
  return trSum / period;
}

function findSwings(candles, strength = 3, thresholdPct = 0.004) {
  const peaks = [];
  const troughs = [];

  for (let i = strength; i < candles.length - strength; i++) {
    const currHigh = candles[i].high;
    const currLow = candles[i].low;
    let isPeak = true;
    let isTrough = true;

    for (let j = 1; j <= strength; j++) {
      if (candles[i - j].high >= currHigh || candles[i + j].high >= currHigh) isPeak = false;
      if (candles[i - j].low <= currLow || candles[i + j].low <= currLow) isTrough = false;
    }

    if (isPeak) peaks.push({ index: i, price: currHigh, time: candles[i].time, candle: candles[i] });
    if (isTrough) troughs.push({ index: i, price: currLow, time: candles[i].time, candle: candles[i] });
  }

  // ZigZag filter: remove insignificant swings < thresholdPct
  const filterSwings = (swings, isPeak) => {
    const filtered = [];
    for (let s of swings) {
      if (filtered.length === 0) {
        filtered.push(s);
        continue;
      }
      const last = filtered[filtered.length - 1];
      const changePct = Math.abs(s.price - last.price) / last.price;
      if (changePct >= thresholdPct) {
        filtered.push(s);
      } else {
        // Keep the more extreme
        if ((isPeak && s.price > last.price) || (!isPeak && s.price < last.price)) {
          filtered[filtered.length - 1] = s;
        }
      }
    }
    return filtered;
  };

  return {
    peaks: filterSwings(peaks, true),
    troughs: filterSwings(troughs, false)
  };
}

function detectPatternsOnTimeframe(candles, timeframe, symbol) {
  if (!candles || candles.length < 50) return [];

  const { peaks, troughs } = findSwings(candles, 3, 0.003);
  const patterns = [];
  const atr = calculateATR(candles);

  // Detect Double Tops
  for (let i = 0; i < peaks.length - 1; i++) {
    for (let j = i + 1; j < Math.min(peaks.length, i + 6); j++) {
      const p1 = peaks[i];
      const p2 = peaks[j];
      
      // Peaks must be similar height within 1.5%
      const peakDiffPct = Math.abs(p1.price - p2.price) / p1.price;
      if (peakDiffPct > 0.015) continue;

      // Find the lowest trough between p1 and p2 (neckline)
      const betweenTroughs = troughs.filter(t => t.index > p1.index && t.index < p2.index);
      if (betweenTroughs.length === 0) continue;
      
      const necklineTrough = betweenTroughs.reduce((min, t) => t.price < min.price ? t : min, betweenTroughs[0]);
      const neckline = necklineTrough.price;
      const patternHeight = Math.max(p1.price, p2.price) - neckline;
      
      if (patternHeight <= 0) continue;
      if (patternHeight / p1.price < 0.002) continue; // too shallow

      // Find breakout after p2: candle body close below neckline
      const afterP2 = candles.slice(p2.index + 1);
      let breakout = null;
      let breakoutIndex = -1;
      
      for (let k = 0; k < afterP2.length; k++) {
        const c = afterP2[k];
        // Decisive body close: Close < Neckline, not just wick
        if (c.close < neckline) {
          // Body must extend at least 15% beyond neckline relative to body size to avoid wick traps
          const bodySize = Math.abs(c.open - c.close);
          const bodyExtension = neckline - c.close;
          // If body is very small, require at least 0.05% of price
          if (bodySize > 0 && bodyExtension / bodySize < 0.15 && bodyExtension / c.close < 0.0005) continue;
          
          breakout = c;
          breakoutIndex = p2.index + 1 + k;
          break;
        }
      }

      if (!breakout) continue;

      // RSI Divergence check
      const rsiP1 = calculateRSI(candles.slice(0, p1.index + 1));
      const rsiP2 = calculateRSI(candles.slice(0, p2.index + 1));
      const rsiDivergence = rsiP2 < rsiP1 - 1.0; // bearish divergence

      // Volume checks
      const volP1 = p1.candle.volume || 2500;
      const volP2 = p2.candle.volume || 2500;
      const volumeContraction = volP2 < volP1;
      
      const recentVols = candles.slice(Math.max(0, breakoutIndex - 20), breakoutIndex).map(c => c.volume);
      const avgVol = recentVols.reduce((a,b) => a+b, 0) / recentVols.length;
      const breakoutVolumeExpansion = breakout.volume > avgVol * 1.1;

      // Trade geometry
      const entry = breakout.close;
      const stopLoss = Math.max(p1.price, p2.price) + patternHeight * 0.10 + atr * 0.1;
      const tp1 = neckline - patternHeight * 1.0;
      const tp2 = neckline - patternHeight * 1.618;
      const risk = stopLoss - entry;
      const reward1 = entry - tp1;
      const reward2 = entry - tp2;
      const rr1 = risk > 0 ? reward1 / risk : 0;
      const rr2 = risk > 0 ? reward2 / risk : 0;

      if (rr1 < 1.0) continue; // filter low RR

      patterns.push({
        id: `${symbol}-${timeframe}-DT-${p1.index}-${p2.index}`,
        symbol,
        timeframe,
        type: 'DT',
        pattern: 'Double Top',
        peak1: { index: p1.index, price: p1.price, time: p1.time },
        peak2: { index: p2.index, price: p2.price, time: p2.time },
        neckline,
        necklineTime: necklineTrough.time,
        trough: necklineTrough,
        entry,
        stopLoss,
        sl: stopLoss,
        tp1,
        tp2,
        patternHeight,
        riskReward: parseFloat(rr1.toFixed(2)),
        rr1: parseFloat(rr1.toFixed(2)),
        rr2: parseFloat(rr2.toFixed(2)),
        activationCandle: breakout,
        breakoutIndex,
        confluences: {
          rsiDivergence,
          rsiP1: parseFloat(rsiP1.toFixed(1)),
          rsiP2: parseFloat(rsiP2.toFixed(1)),
          volumeContraction,
          breakoutVolumeExpansion,
          bodyCloseConfirmed: true,
          atr
        },
        timestamp: breakout.time,
        grade: 'PENDING', // will be set by top-down evaluator
        isHighProb: false
      });

      // Only one DT per p1 to avoid duplicates
      break;
    }
  }

  // Detect Double Bottoms
  for (let i = 0; i < troughs.length - 1; i++) {
    for (let j = i + 1; j < Math.min(troughs.length, i + 6); j++) {
      const t1 = troughs[i];
      const t2 = troughs[j];
      
      const troughDiffPct = Math.abs(t1.price - t2.price) / t1.price;
      if (troughDiffPct > 0.015) continue;

      const betweenPeaks = peaks.filter(p => p.index > t1.index && p.index < t2.index);
      if (betweenPeaks.length === 0) continue;
      
      const necklinePeak = betweenPeaks.reduce((max, p) => p.price > max.price ? p : max, betweenPeaks[0]);
      const neckline = necklinePeak.price;
      const patternHeight = neckline - Math.min(t1.price, t2.price);
      
      if (patternHeight <= 0) continue;
      if (patternHeight / t1.price < 0.002) continue;

      const afterT2 = candles.slice(t2.index + 1);
      let breakout = null;
      let breakoutIndex = -1;
      
      for (let k = 0; k < afterT2.length; k++) {
        const c = afterT2[k];
        if (c.close > neckline) {
          const bodySize = Math.abs(c.open - c.close);
          const bodyExtension = c.close - neckline;
          if (bodySize > 0 && bodyExtension / bodySize < 0.15 && bodyExtension / c.close < 0.0005) continue;
          breakout = c;
          breakoutIndex = t2.index + 1 + k;
          break;
        }
      }

      if (!breakout) continue;

      const rsiT1 = calculateRSI(candles.slice(0, t1.index + 1));
      const rsiT2 = calculateRSI(candles.slice(0, t2.index + 1));
      const rsiDivergence = rsiT2 > rsiT1 + 1.0; // bullish divergence

      const volT1 = t1.candle.volume || 2500;
      const volT2 = t2.candle.volume || 2500;
      const volumeContraction = volT2 < volT1;
      
      const recentVols = candles.slice(Math.max(0, breakoutIndex - 20), breakoutIndex).map(c => c.volume);
      const avgVol = recentVols.reduce((a,b) => a+b, 0) / recentVols.length;
      const breakoutVolumeExpansion = breakout.volume > avgVol * 1.1;

      const entry = breakout.close;
      const stopLoss = Math.min(t1.price, t2.price) - patternHeight * 0.10 - atr * 0.1;
      const tp1 = neckline + patternHeight * 1.0;
      const tp2 = neckline + patternHeight * 1.618;
      const risk = entry - stopLoss;
      const reward1 = tp1 - entry;
      const reward2 = tp2 - entry;
      const rr1 = risk > 0 ? reward1 / risk : 0;
      const rr2 = risk > 0 ? reward2 / risk : 0;

      if (rr1 < 1.0) continue;

      patterns.push({
        id: `${symbol}-${timeframe}-DB-${t1.index}-${t2.index}`,
        symbol,
        timeframe,
        type: 'DB',
        pattern: 'Double Bottom',
        trough1: { index: t1.index, price: t1.price, time: t1.time },
        trough2: { index: t2.index, price: t2.price, time: t2.time },
        peak: necklinePeak,
        neckline,
        necklineTime: necklinePeak.time,
        entry,
        stopLoss,
        sl: stopLoss,
        tp1,
        tp2,
        patternHeight,
        riskReward: parseFloat(rr1.toFixed(2)),
        rr1: parseFloat(rr1.toFixed(2)),
        rr2: parseFloat(rr2.toFixed(2)),
        activationCandle: breakout,
        breakoutIndex,
        confluences: {
          rsiDivergence,
          rsiT1: parseFloat(rsiT1.toFixed(1)),
          rsiT2: parseFloat(rsiT2.toFixed(1)),
          volumeContraction,
          breakoutVolumeExpansion,
          bodyCloseConfirmed: true,
          atr
        },
        timestamp: breakout.time,
        grade: 'PENDING',
        isHighProb: false
      });

      break;
    }
  }

  // Sort by most recent breakout
  return patterns.sort((a,b) => b.timestamp - a.timestamp).slice(0, 3); // max 3 per TF
}

function evaluateTopDownUniqueness(tfPatterns) {
  // tfPatterns: { W1: [], D1: [], H4: [], H2: [], H1: [], M15: [] }
  const allPatterns = [];
  const timeframeCounts = {};

  Object.keys(tfPatterns).forEach(tf => {
    timeframeCounts[tf] = (tfPatterns[tf] || []).length;
    (tfPatterns[tf] || []).forEach(p => {
      allPatterns.push({ ...p, timeframe: tf });
    });
  });

  const totalTimeframesWithPattern = Object.values(timeframeCounts).filter(c => c > 0).length;

  // Enrich each pattern
  const enriched = allPatterns.map(p => {
    // Count how many TFs have at least one pattern (any type) for this symbol
    // For hidden logic, we want strictly 1 TF = HIGH PROB
    const tfWithPattern = Object.keys(tfPatterns).filter(tf => (tfPatterns[tf] || []).length > 0).length;
    
    let grade, verdict, isHighProb, score;
    
    if (tfWithPattern === 1) {
      grade = '🌟 HIGH PROB (HIDDEN)';
      verdict = 'Institutional Advantage (Alpha Generative)';
      isHighProb = true;
      score = 95;
    } else if (tfWithPattern === 2) {
      grade = '⚡ MEDIUM (SEMI-HIDDEN)';
      verdict = 'Potential Institutional, Monitor Closely';
      isHighProb = false;
      score = 65;
    } else {
      grade = '❌ RETAIL TRAP (CROWDED)';
      verdict = 'Retail Trap - High Fakeout Risk';
      isHighProb = false;
      score = 25;
    }

    // Adjust score with confluences
    if (p.confluences) {
      if (p.confluences.rsiDivergence) score += 5;
      if (p.confluences.volumeContraction) score += 3;
      if (p.confluences.breakoutVolumeExpansion) score += 3;
      if (p.rr1 >= 2.0) score += 4;
    }
    score = Math.min(100, score);

    return {
      ...p,
      uniquenessCount: tfWithPattern,
      totalTimeframesWithPattern,
      timeframePresence: timeframeCounts,
      grade,
      verdict,
      isHighProb,
      score,
      isolation: tfWithPattern === 1 ? 'Isolated to single timeframe' : `Visible on ${tfWithPattern} timeframes`
    };
  });

  // Sort: high prob first, then by RR, then by score
  return enriched.sort((a,b) => {
    if (a.isHighProb !== b.isHighProb) return b.isHighProb - a.isHighProb;
    return b.score - a.score;
  });
}

module.exports = { detectPatternsOnTimeframe, evaluateTopDownUniqueness, calculateRSI, calculateATR };
