//+------------------------------------------------------------------+
//| PBD_Crypto_Structure_Indicator.mq5                               |
//| PBD-style chart overlay: validated ranges, signals, risk/targets. |
//| Not a true bid/ask footprint; see indicator comment/documentation. |
//| ORIGINAL v1.10 — kept as reference baseline for the v2 rewrite.   |
//+------------------------------------------------------------------+
#property strict
#property version   "1.10"
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

input int InpRangeLookback = 64;               // Prior closed bars defining balance
input int InpATRPeriod = 14;
input double InpTouchATR = 0.20;               // Range-edge tolerance in ATRs
input int InpMinimumTouches = 3;
input double InpMaxRangeATRMultiple = 0.80;    // Width <= lookback * ATR * multiplier
input int InpTouchSeparationBars = 3;
input bool InpShowRangeSignals = true;
input bool InpShowReclaimSignals = true;
input bool InpShowBreakoutSignals = true;
input bool InpAllowShorts = true;
input bool InpRangeSessionFilter = false;
input int InpRangeSessionEndHour = 21;         // Broker/server time
input int InpArrowOffsetPoints = 30;

input int InpMinimumConfluence = 2;            // Score 1-3; minimum to show an entry
input bool InpUseH4Confluence = true;          // +1 when H4 close agrees with EMA
input int InpH4EMAPeriod = 50;
input double InpImpulseATRMultiple = 1.5;      // Prior impulse threshold for +1 confluence
input bool InpShowTradeLevels = true;
input bool InpShowInfoComment = true;
input int InpRiskBufferATR = 20;                // SL buffer in 0.01 ATR units (20 = 0.20 ATR)

// Indicator buffers
double RangeHighBuffer[], RangeLowBuffer[];
double RangeLongBuffer[], RangeShortBuffer[];
double ReclaimLongBuffer[], ReclaimShortBuffer[];
double BreakoutLongBuffer[], BreakoutShortBuffer[];

int h4EmaHandle=INVALID_HANDLE;
datetime lastProcessedBar=0;
string PREFIX="PBD_LEVEL_";

// Average true range computed from historical, closed candles.
double ATRAt(const int shift,const int rates_total,const double &high[],const double &low[],const double &close[])
{
   int count=MathMin(InpATRPeriod,rates_total-shift-1);
   if(count<1) return 0.0;
   double sum=0.0;
   for(int k=shift;k<shift+count;k++)
   {
      double prev=close[k+1];
      double tr=MathMax(high[k]-low[k],MathMax(MathAbs(high[k]-prev),MathAbs(low[k]-prev)));
      sum+=tr;
   }
   return sum/count;
}

bool GetBox(const int shift,const int rates_total,const double &high[],const double &low[],const double &close[],
            double &boxHigh,double &boxLow,double &atrValue,int &touchCount)
{
   if(shift+InpRangeLookback+1>=rates_total) return false;
   boxHigh=-DBL_MAX; boxLow=DBL_MAX;
   for(int j=shift+1;j<=shift+InpRangeLookback;j++)
   {
      boxHigh=MathMax(boxHigh,high[j]); boxLow=MathMin(boxLow,low[j]);
   }
   if(boxHigh<=boxLow) return false;
   atrValue=ATRAt(shift+1,rates_total,high,low,close);
   if(atrValue<=0) return false;
   double tol=InpTouchATR*atrValue;
   touchCount=0;
   int lastTouch=1000000;
   for(int j=shift+InpRangeLookback;j>=shift+1;j--)
   {
      bool atHigh=(high[j]>=boxHigh-tol), atLow=(low[j]<=boxLow+tol);
      if((atHigh || atLow) && (lastTouch-j)>=InpTouchSeparationBars)
      { touchCount++; lastTouch=j; }
   }
   if(touchCount<InpMinimumTouches) return false;
   if((boxHigh-boxLow)>InpRangeLookback*atrValue*InpMaxRangeATRMultiple) return false;
   return true;
}

// Returns +1 for a qualifying prior upward impulse, -1 for downward, 0 if absent.
// The range is examined over the lookback immediately before the balance box.
int PriorImpulse(const int shift,const int rates_total,const double &high[],const double &low[],const double &close[],
                 const double atrValue,double &impulseSize,double &origin)
{
   impulseSize=0.0; origin=0.0;
   int near=shift+InpRangeLookback+1;
   int far=shift+2*InpRangeLookback;
   if(far+1>=rates_total) return 0;
   double delta=close[near]-close[far];
   impulseSize=MathAbs(delta);
   if(impulseSize<InpImpulseATRMultiple*atrValue) return 0;
   if(delta>0)
   {
      origin=DBL_MAX;
      for(int j=near;j<=far;j++) origin=MathMin(origin,low[j]);
      return 1;
   }
   origin=-DBL_MAX;
   for(int j=near;j<=far;j++) origin=MathMax(origin,high[j]);
   return -1;
}

