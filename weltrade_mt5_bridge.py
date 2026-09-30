#!/usr/bin/env python3
"""
Weltrade MT5 Bridge - Production-Grade Python Service
======================================================

This bridge connects to your Weltrade MT5 terminal and exposes
real-time OHLCV candle data + symbol metadata over a local HTTP API
on port 5555.

It is consumed by the Node.js scanner (services/weltradeBridgeService.js).

Endpoints:
  GET  /health                      - Bridge status + connection info
  GET  /symbols                     - All available Weltrade symbols
  GET  /symbols/category/<cat>      - Filter by category (syntx, volatility, fxvol, etc)
  GET  /candles?symbol=X&tf=Y&n=120 - OHLCV candles (tf: M15,H1,H2,H4,D1,W1)
  POST /connect                     - Connect to MT5 with credentials
                                     Body: {login, password, server, path?}
  POST /disconnect                  - Disconnect from MT5
  GET  /account                     - Account info (balance, equity, leverage)

Setup:
  1. pip install MetaTrader5 flask flask-cors pandas numpy
  2. Install the Weltrade MT5 terminal from https://weltrade.com
  3. Run: python weltrade_mt5_bridge.py
  4. Open the web scanner at http://localhost:3001
"""

import os
import sys
import time
import json

# Force UTF-8 stdout/stderr so emoji and unicode characters print correctly
# on Windows (where the default codec is cp1252 which can't handle ⚡ etc).
# If the reconfigure fails (e.g. older Python), fall back to replacing the
# stdout/stderr with a UTF-8 wrapper.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import logging
from datetime import datetime, timezone
from threading import Lock

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    print("[WARN] MetaTrader5 package not installed. Run: pip install MetaTrader5")

try:
    import pandas as pd
    import numpy as np
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

from flask import Flask, jsonify, request
from flask_cors import CORS

# ----------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger('weltrade-bridge')

# ----------------------------------------------------------------------
# Timeframe mapping (string <-> MT5 constant)
# ----------------------------------------------------------------------
TIMEFRAME_MAP = {
    'M15': mt5.TIMEFRAME_M15 if MT5_AVAILABLE else 15,
    'H1':  mt5.TIMEFRAME_H1  if MT5_AVAILABLE else 16385,
    'H2':  mt5.TIMEFRAME_H2  if MT5_AVAILABLE else 16386,
    'H4':  mt5.TIMEFRAME_H4  if MT5_AVAILABLE else 16388,
    'D1':  mt5.TIMEFRAME_D1  if MT5_AVAILABLE else 16408,
    'W1':  mt5.TIMEFRAME_W1  if MT5_AVAILABLE else 32769,
}

# ----------------------------------------------------------------------
# Symbol categorization (Weltrade-specific)
# ----------------------------------------------------------------------
def categorize_symbol(name: str) -> str:
    """Categorize a Weltrade symbol based on its name."""
    n = name.upper()
    if 'SYNTX' in n:
        return 'syntx'
    if 'PAINX' in n:
        return 'painx'
    if 'GAINX' in n:
        return 'gainx'
    if 'FXVOL' in n or 'SFXVOL' in n:
        return 'fxvol'
    if 'VOL' in n and any(d in n for d in ['10','25','50','75','100','150','250']):
        return 'volatility'
    if 'CRASH' in n or 'BOOM' in n:
        return 'crashboom'
    if 'SWITCHX' in n or 'BREAKX' in n or 'TRENDX' in n or 'FLIPX' in n:
        return 'regime'
    if any(idx in n for idx in ['US30','NAS','SPX','US500','GER','UK100','JPN225','AUS200','FRA40','EUSTX50']):
        return 'cfd_indices'
    if any(m in n for m in ['USD','EUR','GBP','JPY','AUD','NZD','CAD','CHF']) and len(n) <= 8:
        return 'forex'
    if any(m in n for m in ['XAU','XAG','OIL','BRENT','WTI','GAS','COPPER']):
        return 'commodities'
    if any(c in n for c in ['BTC','ETH','LTC','XRP','BCH','SOL','ADA','DOGE','BNB','DOT']):
        return 'crypto'
    return 'other'


