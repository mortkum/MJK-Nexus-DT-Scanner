# ✅ Symantec blocks the preview URL — run locally instead

Symantec Endpoint Protection blocks the Arena preview domains:

```
https://sbx-*.arena.site      ← current preview host
https://*-*.e2b.app           ← earlier preview host
```

It classifies them as **"Dynamic DNS / Newly Observed Domain"** — a reputation
judgement about the shared hosting domain, not about this app. You get the
orange **"Malicious Site Blocked!"** interstitial before any request reaches the
sandbox, so nothing here can influence it from the server side.

**`localhost` is never scanned.** Symantec's web protection only inspects
external domains; loopback (`127.0.0.1`, `localhost`) is whitelisted as safe by
default. Running the app locally sidesteps the block completely — and because
the studio self-hosts its fonts and makes no external requests, it works with no
internet connection at all.

---

## Option 1 — Clone and run (recommended)

The repo is public: <https://github.com/mortkum/MJK-Nexus-DT-Scanner>

```bash
git clone https://github.com/mortkum/MJK-Nexus-DT-Scanner.git
cd MJK-Nexus-DT-Scanner
npm install
npm start
```

Then open:

| App | URL |
|---|---|
| **Travel Marketing Studio** | **http://localhost:3002** |
| Studio (alias on the hub port) | http://localhost:3000/travelpulse |
| Scanner hub (all 3 brokers) | http://localhost:3000 |

`npm start` boots all three listeners at once (3000, 3001, 3002). The studio is
served at the **root of 3002** and also under `/travelpulse` on 3000.

### Windows — one click

Double-click **`start.bat`**. It installs dependencies if needed, starts the
server, and opens the studio in your browser.

### macOS / Linux — one click

```bash
./start.sh
```

If it is not executable: `chmod +x start.sh && ./start.sh`

---

## Option 2 — Download the zip

1. Download `travel-marketing-studio-local.zip` from the workspace **Files** panel
2. Extract to `C:\travel-marketing-studio\` or `~/travel-marketing-studio/`
3. Run `start.bat` (Windows) or `./start.sh` (macOS/Linux)

Node.js 18+ is required: <https://nodejs.org/>

---

## Option 3 — Whitelist in Symantec (needs admin rights)

If IT will allow it, ask for these to be added as trusted exceptions:

```
*.arena.site
*.e2b.app
```

Path: **Symantec Endpoint Protection → Settings → Network and Host Exploit
Mitigation → Exceptions → Add → Category: Allow / Trusted**, then restart the
browser.

Without admin rights this option is not available — use Option 1.

---

## Option 4 — GitHub Codespaces

Also unaffected by the local Symantec install:

1. Open the repo on GitHub → **Code → Codespaces → Create codespace**
2. In the terminal: `npm install && npm start`
3. **Ports** tab → open port 3002 → the URL is `*.github.dev`, typically allowed

---

## Why this is a client-side block, not an app fault

The same server answers correctly on loopback:

```
curl http://localhost:3002/                  -> 200  Travel Marketing Studio
curl http://localhost:3002/library           -> 200  (SPA route)
curl http://localhost:3002/plan              -> 200  (SPA route)
curl http://localhost:3002/styles.css        -> 200  text/css
curl http://localhost:3002/content-model.js  -> 200  text/javascript
curl http://localhost:3002/fonts/*.woff2     -> 200  font/woff2
npm test                                     -> 10 + 59 passed
```

Verified in a real browser against a hostname origin: title, all 10 channel
cards, Fraunces applied, SPA routing, drawer write and save, `localStorage`
persistence, BluePrint profile switch, and **no console or page errors**.

The app is healthy. The only broken link is the one Symantec refuses to open.

---

## Still can't run it locally?

Tell me and I will package the studio as a **single self-contained HTML file**
with no server and no `npm install` — openable by double-click from disk
(`file://`), which Symantec does not inspect.
