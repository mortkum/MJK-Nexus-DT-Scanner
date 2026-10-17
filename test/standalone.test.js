/* ============================================================
   Single-file build — guards the promise that the standalone
   HTML needs no server, no install and no network.
   ============================================================ */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

let passed = 0;
let failed = 0;

function check(label, ok, detail) {
  if (ok) {
    passed++;
    console.log(`• ${label}... PASSED`);
  } else {
    failed++;
    console.log(`• ${label}... FAILED${detail ? ` — ${detail}` : ''}`);
  }
}

const ROOT = path.resolve(__dirname, '..');
const out = path.join(os.tmpdir(), `tms-standalone-${process.pid}.html`);

console.log('\n========================================================');
console.log('📦 SINGLE-FILE BUILD');
console.log('========================================================\n');

execFileSync(process.execPath, [path.join(ROOT, 'tools/build-single-file.js'), out], {
  stdio: 'pipe'
});

const html = fs.readFileSync(out, 'utf8');

check('Build produces a single HTML file', fs.existsSync(out));
check('It is reasonably small (under 400 KB)', Buffer.byteLength(html) < 400 * 1024,
  `${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);

/* No external subresources of any kind. */
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
const external = refs.filter((r) => !r.startsWith('data:') && !r.startsWith('#'));
check('No external src/href remain', external.length === 0, external.join(', '));

const cssUrls = [...html.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
check('Every CSS url() is a data URI',
  cssUrls.length > 0 && cssUrls.every((u) => u.startsWith('data:')),
  `${cssUrls.filter((u) => !u.startsWith('data:')).length} external`);

check('Stylesheet is inlined', html.includes('<style>') && !html.includes('styles.css"'));
check('The studio engine is inlined', html.includes('StudioModel'));
check('The app shell is inlined', html.includes('summaryToggleLabel'));

const fonts = (html.match(/data:font\/woff2;base64,/g) || []).length;
check('All three fonts are embedded', fonts === 3, `found ${fonts}`);

check('Content model carries both profiles',
  html.includes("label: 'Travel Club'") && html.includes("label: 'BluePrint'"));

check('The verbatim BluePrint post survives the build',
  html.includes('Most tech professionals spend their entire careers optimizing systems'));

check('file:// hash routing is present',
  html.includes('IS_FILE') && html.includes('hashchange'));

check('Favicon is embedded', html.includes('data:image/svg+xml;base64,'));

const scripts = (html.match(/<script>/g) || []).length;
check('Scripts are inlined (no src)', scripts === 2, `found ${scripts}`);
check('No leftover script src references', !/<script\s+src=/.test(html));

fs.unlinkSync(out);

console.log('\n--------------------------------------------------------');
console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed.`);
console.log(failed === 0 ? '✅ SINGLE-FILE BUILD VERIFIED!' : '❌ SOME CHECKS FAILED');
console.log('--------------------------------------------------------\n');

process.exit(failed === 0 ? 0 : 1);