bool H4TrendAgrees(const datetime t,const int side)
{
   if(!InpUseH4Confluence) return false;
   if(h4EmaHandle==INVALID_HANDLE) return false;
   int shift=iBarShift(_Symbol,PERIOD_H4,t,false);
   if(shift<0) return false;
   double ema[1];
   if(CopyBuffer(h4EmaHandle,0,shift,1,ema)!=1) return false;
   double c=iClose(_Symbol,PERIOD_H4,shift);
   if(c<=0 || ema[0]<=0) return false;
   return (side>0 ? c>ema[0] : c<ema[0]);
}

int ConfluenceScore(const int shift,const int side,const datetime &time[],const int rates_total,
                    const double &high[],const double &low[],const double &close[],const double atrValue,
                    int &impulseDir,double &impulseSize,double &impulseOrigin)
{
   // Point 1 is the already-validated three-touch range; add aligned impulse and H4 EMA.
   int score=1;
   impulseDir=PriorImpulse(shift,rates_total,high,low,close,atrValue,impulseSize,impulseOrigin);
   if(impulseDir==side) score++;
   if(H4TrendAgrees(time[shift],side)) score++;
   return score;
}

void DeleteLevelObjects()
{
   ObjectDelete(0,PREFIX+"ENTRY"); ObjectDelete(0,PREFIX+"SL");
   ObjectDelete(0,PREFIX+"TP1"); ObjectDelete(0,PREFIX+"TP2"); ObjectDelete(0,PREFIX+"TP3");
}

void PutHLine(const string suffix,const double price,const color c,const ENUM_LINE_STYLE style,const int width,const string text)
{
   string name=PREFIX+suffix;
   ObjectDelete(0,name);
   if(!ObjectCreate(0,name,OBJ_HLINE,0,0,price)) return;
   ObjectSetInteger(0,name,OBJPROP_COLOR,c); ObjectSetInteger(0,name,OBJPROP_STYLE,style);
   ObjectSetInteger(0,name,OBJPROP_WIDTH,width); ObjectSetInteger(0,name,OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0,name,OBJPROP_HIDDEN,true); ObjectSetString(0,name,OBJPROP_TOOLTIP,text+"  "+DoubleToString(price,_Digits));
}

void DrawLevels(const double entry,const double sl,const double tp1,const double tp2,const double tp3,
                const string setup,const int side,const int score)
{
   DeleteLevelObjects();
   if(!InpShowTradeLevels) return;
   PutHLine("ENTRY",entry,clrWhite,STYLE_DOT,1,"ENTRY | "+setup);
   PutHLine("SL",sl,clrRed,STYLE_SOLID,2,"STRUCTURAL SL");
   PutHLine("TP1",tp1,clrLimeGreen,STYLE_DASH,1,"TP1 | nearest structure");
   PutHLine("TP2",tp2,clrDeepSkyBlue,STYLE_DASH,1,"TP2 | range projection");
   PutHLine("TP3",tp3,clrGold,STYLE_DASHDOT,1,"TP3 | macro impulse projection");
   ChartRedraw(0);
}

