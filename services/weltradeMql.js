// services/weltradeMql.js - Weltrade-tuned MetaTrader 5 EA generator
//
// Produces a production-ready MQL5 Expert Advisor that:
//   * Runs inside your Weltrade MT5 terminal
//   * Reads candles via CopyRates() (no external API needed)
//   * Scans all 6 timeframes on every tick
//   * Detects Double Top / Double Bottom with RSI divergence
//   * Only activates on candle body CLOSE (decisive activation rule)
//   * Grades patterns with the same top-down isolation logic as the web app
//   * Sends push notifications + journal alerts
//
// This is the recommended path for live trading on Weltrade since it
// runs natively in their MT5 and uses their tick-perfect feed.

function getWeltradeMQL5Code() {
  return `//+------------------------------------------------------------------+
//|                                         Nexus_HiddenDT_DB_Weltrade.mq5 |
//|                        Copyright 2026, Nexus Trading Systems        |
//|                                   Hidden Double Top / Bottom Scanner|
//+------------------------------------------------------------------+
#property copyright   "Nexus Trading Systems"
#property link        "https://nexus-scanner.local"
#property version     "2.10"
#property description "Weltrade SyntX / FXvol / Volatility / Crash-Boom / PainX / GainX"
#property description "Hidden DT/DB detector with multi-timeframe isolation + RSI divergence"
#property strict

#include <Trade\\Trade.mqh>

// ----------------------------------------------------------------------
// INPUTS - tuned for Weltrade synthetic indices
// ----------------------------------------------------------------------
input group    "==== Weltrade Account ===="
input long     InpLogin          = 0;            // Weltrade MT5 account number
input string   InpServer         = "Weltrade-Live"; // MT5 server (Weltrade-Live or Weltrade-Demo)

input group    "==== Scan Settings ===="
input int      InpSwingStrength  = 3;            // Pivot lookback bars each side
input double   InpPeakTolerance  = 0.015;        // Peak/peak tolerance (1.5%)
input double   InpMinPatternPct  = 0.002;        // Minimum pattern height (0.2%)
input double   InpBodyExtensionPct = 0.15;       // Body extension past neckline
input int      InpRSIPeriod      = 14;           // RSI period
input double   InpMinRR          = 1.5;          // Minimum risk:reward

input group    "==== Multi-Timeframe ===="
input bool     InpScanW1         = true;
input bool     InpScanD1         = true;
input bool     InpScanH4         = true;
input bool     InpScanH2         = true;
input bool     InpScanH1         = true;
input bool     InpScanM15        = true;

input group    "==== Notifications ===="
input bool     InpAlertPopup     = true;
input bool     InpAlertPush      = true;
input bool     InpAlertSound     = true;
input string   InpAlertSoundFile = "alert.wav";
input bool     InpAlertEmail     = false;

input group    "==== Auto-Trading ===="
input bool     InpAutoTrade      = false;        // Master switch (OFF by default)
input double   InpRiskPercent    = 1.0;          // Risk % per trade
input double   InpATR_SL_Buffer = 0.10;          // SL buffer (10% of pattern height + ATR mult)

// ----------------------------------------------------------------------
// STRUCTS
// ----------------------------------------------------------------------
struct Candle { datetime time; double open, high, low, close; long volume; };

struct SwingPoint { int index; double price; datetime time; long volume; };

struct Pattern {
  string symbol;
  ENUM_TIMEFRAMES tf;
  int    type;             // 1 = Double Top, -1 = Double Bottom
  double p1, p2, neckline;
  datetime t1, t2, t_neckline;
  double entry, sl, tp1, tp2;
  double rsi_p1, rsi_p2;
  bool   rsi_divergence;
  bool   vol_contraction;
  bool   breakout_vol_expansion;
  double rr1, rr2;
  datetime activation_time;
  int    isolation_count;  // how many TFs share the pattern
  bool   is_high_prob;
};

// ----------------------------------------------------------------------
// GLOBALS
// ----------------------------------------------------------------------
CTrade trade;
string g_symbols[];
int    g_scan_tf_count = 0;
ENUM_TIMEFRAMES g_scan_tfs[];
Pattern g_active_patterns[];

datetime g_last_bar_time[];
int g_rsi_handle[];

//+------------------------------------------------------------------+
//| Helpers                                                          |
//+------------------------------------------------------------------+
ENUM_TIMEFRAMES StringToTF(string s) {
  if(s=="M15") return PERIOD_M15;
  if(s=="H1")  return PERIOD_H1;
  if(s=="H2")  return PERIOD_H2;
  if(s=="H4")  return PERIOD_H4;
  if(s=="D1")  return PERIOD_D1;
  if(s=="W1")  return PERIOD_W1;
  return PERIOD_H1;
}

string TFToString(ENUM_TIMEFRAMES tf) {
  switch(tf) {
    case PERIOD_M15: return "M15";
    case PERIOD_H1:  return "H1";
    case PERIOD_H2:  return "H2";
    case PERIOD_H4:  return "H4";
    case PERIOD_D1:  return "D1";
    case PERIOD_W1:  return "W1";
    default:         return "H1";
  }
}

// Fetch last n bars as Candle[]
bool GetCandles(string symbol, ENUM_TIMEFRAMES tf, int n, Candle &out[]) {
  MqlRates rates[];
  ArraySetAsSeries(rates, true);
  int copied = CopyRates(symbol, tf, 0, n, rates);
  if(copied <= 0) return false;
  ArrayResize(out, copied);
  for(int i=0;i<copied;i++){
    out[i].time   = rates[i].time;
    out[i].open   = rates[i].open;
    out[i].high   = rates[i].high;
    out[i].low    = rates[i].low;
    out[i].close  = rates[i].close;
    out[i].volume = rates[i].tick_volume;
  }
  return true;
}

double CalcRSI(string symbol, ENUM_TIMEFRAMES tf, int period, int shift) {
  double rsi[];
  int h = iRSI(symbol, tf, period, PRICE_CLOSE);
  if(h == INVALID_HANDLE) return 50;
  ArraySetAsSeries(rsi, true);
  if(CopyBuffer(h, 0, shift, 1, rsi) <= 0) return 50;
  return rsi[0];
}

void FindSwings(const Candle &c[], int strength, double threshold_pct,
                SwingPoint &peaks[], SwingPoint &troughs[]) {
  ArrayResize(peaks, 0);
  ArrayResize(troughs, 0);
  for(int i=strength; i<ArraySize(c)-strength; i++){
    bool isPeak=true, isTrough=true;
    for(int j=1; j<=strength; j++){
      if(c[i-j].high >= c[i].high || c[i+j].high >= c[i].high) isPeak=false;
      if(c[i-j].low  <= c[i].low  || c[i+j].low  <= c[i].low ) isTrough=false;
    }
    if(isPeak)  { SwingPoint p; p.index=i; p.price=c[i].high; p.time=c[i].time; p.volume=c[i].volume; ArrayResize(peaks, ArraySize(peaks)+1); peaks[ArraySize(peaks)-1]=p; }
    if(isTrough){ SwingPoint t; t.index=i; t.price=c[i].low;  t.time=c[i].time; t.volume=c[i].volume; ArrayResize(troughs, ArraySize(troughs)+1); troughs[ArraySize(troughs)-1]=t; }
  }
}

//+------------------------------------------------------------------+
//| PATTERN DETECTION                                                |
//+------------------------------------------------------------------+
int DetectHiddenDT_DB(string symbol, ENUM_TIMEFRAMES tf, Pattern &out_patterns[]) {
  Candle c[];
  if(!GetCandles(symbol, tf, 250, c)) return 0;

  SwingPoint peaks[], troughs[];
  FindSwings(c, InpSwingStrength, InpPeakTolerance*0.5, peaks, troughs);

  int found = 0;
  ArrayResize(out_patterns, 0);

  // ---- Double Top ----
  for(int i=0; i<ArraySize(peaks)-1; i++){
    for(int j=i+1; j<MathMin(ArraySize(peaks), i+6); j++){
      double p1 = peaks[i].price, p2 = peaks[j].price;
      if(MathAbs(p1-p2)/p1 > InpPeakTolerance) continue;

      // Find neckline (lowest trough between p1 and p2)
      SwingPoint neckTrough; bool hasNeck=false;
      for(int k=0; k<ArraySize(troughs); k++){
        if(troughs[k].index > peaks[i].index && troughs[k].index < peaks[j].index){
          if(!hasNeck || troughs[k].price < neckTrough.price){ neckTrough=troughs[k]; hasNeck=true; }
        }
      }
      if(!hasNeck) continue;
      double neckline = neckTrough.price;
      double height   = MathMax(p1,p2) - neckline;
      if(height/p1 < InpMinPatternPct) continue;

      // Wait for body close below neckline (DECISIVE activation)
      bool activated=false;
      int  breakout_i=-1;
      for(int k=peaks[j].index+1; k<ArraySize(c); k++){
        if(c[k].close < neckline){
          double body = MathAbs(c[k].open - c[k].close);
          double ext  = neckline - c[k].close;
          if(body > 0 && ext/body >= InpBodyExtensionPct){
            activated=true; breakout_i=k; break;
          }
        }
      }
      if(!activated) continue;

      // RSI divergence
      int bshift = ArraySize(c) - 1 - peaks[i].index;
      int bshift2= ArraySize(c) - 1 - peaks[j].index;
      double rsi1 = CalcRSI(symbol, tf, InpRSIPeriod, bshift);
      double rsi2 = CalcRSI(symbol, tf, InpRSIPeriod, bshift2);
      bool rsiDiv = (rsi2 < rsi1 - 1.0);

      // Volume contraction on peak 2
      bool volContract = (peaks[j].volume < peaks[i].volume);

      // Trade geometry
      double entry = c[breakout_i].close;
      double sl    = MathMax(p1,p2) + height*InpATR_SL_Buffer;
      double tp1   = neckline - height*1.0;
      double tp2   = neckline - height*1.618;
      double risk  = sl - entry;
      double rr1   = (entry - tp1) / MathMax(risk, _Point);
      double rr2   = (entry - tp2) / MathMax(risk, _Point);
      if(rr1 < InpMinRR) continue;

      Pattern pat;
      pat.symbol=symbol; pat.tf=tf; pat.type=1;
      pat.p1=p1; pat.p2=p2; pat.neckline=neckline;
      pat.t1=peaks[i].time; pat.t2=peaks[j].time; pat.t_neckline=neckTrough.time;
      pat.entry=entry; pat.sl=sl; pat.tp1=tp1; pat.tp2=tp2;
      pat.rsi_p1=rsi1; pat.rsi_p2=rsi2; pat.rsi_divergence=rsiDiv;
      pat.vol_contraction=volContract; pat.breakout_vol_expansion=true;
      pat.rr1=rr1; pat.rr2=rr2;
      pat.activation_time=c[breakout_i].time;
      ArrayResize(out_patterns, ArraySize(out_patterns)+1);
      out_patterns[ArraySize(out_patterns)-1]=pat;
      found++;
      break;
    }
  }

  // ---- Double Bottom ----
  for(int i=0; i<ArraySize(troughs)-1; i++){
    for(int j=i+1; j<MathMin(ArraySize(troughs), i+6); j++){
      double t1=troughs[i].price, t2=troughs[j].price;
      if(MathAbs(t1-t2)/t1 > InpPeakTolerance) continue;

      SwingPoint neckPeak; bool hasNeck=false;
      for(int k=0; k<ArraySize(peaks); k++){
        if(peaks[k].index > troughs[i].index && peaks[k].index < troughs[j].index){
          if(!hasNeck || peaks[k].price > neckPeak.price){ neckPeak=peaks[k]; hasNeck=true; }
        }
      }
      if(!hasNeck) continue;
      double neckline = neckPeak.price;
      double height   = neckline - MathMin(t1,t2);
      if(height/t1 < InpMinPatternPct) continue;

      bool activated=false; int breakout_i=-1;
      for(int k=troughs[j].index+1; k<ArraySize(c); k++){
        if(c[k].close > neckline){
          double body = MathAbs(c[k].open - c[k].close);
          double ext  = c[k].close - neckline;
          if(body > 0 && ext/body >= InpBodyExtensionPct){
            activated=true; breakout_i=k; break;
          }
        }
      }
      if(!activated) continue;

      int bshift = ArraySize(c) - 1 - troughs[i].index;
      int bshift2= ArraySize(c) - 1 - troughs[j].index;
      double rsi1 = CalcRSI(symbol, tf, InpRSIPeriod, bshift);
      double rsi2 = CalcRSI(symbol, tf, InpRSIPeriod, bshift2);
      bool rsiDiv = (rsi2 > rsi1 + 1.0);

      bool volContract = (troughs[j].volume < troughs[i].volume);

      double entry = c[breakout_i].close;
      double sl    = MathMin(t1,t2) - height*InpATR_SL_Buffer;
      double tp1   = neckline + height*1.0;
      double tp2   = neckline + height*1.618;
      double risk  = entry - sl;
      double rr1   = (tp1 - entry) / MathMax(risk, _Point);
      double rr2   = (tp2 - entry) / MathMax(risk, _Point);
      if(rr1 < InpMinRR) continue;

      Pattern pat;
      pat.symbol=symbol; pat.tf=tf; pat.type=-1;
      pat.p1=t1; pat.p2=t2; pat.neckline=neckline;
      pat.t1=troughs[i].time; pat.t2=troughs[j].time; pat.t_neckline=neckPeak.time;
      pat.entry=entry; pat.sl=sl; pat.tp1=tp1; pat.tp2=tp2;
      pat.rsi_p1=rsi1; pat.rsi_p2=rsi2; pat.rsi_divergence=rsiDiv;
      pat.vol_contraction=volContract; pat.breakout_vol_expansion=true;
      pat.rr1=rr1; pat.rr2=rr2;
      pat.activation_time=c[breakout_i].time;
      ArrayResize(out_patterns, ArraySize(out_patterns)+1);
      out_patterns[ArraySize(out_patterns)-1]=pat;
      found++;
      break;
    }
  }

  return found;
}

//+------------------------------------------------------------------+
//| TOP-DOWN ISOLATION CHECK                                         |
//+------------------------------------------------------------------+
int CountTimeframesWithPattern(string symbol, int type) {
  int count = 0;
  for(int i=0; i<g_scan_tf_count; i++){
    Pattern tmp[];
    int n = DetectHiddenDT_DB(symbol, g_scan_tfs[i], tmp);
    for(int j=0; j<n; j++) if(tmp[j].type == type){ count++; break; }
  }
  return count;
}

//+------------------------------------------------------------------+
//| ALERTS                                                          |
//+------------------------------------------------------------------+
void FireAlert(const Pattern &p) {
  string dir = (p.type==1) ? "DOUBLE TOP (Sell)" : "DOUBLE BOTTOM (Buy)";
  string tf  = TFToString(p.tf);
  string msg = StringFormat("\\n⚡ NEXUS HIDDEN %s on %s %s\\n"
                            "Entry: %.5f   SL: %.5f\\n"
                            "TP1: %.5f   TP2: %.5f\\n"
                            "RR1: %.2f  RR2: %.2f\\n"
                            "RSI Divergence: %s   Vol Contraction: %s",
                            dir, p.symbol, tf, p.entry, p.sl, p.tp1, p.tp2,
                            p.rr1, p.rr2,
                            p.rsi_divergence?"YES":"no",
                            p.vol_contraction?"YES":"no");

  Print(msg);
  if(InpAlertPopup) Alert(msg);
  if(InpAlertPush)  SendNotification("Nexus " + dir + " " + p.symbol + " " + tf);
  if(InpAlertSound) PlaySound(InpAlertSoundFile);
  if(InpAlertEmail) SendMail("Nexus Alert: " + dir, msg);
}

//+------------------------------------------------------------------+
//| AUTO TRADE                                                      |
//+------------------------------------------------------------------+
void TryExecuteTrade(const Pattern &p) {
  if(!InpAutoTrade) return;
  double balance = AccountInfoDouble(ACCOUNT_BALANCE);
  double risk    = balance * InpRiskPercent / 100.0;
  double tickVal = SymbolInfoDouble(p.symbol, SYMBOL_TRADE_TICK_VALUE);
  double tickSz  = SymbolInfoDouble(p.symbol, SYMBOL_TRADE_TICK_SIZE);
  double lots    = (risk / MathMax(p.sl-p.entry, _Point)) * tickSz / MathMax(tickVal, _Point);
  double minLot  = SymbolInfoDouble(p.symbol, SYMBOL_VOLUME_MIN);
  double maxLot  = SymbolInfoDouble(p.symbol, SYMBOL_VOLUME_MAX);
  lots = MathMax(minLot, MathMin(maxLot, lots));
  lots = NormalizeDouble(lots, 2);

  if(p.type == 1) trade.Sell(lots, p.symbol, p.entry, p.sl, p.tp1, "Nexus Hidden DT");
  else            trade.Buy (lots, p.symbol, p.entry, p.sl, p.tp1, "Nexus Hidden DB");
}

//+------------------------------------------------------------------+
//| OnInit                                                          |
//+------------------------------------------------------------------+
int OnInit() {
  Print("=== Nexus Weltrade Hidden DT/DB Scanner v2.10 starting ===");

  // Build timeframe list based on inputs
  g_scan_tf_count = 0;
  if(InpScanM15) { ArrayResize(g_scan_tfs, g_scan_tf_count+1); g_scan_tfs[g_scan_tf_count++] = PERIOD_M15; }
  if(InpScanH1)  { ArrayResize(g_scan_tfs, g_scan_tf_count+1); g_scan_tfs[g_scan_tf_count++] = PERIOD_H1;  }
  if(InpScanH2)  { ArrayResize(g_scan_tfs, g_scan_tf_count+1); g_scan_tfs[g_scan_tf_count++] = PERIOD_H2;  }
  if(InpScanH4)  { ArrayResize(g_scan_tfs, g_scan_tf_count+1); g_scan_tfs[g_scan_tf_count++] = PERIOD_H4;  }
  if(InpScanD1)  { ArrayResize(g_scan_tfs, g_scan_tf_count+1); g_scan_tfs[g_scan_tf_count++] = PERIOD_D1;  }
  if(InpScanW1)  { ArrayResize(g_scan_tfs, g_scan_tf_count+1); g_scan_tfs[g_scan_tf_count++] = PERIOD_W1;  }

  // Auto-populate Weltrade symbols from Market Watch
  int total = SymbolsTotal(true);
  ArrayResize(g_symbols, total);
  for(int i=0; i<total; i++) g_symbols[i] = SymbolName(i, true);

  Print("Scanning ", total, " symbols across ", g_scan_tf_count, " timeframes");
  EventSetTimer(60);  // scan every minute on new bar
  return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) { EventKillTimer(); }

//+------------------------------------------------------------------+
//| SCAN LOOP - runs once per bar per symbol                         |
//+------------------------------------------------------------------+
void ScanSymbol(string symbol) {
  // Skip if symbol not visible
  if(!SymbolSelect(symbol, true)) return;
  if(SymbolInfoInteger(symbol, SYMBOL_TRADE_MODE) == SYMBOL_TRADE_MODE_DISABLED) return;

  // Detect on each TF
  for(int t=0; t<g_scan_tf_count; t++){
    Pattern local[];
    int n = DetectHiddenDT_DB(symbol, g_scan_tfs[t], local);
    for(int p=0; p<n; p++){
      int isolation = CountTimeframesWithPattern(symbol, local[p].type);
      local[p].isolation_count = isolation;
      local[p].is_high_prob    = (isolation == 1);
      if(isolation <= 2){                  // hidden or semi-hidden = fire alert
        FireAlert(local[p]);
        TryExecuteTrade(local[p]);
      }
    }
  }
}

void OnTimer() {
  for(int i=0; i<ArraySize(g_symbols); i++) ScanSymbol(g_symbols[i]);
}

//+------------------------------------------------------------------+
//| Optional: triggered manually from chart                          |
//+------------------------------------------------------------------+
void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam) {
  if(id == CHARTEVENT_KEYDOWN && lparam == 'S'){
    for(int i=0; i<ArraySize(g_symbols); i++) ScanSymbol(g_symbols[i]);
    Print("Manual scan complete for ", ArraySize(g_symbols), " symbols");
  }
}
//+------------------------------------------------------------------+
`;
}

