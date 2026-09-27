// public/app.js - Frontend controller
let state = {
  broker: 'main',
  scanResults: [],
  filtered: [],
  selectedSymbol: null,
  selectedPattern: null,
  currentTF: 'H2',
  highProbOnly: false,
  watchlist: [],
  candlesCache: {}
};

const chartEngine = new ChartEngine('chartContainer');

const el = {
  scanBtn: document.getElementById('scanBtn'),
  highProbBtn: document.getElementById('highProbBtn'),
  resultsList: document.getElementById('resultsList'),
  chartSymbol: document.getElementById('chartSymbol'),
  chartInfo: document.getElementById('chartInfo'),
  tfSwitcher: document.getElementById('tfSwitcher'),
  inspector: document.getElementById('inspector'),
  tradePlan: document.getElementById('tradePlan'),
  search: document.getElementById('searchInput'),
  statBroker: document.getElementById('statBroker'),
  statCount: document.getElementById('statCount'),
  statPatterns: document.getElementById('statPatterns'),
  statHigh: document.getElementById('statHigh'),
  statTime: document.getElementById('statTime'),
  audioToggle: document.getElementById('audioToggle'),
  pineBtn: document.getElementById('pineBtn'),
  mql5Btn: document.getElementById('mql5Btn'),
  webhookBtn: document.getElementById('webhookBtn'),
  codePreview: document.getElementById('codePreview'),
  calcBalance: document.getElementById('calcBalance'),
  calcRisk: document.getElementById('calcRisk'),
  calcResult: document.getElementById('calcResult')
};

// Broker switcher
document.querySelectorAll('.broker-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.broker-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    state.broker = btn.dataset.broker;
    el.statBroker.textContent = state.broker.toUpperCase();
    fetchWatchlist();
    if (state.scanResults.length) renderResults();
  });
});

el.highProbBtn.addEventListener('click', () => {
  state.highProbOnly = !state.highProbOnly;
  el.highProbBtn.classList.toggle('active', state.highProbOnly);
  renderResults();
});

el.search.addEventListener('input', () => renderResults());

el.tfSwitcher.querySelectorAll('button').forEach(b=>{
  b.addEventListener('click', ()=>{
    el.tfSwitcher.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    state.currentTF = b.dataset.tf;
    if (state.selectedSymbol) loadCandles(state.selectedSymbol, state.currentTF);
  });
});

el.scanBtn.addEventListener('click', async () => {
  await doScan();
});

async function fetchWatchlist() {
  try {
    const res = await fetch(`/api/watchlist?broker=${state.broker}`);
    const data = await res.json();
    state.watchlist = data.watchlist || [];
  } catch(e){ console.error(e); }
}

async function doScan() {
  el.scanBtn.textContent = '⏳ SCANNING...';
  el.scanBtn.disabled = true;
  el.resultsList.innerHTML = '<div class="empty">⚡ Scanning across 6 timeframes (W1 D1 H4 H2 H1 M15) - checking top-down isolation...</div>';
  try {
    const res = await fetch(`/api/scan?broker=${state.broker}&refresh=true`);
    const data = await res.json();
    state.scanResults = data.results || [];
    const allPatterns = state.scanResults.flatMap(r => r.enrichedPatterns || []);
    
    el.statCount.textContent = state.scanResults.length;
    el.statPatterns.textContent = allPatterns.length;
    el.statHigh.textContent = allPatterns.filter(p=>p.isHighProb).length;
    el.statTime.textContent = new Date().toLocaleTimeString();

    if (allPatterns.filter(p=>p.isHighProb).length > 0 && el.audioToggle.checked) playChime();

    renderResults();
    toast(`✅ Scan complete: ${allPatterns.length} patterns, ${allPatterns.filter(p=>p.isHighProb).length} high prob hidden`);
  } catch(e){
    el.resultsList.innerHTML = `<div class="empty">❌ Scan failed: ${e.message}</div>`;
  } finally {
    el.scanBtn.textContent = '🔍 SCAN MARKET';
    el.scanBtn.disabled = false;
  }
}