int OnInit()
{
   if(InpRangeLookback<8 || InpATRPeriod<2 || InpMinimumTouches<3 || InpTouchSeparationBars<1 ||
      InpMinimumConfluence<1 || InpMinimumConfluence>3 || InpH4EMAPeriod<2)
      return INIT_PARAMETERS_INCORRECT;
   SetIndexBuffer(0,RangeHighBuffer,INDICATOR_DATA); SetIndexBuffer(1,RangeLowBuffer,INDICATOR_DATA);
   SetIndexBuffer(2,RangeLongBuffer,INDICATOR_DATA); SetIndexBuffer(3,RangeShortBuffer,INDICATOR_DATA);
   SetIndexBuffer(4,ReclaimLongBuffer,INDICATOR_DATA); SetIndexBuffer(5,ReclaimShortBuffer,INDICATOR_DATA);
   SetIndexBuffer(6,BreakoutLongBuffer,INDICATOR_DATA); SetIndexBuffer(7,BreakoutShortBuffer,INDICATOR_DATA);
   ArraySetAsSeries(RangeHighBuffer,true); ArraySetAsSeries(RangeLowBuffer,true);
   ArraySetAsSeries(RangeLongBuffer,true); ArraySetAsSeries(RangeShortBuffer,true);
   ArraySetAsSeries(ReclaimLongBuffer,true); ArraySetAsSeries(ReclaimShortBuffer,true);
   ArraySetAsSeries(BreakoutLongBuffer,true); ArraySetAsSeries(BreakoutShortBuffer,true);
   for(int p=0;p<8;p++) PlotIndexSetDouble(p,PLOT_EMPTY_VALUE,EMPTY_VALUE);
   PlotIndexSetInteger(2,PLOT_ARROW,233); PlotIndexSetInteger(3,PLOT_ARROW,234);
   PlotIndexSetInteger(4,PLOT_ARROW,233); PlotIndexSetInteger(5,PLOT_ARROW,234);
   PlotIndexSetInteger(6,PLOT_ARROW,241); PlotIndexSetInteger(7,PLOT_ARROW,242);
   if(InpUseH4Confluence) h4EmaHandle=iMA(_Symbol,PERIOD_H4,InpH4EMAPeriod,0,MODE_EMA,PRICE_CLOSE);
   if(InpUseH4Confluence && h4EmaHandle==INVALID_HANDLE) return INIT_FAILED;
   IndicatorSetString(INDICATOR_SHORTNAME,"PBD Structure + Levels (M15 rules)");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   DeleteLevelObjects(); Comment("");
   if(h4EmaHandle!=INVALID_HANDLE) IndicatorRelease(h4EmaHandle);
}

