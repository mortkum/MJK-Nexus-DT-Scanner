//+------------------------------------------------------------------+
//| PBD_Crypto_Structure_Indicator_v2.mq5                            |
//| "Sniper Edition" — PBD chart overlay v2:                         |
//|   * Highly visible balance box (filled structure box + POC)      |
//|   * Entry zone, SL, TP1/TP2/TP3 as bold labelled price lines     |
//|   * Confluence-scored, RR-filtered, deduplicated signals         |
//|   * Sniper edge-limit entries (or market close)                  |
//|   * On-chart decision dashboard: confluence checklist, RR,       |
//|     lot size, box stats, pressure/POC, live trade status         |
//|   * Alerts on new setup and on entry/TP/SL state changes         |
//|                                                                   |
//| Not a true bid/ask footprint: pressure and POC are tick-volume    |
//| approximations (see PBD_v2_IMPROVEMENTS.md).                     |
//+------------------------------------------------------------------+
#property strict
#property version   "2.00"
#property description "PBD v2 Sniper: 3-touch balance boxes + reclaim / breakout / range signals,"
#property description "confluence-scored and RR-filtered, with a visible structure box, entry zone,"
#property description "SL and TP1-3 levels plus a decision dashboard with confluence checklist."
#property indicator_chart_window
#property indicator_buffers 8
#property indicator_plots   8

#property indicator_label1  "PBD Range High"
#property indicator_type1   DRAW_LINE
#property indicator_color1  clrTomato
#property indicator_style1  STYLE_DASH
#property indicator_width1  1
#property indicator_label2  "PBD Range Low"
#property indicator_type2   DRAW_LINE
#property indicator_color2  clrDeepSkyBlue
#property indicator_style2  STYLE_DASH
#property indicator_width2  1
#property indicator_label3  "Range Long"
#property indicator_type3   DRAW_ARROW
#property indicator_color3  clrLimeGreen
#property indicator_width3  2
#property indicator_label4  "Range Short"
#property indicator_type4   DRAW_ARROW
#property indicator_color4  clrOrangeRed
#property indicator_width4  2
#property indicator_label5  "Reclaim Long"
#property indicator_type5   DRAW_ARROW
#property indicator_color5  clrAqua
#property indicator_width5  3
#property indicator_label6  "Reclaim Short"
#property indicator_type6   DRAW_ARROW
#property indicator_color6  clrMagenta
#property indicator_width6  3
#property indicator_label7  "Breakout Long"
#property indicator_type7   DRAW_ARROW
#property indicator_color7  clrDodgerBlue
#property indicator_width7  3
#property indicator_label8  "Breakout Short"
#property indicator_type8   DRAW_ARROW
#property indicator_color8  clrGold
#property indicator_width8  3

//+------------------------------------------------------------------+
//| Entry modes                                                        |
//+------------------------------------------------------------------+
enum ENUM_ENTRY_MODE
  {
   ENTRY_MODE_CLOSE      = 0,   // Signal-bar close (market order)
   ENTRY_MODE_EDGE_LIMIT = 1    // Sniper: limit order at structural edge
  };

//+------------------------------------------------------------------+
//| Inputs                                                             |
//+------------------------------------------------------------------+
input group "══════ Box / Structure ══════"
input int    InpRangeLookback        = 64;    // Prior closed bars defining balance
input int    InpATRPeriod            = 14;    // ATR period
input double InpTouchATR             = 0.20;  // Range-edge tolerance (ATR)
input int    InpMinimumTouches       = 3;     // Minimum separated edge touches
input int    InpTouchSeparationBars  = 3;     // Min bars between two touches
input double InpMinBoxWidthATR       = 0.60;  // Min box width (ATR multiples)
input double InpMaxBoxWidthATR       = 4.00;  // Max box width (ATR multiples)

input group "══════ Signals ══════"
input bool   InpShowRangeSignals     = true;  // Range (edge-fade) signals
input bool   InpShowReclaimSignals   = true;  // Reclaim (failed-breakout) signals
input bool   InpShowBreakoutSignals  = true;  // Confirmed breakout signals
input bool   InpAllowShorts          = true;  // Allow short setups
input int    InpMinimumConfluence    = 3;     // Min confluence score 1-5
input double InpMinRR                = 1.5;   // Min reward:risk at TP2 to accept
input int    InpMinBarsBetweenSignals= 5;     // Dedupe: min bars between signals
input int    InpSignalMaxAgeBars     = 40;    // Expire displayed setup after N bars
input double InpImpulseATRMultiple   = 1.5;   // Prior impulse threshold (ATR)
input bool   InpUseH4Confluence      = true;  // +1 when H4 close agrees with EMA
input int    InpH4EMAPeriod          = 50;    // H4 EMA period
input int    InpRSIPeriod            = 14;    // RSI period (reclaim divergence)
input double InpVolumeExpansionMult  = 1.20;  // Trigger volume > mult x SMA20 volume
input double InpMinBodyRatio         = 0.35;  // Min body/range ratio (range & breakout)
input bool   InpSessionFilter        = false; // Restrict signals to session hours
input int    InpSessionStartHour     = 2;     // Session start hour (server time)
input int    InpSessionEndHour       = 21;    // Session end hour (server time)

input group "══════ Entry / Risk ══════"
input ENUM_ENTRY_MODE InpEntryMode   = ENTRY_MODE_EDGE_LIMIT; // Entry style
input double InpEdgeEntryOffsetATR   = 0.10;  // Limit-entry offset beyond edge (ATR)
input double InpRiskBufferATR        = 0.20;  // SL safety buffer beyond structure (ATR)
input double InpTP1R                 = 1.0;   // TP1 distance in R multiples
input double InpRiskPercent          = 1.0;   // Risk % of balance (lot-size estimate)
input bool   InpShowLotSize          = true;  // Show estimated lot size on dashboard

input group "══════ Visuals ══════"
input bool   InpShowBox              = true;  // Draw structure box
input color  InpBoxFillColor         = C'20,26,40'; // Box fill color
input color  InpBoxBorderColor       = clrDodgerBlue; // Box border color
input bool   InpShowTradeLevels      = true;  // Draw Entry/SL/TP1-3 levels
input bool   InpShowPriceTags        = true;  // Draw price + RR tags at the right
input bool   InpShowEntryZone        = true;  // Draw entry zone shading
input bool   InpShowPOC              = true;  // Draw box POC line (volume approx)
input bool   InpShowDashboard        = true;  // Draw on-chart dashboard panel
input ENUM_BASE_CORNER InpPanelCorner= CORNER_RIGHT_UPPER; // Dashboard corner
input bool   InpEnableChartShift     = true;  // Enable chart shift for price tags
input int    InpRightPadBars         = 4;     // Bars of right padding for tags
input int    InpArrowOffsetPoints    = 30;    // Arrow offset (points)
input bool   InpShowInfoComment      = false; // Also show legacy Comment() text

input group "══════ Alerts ══════"
input bool   InpAlertOnSignal        = true;  // Alert when a new setup appears
input bool   InpAlertOnStateChange   = true;  // Alert on entry/TP/SL status changes
input bool   InpAlertSound           = true;  // Play sound with alerts
input bool   InpAlertPush            = false; // Send push notification

//+------------------------------------------------------------------+
//| Buffers                                                            |
//+------------------------------------------------------------------+
double RangeHighBuffer[], RangeLowBuffer[];
double RangeLongBuffer[], RangeShortBuffer[];
double ReclaimLongBuffer[], ReclaimShortBuffer[];
double BreakoutLongBuffer[], BreakoutShortBuffer[];

//+------------------------------------------------------------------+
//| Setup record                                                       |
//+------------------------------------------------------------------+
struct SetupInfo
  {
   double   entry, sl, tp1, tp2, tp3;
   double   boxHigh, boxLow, boxWidth, atr, poc;
   double   impulseSize, impulseOrigin, risk, rr1, rr2, rr3;
   double   bodyRatio, edgeOffset;
   int      side, score, touches, highTouches, lowTouches, impulseDir;
   bool     fBox, fImpulse, fH4, fVol, fQuality;
   string   setup;
   datetime signalTime, boxStartTime;
  };