# ----------------------------------------------------------------------
# Complete Weltrade Watchlist (matches actual MT5 symbol names from the
# user's Weltrade-Real server as of 2026-09-29)
# Symbol names use the EXACT spelling from MT5 (including spaces).
# ----------------------------------------------------------------------
WELTRADE_CANONICAL_WATCHLIST = [
    # ----- FX Vol Series (the main Weltrade synthetic volatility index family) -----
    {'symbol': 'FX Vol 20',  'name': 'FX Vol 20',  'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FX Vol 40',  'name': 'FX Vol 40',  'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FX Vol 60',  'name': 'FX Vol 60',  'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FX Vol 80',  'name': 'FX Vol 80',  'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FX Vol 99',  'name': 'FX Vol 99',  'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'SFX Vol 20', 'name': 'SFX Vol 20', 'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'SFX Vol 40', 'name': 'SFX Vol 40', 'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'SFX Vol 60', 'name': 'SFX Vol 60', 'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'SFX Vol 80', 'name': 'SFX Vol 80', 'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'SFX Vol 99', 'name': 'SFX Vol 99', 'category': 'fxvol', 'pip_size': 0.01, 'min_lot': 0.01},

    # ----- FlipX Series (50% direction change) -----
    {'symbol': 'FlipX 1', 'name': 'FlipX 1', 'category': 'flipx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FlipX 2', 'name': 'FlipX 2', 'category': 'flipx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FlipX 3', 'name': 'FlipX 3', 'category': 'flipx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FlipX 4', 'name': 'FlipX 4', 'category': 'flipx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FlipX 5', 'name': 'FlipX 5', 'category': 'flipx', 'pip_size': 0.01, 'min_lot': 0.01},

    # ----- PainX Series (growing index with periodic drops) -----
    {'symbol': 'PainX 400',  'name': 'PainX 400',  'category': 'painx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'PainX 600',  'name': 'PainX 600',  'category': 'painx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'PainX 800',  'name': 'PainX 800',  'category': 'painx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'PainX 999',  'name': 'PainX 999',  'category': 'painx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'PainX 1200', 'name': 'PainX 1200', 'category': 'painx', 'pip_size': 0.01, 'min_lot': 0.01},

    # ----- GainX Series (decreasing index with periodic jumps) -----
    {'symbol': 'GainX 400',  'name': 'GainX 400',  'category': 'gainx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'GainX 600',  'name': 'GainX 600',  'category': 'gainx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'GainX 800',  'name': 'GainX 800',  'category': 'gainx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'GainX 999',  'name': 'GainX 999',  'category': 'gainx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'GainX 1200', 'name': 'GainX 1200', 'category': 'gainx', 'pip_size': 0.01, 'min_lot': 0.01},

    # ----- SwitchX (reverse on each jump) -----
    {'symbol': 'SwitchX 600',  'name': 'SwitchX 600',  'category': 'switchx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'SwitchX 1200', 'name': 'SwitchX 1200', 'category': 'switchx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'SwitchX 1800', 'name': 'SwitchX 1800', 'category': 'switchx', 'pip_size': 0.01, 'min_lot': 0.01},

    # ----- BreakX (reverse on jump level crossing) -----
    {'symbol': 'BreakX 600',  'name': 'BreakX 600',  'category': 'breakx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'BreakX 1200', 'name': 'BreakX 1200', 'category': 'breakx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'BreakX 1800', 'name': 'BreakX 1800', 'category': 'breakx', 'pip_size': 0.01, 'min_lot': 0.01},

    # ----- TrendX (reverse on jump forming new trend) -----
    {'symbol': 'TrendX 600',  'name': 'TrendX 600',  'category': 'trendx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'TrendX 1200', 'name': 'TrendX 1200', 'category': 'trendx', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'TrendX 1800', 'name': 'TrendX 1800', 'category': 'trendx', 'pip_size': 0.01, 'min_lot': 0.01},

    # ----- Step growth variants -----
    {'symbol': 'PlusX 1', 'name': 'PlusX 1', 'category': 'step', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'FiboX',   'name': 'FiboX',   'category': 'step', 'pip_size': 0.01, 'min_lot': 0.01},
    {'symbol': 'QuadX',   'name': 'QuadX',   'category': 'step', 'pip_size': 0.01, 'min_lot': 0.01},

    # ----- MAX PainX / GainX (growing jump size and frequency, 3-digit precision) -----
    {'symbol': 'MAX PainX 1000', 'name': 'MAX PainX 1000', 'category': 'maxpainx', 'pip_size': 0.001, 'min_lot': 0.01},
    {'symbol': 'MAX GainX 1000', 'name': 'MAX GainX 1000', 'category': 'maxgainx', 'pip_size': 0.001, 'min_lot': 0.01},
    {'symbol': 'MAX PainX 2000', 'name': 'MAX PainX 2000', 'category': 'maxpainx', 'pip_size': 0.001, 'min_lot': 0.01},
    {'symbol': 'MAX GainX 2000', 'name': 'MAX GainX 2000', 'category': 'maxgainx', 'pip_size': 0.001, 'min_lot': 0.01},
]


# ----------------------------------------------------------------------
# Flask App
# ----------------------------------------------------------------------
app = Flask(__name__)
CORS(app)

# Shared state
state = {
    'connected': False,
    'login': None,
    'server': None,
    'last_error': None,
    'last_symbols_refresh': 0,
    'live_symbols': [],     # Symbols actually available in the connected MT5
    'lock': Lock(),
}


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def find_meta(symbol: str):
    """Find canonical metadata for a symbol, falling back to a generic record.
    Accepts both 'FXvol40' and 'FX Vol 40' (case-insensitive, space-insensitive)."""
    if not symbol:
        return None
    normalized = ''.join(symbol.split()).lower()  # strip spaces, lowercase
    for entry in WELTRADE_CANONICAL_WATCHLIST:
        if entry['symbol'].lower() == symbol.lower():
            return entry
        if ''.join(entry['symbol'].split()).lower() == normalized:
            return entry
    return {
        'symbol': symbol,
        'name': symbol,
        'category': categorize_symbol(symbol),
        'pip_size': 0.01,
        'min_lot': 0.01,
    }


def resolve_mt5_symbol(symbol: str) -> str:
    """Translate user-friendly names (e.g. 'FXvol40', 'fx vol 40') to the exact
    MT5 symbol name (e.g. 'FX Vol 40'). Returns symbol unchanged if not found.
    """
    if not symbol:
        return symbol
    normalized = ''.join(symbol.split()).lower()
    for entry in WELTRADE_CANONICAL_WATCHLIST:
        if entry['symbol'].lower() == symbol.lower():
            return entry['symbol']
        if ''.join(entry['symbol'].split()).lower() == normalized:
            return entry['symbol']
    return symbol


def live_symbol_names():
    """Return the list of canonical MT5 symbol names that are currently
    visible/selected in Market Watch (i.e. the user has them on chart).
    """
    if not MT5_AVAILABLE or not state['connected']:
        return []
    out = []
    try:
        all_syms = mt5.symbols_get() or []
        for s in all_syms:
            if s.visible or s.select:
                out.append(s.name)
    except Exception:
        pass
    return out


def to_candle_dict(rate) -> dict:
    """Convert an MT5 rate tuple into the JSON shape consumed by the scanner."""
    return {
        'time':  int(rate['time']),
        'open':  float(rate['open']),
        'high':  float(rate['high']),
        'low':   float(rate['low']),
        'close': float(rate['close']),
        'volume': int(rate['tick_volume']) if rate['tick_volume'] else int(rate['real_volume'] or 0),
    }


def fetch_candles(symbol: str, timeframe: str, count: int):
    """Pull N most-recent candles from MT5 for a symbol/timeframe.
    Returns (candles_list, display_scale, raw_point, display_multiplier).
    """
    if not MT5_AVAILABLE or not state['connected']:
        raise RuntimeError('MT5 not connected. POST /connect first.')

    tf_const = TIMEFRAME_MAP.get(timeframe.upper())
    if tf_const is None:
        raise ValueError(f'Unknown timeframe: {timeframe}')

    # Translate user-friendly names (e.g. 'FXvol40', 'fx vol 40') to the
    # exact MT5 symbol name (e.g. 'FX Vol 40')
    resolved = resolve_mt5_symbol(symbol)

    # Make sure symbol is selected in Market Watch
    if not mt5.symbol_select(resolved, True):
        err = mt5.last_error()
        raise RuntimeError(f'symbol_select({resolved}) failed: {err}')

    rates = mt5.copy_rates_from_pos(resolved, tf_const, 0, int(count))
    if rates is None or len(rates) == 0:
        err = mt5.last_error()
        raise RuntimeError(f'copy_rates_from_pos failed for {resolved} {timeframe}: {err}')

    # ------------------------------------------------------------------
    # Synthetic index price scaling (Weltrade quirk).
    #
    # Weltrade synthetic indices (FXvol, SyntX, Volatility, Crash/Boom,
    # etc.) are quoted internally at a much smaller scale than what
    # the MT5 terminal displays. For example, MT5 shows FXvol40 at
    # ~179,329 but copy_rates_from_pos() returns values around 2045.
    #
    # We probe with symbol_info_tick() to derive the display scale,
    # then scale all OHLC values by 10^scale so the scanner chart
    # matches what the user sees in the MT5 terminal.
    # ------------------------------------------------------------------
    display_scale = 0
    display_multiplier = 1.0  # actual float multiplier (may not be exactly 10^n)
    raw_point = 0.0
    info = mt5.symbol_info(symbol)
    if info is not None:
        raw_point = float(info.point) if info.point else 0.0
        try:
            tick = mt5.symbol_info(symbol + '_tick') if False else mt5.symbol_info_tick(symbol)
            if tick is not None and tick.ask > 0 and tick.bid > 0:
                last_mid = (tick.ask + tick.bid) / 2.0
                if rates is not None and len(rates) > 0:
                    last_close = float(rates[-1]['close'])
                    if last_close > 0:
                        ratio = last_mid / last_close
                        log.info(f'[scale-probe] {symbol}: tick_mid={last_mid:.4f}, last_close={last_close:.4f}, ratio={ratio:.4f}, info.digits={info.digits}, info.point={info.point}')
                        if ratio >= 5:
                            # Use the actual ratio as the multiplier so we
                            # handle Weltrade's non-power-of-10 scales
                            # (e.g. FXvol40 ratio ~87.7, not exactly 100).
                            display_multiplier = ratio
                            import math
                            display_scale = int(round(math.log10(ratio)))
                            log.info(f'[scale-probe] {symbol}: APPLIED multiplier={display_multiplier:.4f}, scale={display_scale}')
                        else:
                            log.info(f'[scale-probe] {symbol}: ratio<5, no scaling')
        except Exception as e:
            log.warning(f'[scale-probe] {symbol}: probe failed: {e}')

    def _scale(v):
        if v is None:
            return None
        if display_multiplier != 1.0:
            return float(v) * display_multiplier
        return float(v)

    if PANDAS_AVAILABLE:
        df = pd.DataFrame(rates)
        df['time'] = df['time'].astype(int)
        candles = df[['time', 'open', 'high', 'low', 'close', 'tick_volume', 'real_volume']].to_dict('records')
        out = []
        for r in candles:
            out.append({
                'time':   int(r['time']),
                'open':   _scale(r['open']),
                'high':   _scale(r['high']),
                'low':    _scale(r['low']),
                'close':  _scale(r['close']),
                'volume': int(r['tick_volume'] or r['real_volume'] or 0),
            })
        return out, display_scale, raw_point, display_multiplier

    out = [{
        'time':   int(r['time']),
        'open':   _scale(r['open']),
        'high':   _scale(r['high']),
        'low':    _scale(r['low']),
        'close':  _scale(r['close']),
        'volume': int(r['tick_volume'] or r['real_volume'] or 0),
    } for r in rates]
    return out, display_scale, raw_point, display_multiplier


# ----------------------------------------------------------------------
# Endpoints
# ----------------------------------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    with state['lock']:
        return jsonify({
            'service': 'weltrade-mt5-bridge',
            'status': 'ok' if state['connected'] else 'disconnected',
            'mt5_available': MT5_AVAILABLE,
            'connected': state['connected'],
            'login': state['login'],
            'server': state['server'],
            'last_error': state['last_error'],
            'symbols_known': len(WELTRADE_CANONICAL_WATCHLIST),
            'symbols_live': len(state['live_symbols']),
            'uptime_iso': datetime.now(timezone.utc).isoformat(),
        })


@app.route('/probe/<symbol>', methods=['GET'])
def probe_symbol(symbol: str):
    """Diagnostic: return raw MT5 symbol info + tick + last candle close
    so we can debug price scaling issues. Replace < > with %3C %3E in URLs."""
    if not MT5_AVAILABLE:
        return jsonify({'error': 'MetaTrader5 package not installed'}), 503
    if not state['connected']:
        return jsonify({
            'error': 'MT5 not connected',
            'connected': False,
            'mt5_available': True,
            'last_error': state.get('last_error'),
        }), 503
    resolved = resolve_mt5_symbol(symbol)
    info = mt5.symbol_info(resolved)
    tick = mt5.symbol_info_tick(resolved)
    rates = mt5.copy_rates_from_pos(resolved, TIMEFRAME_MAP.get('M15', 15), 0, 2)
    last_close = None
    if rates is not None and len(rates) > 0:
        last_close = float(rates[-1]['close'])
    last_mid = None
    if tick is not None:
        last_mid = (tick.ask + tick.bid) / 2.0
    ratio = None
    if last_mid and last_close:
        ratio = last_mid / last_close
    return jsonify({
        'symbol': symbol,
        'connected': True,
        'digits': info.digits if info else None,
        'point': float(info.point) if info and info.point else None,
        'tick_ask': tick.ask if tick else None,
        'tick_bid': tick.bid if tick else None,
        'tick_mid': last_mid,
        'last_candle_close': last_close,
        'ratio_tick_to_close': ratio,
        'suggested_multiplier': round(ratio) if ratio and ratio > 5 else 1.0,
    })


@app.route('/symbols-search', methods=['GET'])
def symbols_search():
    """Diagnostic: search MT5 for symbols matching a query.
    Usage: GET /symbols-search?q=fxvol
    Returns all symbols whose name contains the query (case-insensitive),
    plus a small subset of their info (digits, point, currency, path).
    Use ?all=1 to dump all symbols (warning: large).
    """
    if not MT5_AVAILABLE or not state['connected']:
        return jsonify({'error': 'MT5 not connected', 'connected': state['connected']}), 503
    q = (request.args.get('q') or '').lower().strip()
    dump_all = request.args.get('all') in ('1', 'true', 'yes')
    if not q and not dump_all:
        return jsonify({'error': 'q query param required (or ?all=1 to dump everything)'}), 400
    all_symbols = mt5.symbols_get() or []
    matches = []
    for s in all_symbols:
        is_match = dump_all or (q and (q in s.name.lower() or q in (s.path or '').lower()))
        if not is_match:
            continue
        try:
            info = mt5.symbol_info(s.name)
            matches.append({
                'name': s.name,
                'path': s.path,
                'description': s.description,
                'digits': info.digits if info else None,
                'point': float(info.point) if info and info.point else None,
                'currency_base': s.currency_base,
                'currency_profit': s.currency_profit,
                'visible': s.visible,
                'selected': s.select,
            })
        except Exception as e:
            matches.append({'name': s.name, 'path': s.path, 'error': str(e)})
        if len(matches) >= 200:
            break
    # Also test if our resolved MT5 names actually fetch live data
    test_results = []
    if not dump_all and q:
        # Try fetching live tick for each Weltrade canonical symbol
        for entry in WELTRADE_CANONICAL_WATCHLIST[:10]:  # sample
            sym = entry['symbol']
            if q.replace(' ', '') in sym.replace(' ', '').lower():
                tick = mt5.symbol_info_tick(sym)
                rates = mt5.copy_rates_from_pos(sym, 15, 0, 2)  # M15
                last_close = None
                if rates is not None and len(rates) > 0:
                    last_close = float(rates[-1]['close'])
                test_results.append({
                    'symbol': sym,
                    'tick_ask': tick.ask if tick else None,
                    'tick_bid': tick.bid if tick else None,
                    'last_close_M15': last_close,
                })
    return jsonify({
        'query': q or '*',
        'matched': len(matches),
        'total_symbols': len(all_symbols),
        'matches': matches,
        'live_test_results': test_results,
    })


@app.route('/connect', methods=['POST'])
def connect():
    if not MT5_AVAILABLE:
        return jsonify({'success': False, 'error': 'MetaTrader5 package not installed. Run: pip install MetaTrader5'}), 500

    body = request.get_json(silent=True) or {}
    login    = body.get('login')
    password = body.get('password')
    server   = body.get('server', 'Weltrade-Live')
    path     = body.get('path')  # optional explicit terminal64.exe path

    if not login or not password:
        return jsonify({'success': False, 'error': 'login and password are required'}), 400

    # Initialize MT5 terminal (with optional path)
    init_kwargs = {}
    if path:
        init_kwargs['path'] = path
    if not mt5.initialize(**init_kwargs):
        err = mt5.last_error()
        return jsonify({'success': False, 'error': f'mt5.initialize failed: {err}. Verify Weltrade MT5 is installed.'}), 500

    # Authorize
    authorized = mt5.login(
        login=int(login),
        password=str(password),
        server=str(server),
    )
    if not authorized:
        err = mt5.last_error()
        mt5.shutdown()
        return jsonify({'success': False, 'error': f'Login failed: {err}. Check credentials and server name.'}), 401

    with state['lock']:
        state['connected'] = True
        state['login'] = login
        state['server'] = server
        state['last_error'] = None

    # Cache symbols available on the broker
    refresh_symbols()

    return jsonify({
        'success': True,
        'login': login,
        'server': server,
        'symbols_available': len(state['live_symbols']),
    })


@app.route('/disconnect', methods=['POST'])
def disconnect():
    if MT5_AVAILABLE and state['connected']:
        mt5.shutdown()
    with state['lock']:
        state['connected'] = False
        state['live_symbols'] = []
    return jsonify({'success': True})


@app.route('/detect', methods=['GET', 'POST'])
def detect_terminal():
    """Auto-detect: read the already-logged-in MT5 terminal without needing
    a separate login. If a user already has Weltrade MT5 open and logged in
    (the common case), this endpoint grabs the account info and starts
    streaming candles immediately — no password required.

    Returns:
        200 if MT5 terminal is reachable and a session is active
        503 if MT5 is not installed / running / not logged in
    """
    if not MT5_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'MetaTrader5 package not installed. Run: pip install MetaTrader5',
        }), 503

    # Try multiple candidate paths for the Weltrade MT5 terminal.
    # Weltrade installs to a non-standard folder, so the default lookup often fails.
    candidates = []
    # 0. Body-supplied path from the settings UI (highest priority - user explicit)
    body_data = request.get_json(silent=True) or {}
    body_path = body_data.get('path') if isinstance(body_data, dict) else None
    if body_path:
        candidates.insert(0, body_path)
    # 1. Env var override
    mt5_path = os.environ.get('MT5_PATH')
    if mt5_path:
        candidates.append(mt5_path)
    # 2. Common Weltrade install paths on Windows
    candidates += [
        r'C:\Program Files\Weltrade MetaTrader 5\terminal64.exe',
        r'C:\Program Files (x86)\Weltrade MetaTrader 5\terminal64.exe',
        r'C:\Program Files\Weltrade MetaTrader 5\terminal.exe',
        r'C:\Program Files (x86)\Weltrade MetaTrader 5\terminal.exe',
        # Standard MetaTrader5 install paths as fallback
        r'C:\Program Files\MetaTrader 5\terminal64.exe',
        r'C:\Program Files (x86)\MetaTrader 5\terminal64.exe',
        os.path.expanduser('~\\AppData\\Roaming\\Weltrade MetaTrader 5\\terminal64.exe'),
        os.path.expanduser('~\\AppData\\Roaming\\MetaTrader 5\\terminal64.exe'),
    ]
    # 3. Add any saved terminal path from credentials file
    creds_file = os.path.expanduser('~/.weltrade-credentials.json')
    if os.path.exists(creds_file):
        try:
            with open(creds_file, 'r') as f:
                c = json.load(f)
                if c.get('path'):
                    candidates.insert(0, c['path'])
        except Exception:
            pass

    init_kwargs = {}
    last_err = None
    attached = False

    # First try with no path (let MT5 find itself if running)
    try:
        if mt5.initialize():
            attached = True
            log.info('Attached to MT5 without explicit path')
        else:
            last_err = mt5.last_error()
    except Exception as e:
        last_err = repr(e)

    # If that fails, try each candidate path
    if not attached:
        for path in candidates:
            if not path or not os.path.exists(path):
                continue
            try:
                if mt5.initialize(path=path):
                    attached = True
                    log.info(f'Attached to MT5 at: {path}')
                    break
                else:
                    last_err = mt5.last_error()
            except Exception as e:
                last_err = repr(e)
                continue

    if not attached:
        return jsonify({
            'success': False,
            'error': f'Cannot attach to MT5. Tried {len(candidates)+1} paths. Last error: {last_err}. Make sure Weltrade MT5 is running and try setting the path field manually.',
            'candidates_tried': [p for p in candidates if p and os.path.exists(p)],
        }), 503

    # Check if there's already an active session (user logged in manually)
    account = mt5.account_info()
    if account is None:
        err = mt5.last_error()
        mt5.shutdown()
        return jsonify({
            'success': False,
            'error': f'MT5 has no active session. Please log into your Weltrade account in MT5 first, then click Auto-Detect again. ({err})',
        }), 503

    # Success! Lock in the session
    with state['lock']:
        state['connected'] = True
        state['login'] = account.login
        state['server'] = account.server
        state['last_error'] = None

    # Cache symbols
    refresh_symbols()

    return jsonify({
        'success': True,
        'login': account.login,
        'server': account.server,
        'name': account.name,
        'company': account.company,
        'currency': account.currency,
        'balance': float(account.balance),
        'equity': float(account.equity),
        'leverage': account.leverage,
        'symbols_available': len(state['live_symbols']),
        'message': 'Connected to your running MT5 terminal. No password needed.',
    })


