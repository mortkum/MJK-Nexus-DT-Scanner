# ⚡ Multi-Broker Scanner Architecture & Synthetic Indices Guide

## 1. Zero-Interference Architectural Design

To ensure that your original scanner **continues running without interference**, we have decoupled the scanners into **3 independent standalone applications**. Each app has its own isolated directory, its own dedicated port, its own package dependencies, and its own broker-specific data engine:

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                 RADAR SCANNER SUITE                                   │
├─────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ 1. MAIN MARKETS SCANNER │ 2. WELTRADE INDICES SCANNER │ 3. DERIV SYNTHETICS SCANNER   │
├─────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Directory:              │ Directory:                  │ Directory:                    │
│ double-pattern-scanner/ │ weltrade-indices-scanner/   │ deriv-synthetic-scanner/      │
│                         │                             │                               │
│ Port: 3000              │ Port: 3001                  │ Port: 3002                    │
│                         │                             │                               │
│ Assets (51 Total):      │ Assets (19 Total):          │ Assets (29 Total):            │
│ • Forex Majors (7)      │ • SyntX Indices (5)         │ • Volatility Indices (12)     │
│ • Cryptocurrencies (40) │ • Weltrade Crash/Boom (4)   │ • Crash & Boom Indices (6)    │
│ • Commodities (Gold/Oil)│ • Volatility & Step (4)     │ • Step & Jump Indices (6)     │
│ • S&P 500 & Nasdaq 100  │ • CFD Indices (US30, NAS)   │ • Range Break & DEX (5)       │
│                         │                             │                               │
│ Launcher: start.bat     │ Launcher: start_weltrade.bat│ Launcher: start_deriv.bat     │
└─────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. Weltrade SyntX Scanner (Official Instruments)

### Covered Official Instruments (26 Total):
- **FX Vol Series (Forex-style mechanics with mathematically fixed annual volatility):**
  - `FXvol20` (FX Vol 20% annual volatility)
  - `FXvol40` (FX Vol 40% annual volatility - steady trends, news-free)
  - `FXvol60` (FX Vol 60% annual volatility)
  - `FXvol80` (FX Vol 80% annual volatility)
  - `FXvol99` (FX Vol 99% annual volatility - high momentum swings)
- **SFX Vol Series (Fixed volatility with simulated news shock pulses):**
  - `SFXvol40` (Simulated news spikes every ~30 mins on 40% base)
  - `SFXvol99` (Extreme simulated news shocks on 99% base)
- **PainX Series (Price drifts upward steadily, then drops sharply every X ticks):**
  - `PainX400` (Sharp drop every 400 ticks on average)
  - `PainX600` (Sharp drop every 600 ticks on average)
  - `PainX800` (Sharp drop every 800 ticks on average)
  - `PainX999` (Sharp drop every 999 ticks on average)
  - `PainX1200` (Sharp drop every 1200 ticks on average)
- **GainX Series (Price drifts downward steadily, then spikes upward every X ticks):**
  - `GainX400` (Sharp spike jump every 400 ticks on average)
  - `GainX600` (Sharp spike jump every 600 ticks on average)
  - `GainX800` (Sharp spike jump every 800 ticks on average)
  - `GainX999` (Sharp spike jump every 999 ticks on average)
  - `GainX1200` (Sharp spike jump every 1200 ticks on average)
- **Regime Shift Synthetics:**
  - `SwitchX` (Begins as GainX, permanently switches to PainX after trigger)
  - `BreakX` (Switches mode when a spike exceeds the prior spike)
  - `TrendX` (Switches only on confirmed higher highs & higher lows)
  - `FlipX` (Dynamic regime flip)
- **Weltrade Major CFD Stock Indices:**
  - `US30` (Wall Street 30 / Dow Jones)
  - `NAS100` (US Tech 100 / Nasdaq)
  - `SPX500` (US 500 / S&P 500)
  - `GER40` (Germany 40 / DAX)
  - `UK100` (UK 100 / FTSE)

### Where Does Weltrade Data Come From?
1. **Proprietary Broker Nature**:
   Unlike public Forex and Crypto pairs (which have open REST APIs from Yahoo Finance, Binance, or OANDA), synthetic indices like **FXvol40**, **FXvol99**, **PainX**, and **GainX** are **proprietary algorithmic instruments created and hosted exclusively by Weltrade**. Weltrade does not provide a public, unauthenticated HTTP market data API.
2. **Web Scanner Engine**:
   The web radar uses a **calibrated 24/7 algorithmic candle simulation engine** that replicates the exact statistical behavior, tick intervals, drift rates, and spike/drop mechanics of each Weltrade SyntX instrument.
3. **Live MT5 Direct Feed**:
   For live real-time trading directly from Weltrade's live price feed, use the provided **Weltrade MQL5 EA / Script** in MetaTrader 5 (`Weltrade_SyntX_Hidden_DT_DB.mq5`). It attaches directly to your Weltrade MT5 terminal charts and uses Weltrade's native broker tick buffer (`CopyRates`) for 100% tick-perfect execution.

### How to Run Weltrade Scanner:
- **Windows:** Double-click `start_weltrade.bat`
- **macOS / Linux:** Run `./start_weltrade.sh`
- **URL:** `http://localhost:3001`

---

## 3. Deriv Synthetics Scanner (Port 3002)

### Covered Instruments:
- **Continuous Volatility Indices:**
  - `R_75` (Volatility 75 Index — King of Synthetics)
  - `1HZ75V` (Volatility 75 (1s) Index)
  - `R_100` (Volatility 100 Index)
  - `1HZ100V` (Volatility 100 (1s) Index)
  - `R_50` & `1HZ50V` (Volatility 50 Indices)
  - `R_25` & `1HZ25V` (Volatility 25 Indices)
  - `R_10` & `1HZ10V` (Volatility 10 Indices)
  - `1HZ150V` & `1HZ250V` (High Volatility 1s Indices)
- **Crash & Boom Series:**
  - `CRASH1000`, `CRASH500`, `CRASH300`
  - `BOOM1000`, `BOOM500`, `BOOM300`
- **Step & Jump Indices:**
  - `STEPINDEX` (Step Index)
  - `JD10`, `JD25`, `JD50`, `JD75`, `JD100` (Jump Indices)
- **Range Break & DEX:**
  - `RANGE100`, `RANGE200`
  - `DEX600`, `DEX900`, `DEX1500`

### How to Run Deriv Scanner:
- **Windows:** Double-click `start_deriv.bat`
- **macOS / Linux:** Run `./start_deriv.sh`
- **URL:** `http://localhost:3002`

---

## 4. Master 1-Click Launcher (Run All 3 Simultaneously)

If you want to run all 3 scanners side-by-side:
- **Windows:** Double-click **`start_all.bat`**. It will open 3 command windows and launch each scanner on its dedicated port.
- **macOS / Linux:** Run **`./start_all.sh`**.
- Open your browser tabs:
  - Tab 1: `http://localhost:3000` (Main Markets: Forex/Crypto/Indices)
  - Tab 2: `http://localhost:3001` (Weltrade SyntX & Indices)
  - Tab 3: `http://localhost:3002` (Deriv Synthetics)

Each app also features a **Radar Suite Switcher Bar** at the top of the webpage allowing you to tab between them instantly!