//+------------------------------------------------------------------+
//| Globals                                                            |
//+------------------------------------------------------------------+
#define PREFIX        "PBD_V2_"
#define PANEL_PREFIX  "PBD_V2_PANEL_"
#define SCORE_MAX     5

int      h4EmaHandle   = INVALID_HANDLE;
int      hRsiHandle    = INVALID_HANDLE;
datetime g_lastBarTime = 0;

// persistent scan state (breakout state machine + tracking)
int      g_breakoutStage = 0, g_breakoutDirection = 0, g_barsAfterBreak = 0;
double   g_breakoutEdge = 0, g_breakoutExtreme = 0, g_breakoutTol = 0, g_breakoutWidth = 0;
datetime g_lastAcceptedSignalTime = 0;

// latest accepted setup + preview box
SetupInfo g_setup;
bool      g_hasSetup = false;
int       g_newestValid = -1;
double    g_newestHigh = 0, g_newestLow = 0, g_newestATR = 0, g_newestPOC = 0;
int       g_newestTouches = 0;
datetime  g_newestBoxStartTime = 0;

// status / alerts / object lifecycle
string   g_prevStatus = "";
bool     g_statusInit = false;
datetime g_alertedSignalTime = 0;
string   g_lastAlertKey = "";
uint     g_lastRedrawTick = 0;
bool     g_levelsDrawn = false;
bool     g_boxDrawn = false;

//+------------------------------------------------------------------+
//| Small helpers                                                      |
//+------------------------------------------------------------------+
string Mark(const bool b)
  {
   if(b) return "[v]";
   return "[x]";
  }

datetime timeTag()
  {
   return iTime(_Symbol, _Period, 0) + (datetime)(PeriodSeconds() * MathMax(1, InpRightPadBars));
  }

//+------------------------------------------------------------------+
//| ATR from closed candles                                            |
//+------------------------------------------------------------------+
double ATRAt(const int shift,const int rates_total,const double &high[],const double &low[],const double &close[])
  {
   int count = (int)MathMin(InpATRPeriod, rates_total - shift - 1);
   if(count < 1) return 0.0;
   double sum = 0.0;
   for(int k = shift; k < shift + count; k++)
     {
      double prev = close[k + 1];
      double tr = MathMax(high[k] - low[k], MathMax(MathAbs(high[k] - prev), MathAbs(low[k] - prev)));
      sum += tr;
     }
   return sum / count;
  }

//+------------------------------------------------------------------+
//| Average tick volume of closed bars                                 |
//+------------------------------------------------------------------+
double VolSMA(const int shift,const int period,const int rates_total,const long &tick_volume[])
  {
   int count = (int)MathMin(period, rates_total - shift - 1);
   if(count < 1) return 0.0;
   double sum = 0.0;
   for(int k = shift + 1; k <= shift + count; k++)
      sum += (double)tick_volume[k];
   return sum / count;
  }

//+------------------------------------------------------------------+
//| Validate a balance box anchored at 'shift'                         |
//+------------------------------------------------------------------+
bool GetBox(const int shift,const int rates_total,const double &high[],const double &low[],const double &close[],
            double &boxHigh,double &boxLow,double &atrValue,int &touchCount,int &highTouches,int &lowTouches)
  {
   touchCount = 0; highTouches = 0; lowTouches = 0;
   if(shift + InpRangeLookback + 1 >= rates_total) return false;
   boxHigh = -DBL_MAX; boxLow = DBL_MAX;
   for(int j = shift + 1; j <= shift + InpRangeLookback; j++)
     {
      boxHigh = MathMax(boxHigh, high[j]);
      boxLow  = MathMin(boxLow,  low[j]);
     }
   if(boxHigh <= boxLow) return false;
   atrValue = ATRAt(shift + 1, rates_total, high, low, close);
   if(atrValue <= 0) return false;

   // Width must express real balance: not a micro box, not a runaway trend leg.
   double width = boxHigh - boxLow;
   if(width < InpMinBoxWidthATR * atrValue) return false;
   if(width > InpMaxBoxWidthATR * atrValue) return false;

   double tol = InpTouchATR * atrValue;
   int lastTouch = 1000000;
   int hT = 0, lT = 0;
   for(int j = shift + InpRangeLookback; j >= shift + 1; j--)
     {
      bool atHigh = (high[j] >= boxHigh - tol);
      bool atLow  = (low[j]  <= boxLow  + tol);
      if((atHigh || atLow) && (lastTouch - j) >= InpTouchSeparationBars)
        {
         touchCount++;
         if(atHigh) hT++;
         if(atLow)  lT++;
         lastTouch = j;
        }
     }
   highTouches = hT; lowTouches = lT;
   // A true balance box is tested on BOTH edges.
   if(touchCount < InpMinimumTouches) return false;
   if(hT < 1 || lT < 1) return false;
   return true;
  }

//+------------------------------------------------------------------+
//| Prior impulse before the box: +1 up, -1 down, 0 absent            |
//+------------------------------------------------------------------+
int PriorImpulse(const int shift,const int rates_total,const double &high[],const double &low[],const double &close[],
                 const double atrValue,double &impulseSize,double &origin)
  {
   impulseSize = 0.0; origin = 0.0;
   int near = shift + InpRangeLookback + 1;
   int far  = shift + 2 * InpRangeLookback;
   if(far + 1 >= rates_total) return 0;
   double delta = close[near] - close[far];
   impulseSize = MathAbs(delta);
   if(impulseSize < InpImpulseATRMultiple * atrValue) return 0;
   if(delta > 0)
     {
      origin = DBL_MAX;
      for(int j = near; j <= far; j++) origin = MathMin(origin, low[j]);
      return 1;
     }
   origin = -DBL_MAX;
   for(int j = near; j <= far; j++) origin = MathMax(origin, high[j]);
   return -1;
  }

//+------------------------------------------------------------------+
//| H4 trend agreement via EMA                                         |
//+------------------------------------------------------------------+
bool H4TrendAgrees(const datetime t,const int side)
  {
   if(!InpUseH4Confluence) return false;
   if(h4EmaHandle == INVALID_HANDLE) return false;
   int shift = iBarShift(_Symbol, PERIOD_H4, t, false);
   if(shift < 0) return false;
   double ema[1];
   if(CopyBuffer(h4EmaHandle, 0, shift, 1, ema) != 1) return false;
   double c = iClose(_Symbol, PERIOD_H4, shift);
   if(c <= 0 || ema[0] <= 0) return false;
   return (side > 0 ? c > ema[0] : c < ema[0]);
  }

//+------------------------------------------------------------------+
//| RSI divergence at the reclaim sweep bar                            |
//+------------------------------------------------------------------+
bool DivergenceOK(const int i,const int side,const int rates_total,const double &high[],const double &low[])
  {
   if(hRsiHandle == INVALID_HANDLE) return false;
   int sweep = i + 1;                       // bar that broke the box edge
   if(sweep + 2 >= rates_total) return false;
   int look = (int)MathMin(InpRangeLookback / 2, rates_total - sweep - 2);
   if(look < 3) return false;
   int p = sweep + 2;                       // prior key swing inside the box
   for(int k = sweep + 2; k <= sweep + look; k++)
     {
      if(side > 0 ? low[k] < low[p] : high[k] > high[p]) p = k;
     }
   // Sweep must actually exceed the prior swing (liquidity grab).
   if(side > 0 && !(low[sweep] < low[p])) return false;
   if(side < 0 && !(high[sweep] > high[p])) return false;
   double r1[1], r2[1];
   if(CopyBuffer(hRsiHandle, 0, sweep, 1, r1) != 1) return false;
   if(CopyBuffer(hRsiHandle, 0, p, 1, r2) != 1) return false;
   // Bullish divergence: lower low in price, higher low in RSI (and vice versa).
   return (side > 0 ? r1[0] > r2[0] : r1[0] < r2[0]);
  }