@app.route('/account', methods=['GET'])
def account():
    if not MT5_AVAILABLE or not state['connected']:
        return jsonify({'error': 'Not connected'}), 400
    info = mt5.account_info()
    if info is None:
        return jsonify({'error': mt5.last_error()}), 500
    return jsonify({
        'login':         info.login,
        'name':          info.name,
        'server':        info.server,
        'currency':      info.currency,
        'balance':       float(info.balance),
        'equity':        float(info.equity),
        'margin':        float(info.margin),
        'free_margin':   float(info.margin_free),
        'leverage':      info.leverage,
        'company':       info.company,
    })


@app.route('/symbols', methods=['GET'])
def list_symbols():
    """Return merged canonical watchlist + any live symbols from MT5."""
    category = request.args.get('category')
    out = list(WELTRADE_CANONICAL_WATCHLIST)
    if state['live_symbols']:
        # Mark which symbols are confirmed live in the connected MT5
        live_set = {s.upper() for s in state['live_symbols']}
        for entry in out:
            entry['live'] = entry['symbol'].upper() in live_set
    if category:
        out = [e for e in out if e['category'] == category]
    return jsonify({'broker': 'Weltrade', 'count': len(out), 'watchlist': out})


@app.route('/symbols/category/<category>', methods=['GET'])
def list_by_category(category):
    out = [e for e in WELTRADE_CANONICAL_WATCHLIST if e['category'] == category]
    return jsonify({'category': category, 'count': len(out), 'watchlist': out})


