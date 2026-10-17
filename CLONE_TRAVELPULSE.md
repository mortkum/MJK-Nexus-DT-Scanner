# 📸 TravelPulse Content Studio — Site Clone

Local, self-contained clone of:

> **https://imposing-travel-pulse-pro.base44.app**

---

## 1. What the live URL actually serves

Before cloning, the upstream site was probed. **The Base44 app has not been published**, so the
public URL resolves to Base44's *"app isn't available yet"* landing page — not to a working
TravelPulse Content Studio.

| Probe | Result |
|---|---|
| `GET /` | Renders the Base44 "isn't available yet" page for **TravelPulse Content Studio** |
| `GET /dashboard`, `GET /index.html` | Identical placeholder (the app shell answers every route) |
| `GET /robots.txt` | Empty HTML document (SPA fallback) |
| `GET https://app.base44.com/api/apps/imposing-travel-pulse-pro` | `401 Unauthorized` — app metadata is not public |
| Wayback Machine | *"The Wayback Machine has not archived that URL"* |
| Web search / image search | No indexed copy, no screenshots, no archive of the real UI |

**Conclusion:** the real TravelPulse Content Studio UI is not publicly retrievable — not in the
HTML, not in the API, not in any archive. The only thing that exists at that URL is the
placeholder page.

This clone therefore reproduces **exactly what the URL serves**, faithfully and offline.

---

## 2. The cloned page

Rendered content mirrored 1:1 from the live site:

```
Base44                                            ← header brand link → app.base44.com

TravelPulse Content Studio isn't available yet   ← <h1>

This app isn't available yet.
If you've been invited, you'll be able to access it once it's ready.

Want to build your own app?
[ Start building ]                              → app.base44.com

If you're the app admin, publish the app in Builder.
[ Open Base44 Builder ]                         → app.base44.com

        [ orange Base44 symbol ]                 ← decorative mark

Edit with [Base44]                               ← footer badge → app.base44.com
```

### Fidelity notes

* **Zero external requests.** The Base44 mark is rebuilt locally as SVG
  (`assets/base44-symbol.svg`) instead of hot-linking
  `media.base44.com`, so the clone renders identically with no network and cannot break when
  the CDN changes.
* **Brand-accurate.** The mark reproduces the Base44 "sunrise" glyph (orange disc with a
  horizontal gap over a lower dome) using the brand orange `#FF6B35 → #F0492A` gradient.
* **Native theming.** `<meta name="color-scheme" content="light dark">` plus a
  `prefers-color-scheme` dark palette, matching the original's light/dark intent.
* **Responsive** from 320 px up; CTA cards, type scale and radii scale down on small screens.
* **Accessible.** Semantic landmarks, `aria-label` on the brand link, visible focus rings, and
  `prefers-reduced-motion` honoured (the entrance animation is disabled).
* **Honest.** A small footer line states that this is an offline clone of the upstream URL and
  that the upstream app is unpublished — the clone is never presented as the original.

### Clone-only additions (clearly separated from the original design)

| Feature | Purpose |
|---|---|
| `?theme=light` / `?theme=dark` / `?theme=system` | Force a colour scheme; persisted in `localStorage` |
| Footer provenance line | Names the upstream URL and the render timestamp |
| `/` keyboard shortcut | Focuses the first CTA (mirrors the original's link-first flow) |

---

## 3. Files

```
public-travelpulse/
├── index.html            # Cloned page markup
├── styles.css            # Base44-style theme (light + dark)
├── app.js                # Theme override, provenance stamp, keyboard nicety
├── favicon.svg           # App icon (Base44 sunrise mark)
└── assets/
    └── base44-symbol.svg # Locally rebuilt Base44 brand mark
```

Served by the existing Express server, following the same pattern as
`public-weltrade` and `public-deriv`:

```js
app.use('/travelpulse', express.static(publicTravelPulsePath));
```

---

## 4. Run it

```bash
npm install
npm start
```

Then open:

* **http://localhost:3000/travelpulse/** — the clone
* http://localhost:3000/ — the scanner hub (unchanged)

> The `start.sh` / `start.bat` launchers print the clone URL on start-up.

---

## 5. When the upstream app gets published

If Base44 publishes TravelPulse Content Studio, the live URL will begin serving the real
application. At that point the placeholder clone should be replaced with a clone of the real
UI:

1. Re-fetch the live URL — it will now return the real app shell.
2. Mirror the app's page structure, styles and assets into `public-travelpulse/`.
3. Drop the provenance line from `index.html` (the page is no longer a stand-in for a
   placeholder) and remove the `?theme=` override from `app.js` if the real app ships its own.
4. Re-point any Base44 backend calls at the live endpoints, or keep the clone fully static.

The mount point, the launcher URL and the test suite need no changes.