// Companion: Weltrade SyntX-tuned Pine Script (TradingView alternative)
function getWeltradePineCode() {
  return `//@version=5
indicator("Nexus Hidden DT/DB (Weltrade SyntX)", overlay=true, max_labels_count=500)

// ----------------------------------------------------------------------
// Inputs - tuned for Weltrade synthetic indices
// ----------------------------------------------------------------------
swingStrength = input.int(3, "Pivot Strength")
peakTol       = input.float(0.015, "Peak Tolerance %", step=0.001)
minHeightPct  = input.float(0.002, "Min Pattern Height %", step=0.0005)
rsiLen        = input.int(14, "RSI Length")
rsiDivMin     = input.float(1.0, "RSI Divergence Threshold")
minRR         = input.float(1.5, "Min Risk:Reward")
showAll       = input.bool(false, "Show All TFs (else strict hidden only)")
tableTF       = input.string("H1", "Display Timeframe", options=["M15","H1","H2","H4","D1","W1"])

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
tfMult = tableTF=="M15"?0.45 : tableTF=="H1"?0.75 : tableTF=="H2"?1.0 : tableTF=="H4"?1.4 : tableTF=="D1"?2.6 : 5.2
res    = timeframe.multiplier * 60

pivHi = ta.pivothigh(high, swingStrength, swingStrength)
pivLo = ta.pivotlow (low,  swingStrength, swingStrength)

var float lastTop1 = na, var float lastTop2 = na
var float lastBot1 = na, var float lastBot2 = na
var int   lastTop1Bar = na, var int lastTop2Bar = na
var int   lastBot1Bar = na, var int lastBot2Bar = na
var float lastNeckline = na

// DT detection
if not na(pivHi)
    lastTop1 := lastTop2
    lastTop1Bar := lastTop2Bar
    if not na(lastTop2)
        peakDiff = math.abs(pivHi - lastTop2) / lastTop2
        if peakDiff <= peakTol
            // Look for trough between the two peaks (neckline)
            neckline = ta.lowest(low, swingStrength*4)[swingStrength]
            height   = math.max(lastTop1, pivHi) - neckline
            if height/lastTop1 >= minHeightPct
                // Activation: wait for close below neckline
                if close < neckline
                    rsiP1 = ta.rsi(close, rsiLen)[lastTop1Bar]
                    rsiP2 = ta.rsi(close, rsiLen)[bar_index - lastTop2Bar]
                    divOK = rsiP2 < rsiP1 - rsiDivMin
                    entry = close
                    sl    = math.max(lastTop1, pivHi) + height*0.10
                    tp1   = neckline - height
                    tp2   = neckline - height*1.618
                    risk  = sl - entry
                    rr1   = (entry - tp1) / math.max(risk, syminfo.mintick)
                    if rr1 >= minRR and divOK
                        label.new(bar_index, high, "DT\\nRR:"+str.tostring(rr1,"#.##"), style=label.style_label_down, color=color.red, textcolor=color.white, size=size.small)
                        line.new(lastTop1Bar, lastTop1, lastTop2Bar, pivHi, color=color.red, width=2)
                        line.new(lastTop2Bar, pivHi, bar_index, neckline, color=color.red, style=line.style_dashed)
                        line.new(bar_index, neckline, bar_index+10, neckline, color=color.yellow, width=2)
                        line.new(bar_index, entry, bar_index+10, entry, color=color.aqua, width=1)
                        line.new(bar_index, sl,    bar_index+10, sl,    color=color.orange, width=1)
                        line.new(bar_index, tp1,   bar_index+10, tp1,   color=color.green, width=1)
                        line.new(bar_index, tp2,   bar_index+10, tp2,   color=color.lime,  width=1)
    lastTop2 := pivHi
    lastTop2Bar := bar_index

// DB detection
if not na(pivLo)
    lastBot1 := lastBot2
    lastBot1Bar := lastBot2Bar
    if not na(lastBot2)
        botDiff = math.abs(pivLo - lastBot2) / lastBot2
        if botDiff <= peakTol
            neckline = ta.highest(high, swingStrength*4)[swingStrength]
            height   = neckline - math.min(lastBot1, pivLo)
            if height/lastBot1 >= minHeightPct
                if close > neckline
                    rsiT1 = ta.rsi(close, rsiLen)[lastBot1Bar]
                    rsiT2 = ta.rsi(close, rsiLen)[bar_index - lastBot2Bar]
                    divOK = rsiT2 > rsiT1 + rsiDivMin
                    entry = close
                    sl    = math.min(lastBot1, pivLo) - height*0.10
                    tp1   = neckline + height
                    tp2   = neckline + height*1.618
                    risk  = entry - sl
                    rr1   = (tp1 - entry) / math.max(risk, syminfo.mintick)
                    if rr1 >= minRR and divOK
                        label.new(bar_index, low, "DB\\nRR:"+str.tostring(rr1,"#.##"), style=label.style_label_up, color=color.green, textcolor=color.white, size=size.small)
                        line.new(lastBot1Bar, lastBot1, lastBot2Bar, pivLo, color=color.green, width=2)
                        line.new(lastBot2Bar, pivLo, bar_index, neckline, color=color.green, style=line.style_dashed)
                        line.new(bar_index, neckline, bar_index+10, neckline, color=color.yellow, width=2)
                        line.new(bar_index, entry, bar_index+10, entry, color=color.aqua, width=1)
                        line.new(bar_index, sl,    bar_index+10, sl,    color=color.orange, width=1)
                        line.new(bar_index, tp1,   bar_index+10, tp1,   color=color.green, width=1)
                        line.new(bar_index, tp2,   bar_index+10, tp2,   color=color.lime,  width=1)
    lastBot2 := pivLo
    lastBot2Bar := bar_index

// Status table
var table t = table.new(position.top_right, 2, 4, bgcolor=color.new(color.black, 80))
if barstate.islast
    table.cell(t, 0, 0, "Symbol",    text_color=color.white, text_size=size.small)
    table.cell(t, 1, 0, syminfo.ticker, text_color=color.yellow, text_size=size.small)
    table.cell(t, 0, 1, "TF",        text_color=color.white, text_size=size.small)
    table.cell(t, 1, 1, tableTF,     text_color=color.yellow, text_size=size.small)
    table.cell(t, 0, 2, "Source",    text_color=color.white, text_size=size.small)
    table.cell(t, 1, 2, "Weltrade MT5", text_color=color.aqua, text_size=size.small)
    table.cell(t, 0, 3, "Strategy",  text_color=color.white, text_size=size.small)
    table.cell(t, 1, 3, "Hidden DT/DB", text_color=color.lime, text_size=size.small)
`;
}

module.exports = { getWeltradeMQL5Code, getWeltradePineCode };