@app.route('/candles', methods=['GET'])
def get_candles():
    symbol     = request.args.get('symbol')
    timeframe  = request.args.get('tf', 'H1')
    count      = int(request.args.get('n', 120))

    if not symbol:
        return jsonify({'error': 'symbol query param required'}), 400

    if not MT5_AVAILABLE or not state['connected']:
        # Graceful degradation: signal Node side to use fallback simulation
        return jsonify({
            'error': 'MT5 not connected',
            'connected': False,
            'symbol': symbol,
            'timeframe': timeframe,
        }), 503

    try:
        result = fetch_candles(symbol, timeframe, count)
        # Backwards-compat: if fetch_candles returns a tuple, unpack it.
        if isinstance(result, tuple) and len(result) == 4:
            candles, display_scale, raw_point, display_multiplier = result
        elif isinstance(result, tuple) and len(result) == 3:
            candles, display_scale, raw_point = result
            display_multiplier = (10 ** display_scale) if display_scale else 1.0
        else:
            candles = result
            display_scale = 0
            raw_point = 0.0
            display_multiplier = 1.0
        meta = find_meta(symbol)
        if meta is None:
            meta = {}
        meta['display_scale'] = display_scale
        meta['raw_point'] = raw_point
        meta['display_multiplier'] = display_multiplier
        return jsonify({
            'symbol': symbol,
            'timeframe': timeframe,
            'count': len(candles),
            'meta': meta,
            'display_scale': display_scale,
            'candles': candles,
            'connected': True,
        })
    except Exception as e:
        log.exception('candles fetch failed')
        return jsonify({'error': str(e), 'symbol': symbol, 'timeframe': timeframe}), 500