//+------------------------------------------------------------------+
//| Body / range ratio of the trigger bar                              |
//+------------------------------------------------------------------+
double BodyRatio(const int i,const double &open[],const double &high[],const double &low[],const double &close[])
  {
   double rng = high[i] - low[i];
   if(rng <= 0) return 0.0;
   return MathAbs(close[i] - open[i]) / rng;
  }

//+------------------------------------------------------------------+
//| Session gate (server time)                                         |
//+------------------------------------------------------------------+
bool SessionOK(const datetime t)
  {
   if(!InpSessionFilter) return true;
   MqlDateTime dt;
   TimeToStruct(t, dt);
   int sh = InpSessionStartHour, eh = InpSessionEndHour;
   if(sh == eh) return true;
   if(sh < eh)  return (dt.hour >= sh && dt.hour < eh);
   return (dt.hour >= sh || dt.hour < eh);   // window crosses midnight
  }

//+------------------------------------------------------------------+
//| Spread guard: keep the noise floor far below the structural risk   |
//+------------------------------------------------------------------+
bool SpreadOK(const double atrValue)
  {
   double spreadPts = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   double spreadPrice = spreadPts * _Point;
   return (spreadPrice <= 0.10 * atrValue);
  }

//+------------------------------------------------------------------+
//| Lot-size estimate for the current risk %                           |
//+------------------------------------------------------------------+
double CalcLots(const double slDistance)
  {
   if(slDistance <= 0) return 0.0;
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickValue <= 0 || tickSize <= 0) return 0.0;
   double riskMoney = AccountInfoDouble(ACCOUNT_BALANCE) * InpRiskPercent / 100.0;
   double lots = riskMoney / (slDistance / tickSize * tickValue);
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double lmin = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double lmax = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(step > 0) lots = MathFloor(lots / step) * step;
   lots = MathMax(lots, lmin);
   lots = MathMin(lots, lmax);
   return lots;
  }

//+------------------------------------------------------------------+
//| Reset all persistent scan state (full rescan)                      |
//+------------------------------------------------------------------+
void ResetScanState()
  {
   g_breakoutStage = 0; g_breakoutDirection = 0; g_barsAfterBreak = 0;
   g_breakoutEdge = 0; g_breakoutExtreme = 0; g_breakoutTol = 0; g_breakoutWidth = 0;
   g_lastAcceptedSignalTime = 0;
   g_hasSetup = false;
   ZeroMemory(g_setup);
   g_newestValid = -1; g_newestHigh = 0; g_newestLow = 0; g_newestATR = 0; g_newestPOC = 0;
   g_newestTouches = 0; g_newestBoxStartTime = 0;
   g_prevStatus = ""; g_statusInit = false; g_alertedSignalTime = 0; g_lastAlertKey = "";
  }

//+------------------------------------------------------------------+
//| Enforce strict TP ordering                                         |
//+------------------------------------------------------------------+
void EnforceLevels(const int side,const double entry,const double sl,double &tp1,double &tp2,double &tp3)
  {
   double risk = side * (entry - sl);
   if(risk <= 0) risk = MathAbs(entry - sl);
   if(risk <= 0) risk = _Point;
   if(side * (tp1 - entry) <= 0) tp1 = entry + side * risk;
   if(side * (tp2 - tp1) <= 0)    tp2 = tp1 + side * 0.5 * risk;
   if(side * (tp3 - tp2) <= 0)    tp3 = tp2 + side * 0.5 * risk;
  }

//+------------------------------------------------------------------+
//| Volume-weighted POC over a box region                              |
//+------------------------------------------------------------------+
double CalcPOC(const int barFrom,const int barTo,const double boxHigh,const double boxLow,
               const double &high[],const double &low[],const long &tick_volume[])
  {
   if(barFrom < barTo || boxHigh <= boxLow) return (boxHigh + boxLow) / 2.0;
   const int BUCKETS = 12;
   double w[];
   ArrayResize(w, BUCKETS);
   ArrayInitialize(w, 0.0);
   double step = (boxHigh - boxLow) / BUCKETS;
   if(step <= 0) return boxLow;
   for(int j = barFrom; j >= barTo; j--)
     {
      double lo = MathMax(low[j], boxLow);
      double hi = MathMin(high[j], boxHigh);
      if(hi <= lo) continue;
      double barRange = high[j] - low[j];
      if(barRange <= 0) barRange = step;
      double vol = (double)tick_volume[j];
      int b1 = (int)MathFloor((lo - boxLow) / step);
      int b2 = (int)MathFloor((hi - boxLow) / step);
      b1 = (int)MathMax(0, MathMin(BUCKETS - 1, b1));
      b2 = (int)MathMax(0, MathMin(BUCKETS - 1, b2));
      for(int b = b1; b <= b2; b++)
        {
         double ovLo = MathMax(lo, boxLow + b * step);
         double ovHi = MathMin(hi, boxLow + (b + 1) * step);
         double frac = (ovHi > ovLo ? (ovHi - ovLo) / barRange : 0.0);
         w[b] += vol * frac;
        }
     }
   int best = 0;
   for(int b = 1; b < BUCKETS; b++)
      if(w[b] > w[best]) best = b;
   return boxLow + (best + 0.5) * step;
  }

//+------------------------------------------------------------------+
//| Pressure approximation over recent closed bars                     |
//+------------------------------------------------------------------+
void CalcPressure(const int rates_total,const double &open[],const double &high[],
                  const double &low[],const double &close[],const long &tick_volume[],
                  double &pressure,double &buyPct)
  {
   pressure = 0; buyPct = 50;
   int n = (int)MathMin(20, rates_total - 2);
   if(n < 3) return;
   double up = 0, total = 0;
   for(int j = 1; j <= n; j++)
     {
      double rng = high[j] - low[j];
      if(rng <= 0) continue;
      double dir = (close[j] - open[j]) / rng;
      double vol = (double)tick_volume[j];
      pressure += dir * vol;
      total += vol;
      if(dir > 0) up += vol;
     }
   if(total > 0) buyPct = 100.0 * up / total;
  }

//+------------------------------------------------------------------+
//| Object helpers                                                     |
//+------------------------------------------------------------------+
void SetHLine(const string suffix,const double price,const color c,const ENUM_LINE_STYLE style,
              const int width,const string tip)
  {
   string name = PREFIX + suffix;
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_HLINE, 0, 0, price);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, name, OBJPROP_BACK, true);
     }
   ObjectSetDouble(0, name, OBJPROP_PRICE, price);
   ObjectSetInteger(0, name, OBJPROP_COLOR, c);
   ObjectSetInteger(0, name, OBJPROP_STYLE, style);
   ObjectSetInteger(0, name, OBJPROP_WIDTH, width);
   ObjectSetString(0, name, OBJPROP_TOOLTIP, tip + "  " + DoubleToString(price, _Digits));
  }

void PutTag(const string suffix,const double price,const color c,const string text)
  {
   if(!InpShowPriceTags) return;
   string name = PREFIX + "TAG_" + suffix;
   datetime tagTime = timeTag();
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_TEXT, 0, tagTime, price);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, name, OBJPROP_ANCHOR, ANCHOR_LEFT);
      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
      ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
     }
   ObjectSetInteger(0, name, OBJPROP_TIME, tagTime);
   ObjectSetDouble(0, name, OBJPROP_PRICE, price);
   ObjectSetInteger(0, name, OBJPROP_COLOR, c);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
  }

