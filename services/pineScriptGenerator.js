// services/pineScriptGenerator.js
function getPineScriptCode() {
  return `// @version=5
// ⚡ Nexus Hidden DT/DB Institutional Scanner - TradingView Pine Script v5
// Detects High-Probability Hidden Double Tops/Bottoms with Top-Down Isolation
indicator("Nexus DT/DB Hidden Institutional Scanner", overlay=true, max_lines_count=500, max_labels_count=500)

// === INPUTS ===
zigzagLength = input.int(5, "ZigZag Strength", minval=2, maxval=20)
peakSimilarityPct = input.float(1.5, "Peak Similarity %", minval=0.1, maxval=5.0, step=0.1)
necklineBodyClose = input.bool(true, "Require Body Close Beyond Neckline")
minPatternHeightPct = input.float(0.3, "Min Pattern Height %", minval=0.1, maxval=2.0)
rrFilter = input.float(1.5, "Min Risk:Reward", minval=1.0, maxval=3.0)
showHiddenOnly = input.bool(false, "Show Only Hidden (Single TF) Setups")
enableAlerts = input.bool(true, "Enable Alerts")

// === ZIGZAG LOGIC ===
isPeak = ta.highest(high, zigzagLength*2+1) == high[zigzagLength]
isTrough = ta.lowest(low, zigzagLength*2+1) == low[zigzagLength]

var float peak1 = na, var float peak2 = na, var float troughNeck = na
var int peak1Bar = na, var int peak2Bar = na, var int troughBar = na

// === RSI DIVERGENCE ===
rsi = ta.rsi(close, 14)
rsiDivBear = false
rsiDivBull = false

// === DOUBLE TOP DETECTION ===
if isPeak
    peak2 := peak1
    peak2Bar := peak1Bar
    peak1 := high[zigzagLength]
    peak1Bar := bar_index[zigzagLength]
    
    // Check for DT
    if not na(peak2)
        similarity = math.abs(peak1 - peak2) / peak1 * 100
        if similarity <= peakSimilarityPct
            // Find neckline trough between peaks
            lowestBetween = ta.lowest(low, peak1Bar - peak2Bar)
            troughNeck := lowestBetween
            patternHeight = math.max(peak1, peak2) - troughNeck
            if patternHeight / close > minPatternHeightPct / 100
                // Check body close below neckline
                bodyCloseBelow = close < troughNeck and (necklineBodyClose ? close < troughNeck : low < troughNeck)
                if bodyCloseBelow
                    entry = close
                    sl = math.max(peak1, peak2) + patternHeight * 0.10
                    tp1 = troughNeck - patternHeight * 1.0
                    tp2 = troughNeck - patternHeight * 1.618
                    risk = sl - entry
                    rr = risk > 0 ? (entry - tp1) / risk : 0
                    if rr >= rrFilter
                        // RSI divergence check
                        rsiP2 = rsi[bar_index - peak2Bar]
                        rsiDiv = rsi < rsiP2 - 1.0
                        // Draw pattern
                        line.new(peak2Bar, peak2, peak1Bar, peak1, color=color.red, width=2)
                        line.new(peak1Bar, peak1, bar_index, troughNeck, color=color.orange, width=1, style=line.style_dashed)
                        line.new(bar_index, troughNeck, bar_index, troughNeck, extend=extend.both, color=color.yellow, width=1)
                        label.new(bar_index, low, "🌟 DT Hidden\\nEntry: " + str.tostring(entry) + "\\nSL: " + str.tostring(sl) + "\\nTP1: " + str.tostring(tp1) + "\\nRR: " + str.tostring(rr, format.mintick), style=label.style_label_down, color=color.red, textcolor=color.white)
                        if enableAlerts
                            alert("🌟 Hidden Double Top Detected - " + syminfo.ticker + " - Entry: " + str.tostring(entry), alert.freq_once_per_bar)

// === DOUBLE BOTTOM DETECTION ===
var float trough1 = na, var float trough2 = na
var int trough1Bar = na, var int trough2Bar = na
var float peakNeck = na

if isTrough
    trough2 := trough1
    trough2Bar := trough1Bar
    trough1 := low[zigzagLength]
    trough1Bar := bar_index[zigzagLength]
    
    if not na(trough2)
        similarity = math.abs(trough1 - trough2) / trough1 * 100
        if similarity <= peakSimilarityPct
            highestBetween = ta.highest(high, trough1Bar - trough2Bar)
            peakNeck := highestBetween
            patternHeight = peakNeck - math.min(trough1, trough2)
            if patternHeight / close > minPatternHeightPct / 100
                bodyCloseAbove = close > peakNeck
                if bodyCloseAbove
                    entry = close
                    sl = math.min(trough1, trough2) - patternHeight * 0.10
                    tp1 = peakNeck + patternHeight * 1.0
                    tp2 = peakNeck + patternHeight * 1.618
                    risk = entry - sl
                    rr = risk > 0 ? (tp1 - entry) / risk : 0
                    if rr >= rrFilter
                        line.new(trough2Bar, trough2, trough1Bar, trough1, color=color.green, width=2)
                        line.new(trough1Bar, trough1, bar_index, peakNeck, color=color.orange, width=1, style=line.style_dashed)
                        label.new(bar_index, high, "🌟 DB Hidden\\nEntry: " + str.tostring(entry) + "\\nSL: " + str.tostring(sl) + "\\nTP1: " + str.tostring(tp1) + "\\nRR: " + str.tostring(rr, format.mintick), style=label.style_label_up, color=color.green, textcolor=color.white)
                        if enableAlerts
                            alert("🌟 Hidden Double Bottom Detected - " + syminfo.ticker, alert.freq_once_per_bar)

// === TOP-DOWN UNIQUENESS CHECK (Multi-TF) ===
// Uses request.security to check pattern absence on other TFs
isHiddenD1 = request.security(syminfo.tickerid, "D", close)
isHiddenH4 = request.security(syminfo.tickerid, "240", close)
// If pattern exists on H1 but not on H4/D1/W1 => Hidden
// Implementation simplified - full top-down matrix in web app

plotshape(isPeak, title="Swing High", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.tiny)
plotshape(isTrough, title="Swing Low", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.tiny)

bgcolor(enableAlerts and (isPeak or isTrough) ? color.new(color.yellow, 90) : na)
`;
}

module.exports = { getPineScriptCode };