@app.route('/refresh-symbols', methods=['POST'])
def refresh_symbols():
    """Pull fresh list of symbols actually available in the connected MT5."""
    if not MT5_AVAILABLE or not state['connected']:
        return jsonify({'error': 'Not connected'}), 400
    symbols = mt5.symbols_get()
    if symbols is None:
        return jsonify({'error': mt5.last_error()}), 500
    with state['lock']:
        state['live_symbols'] = [s.name for s in symbols]
        state['last_symbols_refresh'] = time.time()
    return jsonify({'live_count': len(state['live_symbols'])})


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
if __name__ == '__main__':
    port = int(os.environ.get('WELTRADE_BRIDGE_PORT', 5555))
    host = os.environ.get('WELTRADE_BRIDGE_HOST', '0.0.0.0')

    print('=' * 60)
    print('⚡ Weltrade MT5 Bridge - Starting up')
    print('=' * 60)
    print(f'MT5 package available: {MT5_AVAILABLE}')
    print(f'Pandas available:      {PANDAS_AVAILABLE}')
    print(f'Canonical symbols:     {len(WELTRADE_CANONICAL_WATCHLIST)}')
    print(f'Listening on:          {host}:{port}')
    print('=' * 60)
    print('Awaiting POST /connect from the Node.js scanner...')
    print('You can also test manually:')
    print('   curl http://localhost:%d/health' % port)
    print('=' * 60)

    app.run(host=host, port=port, debug=False, threaded=True)
