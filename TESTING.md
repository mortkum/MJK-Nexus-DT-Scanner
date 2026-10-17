# 🧪 How to test the studio in this sandbox / workspace

Three levels, fastest first. All of them work **inside the sandbox** — you do not
need the Symantec-blocked preview domain for any of them.

---

## 1. Automated tests (no browser, ~1 second)

```bash
cd /home/user/MJK-Nexus-DT-Scanner
npm test
```

Expected output — **83 checks, all passing**:

```
📊 TEST RESULTS: 10 Passed, 0 Failed.     ← scanner suite
✅ ALL CRITERIA VERIFIED & COMPLIANT WITH TRADING RULES!
📊 TEST RESULTS: 59 Passed, 0 Failed.     ← studio suite (jsdom)
✅ TRAVEL MARKETING STUDIO CLONE VERIFIED!
📊 TEST RESULTS: 14 Passed, 0 Failed.     ← single-file build guard
✅ SINGLE-FILE BUILD VERIFIED!
```

Individual suites:

```bash
npm run test:studio       # 59 — the studio only
npm run test:standalone   # 14 — rebuilds the single file and re-verifies it
node test/run-tests.js    # 10 — scanner
```

---

## 2. HTTP smoke test (no browser)

```bash
cd /home/user/MJK-Nexus-DT-Scanner
npm start        # or: node server.js
```

Then, in a second shell:

```bash
for p in / /library /plan /styles.css /app.js /content-model.js; do
  printf "%-18s " "$p"
  curl -sS -o /dev/null -w "HTTP %{http_code}  %{size_download}b\n" "http://localhost:3002$p"
done
```

Every route must be **200** with a non-zero size:

```
/                  HTTP 200  6087b     ← the studio
/library           HTTP 200  6087b     ← SPA route
/plan              HTTP 200  6087b     ← SPA route
/styles.css        HTTP 200  19767b
/app.js            HTTP 200  24007b
/content-model.js  HTTP 200  45542b
```

Confirm it is the studio (not the scanner) at the root:

```bash
curl -sS http://localhost:3002/ | grep -o "<title>[^<]*</title>"
# <title>Travel Marketing Studio</title>
```

The scanner still lives on the same port and must stay reachable:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3002/deriv   # 301 → /deriv/
curl -sS http://localhost:3002/api/watchlist | head -c 80               # Deriv JSON
```

---

## 3. Real browser (this is the real check)

The sandbox has no system browser, so the repo-agnostic harness uses
`puppeteer-core` + `@sparticuz/chromium`. If `/tmp/shotter` is gone (it is wiped
between sessions), rebuild it:

```bash
mkdir -p /tmp/shotter && cd /tmp/shotter && npm init -y >/dev/null
npm install --no-save puppeteer-core @sparticuz/chromium

# Chromium needs NSS libs that @sparticuz/chromium ships but does not extract
node -e "const fs=require('fs'),z=require('zlib');
fs.writeFileSync('/tmp/al2023.tar', z.brotliDecompressSync(
  fs.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')))"
mkdir -p /tmp/al2023 && tar -xf /tmp/al2023.tar -C /tmp/al2023
```

Then run the smoke test that lives in the repo:

```bash
cd /tmp/shotter
LD_LIBRARY_PATH=/tmp/al2023/lib:$LD_LIBRARY_PATH \
  node /home/user/MJK-Nexus-DT-Scanner/tools/smoke-test.js
```

It loads both **the served app on port 3002** and **the single file over
`file://`**, drives them like a user, and prints a pass/fail line per check plus
screenshots into `preview/`.

> `LD_LIBRARY_PATH=/tmp/al2023/lib` is required. Without it Chromium dies with
> `libnspr4.so: cannot open shared object file`.

### Why it talks to `studio.test`, not `localhost`

The harness maps `studio.test` to `127.0.0.1` with a Chromium host-resolver rule
instead of using `localhost`. That proves the app does not depend on the
`localhost` origin — it behaves the same behind the Arena preview proxy, which
serves it from a different hostname.

---

## 4. Testing the Symantec-blocked preview

You cannot paste the `*.arena.site` / `*.e2b.app` URL into a normal browser on
your machine — Symantec blocks it before the request leaves your PC, and the
sandbox also requires a traffic token only the Arena proxy injects.

Inside the sandbox the app is reachable at `http://localhost:3002` exactly as it
is in the preview, so the harness above is the truthful test. If you need to see
it in *your* browser, use the standalone HTML file (no server, no domain, no
Symantec involvement) — see `LOCAL_RUN_BYPASS_SYMANTEC.md`.

---

## What "passing" looks like

```
title     : Travel Marketing Studio
hero      : Ten channels. One travel brand.
channels  : 10
source    : Invitation-Only Travel & Lifestyle Club
font      : Fraunces
fontsReady: loaded
url/lib   : http://studio.test:3002/library
plan rows : 10
drawer    : true
stored    : 1
bp hero   : Ten channels. One blueprint.
errors    : none
```

For the single file, additionally:

```
protocol  : file:
network   : none (fully offline)
```
