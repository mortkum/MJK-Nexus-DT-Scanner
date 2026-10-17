# ⚡ Nexus DT/DB Top-Down Institutional Scanner

An institutional-grade trading application that scans multiple markets (Forex, Crypto, Commodities, Indices) across **6 timeframes (W1, D1, H4, H2, H1, M15)** to detect **High-Probability Hidden Double Tops (DT) and Double Bottoms (DB)**.

---

## 🚀 Quick Start Guide (Running on Your Laptop)

### 1. Prerequisites
You only need **Node.js** (version 18 or higher) installed on your laptop:
- Download the free recommended LTS installer from: **[https://nodejs.org/](https://nodejs.org/)**
- (To check if you already have it, open your terminal/command prompt and type: `node -v`)

---

### 2. Running on Windows (Easiest: 1-Click)
1. Extract the downloaded workspace `.zip` folder.
2. Open the folder (`double-pattern-scanner` or the root folder).
3. **Double-click `start.bat`**:
   - It will automatically check for Node.js.
   - It will install the required dependencies (`express`, `cors`).
   - It will start the server and open **`http://localhost:3000`** in your default web browser!

*Manual Windows Method (Command Prompt / PowerShell):*
```cmd
cd double-pattern-scanner
npm install
npm start
```
Then open your browser to: **`http://localhost:3000`**

---

### 3. Running on macOS / Linux
1. Open the **Terminal** app.
2. Navigate to the extracted folder:
   ```bash
   cd path/to/double-pattern-scanner
   ```
3. Run the startup script:
   ```bash
   ./start.sh
   ```
   *(Or manually run:)*
   ```bash
   npm install
   npm start
   ```
4. Open your browser to: **`http://localhost:3000`**

---

## 🧪 Running the Automated Test Suite

To verify all 10 mathematical rules, pattern detection logic, and API endpoints on your laptop:

```bash
npm test
```

Expected output:
```
========================================================
⚡ INSTITUTIONAL PATTERN SCANNER AUTOMATED TEST SUITE ⚡
========================================================

• Testing: All 6 Required Timeframes are present (W1, D1, H4, H2, H1, M15)... PASSED
• Testing: Double Top geometry detection (Peak 1, Peak 2, Neckline)... PASSED
• Testing: Activation Rule: Wick piercing DOES NOT activate, Candle Body Close strictly ACTIVATES... PASSED
• Testing: Top-Down Isolation: Pattern on 1 TF = HIGH PROBABILITY; on 3+ TFs = RETAIL TRAP... PASSED
• Testing: Measured Move Math: TP1 = 1.0x Height, TP2 = 1.618x Height, R:R >= 1.5... PASSED
• Testing: Backend API /api/watchlist returns all assets... PASSED
• Testing: Backend API /api/scan executes top-down scan... PASSED
• Testing: Backend API /api/candles returns OHLCV for H2... PASSED
• Testing: Backend API /api/code/pinescript returns TradingView v5 code... PASSED
• Testing: Backend API /api/code/mql5 returns MetaTrader 5 code... PASSED

--------------------------------------------------------
📊 TEST RESULTS: 10 Passed, 0 Failed.
✅ ALL CRITERIA VERIFIED & COMPLIANT WITH TRADING RULES!
--------------------------------------------------------
```

### Standalone single file

```bash
npm run build:standalone      # -> travel-marketing-studio.html (~233 KB)
```

Compiles the studio into one self-contained HTML file — CSS, both JS files, all
three fonts and the favicon inlined. Open it by double-click; no server, no
`npm install`, no network. `npm run test:standalone` verifies it stayed
self-contained.

`npm test` also runs the **Travel Marketing Studio clone** suite (59 checks, jsdom):

```bash
npm run test:studio   # just the clone suite
```

```
• Content desk renders 10 channel cards... PASSED
• Channels match the original order... PASSED
• Hero headline matches the original copy... PASSED
• Source of truth is loaded... PASSED
• Business Overview Summary has all 6 sections... PASSED
• Every summary section matches the verbatim original text... PASSED
• Expanded toggle reads "Collapse"... PASSED
• BluePrint LinkedIn body is the original post verbatim... PASSED
• Bold markdown becomes <strong>... PASSED
• Write opens the piece drawer... PASSED
• Write all ten produces 10 pieces... PASSED
• Library lists every piece... PASSED
• Channel filter narrows the library... PASSED
• Distribution plan lists all 10 channels... PASSED
• Each profile keeps its own library... PASSED
• Deep link to /library opens the library view... PASSED
• Pieces are persisted to localStorage... PASSED
--------------------------------------------------------
📊 TEST RESULTS: 59 Passed, 0 Failed.
✅ TRAVEL MARKETING STUDIO CLONE VERIFIED!
```

---

## 🌐 Travel Marketing Studio — Site Clone

A self-contained, offline clone of the Base44 app at
**https://imposing-travel-pulse-pro.base44.app** lives in `public-travelpulse/` and is served by
the same Express app:

* **URL:** http://localhost:3000/travelpulse
* **Views:** `/travelpulse/` (content desk) · `/travelpulse/library` · `/travelpulse/plan`
* **Docs:** [`CLONE_TRAVELPULSE.md`](CLONE_TRAVELPULSE.md)

> **How it was cloned:** the app is *not* published, so a plain fetch of the URL returns Base44's
> *"isn't available yet"* placeholder — which is a **client-side render**, not the server response.
> A headless browser sees the real app, so the bundle, routes, copy and design tokens were
> extracted from it and rebuilt as clean local source. Full probe log in `CLONE_TRAVELPULSE.md`.

> **One substitution:** the original calls Base44's hosted LLM to write copy. The clone's writers
> are local, deterministic composers grounded in the same source-of-truth facts. Replacing
> `Model.generate()` with any completion endpoint swaps it back with no UI change.

---

## 🛠️ Port Customization & Troubleshooting

### 1. "Port 3000 is already in use"
If another program on your laptop is using port 3000, you can start the server on any other port (e.g. 4000 or 5000):

- **On Windows (Command Prompt):**
  ```cmd
  set PORT=4000 && npm start
  ```
- **On Windows (PowerShell):**
  ```powershell
  $env:PORT=4000; npm start
  ```
- **On macOS / Linux:**
  ```bash
  PORT=4000 npm start
  ```
Then visit: `http://localhost:4000`

---

## 📁 Project Architecture & Files

```
double-pattern-scanner/
│
├── server.js                   # Express backend & REST API server
├── package.json                # Project dependencies and npm scripts
├── start.bat                   # 1-click Windows launcher
├── start.sh                    # 1-click macOS / Linux launcher
├── STRATEGY_GUIDE.md           # Deep-dive strategy & institutional manual
│
├── services/
│   ├── marketData.js           # Multi-asset fetcher & timeframe aggregator (W1..M15)
│   ├── patternEngine.js        # ZigZag, Double Top/Bottom, Decisive Close & Hidden Top-Down logic
│   ├── pineScriptGenerator.js  # Production TradingView Pine Script v5 code generator
│   └── mql5Generator.js        # Production MetaTrader 5 (MQL5) code generator
│
├── public/
│   ├── index.html              # Modern dark-theme institutional terminal UI
│   ├── styles.css              # Financial UI styling & responsive layout
│   ├── chart-engine.js         # Interactive Canvas candlestick chart & pattern drawer
│   └── app.js                  # Frontend state controller, Web Audio alerts & calculators
│
├── public-weltrade/            # Clone served at /weltrade
├── public-deriv/               # Clone served at /deriv
├── public-travelpulse/         # Clone of imposing-travel-pulse-pro.base44.app → /travelpulse
│   ├── index.html              # Content desk / Library / Distribution plan
│   ├── styles.css              # Design system (Fraunces + Inter + JetBrains Mono, brass on ink)
│   ├── app.js                  # Router, state, drawer, library, distribution plan
│   ├── content-model.js        # Source of truth, 10 channels, per-channel writers
│   └── favicon.svg             # TM monogram
│
├── CLONE_TRAVELPULSE.md        # Site-clone notes: probe log, tokens, fidelity, re-sync steps
│
└── test/
    ├── run-tests.js            # Automated 10-point test runner
    └── studio.test.js          # 59-check DOM test suite for the Travel Marketing Studio clone
```

---

## 🌟 Key Strategy Rules Implemented

1. **Top-Down Hidden Isolation:** Scans `W1, D1, H4, H2, H1, M15`. If a setup is found on **strictly 1 timeframe** and absent on the other 5, it is flagged as **`🌟 HIGH PROB (HIDDEN)` (Grade A+)**. If visible across 3+ timeframes, it is flagged as a **`❌ RETAIL TRAP`**.
2. **Decisive Body Close Activation:** Requires candle body to close strictly below the neckline (`Close < Neckline`) for Double Tops, or above (`Close > Neckline`) for Double Bottoms.
3. **On-Chart Trade Geometry:**
   - **Entry:** Closing price of the breakout candle.
   - **Stop Loss:** Above the peak with ATR buffer.
   - **TP1:** $1.0\times$ Pattern Height (measured move).
   - **TP2:** $1.618\times$ Pattern Height (Fibonacci extension).
4. **Institutional Confluences:** RSI (14) Momentum Divergence, Volume Contraction on Peak 2, Breakout Volume Expansion, and Risk:Reward $\ge 1:2.0$.
