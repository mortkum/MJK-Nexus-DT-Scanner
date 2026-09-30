// public-weltrade/settings.js - MT5 setup UI controller

const el = {
  statusRow:   document.getElementById('statusRow'),
  statusGrid:  document.getElementById('statusGrid'),
  connectForm: document.getElementById('connectForm'),
  login:       document.getElementById('login'),
  password:    document.getElementById('password'),
  server:      document.getElementById('server'),
  path:        document.getElementById('path'),
  connectBtn:  document.getElementById('connectBtn'),
  autoDetectBtn: document.getElementById('autoDetectBtn'),
  autoDetectResult: document.getElementById('autoDetectResult'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  forgetBtn:   document.getElementById('forgetBtn'),
  downloadMqlBtn: document.getElementById('downloadMqlBtn'),
  downloadPineBtn: document.getElementById('downloadPineBtn'),
  toasts:      document.getElementById('toasts'),
};

function toast(msg, kind = 'info', ttl = 4000) {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  el.toasts.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, ttl);
}

function pill(text, cls) {
  return `<span class="pill ${cls}">${text}</span>`;
}

async function refreshStatus() {
  try {
    const [health, credStatus, account] = await Promise.all([
      fetch('/api/weltrade/bridge/health').then(r => r.json()).catch(() => ({})),
      fetch('/api/weltrade/bridge/credentials/status').then(r => r.json()).catch(() => ({})),
      fetch('/api/weltrade/bridge/account').then(r => r.json()).catch(() => ({})),
    ]);

    // Top row
    let html = '';
    if (health && health.connected) {
      html += pill('🟢 LIVE MT5 CONNECTED', 'green') + ' ';
      html += `<span style="color:#94a3b8; margin-left:8px; font-size:13px;">Login: <b>${health.login}</b> · Server: <b>${health.server}</b></span>`;
    } else if (health && health.mt5_available) {
      html += pill('🟡 BRIDGE READY · NOT CONNECTED', 'amber');
      if (credStatus.saved) {
        html += `<span style="color:#94a3b8; margin-left:8px; font-size:13px;">Saved credentials for login <b>${credStatus.login}</b> on <b>${credStatus.server}</b></span>`;
      }
    } else if (health && health.status === 'unreachable') {
      html += pill('🔴 BRIDGE UNREACHABLE', 'red') + ' ';
      html += `<span style="color:#94a3b8; margin-left:8px; font-size:13px;">Start <code>weltrade_mt5_bridge.py</code> or install Python + MetaTrader5 package</span>`;
    } else {
      html += pill('⚪ INITIALIZING', 'gray');
    }
    el.statusRow.innerHTML = html;

    // Grid
    let grid = '';
    const cells = [
      ['MT5 Package',     health && health.mt5_available ? '✅ Available' : '❌ Missing', health && health.mt5_available ? 'val' : 'val' ],
      ['Bridge Port',     health && health.mt5_available ? `${health.symbols_live || 0} symbols` : 'N/A', ''],
      ['Connection',      health && health.connected ? '🟢 Connected' : (health && health.mt5_available ? '🟡 Ready' : '🔴 Offline'), ''],
      ['Last Error',      (health && health.last_error) ? health.last_error : 'None', ''],
    ];
    if (account && !account.error) {
      cells.push(['Balance', `$${Number(account.balance || 0).toFixed(2)}`, '']);
      cells.push(['Equity',  `$${Number(account.equity  || 0).toFixed(2)}`, '']);
      cells.push(['Leverage', account.leverage ? `1:${account.leverage}` : '-', '']);
      cells.push(['Currency', account.currency || '-', '']);
    }
    cells.forEach(([lbl, val, _]) => {
      grid += `<div class="status-cell"><div class="lbl">${lbl}</div><div class="val">${val}</div></div>`;
    });
    el.statusGrid.innerHTML = grid;
  } catch (e) {
    el.statusRow.innerHTML = pill('⚠️ Error', 'red') + ' ' + e.message;
  }
}

el.connectBtn.addEventListener('click', async () => {
  const login = el.login.value.trim();
  const password = el.password.value;
  const server = el.server.value.trim() || 'Weltrade-Live';
  const path = el.path.value.trim() || undefined;
  if (!login || !password) {
    toast('Login and password are required', 'error');
    return;
  }
  el.connectBtn.disabled = true;
  el.connectBtn.textContent = '⏳ Connecting...';
  try {
    const res = await fetch('/api/weltrade/bridge/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password, server, path }),
    });
    const data = await res.json();
    if (data.success) {
      toast(`✅ Connected to ${server} (${data.symbols_available} symbols available)`, 'success', 6000);
      el.password.value = '';
    } else {
      toast('❌ ' + (data.error || 'Connection failed'), 'error', 8000);
    }
  } catch (e) {
    toast('❌ ' + e.message, 'error', 8000);
  } finally {
    el.connectBtn.disabled = false;
    el.connectBtn.textContent = '🔌 Connect to MT5';
    refreshStatus();
  }
});