int OnCalculate(const int rates_total,const int prev_calculated,const datetime &time[],
                const double &open[],const double &high[],const double &low[],const double &close[],
                const long &tick_volume[],const long &volume[],const int &spread[])
{
   if(rates_total<InpRangeLookback+InpATRPeriod+5) return 0;
   ArraySetAsSeries(time,true); ArraySetAsSeries(open,true); ArraySetAsSeries(high,true);
   ArraySetAsSeries(low,true); ArraySetAsSeries(close,true);
   if(prev_calculated>0 && time[0]==lastProcessedBar) return rates_total;
   lastProcessedBar=time[0];

   for(int i=rates_total-1;i>=0;i--)
   {
      RangeHighBuffer[i]=EMPTY_VALUE; RangeLowBuffer[i]=EMPTY_VALUE;
      RangeLongBuffer[i]=EMPTY_VALUE; RangeShortBuffer[i]=EMPTY_VALUE;
      ReclaimLongBuffer[i]=EMPTY_VALUE; ReclaimShortBuffer[i]=EMPTY_VALUE;
      BreakoutLongBuffer[i]=EMPTY_VALUE; BreakoutShortBuffer[i]=EMPTY_VALUE;
   }

   int breakoutStage=0, breakoutDirection=0, barsAfterBreak=0;
   double breakoutEdge=0.0, breakoutExtreme=0.0, breakoutTol=0.0, breakoutWidth=0.0;
   int newestValid=-1; double newestHigh=0.0,newestLow=0.0,newestATR=0.0; int newestTouches=0;
   double latestEntry=0,latestSL=0,latestTP1=0,latestTP2=0,latestTP3=0;
   string latestSetup=""; int latestScore=0,latestSide=0; datetime latestSignalTime=0;
   double arrowOffset=InpArrowOffsetPoints*_Point;

   for(int i=rates_total-InpRangeLookback-2;i>=1;i--)
   {
      double rh,rl,a; int touches;
      bool valid=GetBox(i,rates_total,high,low,close,rh,rl,a,touches);
      if(valid)
      {
         RangeHighBuffer[i]=rh; RangeLowBuffer[i]=rl;
         newestValid=i; newestHigh=rh; newestLow=rl; newestATR=a; newestTouches=touches;
      }
      if(!valid) { breakoutStage=0; continue; }
      double tol=InpTouchATR*a, width=rh-rl;
      int signalSide=0, impulseDir=0, score=0;
      string setup="";
      double signalSL=0, signalTP1=0, signalTP2=0, signalTP3=0, impulseSize=0, impulseOrigin=0;
      bool isSignal=false;

      // Fake breakout/reclaim. Long-side breakdown reclaim is the preferred version.
      if(InpShowReclaimSignals && i+1<rates_total)
      {
         if(low[i+1]<rl-tol && close[i]>rl && close[i]<rh)
         { signalSide=1; setup="RECLAIM LONG"; signalSL=MathMin(low[i+1],low[i])-tol; isSignal=true; }
         else if(InpAllowShorts && high[i+1]>rh+tol && close[i]<rh && close[i]>rl)
         { signalSide=-1; setup="RECLAIM SHORT"; signalSL=MathMax(high[i+1],high[i])+tol; isSignal=true; }
      }

      // Confirmed breakout: outside close -> retest -> continuation close beyond initial extreme.
      if(!isSignal && InpShowBreakoutSignals)
      {
         if(breakoutStage>0)
         {
            barsAfterBreak++;
            if(barsAfterBreak>8 || breakoutDirection*(close[i]-breakoutEdge)<-2.0*breakoutTol) breakoutStage=0;
         }
         if(breakoutStage==1)
         {
            bool retested=(breakoutDirection>0 ? low[i]<=breakoutEdge+breakoutTol : high[i]>=breakoutEdge-breakoutTol);
            if(retested) breakoutStage=2;
         }
         else if(breakoutStage==2)
         {
            bool continuation=(breakoutDirection>0 ? close[i]>breakoutExtreme : close[i]<breakoutExtreme);
            if(continuation && (breakoutDirection>0 || InpAllowShorts))
            {
               signalSide=breakoutDirection;
               setup=(signalSide>0 ? "BREAKOUT LONG" : "BREAKOUT SHORT");
               signalSL=(signalSide>0 ? MathMin(low[i],breakoutEdge-breakoutTol) : MathMax(high[i],breakoutEdge+breakoutTol));
               isSignal=true; breakoutStage=0;
            }
         }
         if(!isSignal && breakoutStage==0)
         {
            if(close[i]>rh+tol)
            { breakoutStage=1; breakoutDirection=1; breakoutEdge=rh; breakoutExtreme=high[i]; breakoutTol=tol; breakoutWidth=width; barsAfterBreak=0; }
            else if(InpAllowShorts && close[i]<rl-tol)
            { breakoutStage=1; breakoutDirection=-1; breakoutEdge=rl; breakoutExtreme=low[i]; breakoutTol=tol; breakoutWidth=width; barsAfterBreak=0; }
         }
      }

      // Boundary-to-boundary range entries. Optional session restriction.
      if(!isSignal && InpShowRangeSignals)
      {
         bool allowed=true;
         if(InpRangeSessionFilter) { MqlDateTime dt; TimeToStruct(time[i],dt); if(dt.hour>=InpRangeSessionEndHour) allowed=false; }
         if(allowed && low[i]<=rl+tol && close[i]>rl)
         { signalSide=1; setup="RANGE LONG"; signalSL=rl-tol; isSignal=true; }
         else if(allowed && InpAllowShorts && high[i]>=rh-tol && close[i]<rh)
         { signalSide=-1; setup="RANGE SHORT"; signalSL=rh+tol; isSignal=true; }
      }

      if(!isSignal) continue;
      score=ConfluenceScore(i,signalSide,time,rates_total,high,low,close,a,impulseDir,impulseSize,impulseOrigin);
      if(score<InpMinimumConfluence) continue;
      double entry=close[i];
      double riskBuffer=(InpRiskBufferATR/100.0)*a;
      // Preserve the structural stop but add configurable ATR safety buffer.
      signalSL=(signalSide>0 ? signalSL-riskBuffer : signalSL+riskBuffer);
      double farEdge=(signalSide>0 ? rh : rl);
      if(signalSide*(farEdge-entry)<=0) farEdge=entry+signalSide*width;

      if(StringFind(setup,"RANGE")==0)
      {
         // Guide's range objective is the opposite edge. The requested three
         // display levels divide the edge-to-edge move into equal thirds;
         // they are visualization only (guide says standard range trades exit at the far edge).
         double distance=farEdge-entry;
         signalTP1=entry+distance/3.0; signalTP2=entry+2.0*distance/3.0; signalTP3=farEdge;
      }
      else if(StringFind(setup,"RECLAIM")==0)
      {
         // TP1 opposite box edge; TP2 range-height projection; TP3 prior macro
         // swing origin when ahead of price, otherwise a second range extension.
         signalTP1=farEdge;
         signalTP2=farEdge+signalSide*width;
         double projected=entry+signalSide*MathMax(impulseSize,width);
         double macroTarget=impulseOrigin;
         if(signalSide*(macroTarget-entry)<=0) macroTarget=farEdge+signalSide*2.0*width;
         signalTP3=(signalSide*(macroTarget-signalTP2)>0 ? macroTarget : MathMax(signalSide*signalTP2,signalSide*projected)*signalSide);
         if(signalSide*(signalTP1-entry)<=0) signalTP1=entry+signalSide*width;
         if(signalSide*(signalTP2-signalTP1)<=0) signalTP2=signalTP1+signalSide*width;
         if(signalSide*(signalTP3-signalTP2)<=0) signalTP3=signalTP2+signalSide*width;
      }
      else
      {
         // Breakout: 1:1 range-height target, then 1:1 prior impulse projection;
         // final target uses a second range-height projection if no farther
         // objective is supplied by the visible structure.
         signalTP1=entry+signalSide*width;
         signalTP2=entry+signalSide*MathMax(impulseSize,width);
         if(signalSide*(signalTP2-signalTP1)<=0) signalTP2=signalTP1+signalSide*width;
         signalTP3=signalTP2+signalSide*width;
      }

      if(signalSide>0)
      {
         if(StringFind(setup,"RANGE")==0) RangeLongBuffer[i]=low[i]-arrowOffset;
         else if(StringFind(setup,"RECLAIM")==0) ReclaimLongBuffer[i]=low[i]-arrowOffset;
         else BreakoutLongBuffer[i]=low[i]-arrowOffset;
      }
      else
      {
         if(StringFind(setup,"RANGE")==0) RangeShortBuffer[i]=high[i]+arrowOffset;
         else if(StringFind(setup,"RECLAIM")==0) ReclaimShortBuffer[i]=high[i]+arrowOffset;
         else BreakoutShortBuffer[i]=high[i]+arrowOffset;
      }
      // Processing runs oldest-to-newest; latest qualifying signal overwrites the prior levels.
      latestEntry=entry; latestSL=signalSL; latestTP1=signalTP1; latestTP2=signalTP2; latestTP3=signalTP3;
      latestSetup=setup; latestScore=score; latestSide=signalSide; latestSignalTime=time[i];
   }

   RangeHighBuffer[0]=EMPTY_VALUE; RangeLowBuffer[0]=EMPTY_VALUE;
   RangeLongBuffer[0]=EMPTY_VALUE; RangeShortBuffer[0]=EMPTY_VALUE;
   ReclaimLongBuffer[0]=EMPTY_VALUE; ReclaimShortBuffer[0]=EMPTY_VALUE;
   BreakoutLongBuffer[0]=EMPTY_VALUE; BreakoutShortBuffer[0]=EMPTY_VALUE;

   if(latestScore>0) DrawLevels(latestEntry,latestSL,latestTP1,latestTP2,latestTP3,latestSetup,latestSide,latestScore);
   else DeleteLevelObjects();

   if(InpShowInfoComment)
   {
      string text="PBD Structure + Levels | "+_Symbol+" | "+EnumToString((ENUM_TIMEFRAMES)_Period)+"\n"+
         "Signals require 3-touch range + confluence score >= "+IntegerToString(InpMinimumConfluence)+"/3."+
         " Score: validated range, aligned preceding impulse, aligned H4 EMA."+
         "\nNo true footprint / volume-profile data is used; confluence is heuristic, not a win probability.";
      if(newestValid>=0) text+="\nLatest box: H "+DoubleToString(newestHigh,_Digits)+" | L "+DoubleToString(newestLow,_Digits)+
         " | touches "+IntegerToString(newestTouches)+" | ATR "+DoubleToString(newestATR,_Digits);
      if(latestScore>0)
      {
         text+="\nLATEST: "+latestSetup+" | confluence "+IntegerToString(latestScore)+"/3 | "+TimeToString(latestSignalTime,TIME_DATE|TIME_MINUTES)+
               "\nEntry "+DoubleToString(latestEntry,_Digits)+" | SL "+DoubleToString(latestSL,_Digits)+
               " | TP1 "+DoubleToString(latestTP1,_Digits)+" | TP2 "+DoubleToString(latestTP2,_Digits)+" | TP3 "+DoubleToString(latestTP3,_Digits);
      }
      Comment(text);
   }
   return rates_total;
}
//+------------------------------------------------------------------+
