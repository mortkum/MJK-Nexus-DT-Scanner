// public/chart-engine.js - Canvas candlestick chart with pattern drawing
class ChartEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.candleSeries = null;
    this.volumeSeries = null;
    this.markers = [];
    this.lines = [];
    this.resizeObserver = null;
    this.init();
  }

  init() {
    // Try lightweight-charts if available, else fallback to canvas
    if (typeof LightweightCharts !== 'undefined') {
      this.chart = LightweightCharts.createChart(this.container, {
        layout: { background: { color: '#0c121b' }, textColor: '#8b9bb0' },
        grid: { vertLines: { color: '#121821' }, horzLines: { color: '#121821' } },
        width: this.container.clientWidth,
        height: this.container.clientHeight,
        timeScale: { borderColor: '#1f2d40', timeVisible: true, secondsVisible: false },
        rightPriceScale: { borderColor: '#1f2d40' }
      });
      this.candleSeries = this.chart.addCandlestickSeries({
        upColor: '#00e676', downColor: '#ff3d57', borderVisible: false, wickUpColor: '#00e676', wickDownColor: '#ff3d57'
      });
      this.volumeSeries = this.chart.addHistogramSeries({
        priceScaleId: '', priceFormat: { type: 'volume' }, color: '#1f2d40'
      });
      window.addEventListener('resize', () => {
        if (this.container) this.chart.applyOptions({ width: this.container.clientWidth, height: this.container.clientHeight });
      });
    } else {
      // Canvas fallback
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
    }
  }

  setData(candles, patterns = []) {
    if (!candles || candles.length === 0) return;
    if (this.candleSeries) {
      const candleData = candles.map(c => ({
        time: c.time,
        open: c.open, high: c.high, low: c.low, close: c.close
      }));
      const volumeData = candles.map(c => ({
        time: c.time, value: c.volume || 1000, color: c.close >= c.open ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,87,0.3)'
      }));
      this.candleSeries.setData(candleData);
      this.volumeSeries.setData(volumeData);
      this.chart.timeScale().fitContent();

      // Clear old markers/lines
      this.candleSeries.setMarkers([]);

      const markers = [];
      const lines = [];

      patterns.forEach(p => {
        const isDT = p.type === 'DT';
        const color = isDT ? '#ff3d57' : '#00e676';
        
        // Add markers for peaks/troughs
        if (p.peak1) markers.push({ time: p.peak1.time, position: 'aboveBar', color, shape: 'arrowDown', text: 'P1' });
        if (p.peak2) markers.push({ time: p.peak2.time, position: 'aboveBar', color, shape: 'arrowDown', text: 'P2' });
        if (p.trough1) markers.push({ time: p.trough1.time, position: 'belowBar', color, shape: 'arrowUp', text: 'T1' });
        if (p.trough2) markers.push({ time: p.trough2.time, position: 'belowBar', color, shape: 'arrowUp', text: 'T2' });

        // Price lines for entry/SL/TP
        try {
          this.candleSeries.createPriceLine({ price: p.neckline, color: '#ffd600', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'NECKLINE' });
          this.candleSeries.createPriceLine({ price: p.entry, color: '#00e5ff', lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: 'ENTRY' });
          this.candleSeries.createPriceLine({ price: p.stopLoss, color: '#ff3d57', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'SL' });
          this.candleSeries.createPriceLine({ price: p.tp1, color: '#00e676', lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: 'TP1' });
          this.candleSeries.createPriceLine({ price: p.tp2, color: '#00e676', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'TP2' });
        } catch(e) {}
      });

      this.candleSeries.setMarkers(markers.sort((a,b)=>a.time-b.time));
    } else if (this.ctx) {
      this.drawCanvas(candles, patterns);
    }
  }

  drawCanvas(candles, patterns) {
    const canvas = this.canvas;
    const rect = this.container.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = this.ctx;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0,0,W,H);
    
    // Simple candle draw
    const visible = candles.slice(-100);
    const min = Math.min(...visible.map(c=>c.low));
    const max = Math.max(...visible.map(c=>c.high));
    const pad = (max-min)*0.1;
    const range = (max-min)+pad*2;
    const candleW = Math.max(2, W / visible.length * 0.6);
    
    visible.forEach((c,i)=>{
      const x = (i/visible.length)*W;
      const yHigh = ((max - c.high + pad)/range)*H*0.8;
      const yLow = ((max - c.low + pad)/range)*H*0.8;
      const yOpen = ((max - c.open + pad)/range)*H*0.8;
      const yClose = ((max - c.close + pad)/range)*H*0.8;
      const isUp = c.close>=c.open;
      ctx.strokeStyle = isUp ? '#00e676' : '#ff3d57';
      ctx.fillStyle = isUp ? '#00e676' : '#ff3d57';
      ctx.beginPath(); ctx.moveTo(x, yHigh); ctx.lineTo(x, yLow); ctx.stroke();
      ctx.fillRect(x-candleW/2, Math.min(yOpen,yClose), candleW, Math.max(2, Math.abs(yOpen-yClose)));
    });

    // Draw neckline
    patterns.forEach(p=>{
      const y = ((max - p.neckline + pad)/range)*H*0.8;
      ctx.strokeStyle = '#ffd600'; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); ctx.setLineDash([]);
    });
  }
}