el.disconnectBtn.addEventListener('click', async () => {
  if (!confirm('Disconnect from MT5?')) return;
  try {
    await fetch('/api/weltrade/bridge/disconnect', { method: 'POST' });
    toast('Disconnected', 'success');
  } catch (e) { toast(e.message, 'error'); }
  refreshStatus();
});

el.autoDetectBtn.addEventListener('click', async () => {
  el.autoDetectBtn.disabled = true;
  el.autoDetectBtn.textContent = '⏳ Detecting...';
  el.autoDetectResult.innerHTML = '<span style="color:#94a3b8">Searching for your Weltrade MT5 terminal...</span>';
  try {
    // Pass the user-supplied MT5 path if they filled one in
    const body = {};
    if (el.path && el.path.value && el.path.value.trim()) {
      body.path = el.path.value.trim();
    }
    const res = await fetch('/api/weltrade/bridge/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      // Auto-fill the form so the user sees what was detected
      el.login.value = data.login || '';
      // Pick matching server option if it exists, otherwise use value
      const serverOpt = Array.from(el.server.options).find(o => o.value === data.server);
      if (serverOpt) el.server.value = data.server;
      else {
        const opt = document.createElement('option');
        opt.value = data.server; opt.textContent = data.server + ' (auto-detected)';
        el.server.appendChild(opt);
        el.server.value = data.server;
      }
      el.autoDetectResult.innerHTML = `
        <div style="background:rgba(0,230,118,0.10); border:1px solid #00e676; border-radius:8px; padding:10px; margin-top:8px;">
          ✅ <b>Connected to your running MT5!</b><br>
          <span style="color:#94a3b8; font-size:12px;">
            Login <b>${data.login}</b> · Server <b>${data.server}</b> · ${data.name || ''}<br>
            Balance <b>$${Number(data.balance||0).toFixed(2)}</b> · ${data.leverage ? '1:'+data.leverage : ''} · ${data.symbols_available} symbols live
          </span>
        </div>
      `;
      toast('🎉 Auto-detected your Weltrade MT5 — connected!', 'success', 6000);
    } else {
      el.autoDetectResult.innerHTML = `
        <div style="background:rgba(239,68,68,0.10); border:1px solid #ef4444; border-radius:8px; padding:10px; margin-top:8px;">
          ⚠️ <b>Could not auto-detect MT5</b><br>
          <span style="color:#cbd5e0; font-size:12px;">${data.error || 'Unknown error'}</span><br>
          <span style="color:#94a3b8; font-size:11px;">Make sure Weltrade MT5 is open and you're logged in, then try again.</span>
        </div>
      `;
      toast('Auto-detect failed — see below', 'error', 6000);
    }
  } catch (e) {
    el.autoDetectResult.innerHTML = `<div style="color:#ef4444">❌ ${e.message}</div>`;
  } finally {
    el.autoDetectBtn.disabled = false;
    el.autoDetectBtn.textContent = '🔍 Auto-Detect From Open MT5';
    refreshStatus();
  }
});

el.forgetBtn.addEventListener('click', async () => {
  if (!confirm('Delete saved credentials from this PC?')) return;
  try {
    await fetch('/api/weltrade/bridge/credentials', { method: 'DELETE' });
    toast('Credentials deleted', 'success');
  } catch (e) { toast(e.message, 'error'); }
  refreshStatus();
});

el.downloadMqlBtn.addEventListener('click', async () => {
  const res = await fetch('/api/code/mql5?broker=weltrade');
  const text = await res.text();
  downloadFile(text, 'Nexus_HiddenDT_DB_Weltrade.mq5');
});
el.downloadPineBtn.addEventListener('click', async () => {
  const res = await fetch('/api/code/weltrade-pinescript');
  const text = await res.text();
  downloadFile(text, 'Nexus_HiddenDT_DB_Weltrade.pine');
});

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Downloaded ${filename}`, 'success');
}

// Auto-poll status every 5 seconds
refreshStatus();
setInterval(refreshStatus, 5000);
