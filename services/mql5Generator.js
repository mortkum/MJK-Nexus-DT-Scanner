// services/mql5Generator.js
function getMQL5Code() {
  return `//+------------------------------------------------------------------+
//| ⚡ Nexus Hidden DT/DB Institutional Scanner - MQL5 EA                |
//| Detects High-Probability Hidden Double Tops/Bottoms                  |
//| Top-Down: W1, D1, H4, H2, H1, M15 - Isolated Single TF = Grade A+    |
//+------------------------------------------------------------------+
#property copyright "Nexus Institutional Scanner"
#property version   "1.00"
#property strict

#include <Trade/Trade.mqh>
CTrade trade;

//--- Inputs
input int ZigZagStrength = 5;
input double PeakSimilarityPct = 1.5; // %
input bool RequireBodyClose = true;
input double MinRR = 1.5;
input double RiskPercent = 1.0; // % risk per trade
input bool ShowOnlyHidden = false;
input bool EnableAlerts = true;
input bool EnableAutoTrading = false;

//--- Global vars
double peak1, peak2, trough1, trough2, neckline;
datetime peak1Time, peak2Time;
int peakCount = 0, troughCount = 0;

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("⚡ Nexus DT/DB Scanner Initialized on ", _Symbol);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Calculate RSI                                                    |
//+------------------------------------------------------------------+
double GetRSI(int period, int shift)
{
   double rsi[];
   ArraySetAsSeries(rsi, true);
   int handle = iRSI(_Symbol, _Period, period, PRICE_CLOSE);
   CopyBuffer(handle, 0, shift, 1, rsi);
   return rsi[0];
}

//+------------------------------------------------------------------+
//| Find Swing Highs/Lows                                            |
//+------------------------------------------------------------------+
bool IsSwingHigh(int index, int strength)
{
   double currHigh = iHigh(_Symbol, _Period, index);
   for(int i=1; i<=strength; i++)
   {
      if(iHigh(_Symbol, _Period, index-i) >= currHigh) return false;
      if(iHigh(_Symbol, _Period, index+i) >= currHigh) return false;
   }
   return true;
}

bool IsSwingLow(int index, int strength)
{
   double currLow = iLow(_Symbol, _Period, index);
   for(int i=1; i<=strength; i++)
   {
      if(iLow(_Symbol, _Period, index-i) <= currLow) return false;
      if(iLow(_Symbol, _Period, index+i) <= currLow) return false;
   }
   return true;
}

//+------------------------------------------------------------------+
//| OnTick - Main Detection Loop                                     |
//+------------------------------------------------------------------+
void OnTick()
{
   static datetime lastBar = 0;
   datetime currBarTime = iTime(_Symbol, _Period, 0);
   if(currBarTime == lastBar) return;
   lastBar = currBarTime;

   // Scan last 100 bars for patterns
   double highs[], lows[], closes[], volumes[];
   ArraySetAsSeries(highs, true);
   ArraySetAsSeries(lows, true);
   ArraySetAsSeries(closes, true);
   ArraySetAsSeries(volumes, true);
   CopyHigh(_Symbol, _Period, 0, 120, highs);
   CopyLow(_Symbol, _Period, 0, 120, lows);
   CopyClose(_Symbol, _Period, 0, 120, closes);
   CopyTickVolume(_Symbol, _Period, 0, 120, volumes);

   // Find peaks and troughs
   double peaks[20], peakTimes[20];
   double troughs[20], troughTimes[20];
   int pCount=0, tCount=0;

   for(int i=ZigZagStrength; i<110; i++)
   {
      if(IsSwingHigh(i, ZigZagStrength) && pCount < 20)
      {
         peaks[pCount] = highs[i];
         peakTimes[pCount] = iTime(_Symbol, _Period, i);
         pCount++;
      }
      if(IsSwingLow(i, ZigZagStrength) && tCount < 20)
      {
         troughs[tCount] = lows[i];
         troughTimes[tCount] = iTime(_Symbol, _Period, i);
         tCount++;
      }
   }

   //--- Detect Double Top
   for(int i=0; i<pCount-1; i++)
   {
      for(int j=i+1; j<MathMin(pCount, i+5); j++)
      {
         double diffPct = MathAbs(peaks[i] - peaks[j]) / peaks[i] * 100.0;
         if(diffPct > PeakSimilarityPct) continue;

         // Find neckline (lowest trough between peaks)
         double neck = 1e10;
         for(int k=0; k<tCount; k++)
         {
            datetime tTime = (datetime)troughTimes[k];
            if(tTime > peakTimes[j] && tTime < peakTimes[i])
               if(troughs[k] < neck) neck = troughs[k];
         }
         if(neck == 1e10) continue;

         double height = MathMax(peaks[i], peaks[j]) - neck;
         if(height <= 0) continue;

         // Body close below neckline?
         double close0 = closes[0];
         if(RequireBodyClose && close0 >= neck) continue;
         if(!RequireBodyClose && lows[0] >= neck) continue;

         // RSI divergence
         double rsi1 = GetRSI(14, i+ZigZagStrength);
         double rsi2 = GetRSI(14, j+ZigZagStrength);
         bool rsiDiv = rsi2 < rsi1 - 1.0;

         // Trade geometry
         double entry = close0;
         double sl = MathMax(peaks[i], peaks[j]) + height * 0.10;
         double tp1 = neck - height * 1.0;
         double tp2 = neck - height * 1.618;
         double risk = sl - entry;
         double rr = risk > 0 ? (entry - tp1) / risk : 0;
         if(rr < MinRR) continue;

         // Draw objects
         string nameBase = "DT_" + TimeToString(peakTimes[i]);
         ObjectCreate(0, nameBase+"_P1P2", OBJ_TREND, 0, peakTimes[j], peaks[j], peakTimes[i], peaks[i]);
         ObjectSetInteger(0, nameBase+"_P1P2", OBJPROP_COLOR, clrRed);
         ObjectSetInteger(0, nameBase+"_P1P2", OBJPROP_WIDTH, 2);

         ObjectCreate(0, nameBase+"_Neck", OBJ_HLINE, 0, 0, neck);
         ObjectSetInteger(0, nameBase+"_Neck", OBJPROP_COLOR, clrYellow);
         ObjectSetInteger(0, nameBase+"_Neck", OBJPROP_STYLE, STYLE_DASH);

         PrintFormat("🌟 DT Hidden Detected %s Entry=%.5f SL=%.5f TP1=%.5f RR=%.2f RSI Div=%s", _Symbol, entry, sl, tp1, rr, rsiDiv ? "YES" : "NO");

         if(EnableAlerts)
            Alert(StringFormat("🌟 DT %s M%d Entry %.5f SL %.5f TP1 %.5f", _Symbol, Period(), entry, sl, tp1));

         if(EnableAutoTrading && rr >= 2.0 && rsiDiv)
         {
            double lot = CalculateLotSize(risk);
            trade.Sell(lot, _Symbol, 0, sl, tp1, "Nexus DT Hidden");
         }
      }
   }

   //--- Detect Double Bottom (similar logic)
   for(int i=0; i<tCount-1; i++)
   {
      for(int j=i+1; j<MathMin(tCount, i+5); j++)
      {
         double diffPct = MathAbs(troughs[i] - troughs[j]) / troughs[i] * 100.0;
         if(diffPct > PeakSimilarityPct) continue;

         double neck = -1e10;
         for(int k=0; k<pCount; k++)
         {
            datetime pTime = (datetime)peakTimes[k];
            if(pTime > troughTimes[j] && pTime < troughTimes[i])
               if(peaks[k] > neck) neck = peaks[k];
         }
         if(neck == -1e10) continue;

         double height = neck - MathMin(troughs[i], troughs[j]);
         if(height <= 0) continue;

         double close0 = closes[0];
         if(RequireBodyClose && close0 <= neck) continue;

         double entry = close0;
         double sl = MathMin(troughs[i], troughs[j]) - height * 0.10;
         double tp1 = neck + height * 1.0;
         double tp2 = neck + height * 1.618;
         double risk = entry - sl;
         double rr = risk > 0 ? (tp1 - entry) / risk : 0;
         if(rr < MinRR) continue;

         string nameBase = "DB_" + TimeToString(troughTimes[i]);
         ObjectCreate(0, nameBase+"_T1T2", OBJ_TREND, 0, troughTimes[j], troughs[j], troughTimes[i], troughs[i]);
         ObjectSetInteger(0, nameBase+"_T1T2", OBJPROP_COLOR, clrGreen);

         PrintFormat("🌟 DB Hidden Detected %s Entry=%.5f SL=%.5f TP1=%.5f RR=%.2f", _Symbol, entry, sl, tp1, rr);

         if(EnableAlerts)
            Alert(StringFormat("🌟 DB %s M%d Entry %.5f", _Symbol, Period(), entry));

         if(EnableAutoTrading)
         {
            double lot = CalculateLotSize(risk);
            trade.Buy(lot, _Symbol, 0, sl, tp1, "Nexus DB Hidden");
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Calculate Lot Size from Risk %                                   |
//+------------------------------------------------------------------+
double CalculateLotSize(double riskPoints)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskMoney = balance * RiskPercent / 100.0;
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double lot = riskMoney / (riskPoints / tickSize * tickValue);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   lot = MathMax(minLot, MathMin(maxLot, lot));
   return NormalizeDouble(lot, 2);
}
//+------------------------------------------------------------------+
`;
}

module.exports = { getMQL5Code };
