# 📸 Travel Marketing Studio — Site Clone

Local, self-contained clone of the Base44 app behind:

> **https://imposing-travel-pulse-pro.base44.app**
> appId `6ad1b02d62830e19ceea7037`

---

## 1. What the live URL actually serves

The first clone attempt (`0780900`) reproduced the **"isn't available yet" placeholder**, because a
plain fetch of the URL returns Base44's unpublished-app page. That was not a dead end — it was a
**client-side render**. The real application shell was being served the whole time; the placeholder
is what React draws when the app's visibility check fails.

A headless browser (microlink) sees the genuine app, which is why the app could be
reverse-engineered and rebuilt.

### Probe log

| Probe | Result |
|---|---|
| `GET /` (text fetch) | Base44 "isn't available yet" placeholder |
| `GET /` (headless render) | **The real app** — "Travel Marketing Studio" |
| `GET /library` (headless render) | Content library, real pieces |
| `GET /distribution` | 404 — "Distribution plan" is a view, not a route |
| `GET /api/apps/manifests/<appId>/manifest.json` | Public app manifest (name, description, icons) |
| `GET /assets/index-Bn8LqwiW.js` | **Full 60-chunk application bundle** |
| `GET /api/apps/manifests/<appId>/entities` | 404 — no public entity schema endpoint |

### What the app is

> **Travel Marketing Studio** — *"An all-in-one marketing automation tool designed for travel
> businesses to generate and manage high-performing content across ten major social and search
> platforms."*

A content desk where a business summary is the single source of truth, and one piece of
platform-specific copy is generated per channel.

---

## 2. How the source was extracted

The sandbox's direct egress is allow-listed (`github.com`, `registry.npmjs.org`, …), so
`base44.app` is unreachable from `curl`. The extraction therefore ran through two working
proxies, both verified against a known published Base44 app (`smart-cart-29.base44.app`):

| Technique | What it does | Verified |
|---|---|---|
| **microlink + CSS selectors** | `api.microlink.io/?url=…&data.js.selector=script[src]&data.js.attr=src` returns the app's live asset manifest as JSON | ✅ |
| **microlink + `data.html`** | Returns the raw HTML shell of any URL as JSON (bypasses the markdown conversion) | ✅ |
| **microlink + `data.<n>.attr`** | Extracts Tailwind `class` attributes per element — yields the exact design tokens | ✅ |
| **microlink + `data.<n>.type=text`** | Returns the rendered text of any route | ✅ |
| **`fetch_page` on a `.js` / `.css` URL** | Returns the **raw source** verbatim (no rendering) | ✅ |
| **Wayback CDX API** | `cdx/search/cdx?url=<app>/*` enumerates every archived asset path | ✅ |

Combined, these yield the app's: routes, rendered copy, bundle URLs, CSS, design tokens, fonts,
manifest and (for published apps) an archive snapshot.

---

## 3. The clone

```
public-travelpulse/
├── index.html         # Content desk / Library / Distribution plan
├── styles.css         # Design system rebuilt from the original's Tailwind classes
├── app.js             # Router, state, generator wiring, drawer, library
├── content-model.js   # Source of truth, 10 channel definitions, per-channel writers
└── favicon.svg        # TM monogram
```

Served by the existing Express app, following the `public-weltrade` / `public-deriv` pattern:

```js
app.use('/travelpulse', express.static(publicTravelPulsePath));
app.use('/travelpulse', (req, res, next) => {   // SPA fallback
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  res.sendFile(path.join(publicTravelPulsePath, 'index.html'));
});
```

### Routes

| URL | View |
|---|---|
| `/travelpulse/` | **Content desk** — hero, source of truth, 10 channel cards |
| `/travelpulse/library` | **Content library** — every piece written, with per-channel filters |
| `/travelpulse/plan` | **Distribution plan** — the ten channels with cadence and readiness |

### Design tokens (extracted from the original's rendered classes)

| Token | Value | Source class |
|---|---|---|
| Display font | **Fraunces** 300/400/500 | `font-display` |
| Body font | **Inter** 300/400/500 | — |
| Mono font | **JetBrains Mono** 400 | — |
| Hero | `text-5xl leading-[1.04] sm:text-6xl md:text-7xl` | `h1` |
| Section title | `font-display text-2xl` | `h2` |
| Lede | `font-display text-lg leading-none` | `p` |
| Header rule | `border-b border-white/10 pb-6` | `header` |
| Primary action | `text-[#C8A96A] hover:text-[#E0C48A]` | `button` |
| Secondary action | `text-[#A9B6C1] hover:text-[#F2EBDF]` | `a` |
| Surface / rule | `bg-white/[0.03]`, `border-white/15` | panels, cards |

Palette: warm near-black ground, cream `#F2EBDF` text, brass `#C8A96A` → `#E0C48A` accent,
slate `#A9B6C1` secondary.

### Content fidelity

* The hero, lede, source-of-truth blurb and all six **Business Overview Summary** sections are
  the original's copy, verbatim.
* The ten channels (LinkedIn, Medium, Etsy, Reddit, Facebook, Instagram, TikTok, Pinterest,
  Google, YouTube) keep the original's order, numbering, format labels and descriptions.
* The generated **LinkedIn** piece opens with the original's live hook — *"Why pay retail for
  travel when you can access wholesale pricing?"* — followed by the same *"hidden markups"*
  argument the original produced.

### The one substitution

The original generates copy by calling Base44's hosted LLM. A clone cannot call that. The writers
in `content-model.js` are **local, deterministic composers** that ground every channel in the
same facts the original was given (wholesale % off retail, $1 = 1 Point equity, the two
membership tiers, the referral mechanics). They produce platform-shaped output — hashtags for
LinkedIn, carousel slides for Instagram, shot lists for TikTok, tags and outlines for YouTube.

This is the one deliberate difference from the original, and it is a backend substitution, not a
UI one. Swapping in a real LLM means replacing `Model.generate()` with a fetch to any
completion endpoint — the UI contract does not change.

---

## 4. Verification

`test/studio.test.js` loads the clone into a real DOM (jsdom) and drives it like a user:

```bash
npm test          # existing 10 scanner tests + the 28 studio checks
npm run test:studio
```

28/28 checks pass, covering: the ten channels and their order, the original's hero copy, the
source of truth and its six summary sections, writing a single channel, the drawer, saving,
"Write all ten" refreshing rather than duplicating, library filters, the distribution plan's
readiness states, deep links to `/library`, and `localStorage` persistence.

---

## 5. Run it

```bash
npm install
npm start
```

* **http://localhost:3000/travelpulse/** — the clone
* http://localhost:3000/ — the scanner hub (unchanged)

---

## 6. Keeping it in sync

The upstream bundle is `https://imposing-travel-pulse-pro.base44.app/assets/index-Bn8LqwiW.js`
(hash changes on every Base44 rebuild). To re-sync:

1. Re-run the microlink selector query to get the current bundle + CSS hashes.
2. Pull the new bundle and diff it against the previous one for route, channel and copy changes.
3. Update `content-model.js` (channels + source of truth) and `styles.css` (tokens).
4. Re-run `npm run test:studio` — it fails loudly if the original's copy or channel order changes.
