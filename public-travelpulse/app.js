/* ============================================================
   TravelPulse Content Studio — local clone
   ------------------------------------------------------------
   Upstream:  https://imposing-travel-pulse-pro.base44.app
   Status:    the upstream app has NOT been published. Every
              route on that host returns Base44's "isn't
              available yet" landing page, which is what this
              clone reproduces.
   ============================================================ */

(function () {
  'use strict';

  var UPSTREAM = 'https://imposing-travel-pulse-pro.base44.app';
  var THEME_KEY = 'tp-clone-theme';

  /* ---------- Theme override (light / dark / system) ---------- */

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function resolveInitialTheme() {
    var params = new URLSearchParams(window.location.search);
    var fromQuery = params.get('theme');

    if (fromQuery === 'light' || fromQuery === 'dark' || fromQuery === 'system') {
      try {
        window.localStorage.setItem(THEME_KEY, fromQuery);
      } catch (e) {
        /* private mode — fall through to the query value only */
      }
      return fromQuery;
    }

    try {
      var stored = window.localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch (e) {
      /* ignore */
    }

    return 'system';
  }

  applyTheme(resolveInitialTheme());

  /* ---------- Provenance stamp ---------- */

  function stampProvenance() {
    var el = document.getElementById('cloneNote');
    if (!el) return;

    var now = new Date();
    var when = now.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

    el.innerHTML =
      'Offline clone of <a href="' + UPSTREAM + '" target="_blank" rel="noopener noreferrer">' +
      UPSTREAM +
      '</a> — rendered ' + when +
      '. The upstream app has not been published, so this reproduces the landing page that URL serves.';
  }

  stampProvenance();

  /* ---------- Small niceties ---------- */

  // Keep the document title in sync with the app name, even if a host
  // rewrites or prefixes titles.
  document.title = 'TravelPulse Content Studio';

  // Flag the document as hydrated so CSS can opt into post-load styling.
  document.documentElement.setAttribute('data-clone-ready', 'true');

  // Keyboard: "/" focuses the first call-to-action, like the original.
  document.addEventListener('keydown', function (event) {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

    var tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    var firstCta = document.querySelector('.b44-btn');
    if (!firstCta) return;

    event.preventDefault();
    firstCta.focus();
  });
})();