void SetRect(const string name,const datetime t1,const double p1,const datetime t2,const double p2,
             const color c,const bool fill,const int width,const string tip)
  {
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_RECTANGLE, 0, t1, p1, t2, p2);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
     }
   else
     {
      ObjectSetInteger(0, name, OBJPROP_TIME, 0, t1);
      ObjectSetDouble(0, name, OBJPROP_PRICE, 0, p1);
      ObjectSetInteger(0, name, OBJPROP_TIME, 1, t2);
      ObjectSetDouble(0, name, OBJPROP_PRICE, 1, p2);
     }
   ObjectSetInteger(0, name, OBJPROP_COLOR, c);
   ObjectSetInteger(0, name, OBJPROP_FILL, fill);
   ObjectSetInteger(0, name, OBJPROP_BACK, true);
   ObjectSetInteger(0, name, OBJPROP_WIDTH, width);
   ObjectSetString(0, name, OBJPROP_TOOLTIP, tip);
  }

void DeleteLevelObjects()
  {
   string kill[] = {"ENTRY","SL","TP1","TP2","TP3","ENTRY_ZONE","BOX_LABEL",
                    "TAG_ENTRY","TAG_SL","TAG_TP1","TAG_TP2","TAG_TP3"};
   for(int k = 0; k < ArraySize(kill); k++)
      ObjectDelete(0, PREFIX + kill[k]);
   g_levelsDrawn = false;
  }

void DeleteBoxObjects()
  {
   string kill[] = {"BOX_FILL","BOX_BORDER","POC","TAG_POC"};
   for(int k = 0; k < ArraySize(kill); k++)
      ObjectDelete(0, PREFIX + kill[k]);
   g_boxDrawn = false;
  }

void DrawBox(const datetime t1,const datetime t2,const double pHigh,const double pLow,const double poc)
  {
   if(!InpShowBox) return;
   SetRect(PREFIX + "BOX_FILL", t1, pHigh, t2, pLow, InpBoxFillColor, true, 1, "PBD balance box");
   SetRect(PREFIX + "BOX_BORDER", t1, pHigh, t2, pLow, InpBoxBorderColor, false, 2, "PBD balance box borders");
   if(InpShowPOC && poc > 0)
     {
      SetHLine("POC", poc, C'120,120,140', STYLE_DOT, 1, "POC (tick-volume approx)");
      PutTag("POC", poc, C'150,150,170', " POC " + DoubleToString(poc, _Digits));
     }
   g_boxDrawn = true;
  }

void DrawLevels(const SetupInfo &s)
  {
   string modeTag = (InpEntryMode == ENTRY_MODE_EDGE_LIMIT ? "LIMIT" : "CLOSE");
   SetHLine("ENTRY", s.entry, clrWhite, STYLE_SOLID, 2, "ENTRY (" + modeTag + ") | " + s.setup);
   SetHLine("SL", s.sl, clrRed, STYLE_DASH, 3, "STRUCTURAL SL + buffer");
   SetHLine("TP1", s.tp1, clrLimeGreen, STYLE_DASH, 2, "TP1 | 1R partial - move SL to BE");
   SetHLine("TP2", s.tp2, clrDeepSkyBlue, STYLE_DASH, 2, "TP2 | structural target");
   SetHLine("TP3", s.tp3, clrGold, STYLE_DASHDOT, 2, "TP3 | runner / extension");

   PutTag("ENTRY", s.entry, clrWhite,
          " " + modeTag + " " + DoubleToString(s.entry, _Digits));
   PutTag("SL", s.sl, clrRed,
          " SL " + DoubleToString(s.sl, _Digits) + "  (" + DoubleToString(s.risk / s.atr, 2) + " ATR risk)");
   PutTag("TP1", s.tp1, clrLimeGreen,
          " TP1 " + DoubleToString(s.tp1, _Digits) + "  (1:" + DoubleToString(s.rr1, 2) + ")");
   PutTag("TP2", s.tp2, clrDeepSkyBlue,
          " TP2 " + DoubleToString(s.tp2, _Digits) + "  (1:" + DoubleToString(s.rr2, 2) + ")");
   PutTag("TP3", s.tp3, clrGold,
          " TP3 " + DoubleToString(s.tp3, _Digits) + "  (1:" + DoubleToString(s.rr3, 2) + ")");

   // Entry zone shading (create once, update corners)
   if(InpShowEntryZone)
     {
      double half = MathMax(s.edgeOffset, 0.10 * s.risk);
      SetRect(PREFIX + "ENTRY_ZONE", s.signalTime, s.entry + half, timeTag(), s.entry - half,
              (s.side > 0 ? clrDarkGreen : clrDarkRed), true, 1, "Entry zone - place limit here");
     }

   // Box label
   string lbl = PREFIX + "BOX_LABEL";
   double labelPrice = s.boxHigh + 0.15 * s.atr;
   if(ObjectFind(0, lbl) < 0)
     {
      ObjectCreate(0, lbl, OBJ_TEXT, 0, s.boxStartTime, labelPrice);
      ObjectSetInteger(0, lbl, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);
      ObjectSetString(0, lbl, OBJPROP_FONT, "Consolas");
      ObjectSetInteger(0, lbl, OBJPROP_FONTSIZE, 10);
      ObjectSetInteger(0, lbl, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, lbl, OBJPROP_HIDDEN, true);
     }
   ObjectSetInteger(0, lbl, OBJPROP_TIME, s.boxStartTime);
   ObjectSetDouble(0, lbl, OBJPROP_PRICE, labelPrice);
   ObjectSetInteger(0, lbl, OBJPROP_COLOR, (s.side > 0 ? clrLimeGreen : clrOrangeRed));
   ObjectSetString(0, lbl, OBJPROP_TEXT,
                   s.setup + "  " + IntegerToString(s.score) + "/" + IntegerToString(SCORE_MAX) +
                   "  W:" + DoubleToString(s.boxWidth / s.atr, 1) + "ATR  T:" + IntegerToString(s.touches));
   g_levelsDrawn = true;
  }

//+------------------------------------------------------------------+
//| Dashboard panel                                                    |
//+------------------------------------------------------------------+
void PanelDelete()
  {
   ObjectsDeleteAll(0, PANEL_PREFIX);
  }

void PanelEnsure()
  {
   string bg = PANEL_PREFIX + "BG";
   if(ObjectFind(0, bg) >= 0) return;
   ObjectCreate(0, bg, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, bg, OBJPROP_CORNER, InpPanelCorner);
   ObjectSetInteger(0, bg, OBJPROP_XDISTANCE, 10);
   ObjectSetInteger(0, bg, OBJPROP_YDISTANCE, 24);
   ObjectSetInteger(0, bg, OBJPROP_BGCOLOR, C'12,16,26');
   ObjectSetInteger(0, bg, OBJPROP_COLOR, InpBoxBorderColor);
   ObjectSetInteger(0, bg, OBJPROP_WIDTH, 2);
   ObjectSetInteger(0, bg, OBJPROP_BACK, false);
   ObjectSetInteger(0, bg, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, bg, OBJPROP_HIDDEN, true);
  }

void PanelRender(const string &rows[],const color &cols[])
  {
   PanelEnsure();
   int n = ArraySize(rows);
   const int X0 = 22, Y0 = 34, LH = 16, W = 470;
   string bg = PANEL_PREFIX + "BG";
   ObjectSetInteger(0, bg, OBJPROP_XSIZE, W);
   ObjectSetInteger(0, bg, OBJPROP_YSIZE, Y0 - 24 + n * LH + 12);
   for(int r = 0; r < 40; r++)
     {
      string name = PANEL_PREFIX + "R" + IntegerToString(r);
      if(r >= n)
        {
         ObjectDelete(0, name);
         continue;
        }
      if(ObjectFind(0, name) < 0)
        {
         ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
         ObjectSetInteger(0, name, OBJPROP_CORNER, InpPanelCorner);
         ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
         ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
         ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
         ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
        }
      ObjectSetInteger(0, name, OBJPROP_XDISTANCE, X0);
      ObjectSetInteger(0, name, OBJPROP_YDISTANCE, Y0 + r * LH);
      ObjectSetInteger(0, name, OBJPROP_COLOR, cols[r]);
      ObjectSetString(0, name, OBJPROP_TEXT, rows[r]);
     }
  }

