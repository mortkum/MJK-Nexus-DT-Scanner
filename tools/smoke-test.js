#!/usr/bin/env node
/* ============================================================
   Browser smoke test — drives the real studio like a user.
   ------------------------------------------------------------
   Checks BOTH builds:
     1. the served app on http://studio.test:3002
     2. the single file over file:// (no server, no network)

   Requires puppeteer-core + @sparticuz/chromium reachable from the
   current working directory, and LD_LIBRARY_PATH pointing at the
   extracted al2023 libs. See TESTING.md for setup.

   Usage (from /tmp/shotter, or anywhere with those deps):
     LD_LIBRARY_PATH=/tmp/al2023/lib node tools/smoke-test.js
   ============================================================ */

'use strict';

const path = require('path');
const fs = require('fs');

/* Resolve the browser deps from wherever this is RUN from, not from the
   script's own folder — they usually live in a scratch dir alongside the
   extracted Chromium libs, not in the repo.
   Anchoring createRequire at the cwd also keeps <pkg>/exports resolution
   working for ESM-only packages such as @sparticuz/chromium, which has no
   "main" field and therefore cannot be required by absolute directory. */
const { createRequire } = require('module');

function load(name) {
  const anchors = [
    path.join(process.cwd(), '__resolver__.js'),
    path.join(path.resolve(__dirname, '..'), '__resolver__.js')
  ];

  for (const anchor of anchors) {
    try {
      return createRequire(anchor)(name);
    } catch (e) {
      /* try the next anchor */
    }
  }

  try {
    return require(name);
  } catch (e) {
    return null;
  }
}

const puppeteer = load('puppeteer-core');
const chromiumMod = load('@sparticuz/chromium');
const chromium = chromiumMod && (chromiumMod.default || chromiumMod);

if (!puppeteer || !chromium) {
  console.error('❌ puppeteer-core / @sparticuz/chromium not found.');
  console.error('   Run this from the directory where you installed them,');
  console.error('   or see TESTING.md → "Real browser" for the setup commands.');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'preview');
const SERVED = 'http://studio.test:3002';
const SINGLE_FILE =
  'file://' + path.join(ROOT, 'travel-marketing-studio.html').split(path.sep).join('/');

fs.mkdirSync(OUT, { recursive: true });

let passed = 0;
let failed = 0;