function renderResults() {
  let list = [...state.scanResults];
  const search = el.search.value.toLowerCase();
  if (search) list = list.filter(r => r.symbol.toLowerCase().includes(search) || r.name.toLowerCase().includes(search));

  // Flatten to cards per symbol that has patterns
  let cards = [];
  list.forEach(symData => {
    const patterns = symData.enrichedPatterns || [];
    let displayPatterns = patterns;
    if (state.highProbOnly) displayPatterns = patterns.filter(p=>p.isHighProb);
    if (displayPatterns.length === 0) return;
    cards.push({ symData, patterns: displayPatterns });
  });

  // Sort: high prob first
  cards.sort((a,b)=>{
    const aHigh = a.patterns.filter(p=>p.isHighProb).length;
    const bHigh = b.patterns.filter(p=>p.isHighProb).length;
    return bHigh - aHigh;
  });

  if (cards.length === 0) {
    el.resultsList.innerHTML = `<div class="empty">${state.highProbOnly ? 'No high-prob hidden setups. Try disabling filter.' : 'No patterns found. Market may be ranging - try again.'}</div>`;
    return;
  }

  el.resultsList.innerHTML = cards.map(({symData, patterns})=>{
    const best = patterns[0];
    const isHigh = best.isHighProb;
    const badgeClass = isHigh ? 'high' : (best.uniquenessCount >=3 ? 'trap' : 'medium');
    const badgeText = best.grade;
    const tfPresence = Object.entries(best.timeframePresence || {}).map(([tf,c])=>`<span class="pill ${c>0?'active':''}">${tf}:${c}</span>`).join('');
    return `
      <div class="result-card ${isHigh?'high':''} ${badgeClass==='trap'?'trap':''}" data-symbol="${symData.symbol}">
        <div class="head">
          <span class="sym">${symData.symbol}</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="meta">
          <span><b>${best.type}</b> • ${best.timeframe} • RR 1:${best.rr1}</span>
          <span>Price: ${symData.currentPrice?.toFixed(4) || best.entry?.toFixed(4)}</span>
        </div>
        <div class="patterns">${tfPresence}</div>
        <div class="meta" style="margin-top:6px">
          <span>Score: <b>${best.score}/100</b></span>
          <span>Isolation: <b>${best.isolation}</b></span>
        </div>
      </div>
    `;
  }).join('');

  el.resultsList.querySelectorAll('.result-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const sym = card.dataset.symbol;
      const data = state.scanResults.find(s=>s.symbol===sym);
      if (!data) return;
      selectSymbol(data, data.enrichedPatterns[0]);
    });
  });
}

function selectSymbol(symData, pattern) {
  state.selectedSymbol = symData.symbol;
  state.selectedPattern = pattern || (symData.enrichedPatterns[0]);
  if (state.selectedPattern) state.currentTF = state.selectedPattern.timeframe;
  
  // Update TF switcher
  el.tfSwitcher.querySelectorAll('button').forEach(b=>{
    b.classList.toggle('active', b.dataset.tf===state.currentTF);
  });

  el.chartSymbol.textContent = `${symData.symbol} • ${symData.name} • ${state.selectedPattern?.type || ''}`;
  el.chartInfo.textContent = `${state.selectedPattern?.grade || ''} | Entry ${state.selectedPattern?.entry?.toFixed(5)} | SL ${state.selectedPattern?.stopLoss?.toFixed(5)} | TP1 ${state.selectedPattern?.tp1?.toFixed(5)} | RR 1:${state.selectedPattern?.rr1}`;

  loadCandles(symData.symbol, state.currentTF);
  renderInspector(state.selectedPattern, symData);
  renderTradePlan(state.selectedPattern, symData);
  updateCalculator(state.selectedPattern);
}

