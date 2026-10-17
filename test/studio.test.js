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

/* ---------- 1a. Source of truth is the verbatim original ---------- */

const EXPECTED_SECTIONS = [
  ['Core Model & Value Proposition',
   'The business is a private, invitation-only travel and lifestyle club that bypasses traditional retail booking markups to offer direct wholesale member pricing (up to 70% off retail) across more than 1 million properties worldwide.'],
  ['Dollar-for-Dollar Travel Equity',
   'All membership fees function like a vacation savings account. Every dollar spent converts 1-for-1 into travel equity points ($1 = 1 Point), which members use to buy down out-of-pocket costs on curated, 4- and 5-star "Premium Escapes".'],
  ['Membership Pricing Tiers',
   'African Launch Regional Tier: $250 initial setup + $50/month (yields 250 initial travel points + 50 points/month).\nGlobal Tier: $450 initial setup + $99/month (yields 600 initial travel points + 100 points/month).'],
  ['Operational Cost Elimination ("Get 4, Pay No More")',
   "Referring 4 active members permanently waives the member's monthly membership dues. Even with $0 out-of-pocket monthly fees, the member continues to accrue their monthly travel equity points for free."],
  ['Compensation & Residual Wealth Engine',
   'Ambassadors earn income by sharing the opportunity through a Two-Team (binary) referral network:\nResidual Growth: Monthly residual income scales based on total team volume, ranging from $50/month (5 members left / 5 right) up to $85,000/month (5,000 left / 5,000 right).\n30-Day Launch Multiplier: Hitting a reduced $5,000 regional volume target in the first 30 days triggers a doubled "Amplify Bonus," generating up to $1,400 in initial fast-start earnings.'],
  ['Duplication & Closing System',
   'The business runs on a tool-driven duplication model - ambassadors share a standardized 20-minute recorded video overview rather than making sales pitches. Prospects are categorized at the end using an A/B/C Framework:\nPath A: All-in Brand Ambassador + Member.\nPath B: Traveling Customer only.\nPath C: Not a fit.']
];

const renderedSections = Array.from(doc.querySelectorAll('.summary__section')).map((s) => [
  s.querySelector('h4').textContent,
  s.querySelector('p').textContent
]);

check('Every summary section matches the verbatim original text',
  JSON.stringify(renderedSections) === JSON.stringify(EXPECTED_SECTIONS));

check('Source of truth name and blurb match the original',
  doc.getElementById('sourceName').textContent === 'Invitation-Only Travel & Lifestyle Club' &&
  doc.getElementById('sourceBlurb').textContent ===
  'Frequent travellers who book 4- and 5-star properties and resent retail booking markups, plus people open to a referral-based income opportunity.');

/* ---------- 1b. The summary disclosure matches the original ---------- */

const summaryToggle = doc.getElementById('summaryToggle');
const summaryLabel = doc.getElementById('summaryToggleLabel');
const summaryBody = doc.getElementById('summaryContent');

check('Summary heading reads "Business Overview Summary"',
  doc.querySelector('.summary__heading').textContent === 'Business Overview Summary');
check('Collapsed toggle reads "Read full summary"',
  summaryLabel.textContent === 'Read full summary');
check('Summary body is hidden when collapsed',
  summaryBody.classList.contains('is-hidden'));

summaryToggle.click();
check('Expanded toggle reads "Collapse"',
  summaryLabel.textContent === 'Collapse');
check('Summary body is visible when expanded',
  !summaryBody.classList.contains('is-hidden'));
check('Toggle reports aria-expanded',
  summaryToggle.getAttribute('aria-expanded') === 'true');

summaryToggle.click();
check('Collapsing restores "Read full summary"',
  summaryLabel.textContent === 'Read full summary' &&
  summaryBody.classList.contains('is-hidden'));

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

/* Pieces are stored per profile, so more than one business can keep its
   own library in the same browser. */
const stored = JSON.parse(win.localStorage.getItem('tms.pieces.v1.travel') || '[]');
check('Pieces are persisted to localStorage', stored.length === 10, `got ${stored.length}`);
check('Stored pieces keep their channel, title and body',
  stored.every((p) => p.channel && p.title && p.body));
check('Pieces are namespaced per profile', stored.every((p) => p.profile === 'travel'));

/* ---------- 7. The BluePrint profile ---------- */

/* The original's own LinkedIn output — the ground truth for the writer. */
const BLUEPRINT_HOOK =
  'Most tech professionals spend their entire careers optimizing systems for organizations... ' +
  'but rarely build a system for their own time freedom.';

const BLUEPRINT_LINES = [
  '*A few years into my career as a Technology Specialist, I realized a fundamental truth about linear work:*',
  '**Trading hours for dollars has a hard physical ceiling.**',
  '*No matter how skilled you are, there are only 160 working hours in a month. When you stop working, the revenue stops immediately.*',
  '*That’s why I started researching digital leverage—systems that build* **compounding, recurring value** *alongside a traditional career.*',
  '*Instead of relying on a single paycheck, modern professionals are beginning to leverage 4 key digital vehicles:*',
  '1. *Digital products & knowledge assets*\n2. *Automated e-commerce funnels*\n3. *Real estate equity*\n4. *Scalable digital memberships & wholesale networks*',
  "*Building recurring income isn't about quitting your day job tomorrow—it's about creating financial options and time equity.*",
  '*💬* **I put together a simple 1-page comparison breakdown contrasting Linear Salaries against Modern Residual Vehicles.**',
  "*If you’d like a copy, check out the link in my* **Featured Section** *on my profile, or send me a DM with the word* **\"BLUEPRINT\"** *and I’ll send it right over!*"
];

