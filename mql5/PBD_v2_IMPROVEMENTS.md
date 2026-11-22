# PBD Indicator v2 — Analysis & Improvements

**Files**
- `PBD_Crypto_Structure_Indicator_v1.mq5` — original v1.10 (reference baseline)
- `PBD_Crypto_Structure_Indicator_v2.mq5` — rebuilt "Sniper Edition" (this is what you compile)

---

## 1. What v1 did well
- Clean separation of three setup families (RANGE / RECLAIM / BREAKOUT) around a single
  validated balance box — the core idea is sound and worth keeping.
- Honest disclaimer that it is not a true bid/ask footprint.
- Structured levels already existed (Entry/SL/TP1-3), and SL followed structural logic
  (beyond sweep low / box edge + ATR buffer).
- Efficient-enough indicator pattern (buffers, handles, one pass per bar).

## 2. Issues found in v1 (and how v2 fixes them)

### A. Signal quality / false signals
| # | Issue | Fix in v2 |
|---|-------|-----------|
| A1 | Width cap `lookback × ATR × 0.80` (= 51 ATR with defaults) never rejected anything — trend legs passed as "balance boxes" | Real width filter: box must be `InpMinBoxWidthATR`–`InpMaxBoxWidthATR` (0.6–4.0 ATR default) |
| A2 | Touches could all sit on ONE edge (e.g. 5 highs, 0 lows) and still qualify | Box must be tested on **both** edges (≥1 touch each side), touches shown as `4 (2H/2L)` |
| A3 | Range entries fired on any bar dipping to an edge — no rejection-quality requirement | Trigger bar must close **back inside** the box AND pass a body/range ratio test (≥0.35) |
| A4 | No volume confirmation anywhere (despite the strategy guide requiring it) | +1 confluence when trigger volume > 1.2 × SMA20 volume |
| A5 | No RSI divergence on the reclaim (the guide's #1 filter) | Reclaim setups get +1 only when the sweep shows real RSI divergence vs the prior swing |
| A6 | Confluence score was nearly free: `score≥2` = box + ONE of two factors | 5-point score: box, impulse alignment, H4 EMA, volume expansion, quality (divergence/body). Default gate 3/5 |
| A7 | No R:R quality gate — mid-box entries produced terrible reward:risk | Setup rejected if R:R at TP2 < `InpMinRR` (default 1.5) |
| A8 | No spread guard | Skip signals when spread > 10% of ATR |
| A9 | Duplicate signals: every bar re-derived its own box → arrows 1 bar apart on the same move | Dedupe: min `InpMinBarsBetweenSignals` (5) between accepted signals |
| A10 | Reclaim accepted a prior bar that CLOSED outside the box; range long could close above the opposite edge | Reclaim bar must close back inside; range fades must close inside the box |
| A11 | Session filter was one-sided (blocked only after 21h) | Proper two-way session window (start/end, midnight-safe) |

### B. Breakout logic bugs
| # | Issue | Fix in v2 |
|---|-------|-----------|
| B1 | Breakout state machine was reset whenever a bar's own box failed validation — a live breakout/retest sequence could be silently killed | State machine persists across bars and across calls (globals); box validity only gates signal emission |
| B2 | Retest and continuation could trigger on the same bar (v2 draft bug) | Stage captured at bar start: retest bar and continuation bar must be **separate** bars |
| B3 | State was re-derived from scratch every tick (locals) — unreliable across new bars | Persistent globals, incremental scan of only newly closed bars (with automatic full rescan on history backfill) |

### C. Trade geometry / drawdown
| # | Issue | Fix in v2 |
|---|-------|-----------|
| C1 | RANGE TPs split the move into arbitrary thirds ("visualization only" per v1's own comment) | Unified scheme: **TP1 = 1R** (book partial → move SL to breakeven = minimal drawdown), **TP2 = structural** (opposite box edge / measured move), **TP3 = runner** (width projection or prior impulse origin) |
| C2 | Entry at signal-bar close = chasing, often mid-box | `ENTRY_MODE_EDGE_LIMIT` (default): limit order at the structural edge (box edge for range/reclaim, breakout edge for breakouts) with small ATR offset — sniper entry with maximum R:R |
| C3 | No minimum-risk sanity check | Reject degenerate stops (risk < 0.10 ATR) |
| C4 | No trade management guidance | Dashboard PLAN line: TP1 partial + SL→BE, TP2 close most, TP3 trail remainder |

### D. Display / dashboard (your main visual asks)
| # | Issue | Fix in v2 |
|---|-------|-----------|
| D1 | "Box" was two wobbling dashed lines (each bar had its own box) — not a visible box | **Filled structure rectangle** (bordered, drawn behind price) spanning the validated box + extension to the current bar, with a label: setup, score, width in ATR, touches |
| D2 | Entry/SL/TP lines were thin, unlabelled, no prices shown on chart | Bold colour-coded lines (Entry white, SL red width 3, TP1 green, TP2 blue, TP3 gold) + **right-edge price tags with R:R ratios** and ATR-risk annotation |
| D3 | No entry precision visual | **Entry zone shading** around the limit price |
| D4 | Dashboard was plain `Comment()` text (lost on refresh, no colour, tiny) | **Full on-chart panel** (rectangle + monospace labels): status, setup + grade + score, box stats, entry/SL/TP1-3 with pips and R:R, risk % → lot size, confluence checklist `[v]/[x]`, pressure + POC, age/expiry countdown, spread, trade plan |
| D5 | No state tracking — stale levels from ancient signals stayed on screen | Live status machine: `ARMED → IN POSITION → TP1 HIT (SL→BE) → TP2 → TP3`, plus `INVALIDATED` (close beyond SL) and `EXPIRED` (age > 40 bars); levels auto-remove when dead |
| D6 | No alerts at all | Alerts (sound/Alert/push) on new setup and on every status transition, deduplicated |

### E. Footprint / market-structure readouts
| v2 adds | method |
|---|---|
| **POC line** inside the box | volume-weighted price histogram (12 buckets) over the box region — tick-volume approximation |
| **Pressure readout** | directional volume delta Σ((close−open)/range × tick volume) over 20 bars + % buy volume |
| Note | True bid/ask footprint requires tick-level delta data not available to indicators; these are documented approximations, not fabricated "footprint" claims |

## 3. Score model (v2)
| Point | Condition |
|---|---|
| +1 | Validated 3-touch balanced box (both edges) — always |
| +1 | Prior impulse (before the box) aligned with trade direction |
| +1 | H4 close agrees with H4 EMA(50) |
| +1 | Trigger-bar volume expansion (> 1.2 × SMA20) |
| +1 | Quality: RSI divergence on reclaim sweep **or** body/range ≥ 0.35 on range/breakout trigger |

Grade: **A+** = score ≥4, R:R@TP2 ≥ 1.5× min, ≥4 touches; **A** = score ≥3; else **B**.
Default gate: 3/5 (≈ v1's 2/3 but with 2 harder mandatory filters behind it).

## 4. Tuning guide
| Goal | Adjust |
|---|------|
| Fewer, sniper-grade signals | `InpMinimumConfluence = 4`, `InpMinRR = 2.0`, `InpMinBarsBetweenSignals = 8` |
| More signals (reclaim-only specialist) | disable Range + Breakout signals, keep Reclaim; `InpMinimumConfluence = 3` |
| Crypto volatility | `InpMaxBoxWidthATR = 5.0`, `InpRiskBufferATR = 0.30` |
| Tight scalping | `InpSignalMaxAgeBars = 15`, `InpTP1R = 0.8` |
| Session trading only | `InpSessionFilter = true`, set start/end hours (server time) |

## 5. Install
1. Copy `PBD_Crypto_Structure_Indicator_v2.mq5` into `MQL5/Indicators/`.
2. Compile in MetaEditor (F7) — zero errors expected; warnings about implicit casts are eliminated.
3. Drag onto the chart. Enable "Allow DLL imports" is **not** required. For push alerts, enable
   push notifications in Tools → Options → Notifications.

## 6. Caveats
- Backtest before trading: run the Strategy Tester visual mode and validate that historical
  arrows match the rules you expect on your broker's symbols (especially synthetic indices,
  where session/spread behaviour differs).
- `ENTRY_MODE_EDGE_LIMIT` shows a *planned* limit entry; the fill is yours to place.
- Not financial advice. The confluence score is a heuristic quality gauge, not a win probability.
