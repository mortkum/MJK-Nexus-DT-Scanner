/* ============================================================
   Travel Marketing Studio — DOM smoke test
   ------------------------------------------------------------
   Loads the cloned studio into a real DOM (jsdom) and drives
   the same interactions a user performs: render the desk,
   write a single channel, write all ten, browse the library.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIR = path.join(__dirname, '..', 'public-travelpulse');

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`• ${label}... PASSED`);
  } else {
    failed++;
    console.log(`• ${label}... FAILED${detail ? ' — ' + detail : ''}`);
  }
}

function boot(url) {
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const model = fs.readFileSync(path.join(DIR, 'content-model.js'), 'utf8');
  const app = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');

  const dom = new JSDOM(html, {
    url: url,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });

  const { window } = dom;
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.eval(model);
  window.eval(app);
  return window;
}

console.log('\n========================================================');
console.log('📸 TRAVEL MARKETING STUDIO — CLONE TEST SUITE');
console.log('========================================================\n');

/* ---------- 1. Content desk renders all ten channels ---------- */

const win = boot('https://studio.test/travelpulse/');
const doc = win.document;

const channels = doc.querySelectorAll('.channel');
check('Content desk renders 10 channel cards', channels.length === 10, `got ${channels.length}`);

const channelNames = Array.from(channels).map((c) => c.querySelector('.channel__name').textContent);
const expected = [
  'LinkedIn', 'Medium', 'Etsy', 'Reddit', 'Facebook',
  'Instagram', 'TikTok', 'Pinterest', 'Google', 'YouTube'
];
check('Channels match the original order', JSON.stringify(channelNames) === JSON.stringify(expected),
  channelNames.join(', '));

check('Hero headline matches the original copy',
  doc.querySelector('.hero__title').textContent.replace(/\s+/g, ' ').trim() ===
  'Ten channels. One travel brand.');

check('Source of truth is loaded',
  doc.getElementById('sourceStatus').textContent === 'Loaded' &&
  doc.getElementById('sourceName').textContent === 'Invitation-Only Travel & Lifestyle Club');

check('Business Overview Summary has all 6 sections',
  doc.querySelectorAll('.summary__section').length === 6,
  `got ${doc.querySelectorAll('.summary__section').length}`);

check('New channels start with "No content yet"',
  doc.querySelector('.channel__state').textContent === 'No content yet');

/* ---------- 1b. Distribution plan before anything is written ---------- */

doc.querySelector('[data-route="plan"]').click();
const planRows = doc.querySelectorAll('.plan__row');
check('Distribution plan lists all 10 channels', planRows.length === 10, `got ${planRows.length}`);
check('Plan marks unwritten channels',
  planRows[0].querySelector('.plan__desc').textContent.includes('not written yet'));
doc.querySelector('[data-route="desk"]').click();

/* ---------- 2. Writing a single channel ---------- */

doc.querySelector('[data-channel="linkedin"]').click();

const drawer = doc.getElementById('drawer');
check('Write opens the piece drawer', !drawer.classList.contains('is-hidden'));
check('Drawer shows the channel eyebrow',
  doc.getElementById('drawerEyebrow').textContent === '01 · LinkedIn',
  doc.getElementById('drawerEyebrow').textContent);
check('LinkedIn hook matches the original copy',
  doc.getElementById('drawerTitle').textContent ===
  'Why pay retail for travel when you can access wholesale pricing?');
check('Drawer body carries the generated copy',
  doc.querySelectorAll('.drawer__text')[1].textContent.includes('hidden markups'));
check('Extras are rendered (Tone / Length)',
  doc.querySelectorAll('.drawer__extra').length === 2);

doc.getElementById('drawerSaveBtn').click();
check('Saving closes the drawer', drawer.classList.contains('is-hidden'));
check('Piece count updates to 1',
  doc.getElementById('navPieceCount').textContent === '1',
  doc.getElementById('navPieceCount').textContent);
check('Channel card now shows "1 piece"',
  doc.querySelector('[data-channel="linkedin"]')
    .closest('.channel')
    .querySelector('.channel__state').textContent === '1 piece');

/* ---------- 3. Write all ten ---------- */

doc.getElementById('writeAllBtn').click();
check('Write all ten produces 10 pieces',
  doc.getElementById('navPieceCount').textContent === '10',
  doc.getElementById('navPieceCount').textContent);

const pieces = doc.querySelectorAll('.piece');
check('Library lists every piece', pieces.length === 10, `got ${pieces.length}`);
check('Library routes to the library view',
  !doc.getElementById('view-library').classList.contains('is-hidden'));

const filters = doc.querySelectorAll('.filter');
check('Library offers "All channels" + 10 filters', filters.length === 11, `got ${filters.length}`);

doc.querySelector('[data-filter="etsy"]').click();
check('Channel filter narrows the library',
  doc.querySelectorAll('.piece').length === 1,
  `got ${doc.querySelectorAll('.piece').length}`);

doc.querySelector('[data-filter="all"]').click();
check('Resetting the filter restores all pieces',
  doc.querySelectorAll('.piece').length === 10);

/* ---------- 4. Distribution plan ---------- */

doc.querySelector('[data-route="plan"]').click();
const planRowsAfter = doc.querySelectorAll('.plan__row');
check('Plan marks written channels',
  planRowsAfter[0].querySelector('.plan__desc').textContent.includes('piece ready to post'));
check('Plan marks all ten as ready once written',
  Array.from(planRowsAfter).every((r) =>
    r.querySelector('.plan__desc').textContent.includes('piece ready to post')));

/* ---------- 5. Deep link to /library renders the library ---------- */

const win2 = boot('https://studio.test/travelpulse/library');
check('Deep link to /library opens the library view',
  !win2.document.getElementById('view-library').classList.contains('is-hidden') &&
  win2.document.getElementById('view-desk').classList.contains('is-hidden'));

const win3 = boot('https://studio.test/travelpulse/');
check('Unknown routes fall back to the content desk',
  !win3.document.getElementById('view-desk').classList.contains('is-hidden'));

/* ---------- 6. Persistence ---------- */

const stored = JSON.parse(win.localStorage.getItem('tms.pieces.v1') || '[]');
check('Pieces are persisted to localStorage', stored.length === 10, `got ${stored.length}`);
check('Stored pieces keep their channel, title and body',
  stored.every((p) => p.channel && p.title && p.body));

console.log('\n--------------------------------------------------------');
console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed.`);
if (failed === 0) {
  console.log('✅ TRAVEL MARKETING STUDIO CLONE VERIFIED!');
} else {
  console.log('❌ SOME CHECKS FAILED');
}
console.log('--------------------------------------------------------\n');

process.exit(failed === 0 ? 0 : 1);