const model = win.StudioModel;
const blueprint = model.PROFILES.blueprint;

check('A BluePrint profile ships alongside the travel profile',
  model.PROFILES.travel && blueprint && blueprint.label === 'BluePrint');

check('BluePrint source of truth names the business',
  blueprint.source.name === 'BluePrint — Digital Leverage for Tech Professionals' &&
  blueprint.source.summary.length === 6);

const blueprintLinkedIn = model.generate('linkedin', blueprint);
check('BluePrint LinkedIn hook is the original post verbatim',
  blueprintLinkedIn.title === BLUEPRINT_HOOK);
check('BluePrint LinkedIn body is the original post verbatim',
  blueprintLinkedIn.body === BLUEPRINT_LINES.join('\n\n'));

check('All four digital vehicles survive into the copy',
  ['Digital products & knowledge assets', 'Automated e-commerce funnels',
   'Real estate equity', 'Scalable digital memberships & wholesale networks']
    .every((v) => blueprintLinkedIn.body.includes(v)));

check('The BLUEPRINT lead-magnet keyword is preserved',
  blueprintLinkedIn.body.includes('**"BLUEPRINT"**'));

const blueprintAll = model.generateAll(blueprint);
check('BluePrint writes all ten channels',
  blueprintAll.length === 10 && blueprintAll.every((p) => p.title && p.body));
check('BluePrint pieces are tagged with their profile',
  blueprintAll.every((p) => p.profile === 'blueprint'));
check('Every BluePrint piece has a non-empty title',
  blueprintAll.every((p) => typeof p.title === 'string' && p.title.trim().length > 3),
  blueprintAll.map((p) => p.channel + ':' + p.title).join(' | '));

/* ---------- 8. Markdown rendering ---------- */

/* The original returns markdown; the drawer must render it, not print
   asterisks. Drive the real UI to prove it. */

const blueBtn = doc.querySelector('[data-profile="blueprint"]');
check('The header offers a profile switcher', !!blueBtn);
blueBtn.click();

check('BluePrint swaps the hero without touching the travel copy',
  doc.querySelector('.hero__title').textContent.replace(/\s+/g, ' ').trim() ===
  'Ten channels. One blueprint.');

check('Switching profile swaps the source of truth',
  doc.getElementById('sourceName').textContent ===
  'BluePrint — Digital Leverage for Tech Professionals');

const linkedInBtn = doc.querySelector('[data-channel="linkedin"]');
linkedInBtn.click();

const prose = doc.querySelector('.drawer__prose');
check('Drawer renders the BluePrint hook', doc.getElementById('drawerTitle').textContent === BLUEPRINT_HOOK);

const proseStrong = Array.from(prose.querySelectorAll('strong')).map((n) => n.textContent);
check('Bold markdown becomes <strong>',
  proseStrong.includes('Trading hours for dollars has a hard physical ceiling.'),
  JSON.stringify(proseStrong.slice(0, 4)));

const proseEm = Array.from(prose.querySelectorAll('em')).map((n) => n.textContent);
check('Italic markdown becomes <em>',
  proseEm.some((t) => t.includes('fundamental truth about linear work')),
  `got ${proseEm.length} em nodes`);

const proseItems = Array.from(prose.querySelectorAll('ol > li')).map((n) => n.textContent);
check('Numbered vehicles become a real ordered list',
  proseItems.length === 4 &&
  proseItems[0] === 'Digital products & knowledge assets' &&
  proseItems[3] === 'Scalable digital memberships & wholesale networks',
  JSON.stringify(proseItems));

check('No raw asterisks survive in the rendered drawer',
  !prose.textContent.includes('**') && !prose.textContent.includes('💬*'),
  prose.textContent.slice(0, 80));

doc.getElementById('drawerClose').click();

/* Medium is written in markdown headings — they must render as headings,
   not as lines starting with "###". */
doc.querySelector('[data-channel="medium"]').click();
const mediumProse = doc.querySelector('.drawer__prose');
const mediumHeadings = Array.from(mediumProse.querySelectorAll('.drawer__prose-heading'))
  .map((n) => n.textContent);
check('Markdown "###" headings render as headings',
  mediumHeadings.length === 4 &&
  mediumHeadings[0] === 'Trading hours for dollars has a hard physical ceiling.',
  JSON.stringify(mediumHeadings));
check('No raw "###" markers survive',
  !mediumProse.textContent.includes('###'));
doc.getElementById('drawerClose').click();

/* Saving a BluePrint piece must not leak into the travel library. */
doc.querySelector('[data-channel="medium"]').click();
doc.getElementById('drawerSaveBtn').click();

const blueprintStored = JSON.parse(win.localStorage.getItem('tms.pieces.v1.blueprint') || '[]');
const travelStored = JSON.parse(win.localStorage.getItem('tms.pieces.v1.travel') || '[]');
check('Each profile keeps its own library',
  blueprintStored.length === 1 && travelStored.length === 10,
  `blueprint ${blueprintStored.length}, travel ${travelStored.length}`);

check('The selected profile is remembered',
  win.localStorage.getItem('tms.profile.v1') === 'blueprint');

console.log('\n--------------------------------------------------------');
console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed.`);
if (failed === 0) {
  console.log('✅ TRAVEL MARKETING STUDIO CLONE VERIFIED!');
} else {
  console.log('❌ SOME CHECKS FAILED');
}
console.log('--------------------------------------------------------\n');

process.exit(failed === 0 ? 0 : 1);