//+------------------------------------------------------------------+
//| Live status of the displayed setup                                 |
//+------------------------------------------------------------------+
string ComputeStatus(const SetupInfo &s,const int rates_total,
                     const double &high[],const double &low[],const double &close[],int &barsSince)
  {
   int sigShift = iBarShift(_Symbol, _Period, s.signalTime, false);
   if(sigShift < 0) sigShift = 0;
   barsSince = sigShift;
   if(sigShift > InpSignalMaxAgeBars) return "EXPIRED - awaiting new setup";

   bool hitEntry = false, hitTP1 = false, hitTP2 = false, hitTP3 = false, hitSL = false;
   int top = (int)MathMin(sigShift - 1, 200);
   // chronological scan: oldest first, first decisive event wins
   for(int j = top; j >= 1; j--)
     {
      if(s.side > 0)
        {
         if(close[j] < s.sl)   { hitSL = true; break; }
         if(low[j] <= s.entry)   hitEntry = true;
         if(high[j] >= s.tp3)  { hitTP3 = true; break; }
         if(high[j] >= s.tp2)    hitTP2 = true;
         if(high[j] >= s.tp1)    hitTP1 = true;
        }
      else
        {
         if(close[j] > s.sl)   { hitSL = true; break; }
         if(high[j] >= s.entry)  hitEntry = true;
         if(low[j] <= s.tp3)   { hitTP3 = true; break; }
         if(low[j] <= s.tp2)     hitTP2 = true;
         if(low[j] <= s.tp1)     hitTP1 = true;
        }
     }
   if(hitSL)  return "INVALIDATED - closed beyond SL";
   if(hitTP3) return "TP3 HIT - runner closed, done";
   if(hitTP2) return "TP2 HIT - take most, trail rest";
   if(hitTP1) return "TP1 HIT - move SL to breakeven";
   if(hitEntry) return "IN POSITION - manage per plan";
   return "ARMED - awaiting entry";
  }

//+------------------------------------------------------------------+
//| Fire an alert once per unique event                                |
//+------------------------------------------------------------------+
void FireAlert(const string key,const string text)
  {
   if(g_lastAlertKey == key) return;
   g_lastAlertKey = key;
   if(InpAlertSound) PlaySound("alert.wav");
   Alert(text);
   if(InpAlertPush) SendNotification(text);
  }

//+------------------------------------------------------------------+
//| Dashboard content                                                  |
//+------------------------------------------------------------------+
void RenderDashboard(const SetupInfo &s,const string status,const int barsSince,
                     const double pressure,const double buyPct)
  {
   string rows[];
   color  cols[];
   ArrayResize(rows, 20);
   ArrayResize(cols, 20);
   int n = 0;

   rows[n] = "PBD SNIPER v2  |  " + _Symbol + "  " + EnumToString((ENUM_TIMEFRAMES)_Period) +
             "  |  " + TimeToString(TimeCurrent(), TIME_DATE | TIME_MINUTES);
   cols[n++] = clrWhite;

   rows[n] = "__________________________________________________";
   cols[n++] = C'70,80,100';

   color stC = clrGold;
   if(StringFind(status, "INVALIDATED") >= 0) stC = clrOrangeRed;
   else if(StringFind(status, "TP3") >= 0 || StringFind(status, "TP2") >= 0 || StringFind(status, "TP1") >= 0) stC = clrLimeGreen;
   else if(StringFind(status, "IN POSITION") >= 0) stC = clrAqua;
   rows[n] = "STATUS   " + status;
   cols[n++] = stC;

   string grade = "B";
   if(s.score >= 4 && s.rr2 >= 1.5 * InpMinRR && s.touches >= 4) grade = "A+";
   else if(s.score >= 3) grade = "A";
   rows[n] = "SETUP    " + s.setup + "   Grade " + grade + "   Score " +
             IntegerToString(s.score) + "/" + IntegerToString(SCORE_MAX);
   cols[n++] = (s.side > 0 ? clrLimeGreen : clrOrangeRed);

   rows[n] = "BOX      H " + DoubleToString(s.boxHigh, _Digits) + "  L " + DoubleToString(s.boxLow, _Digits) +
             "  W " + DoubleToString(s.boxWidth / s.atr, 2) + "xATR  touches " + IntegerToString(s.touches) +
             " (" + IntegerToString(s.highTouches) + "H/" + IntegerToString(s.lowTouches) + "L)";
   cols[n++] = C'170,180,200';

   string modeTag = (InpEntryMode == ENTRY_MODE_EDGE_LIMIT ? "LIMIT at edge" : "market close");
   rows[n] = "ENTRY    " + DoubleToString(s.entry, _Digits) + "   (" + modeTag + ")";
   cols[n++] = clrWhite;

   rows[n] = "SL       " + DoubleToString(s.sl, _Digits) + "   risk " +
             DoubleToString(s.side * (s.entry - s.sl) / _Point, 0) + " pts (" +
             DoubleToString(s.risk / s.atr, 2) + " ATR)";
   cols[n++] = clrRed;

   rows[n] = "TP1      " + DoubleToString(s.tp1, _Digits) + "   +" +
             DoubleToString(s.side * (s.tp1 - s.entry) / _Point, 0) + " pts   1:" + DoubleToString(s.rr1, 2) +
             "   -> move SL to BE";
   cols[n++] = clrLimeGreen;

   rows[n] = "TP2      " + DoubleToString(s.tp2, _Digits) + "   +" +
             DoubleToString(s.side * (s.tp2 - s.entry) / _Point, 0) + " pts   1:" + DoubleToString(s.rr2, 2) +
             "   -> structural";
   cols[n++] = clrDeepSkyBlue;

   rows[n] = "TP3      " + DoubleToString(s.tp3, _Digits) + "   +" +
             DoubleToString(s.side * (s.tp3 - s.entry) / _Point, 0) + " pts   1:" + DoubleToString(s.rr3, 2) +
             "   -> runner";
   cols[n++] = clrGold;

   if(InpShowLotSize)
     {
      double lots = CalcLots(s.risk);
      double riskMoney = AccountInfoDouble(ACCOUNT_BALANCE) * InpRiskPercent / 100.0;
      rows[n] = "RISK     " + DoubleToString(InpRiskPercent, 2) + "% = " +
                DoubleToString(riskMoney, 2) + " " + AccountInfoString(ACCOUNT_CURRENCY) +
                "   ->  " + DoubleToString(lots, 2) + " lots";
      cols[n++] = C'200,200,120';
     }

   rows[n] = "CONFL   " + Mark(s.fBox) + "box  " + Mark(s.fImpulse) + "impulse  " +
             Mark(s.fH4) + "H4  " + Mark(s.fVol) + "volume  " +
             Mark(s.fQuality) + (StringFind(s.setup, "RECLAIM") == 0 ? "RSIdiv" : "body");
   cols[n++] = C'170,180,200';

   string pSign = "";
   if(pressure >= 0) pSign = "+";
   rows[n] = "PRESSURE " + pSign + DoubleToString(pressure, 0) +
             " (" + DoubleToString(buyPct, 0) + "% buy)   POC " + DoubleToString(s.poc, _Digits);
   cols[n++] = (pressure >= 0 ? clrLimeGreen : clrOrangeRed);

   rows[n] = "TRADE    age " + IntegerToString(barsSince) + " bars   expires in " +
             IntegerToString(MathMax(0, InpSignalMaxAgeBars - barsSince)) +
             "   spread " + IntegerToString((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD)) + " pts";
   cols[n++] = C'150,150,170';

   rows[n] = "PLAN     TP1 partial + SL->BE  |  TP2 close most  |  TP3 trail remainder";
   cols[n++] = C'120,130,150';

   rows[n] = "confluence: box=3-touch balance, impulse=pre-box leg, H4=EMA trend,";
   cols[n++] = C'80,90,110';
   rows[n] = "volume=trigger expansion, quality=RSI div (reclaim) / body ratio";
   cols[n++] = C'80,90,110';

   ArrayResize(rows, n);
   ArrayResize(cols, n);
   PanelRender(rows, cols);
  }