function check(label, ok, detail) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--host-resolver-rules=MAP studio.test 127.0.0.1'],
    defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 2 },
    executablePath: await chromium.executablePath(),
    headless: 'shell'
  });

  const errors = [];
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag} pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`${tag} console: ${m.text()}`);
    });
    page.on('requestfailed', (r) => errors.push(`${tag} reqfail: ${r.url().slice(0, 90)}`));
  };

  /* ---------------- 1. Served app ---------------- */
  console.log('\nSERVED APP  ' + SERVED);

  const page = await browser.newPage();
  watch(page, '[served]');

  const resp = await page.goto(SERVED + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  check('responds 200', resp.status() === 200, `got ${resp.status()}`);
  check('title is the studio', (await page.title()) === 'Travel Marketing Studio');
  check('hero copy', (await page.$eval('.hero__title', (n) => n.textContent))
    .replace(/\s+/g, ' ').trim() === 'Ten channels. One travel brand.');
  check('ten channels', (await page.$$('.channel')).length === 10);
  check('source of truth loaded',
    (await page.$eval('#sourceName', (n) => n.textContent)) ===
      'Invitation-Only Travel & Lifestyle Club');
  check('fonts are real (Fraunces)',
    (await page.$eval('.hero__title', (n) => getComputedStyle(n).fontFamily)).includes('Fraunces'));
  check('fonts finished loading',
    (await page.evaluate(() => document.fonts.status)) === 'loaded');

  /* summary disclosure */
  await page.click('#summaryBlock .summary__toggle');
  await wait(250);
  check('summary expands to "Collapse"',
    (await page.$eval('#summaryToggleLabel', (n) => n.textContent)) === 'Collapse');
  await page.screenshot({ path: path.join(OUT, '01-content-desk.png') });
  await page.click('#summaryBlock .summary__toggle');

  /* routing */
  await page.click('[data-route="library"]');
  await wait(300);
  check('/library route resolves', page.url().endsWith('/library'));
  check('library view visible',
    await page.$eval('#view-library', (n) => !n.classList.contains('is-hidden')));

  await page.click('[data-route="plan"]');
  await wait(300);
  check('distribution plan has 10 rows', (await page.$$('.plan__row')).length === 10);
  await page.click('[data-route="desk"]');
  await wait(250);

  /* write + save */
  await page.click('[data-channel="linkedin"]');
  await wait(400);
  check('drawer opens', await page.$eval('#drawer', (n) => !n.classList.contains('is-hidden')));
  await page.screenshot({ path: path.join(OUT, '02-write-linkedin.png') });
  await page.click('#drawerSaveBtn');
  await wait(400);
  check('piece persists to localStorage',
    (await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tms.pieces.v1.travel') || '[]').length)) === 1);

  /* write all */
  await page.click('#writeAllBtn');
  await wait(700);
  check('write all ten produces 10 pieces',
    (await page.$eval('#navPieceCount', (n) => n.textContent)) === '10');
  await page.screenshot({ path: path.join(OUT, '03-library.png'), fullPage: true });

  /* BluePrint profile */
  await page.click('[data-route="desk"]');
  await page.click('[data-profile="blueprint"]');
  await wait(400);
  check('BluePrint hero swaps',
    (await page.$eval('.hero__title', (n) => n.textContent)).replace(/\s+/g, ' ').trim() ===
      'Ten channels. One blueprint.');
  await page.click('[data-channel="linkedin"]');
  await wait(450);
  check('verbatim original post renders',
    (await page.$eval('#drawerTitle', (n) => n.textContent)).startsWith('Most tech professionals'));
  check('markdown bold becomes <strong>',
    (await page.$$('.drawer__prose strong')).length === 5);
  check('numbered vehicles become an <ol>',
    (await page.$$('.drawer__prose ol > li')).length === 4);
  await page.screenshot({ path: path.join(OUT, '04-blueprint-verbatim.png') });

  /* ---------------- 2. Single file over file:// ---------------- */
  console.log('\nSINGLE FILE  file://');

  const file = await browser.newPage();
  watch(file, '[file]');
  const network = [];
  file.on('request', (r) => {
    if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) network.push(r.url());
  });

  await file.goto(SINGLE_FILE, { waitUntil: 'load' });
  await file.evaluate(() => document.fonts.ready);

  check('opens over file://', (await file.evaluate(() => location.protocol)) === 'file:');
  check('ten channels render', (await file.$$('.channel')).length === 10);
  check('embedded fonts load', (await file.evaluate(() => document.fonts.status)) === 'loaded');
  check('no network requests', network.length === 0, network.slice(0, 3).join(', '));

  await file.click('[data-route="library"]');
  await wait(300);
  check('hash routing works', (await file.evaluate(() => location.hash)) === '#library');
  check('library view visible (file://)',
    await file.$eval('#view-library', (n) => !n.classList.contains('is-hidden')));

  await file.click('[data-route="desk"]');
  await file.click('[data-channel="medium"]');
  await wait(400);
  check('drawer works (file://)',
    await file.$eval('#drawer', (n) => !n.classList.contains('is-hidden')));
  await file.click('#drawerSaveBtn');
  await wait(400);
  check('localStorage works (file://)',
    (await file.evaluate(() =>
      JSON.parse(localStorage.getItem('tms.pieces.v1.travel') || '[]').length)) === 1);
  await file.screenshot({ path: path.join(OUT, '05-single-file.png') });

  await browser.close();

  /* ---------------- report ---------------- */
  console.log('\n' + '-'.repeat(56));
  console.log(`📊 SMOKE TEST: ${passed} Passed, ${failed} Failed.`);
  if (errors.length) {
    console.log('\nBrowser errors:');
    [...new Set(errors)].slice(0, 8).forEach((e) => console.log('  ! ' + e));
  } else {
    console.log('✅ No page errors, no failed requests.');
  }
  console.log(`Screenshots → ${path.relative(process.cwd(), OUT)}`);
  console.log('-'.repeat(56));

  process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\n❌ FAILED:', e.message);
  if (/libnspr4|libnss3/.test(e.message)) {
    console.error('   Run with: LD_LIBRARY_PATH=/tmp/al2023/lib node tools/smoke-test.js');
  }
  process.exit(1);
});