async function loadCandles(symbol, tf) {
  try {
    const cacheKey = `${symbol}-${tf}-${state.broker}`;
    let data;
    if (state.candlesCache[cacheKey]) {
      data = state.candlesCache[cacheKey];
    } else {
      const res = await fetch(`/api/candles?symbol=${symbol}&timeframe=${tf}&broker=${state.broker}`);
      data = await res.json();
      state.candlesCache[cacheKey] = data;
    }
    const relevantPatterns = (data.patterns || []).length ? data.patterns : [state.selectedPattern].filter(Boolean);
    chartEngine.setData(data.candles, relevantPatterns);
  } catch(e){ console.error('candle load failed', e); }
}

function renderInspector(pattern, symData) {
  if (!pattern) {
    el.inspector.innerHTML = '<div class="empty">No pattern</div>';
    return;
  }
  const gradeClass = pattern.isHighProb ? 'high' : (pattern.uniquenessCount>=3 ? 'trap' : 'medium');
  el.inspector.innerHTML = `
    <div class="grade-box ${gradeClass}">${pattern.grade} • Score ${pattern.score}/100<br><small>${pattern.verdict}</small></div>
    <div class="row"><span>Symbol</span><b>${pattern.symbol}</b></div>
    <div class="row"><span>Timeframe</span><b>${pattern.timeframe}</b></div>
    <div class="row"><span>Type</span><b>${pattern.pattern}</b></div>
    <div class="row"><span>Isolation</span><b>${pattern.isolation}</b></div>
    <div class="row"><span>TF Presence</span><b>${pattern.uniquenessCount}/6 TFs</b></div>
    <div class="row"><span>Pattern Height</span><b>${pattern.patternHeight?.toFixed(5)}</b></div>
    <div class="row"><span>Neckline</span><b>${pattern.neckline?.toFixed(5)}</b></div>
    <div class="row"><span>Entry</span><b>${pattern.entry?.toFixed(5)}</b></div>
    <div class="row"><span>Stop Loss</span><b>${pattern.stopLoss?.toFixed(5)}</b></div>
    <div class="row"><span>TP1 (1.0x)</span><b>${pattern.tp1?.toFixed(5)}</b></div>
    <div class="row"><span>TP2 (1.618x)</span><b>${pattern.tp2?.toFixed(5)}</b></div>
    <div class="row"><span>Risk:Reward TP1</span><b>1:${pattern.rr1}</b></div>
    <div class="row"><span>Risk:Reward TP2</span><b>1:${pattern.rr2}</b></div>
    <div class="row"><span>RSI Divergence</span><b>${pattern.confluences?.rsiDivergence ? '✅ YES' : '❌ NO'} (${pattern.confluences?.rsiP1 || pattern.confluences?.rsiT1} → ${pattern.confluences?.rsiP2 || pattern.confluences?.rsiT2})</b></div>
    <div class="row"><span>Vol Contraction P2</span><b>${pattern.confluences?.volumeContraction ? '✅ YES' : '❌ NO'}</b></div>
    <div class="row"><span>Breakout Vol Expansion</span><b>${pattern.confluences?.breakoutVolumeExpansion ? '✅ YES' : '❌ NO'}</b></div>
    <div class="row"><span>Body Close Confirmed</span><b>${pattern.confluences?.bodyCloseConfirmed ? '✅ YES' : '❌ NO'}</b></div>
    <div class="row"><span>Current Price (${symData.symbol})</span><b>${symData.currentPrice?.toFixed(5)}</b></div>
    <div class="row"><span>Category</span><b>${symData.category}</b></div>
  `;
}