void RenderDashboardEmpty(const string headline)
  {
   string rows[];
   color  cols[];
   ArrayResize(rows, 8);
   ArrayResize(cols, 8);
   rows[0] = "PBD SNIPER v2  |  " + _Symbol + "  " + EnumToString((ENUM_TIMEFRAMES)_Period) +
             "  |  " + TimeToString(TimeCurrent(), TIME_DATE | TIME_MINUTES);
   cols[0] = clrWhite;
   rows[1] = "__________________________________________________";
   cols[1] = C'70,80,100';
   rows[2] = "STATUS   " + headline;
   cols[2] = clrGold;
   rows[3] = "No qualifying setup. Requirements:";
   cols[3] = C'170,180,200';
   rows[4] = " - 3-touch balanced box on both edges (width " +
             DoubleToString(InpMinBoxWidthATR, 1) + "-" + DoubleToString(InpMaxBoxWidthATR, 1) + " ATR)";
   cols[4] = C'120,130,150';
   rows[5] = " - confluence score >= " + IntegerToString(InpMinimumConfluence) + "/" + IntegerToString(SCORE_MAX) +
             "  and  RR at TP2 >= 1:" + DoubleToString(InpMinRR, 2);
   cols[5] = C'120,130,150';
   rows[6] = " - session, spread and dedupe filters passed";
   cols[6] = C'120,130,150';
   rows[7] = "Watch the box: a sweep into an edge + reclaim close is the sniper trigger.";
   cols[7] = C'150,150,170';
   PanelRender(rows, cols);
  }