function renderTradePlan(pattern, symData) {
  if (!pattern) { el.tradePlan.textContent = ''; return; }
  const plan = `TRADE PLAN - ${pattern.symbol} ${pattern.type} ${pattern.timeframe}
Broker: ${state.broker.toUpperCase()}
Grade: ${pattern.grade} (${pattern.score}/100)
Entry: ${pattern.entry}
SL: ${pattern.stopLoss} (Risk: ${(Math.abs(pattern.entry - pattern.stopLoss)).toFixed(5)})
TP1: ${pattern.tp1} (1.0x Height)
TP2: ${pattern.tp2} (1.618x Fib)
RR: 1:${pattern.rr1} at TP1, 1:${pattern.rr2} at TP2
Neckline: ${pattern.neckline}
Isolation: ${pattern.isolation}
Confluences: RSI Div ${pattern.confluences?.rsiDivergence ? 'YES' : 'NO'}, Vol Contraction ${pattern.confluences?.volumeContraction ? 'YES' : 'NO'}, Breakout Vol ${pattern.confluences?.breakoutVolumeExpansion ? 'YES' : 'NO'}
Verdict: ${pattern.verdict}
---
Generated by Nexus DT/DB Scanner
Time: ${new Date().toISOString()}
`;
  el.tradePlan.textContent = plan;
}

function updateCalculator(pattern) {
  if (!pattern) return;
  const bal = parseFloat(el.calcBalance.value) || 10000;
  const riskPct = parseFloat(el.calcRisk.value) || 1;
  const riskMoney = bal * riskPct / 100;
  const riskPoints = Math.abs(pattern.entry - pattern.stopLoss);
  const pipSize = 0.0001; // simplified
  const lot = riskMoney / (riskPoints * 100000); // rough
  const tp1Profit = Math.abs(pattern.tp1 - pattern.entry) * 100000 * lot;
  el.calcResult.textContent = `Lot: ${lot.toFixed(2)} | $Risk: $${riskMoney.toFixed(2)} | TP1 $${tp1Profit.toFixed(2)}`;
}

el.calcBalance.addEventListener('input', ()=> state.selectedPattern && updateCalculator(state.selectedPattern));
el.calcRisk.addEventListener('input', ()=> state.selectedPattern && updateCalculator(state.selectedPattern));

async function copyCode(type) {
  try {
    const res = await fetch(`/api/code/${type}?broker=${state.broker}`);
    const text = await res.text();
    el.codePreview.textContent = text.slice(0, 4000) + (text.length>4000 ? '\n... (truncated, full in download)' : '');
    await navigator.clipboard.writeText(text);
    toast(`📋 ${type.toUpperCase()} copied!`);
  } catch(e){ toast('Copy failed: '+e.message); }
}

el.pineBtn.addEventListener('click', ()=>copyCode('pinescript'));
el.mql5Btn.addEventListener('click', ()=>copyCode('mql5'));
el.webhookBtn.addEventListener('click', ()=>{
  if (!state.selectedPattern) return toast('Select a pattern first');
  const json = JSON.stringify({
    symbol: state.selectedPattern.symbol,
    timeframe: state.selectedPattern.timeframe,
    type: state.selectedPattern.type,
    entry: state.selectedPattern.entry,
    sl: state.selectedPattern.stopLoss,
    tp1: state.selectedPattern.tp1,
    tp2: state.selectedPattern.tp2,
    grade: state.selectedPattern.grade,
    broker: state.broker,
    timestamp: new Date().toISOString()
  }, null, 2);
  el.codePreview.textContent = json;
  navigator.clipboard.writeText(json);
  toast('📋 Webhook JSON copied!');
});

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, start, dur, vol=0.3) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start+0.02); g.gain.exponentialRampToValueAtTime(0.001, start+dur);
      o.start(start); o.stop(start+dur);
    };
    const now = ctx.currentTime;
    play(880, now, 0.25, 0.3);
    play(1108, now+0.15, 0.25, 0.3);
    play(1318, now+0.3, 0.4, 0.35);
  } catch(e){}
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(()=>t.style.display='none', 4000);
}

// Init
fetchWatchlist();
toast('⚡ Nexus Scanner Ready - Click SCAN MARKET');