//+------------------------------------------------------------------+
//| Custom indicator initialization                                    |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(InpRangeLookback < 8 || InpATRPeriod < 2 || InpMinimumTouches < 3 || InpTouchSeparationBars < 1 ||
      InpMinimumConfluence < 1 || InpMinimumConfluence > SCORE_MAX || InpH4EMAPeriod < 2 ||
      InpRSIPeriod < 2 || InpMinBoxWidthATR <= 0 || InpMaxBoxWidthATR <= InpMinBoxWidthATR ||
      InpMinRR <= 0 || InpSignalMaxAgeBars < 1 || InpMinBarsBetweenSignals < 1 ||
      InpRiskPercent <= 0 || InpTP1R <= 0 || InpEdgeEntryOffsetATR < 0 || InpRiskBufferATR < 0)
      return INIT_PARAMETERS_INCORRECT;

   SetIndexBuffer(0, RangeHighBuffer, INDICATOR_DATA);
   SetIndexBuffer(1, RangeLowBuffer, INDICATOR_DATA);
   SetIndexBuffer(2, RangeLongBuffer, INDICATOR_DATA);
   SetIndexBuffer(3, RangeShortBuffer, INDICATOR_DATA);
   SetIndexBuffer(4, ReclaimLongBuffer, INDICATOR_DATA);
   SetIndexBuffer(5, ReclaimShortBuffer, INDICATOR_DATA);
   SetIndexBuffer(6, BreakoutLongBuffer, INDICATOR_DATA);
   SetIndexBuffer(7, BreakoutShortBuffer, INDICATOR_DATA);
   ArraySetAsSeries(RangeHighBuffer, true);
   ArraySetAsSeries(RangeLowBuffer, true);
   ArraySetAsSeries(RangeLongBuffer, true);
   ArraySetAsSeries(RangeShortBuffer, true);
   ArraySetAsSeries(ReclaimLongBuffer, true);
   ArraySetAsSeries(ReclaimShortBuffer, true);
   ArraySetAsSeries(BreakoutLongBuffer, true);
   ArraySetAsSeries(BreakoutShortBuffer, true);
   for(int p = 0; p < 8; p++)
      PlotIndexSetDouble(p, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetInteger(2, PLOT_ARROW, 233);
   PlotIndexSetInteger(3, PLOT_ARROW, 234);
   PlotIndexSetInteger(4, PLOT_ARROW, 233);
   PlotIndexSetInteger(5, PLOT_ARROW, 234);
   PlotIndexSetInteger(6, PLOT_ARROW, 241);
   PlotIndexSetInteger(7, PLOT_ARROW, 242);

   if(InpUseH4Confluence)
      h4EmaHandle = iMA(_Symbol, PERIOD_H4, InpH4EMAPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(InpUseH4Confluence && h4EmaHandle == INVALID_HANDLE)
      return INIT_FAILED;
   hRsiHandle = iRSI(_Symbol, _Period, InpRSIPeriod, PRICE_CLOSE);
   if(hRsiHandle == INVALID_HANDLE)
      return INIT_FAILED;

   if(InpEnableChartShift && InpShowPriceTags)
     {
      // Explicit enum casts + long arguments: some MetaEditor builds treat
      // CHART_SHIFT / CHART_SHIFT_SIZE as ambiguous enum constants, which
      // breaks ChartSetInteger overload resolution ("cannot convert enum",
      // "wrong parameters count") unless cast explicitly.
      ChartSetInteger(ChartID(), (ENUM_CHART_PROPERTY_INTEGER)CHART_SHIFT, (long)1);
      ChartSetInteger(ChartID(), (ENUM_CHART_PROPERTY_INTEGER)CHART_SHIFT_SIZE, (long)MathMax(5, InpRightPadBars * 2));
     }

   IndicatorSetString(INDICATOR_SHORTNAME, "PBD Sniper v2 (" + IntegerToString(InpMinimumConfluence) + "/" +
                      IntegerToString(SCORE_MAX) + " min)");
   ResetScanState();
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| Custom indicator deinitialization                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   ObjectsDeleteAll(0, PREFIX);
   PanelDelete();
   Comment("");
   if(h4EmaHandle != INVALID_HANDLE) IndicatorRelease(h4EmaHandle);
   if(hRsiHandle != INVALID_HANDLE)  IndicatorRelease(hRsiHandle);
   ChartRedraw(0);
  }

//+------------------------------------------------------------------+
//| Main calculation                                                   |
//+------------------------------------------------------------------+
int OnCalculate(const int rates_total,const int prev_calculated,const datetime &time[],
                const double &open[],const double &high[],const double &low[],const double &close[],
                const long &tick_volume[],const long &volume[],const int &spread[])
  {
   if(rates_total < InpRangeLookback + InpATRPeriod + 5) return 0;
   ArraySetAsSeries(time, true);
   ArraySetAsSeries(open, true);
   ArraySetAsSeries(high, true);
   ArraySetAsSeries(low, true);
   ArraySetAsSeries(close, true);
   ArraySetAsSeries(tick_volume, true);

   bool fullRescan = (prev_calculated == 0);
   bool backfill   = (prev_calculated > 0 && rates_total - prev_calculated > 20);
   bool needScan   = (fullRescan || backfill || time[0] != g_lastBarTime);

   if(fullRescan || backfill)
     {
      ResetScanState();
      for(int i = rates_total - 1; i >= 0; i--)
        {
         RangeHighBuffer[i] = EMPTY_VALUE; RangeLowBuffer[i] = EMPTY_VALUE;
         RangeLongBuffer[i] = EMPTY_VALUE; RangeShortBuffer[i] = EMPTY_VALUE;
         ReclaimLongBuffer[i] = EMPTY_VALUE; ReclaimShortBuffer[i] = EMPTY_VALUE;
         BreakoutLongBuffer[i] = EMPTY_VALUE; BreakoutShortBuffer[i] = EMPTY_VALUE;
        }
     }

   if(needScan)
     {
      g_lastBarTime = time[0];
      int start;
      if(fullRescan || backfill)
         start = rates_total - InpRangeLookback - 2;
      else
         start = rates_total - prev_calculated;      // newly closed bars only
      start = (int)MathMin(start, rates_total - InpRangeLookback - 2);
      if(start < 1 && !fullRescan && !backfill) start = 1;
      double arrowOffset = InpArrowOffsetPoints * _Point;

      for(int i = start; i >= 1; i--)
        {
         // new bar slots are not guaranteed EMPTY_VALUE-initialized
         RangeHighBuffer[i] = EMPTY_VALUE;
         RangeLowBuffer[i]  = EMPTY_VALUE;
         RangeLongBuffer[i] = EMPTY_VALUE;
         RangeShortBuffer[i] = EMPTY_VALUE;
         ReclaimLongBuffer[i] = EMPTY_VALUE;
         ReclaimShortBuffer[i] = EMPTY_VALUE;
         BreakoutLongBuffer[i] = EMPTY_VALUE;
         BreakoutShortBuffer[i] = EMPTY_VALUE;

         double rh, rl, a;
         int touches, hT, lT;
         bool valid = GetBox(i, rates_total, high, low, close, rh, rl, a, touches, hT, lT);
         if(valid)
           {
            RangeHighBuffer[i] = rh;
            RangeLowBuffer[i]  = rl;
            g_newestValid = i;
            g_newestHigh = rh; g_newestLow = rl; g_newestATR = a;
            g_newestTouches = touches;
            g_newestBoxStartTime = time[i + InpRangeLookback];
            g_newestPOC = CalcPOC(i + InpRangeLookback, i + 1, rh, rl, high, low, tick_volume);
           }

         // --- breakout state machine (independent of this bar's own box) ---
         int stageAtStart = g_breakoutStage;
         if(InpShowBreakoutSignals && stageAtStart > 0)
           {
            g_barsAfterBreak++;
            if(g_barsAfterBreak > 8 || g_breakoutDirection * (close[i] - g_breakoutEdge) < -2.0 * g_breakoutTol)
              {
               g_breakoutStage = 0;
               stageAtStart = 0;
              }
           }
         if(InpShowBreakoutSignals && stageAtStart == 1)
           {
            bool retested = (g_breakoutDirection > 0 ? low[i] <= g_breakoutEdge + g_breakoutTol
                                                     : high[i] >= g_breakoutEdge - g_breakoutTol);
            if(retested) g_breakoutStage = 2;
           }

         if(!valid) continue;   // signal checks need a validated box at this bar

         double tol = InpTouchATR * a;
         double width = rh - rl;
         int signalSide = 0;
         string setup = "";
         double structSL = 0;
         bool isSignal = false;

         // Reclaim: failed break of an edge, close back inside the box.
         if(InpShowReclaimSignals && i + 1 < rates_total)
           {
            if(low[i + 1] < rl - tol && close[i] > rl && close[i] < rh)
              {
               signalSide = 1;
               setup = "RECLAIM LONG";
               structSL = MathMin(low[i + 1], low[i]) - tol;
               isSignal = true;
              }
            else if(InpAllowShorts && high[i + 1] > rh + tol && close[i] < rh && close[i] > rl)
              {
               signalSide = -1;
               setup = "RECLAIM SHORT";
               structSL = MathMax(high[i + 1], high[i]) + tol;
               isSignal = true;
              }
           }

         // Confirmed breakout continuation (only if stage 2 was already reached
         // on a previous bar: retest and continuation must be separate bars).
         if(!isSignal && InpShowBreakoutSignals && stageAtStart == 2)
           {
            bool continuation = (g_breakoutDirection > 0 ? close[i] > g_breakoutExtreme
                                                         : close[i] < g_breakoutExtreme);
            if(continuation && (g_breakoutDirection > 0 || InpAllowShorts))
              {
               signalSide = g_breakoutDirection;
               setup = (signalSide > 0 ? "BREAKOUT LONG" : "BREAKOUT SHORT");
               structSL = (signalSide > 0 ? MathMin(low[i], g_breakoutEdge - g_breakoutTol)
                                          : MathMax(high[i], g_breakoutEdge + g_breakoutTol));
               isSignal = true;
               g_breakoutStage = 0;
              }
           }

         // Arm a fresh breakout.
         if(!isSignal && InpShowBreakoutSignals && g_breakoutStage == 0)
           {
            if(close[i] > rh + tol)
              {
               g_breakoutStage = 1; g_breakoutDirection = 1;
               g_breakoutEdge = rh; g_breakoutExtreme = high[i];
               g_breakoutTol = tol; g_breakoutWidth = width; g_barsAfterBreak = 0;
              }
            else if(InpAllowShorts && close[i] < rl - tol)
              {
               g_breakoutStage = 1; g_breakoutDirection = -1;
               g_breakoutEdge = rl; g_breakoutExtreme = low[i];
               g_breakoutTol = tol; g_breakoutWidth = width; g_barsAfterBreak = 0;
              }
           }

         // Range edge fades (close must finish back inside the box).
         if(!isSignal && InpShowRangeSignals)
           {
            if(low[i] <= rl + tol && close[i] > rl && close[i] < rh)
              {
               signalSide = 1;
               setup = "RANGE LONG";
               structSL = rl - tol;
               isSignal = true;
              }
            else if(InpAllowShorts && high[i] >= rh - tol && close[i] < rh && close[i] > rl)
              {
               signalSide = -1;
               setup = "RANGE SHORT";
               structSL = rh + tol;
               isSignal = true;
              }
           }

         if(!isSignal) continue;
         if(!SessionOK(time[i])) continue;
         if(!SpreadOK(a)) continue;

         // --- confluence score (1..5) ---
         SetupInfo s;
         ZeroMemory(s);
         s.fBox = true;
         s.impulseDir = PriorImpulse(i, rates_total, high, low, close, a, s.impulseSize, s.impulseOrigin);
         s.fImpulse = (s.impulseDir == signalSide);
         s.fH4 = H4TrendAgrees(time[i], signalSide);
         double triggerVol = (double)tick_volume[i];
         double avgVol = VolSMA(i, 20, rates_total, tick_volume);
         s.fVol = (avgVol > 0 && triggerVol > avgVol * InpVolumeExpansionMult);
         s.bodyRatio = BodyRatio(i, open, high, low, close);
         if(StringFind(setup, "RECLAIM") == 0)
            s.fQuality = DivergenceOK(i, signalSide, rates_total, high, low);
         else
            s.fQuality = (s.bodyRatio >= InpMinBodyRatio);
         s.score = 1 + (s.fImpulse ? 1 : 0) + (s.fH4 ? 1 : 0) + (s.fVol ? 1 : 0) + (s.fQuality ? 1 : 0);
         if(s.score < InpMinimumConfluence) continue;

         // --- entry / stop / targets ---
         double edgeOff = InpEdgeEntryOffsetATR * a;
         double entry;
         if(InpEntryMode == ENTRY_MODE_EDGE_LIMIT)
           {
            if(StringFind(setup, "BREAKOUT") == 0)
               entry = g_breakoutEdge + signalSide * edgeOff;
            else
               entry = (signalSide > 0 ? rl + edgeOff : rh - edgeOff);
           }
         else
            entry = close[i];

         double riskBuffer = InpRiskBufferATR * a;
         double sl = (signalSide > 0 ? structSL - riskBuffer : structSL + riskBuffer);
         if(signalSide * (entry - sl) <= 0) continue;
         double risk = signalSide * (entry - sl);
         if(risk < 0.10 * a) continue;                  // degenerate stop

         double farEdge = (signalSide > 0 ? rh : rl);
         if(signalSide * (farEdge - entry) <= 0) farEdge = entry + signalSide * width;

         double tp1 = entry + signalSide * InpTP1R * risk;
         double tp2, tp3;
         if(StringFind(setup, "RANGE") == 0)
           {
            tp2 = farEdge;                              // opposite box edge
            tp3 = farEdge + signalSide * 0.5 * width;   // momentum runner
           }
         else if(StringFind(setup, "RECLAIM") == 0)
           {
            tp2 = farEdge;                              // opposite box edge
            tp3 = (signalSide * (s.impulseOrigin - tp2) > 0 ? s.impulseOrigin
                                                            : farEdge + signalSide * width);
           }
         else
           {
            tp2 = entry + signalSide * width;           // measured move
            tp3 = entry + signalSide * 2.0 * width;
            if(signalSide * (s.impulseOrigin - tp3) > 0) tp3 = s.impulseOrigin;
           }
         EnforceLevels(signalSide, entry, sl, tp1, tp2, tp3);

         double rr2 = (tp2 - entry) / risk;
         if(signalSide * (tp2 - entry) <= 0 || rr2 < InpMinRR) continue;   // RR quality gate

         // --- dedupe ---
         if(g_lastAcceptedSignalTime > 0 &&
            time[i] < g_lastAcceptedSignalTime + InpMinBarsBetweenSignals * PeriodSeconds())
            continue;

         // --- accept ---
         s.entry = entry; s.sl = sl; s.tp1 = tp1; s.tp2 = tp2; s.tp3 = tp3;
         s.boxHigh = rh; s.boxLow = rl; s.boxWidth = width; s.atr = a;
         s.poc = CalcPOC(i + InpRangeLookback, i + 1, rh, rl, high, low, tick_volume);
         s.risk = risk;
         s.rr1 = (tp1 - entry) / risk;
         s.rr2 = rr2;
         s.rr3 = (tp3 - entry) / risk;
         s.side = signalSide;
         s.touches = touches; s.highTouches = hT; s.lowTouches = lT;
         s.setup = setup;
         s.signalTime = time[i];
         s.boxStartTime = time[i + InpRangeLookback];
         s.edgeOffset = edgeOff;

         if(signalSide > 0)
           {
            if(StringFind(setup, "RANGE") == 0)          RangeLongBuffer[i] = low[i] - arrowOffset;
            else if(StringFind(setup, "RECLAIM") == 0)   ReclaimLongBuffer[i] = low[i] - arrowOffset;
            else                                         BreakoutLongBuffer[i] = low[i] - arrowOffset;
           }
         else
           {
            if(StringFind(setup, "RANGE") == 0)          RangeShortBuffer[i] = high[i] + arrowOffset;
            else if(StringFind(setup, "RECLAIM") == 0)   ReclaimShortBuffer[i] = high[i] + arrowOffset;
            else                                         BreakoutShortBuffer[i] = high[i] + arrowOffset;
           }

         g_setup = s;
         g_hasSetup = true;
         g_lastAcceptedSignalTime = time[i];
        }

      // forming bar stays empty
      RangeHighBuffer[0] = EMPTY_VALUE; RangeLowBuffer[0] = EMPTY_VALUE;
      RangeLongBuffer[0] = EMPTY_VALUE; RangeShortBuffer[0] = EMPTY_VALUE;
      ReclaimLongBuffer[0] = EMPTY_VALUE; ReclaimShortBuffer[0] = EMPTY_VALUE;
      BreakoutLongBuffer[0] = EMPTY_VALUE; BreakoutShortBuffer[0] = EMPTY_VALUE;
     }

   //+------------------------------------------------------------------+
   //| Per-tick dynamic section: status, visuals, dashboard, alerts      |
   //+------------------------------------------------------------------+
   double pressure = 0, buyPct = 50;
   CalcPressure(rates_total, open, high, low, close, tick_volume, pressure, buyPct);

   bool showSetup = false;
   string status = "";
   int barsSince = 0;

   if(g_hasSetup)
     {
      status = ComputeStatus(g_setup, rates_total, high, low, close, barsSince);
      bool dead = (StringFind(status, "EXPIRED") >= 0 || StringFind(status, "INVALIDATED") >= 0);
      showSetup = !dead;

      if(showSetup)
        {
         DrawBox(g_setup.boxStartTime, timeTag(), g_setup.boxHigh, g_setup.boxLow, g_setup.poc);
         if(InpShowTradeLevels) DrawLevels(g_setup);
         else if(g_levelsDrawn) DeleteLevelObjects();
        }
      else
        {
         if(g_levelsDrawn) DeleteLevelObjects();
         if(g_newestValid > 0)
            DrawBox(g_newestBoxStartTime, timeTag(), g_newestHigh, g_newestLow, g_newestPOC);
         else if(g_boxDrawn) DeleteBoxObjects();
        }
     }
   else
     {
      if(g_levelsDrawn) DeleteLevelObjects();
      if(g_newestValid > 0)
        {
         DrawBox(g_newestBoxStartTime, timeTag(), g_newestHigh, g_newestLow, g_newestPOC);
         status = "SCANNING - box visible, awaiting trigger";
        }
      else
        {
         if(g_boxDrawn) DeleteBoxObjects();
         status = "SCANNING - no valid box yet";
        }
     }

   // alerts (never on the very first full pass)
   if(!fullRescan && !backfill)
     {
      if(g_hasSetup && InpAlertOnSignal && g_alertedSignalTime != g_setup.signalTime)
        {
         g_alertedSignalTime = g_setup.signalTime;
         FireAlert("SIG" + TimeToString(g_setup.signalTime),
                   "PBD v2 " + _Symbol + " " + EnumToString((ENUM_TIMEFRAMES)_Period) + ": NEW " +
                   g_setup.setup + " score " + IntegerToString(g_setup.score) + "/5 @ " +
                   DoubleToString(g_setup.entry, _Digits) + " SL " + DoubleToString(g_setup.sl, _Digits) +
                   " TP2 " + DoubleToString(g_setup.tp2, _Digits) + " (1:" + DoubleToString(g_setup.rr2, 2) + ")");
        }
      if(g_hasSetup && InpAlertOnStateChange && g_statusInit && status != g_prevStatus && showSetup)
        {
         FireAlert("ST" + status + TimeToString(g_setup.signalTime),
                   "PBD v2 " + _Symbol + ": " + g_setup.setup + " -> " + status);
        }
     }
   if(g_hasSetup) g_prevStatus = status;
   g_statusInit = true;

   // dashboard
   if(InpShowDashboard)
     {
      if(showSetup)
         RenderDashboard(g_setup, status, barsSince, pressure, buyPct);
      else
         RenderDashboardEmpty(status);
     }
   else
     {
      PanelDelete();
      if(InpShowInfoComment)
        {
         string text = "PBD Sniper v2 | " + _Symbol + " | " + EnumToString((ENUM_TIMEFRAMES)_Period) + "\n" + status;
         if(showSetup)
            text += "\n" + g_setup.setup + " score " + IntegerToString(g_setup.score) + "/5" +
                    "\nEntry " + DoubleToString(g_setup.entry, _Digits) + " | SL " + DoubleToString(g_setup.sl, _Digits) +
                    " | TP1 " + DoubleToString(g_setup.tp1, _Digits) + " | TP2 " + DoubleToString(g_setup.tp2, _Digits) +
                    " | TP3 " + DoubleToString(g_setup.tp3, _Digits) +
                    "\nRR@TP2 1:" + DoubleToString(g_setup.rr2, 2) + " | box W " +
                    DoubleToString(g_setup.boxWidth / g_setup.atr, 2) + " ATR | touches " +
                    IntegerToString(g_setup.touches);
         Comment(text);
        }
     }

   uint now = GetTickCount();
   if(now - g_lastRedrawTick > 250)
     {
      g_lastRedrawTick = now;
      ChartRedraw(0);
     }
   return rates_total;
  }
//+------------------------------------------------------------------+
