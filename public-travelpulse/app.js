/* ============================================================
   Travel Marketing Studio — app shell
   ------------------------------------------------------------
   Reverse-engineered from the published Base44 app
   (appId 6ad1b02d62830e19ceea7037).
   Routes:  /            → Content desk
            /library     → Content library
            /plan        → Distribution plan
   ============================================================ */

(function () {
  'use strict';

  var Model = window.StudioModel;
  var PIECES_KEY = 'tms.pieces.v1.';
  var SOURCE_KEY = 'tms.source.v1.';
  var PROFILE_KEY = 'tms.profile.v1';

  /* ---------------- Base path ---------------- */

  var BASE = (function () {
    var scripts = document.getElementsByTagName('script');
    var last = scripts[scripts.length - 1];
    var src = last && last.src ? last.src : window.location.href;
    try {
      return new URL(src, window.location.href).pathname.replace(/\/[^/]*$/, '');
    } catch (e) {
      return window.location.pathname.replace(/\/[^/]*$/, '');
    }
  })();

  /* ---------------- State ---------------- */

  var state = {
    route: 'desk',
    filter: 'all',
    profileId: readProfile(),
    source: null,
    pieces: [],
    draft: null
  };

  function readProfile() {
    var id = null;
    try {
      id = window.localStorage.getItem(PROFILE_KEY);
    } catch (e) {
      /* ignore */
    }
    return id && Model.PROFILES[id] ? id : Model.DEFAULT_PROFILE;
  }

  function load(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* private mode — session-only */
    }
  }

  function profile() {
    return Model.getProfile(state.profileId);
  }

  function source() {
    var p = profile();
    var stored = load(SOURCE_KEY + p.id, null);
    if (stored) return stored;
    return JSON.parse(JSON.stringify(p.source));
  }

  function loadPieces() {
    return load(PIECES_KEY + state.profileId, []);
  }

  function persistPieces() {
    save(PIECES_KEY + state.profileId, state.pieces);
  }

  function persistSource() {
    save(SOURCE_KEY + state.profileId, state.source);
  }

  /* ---------------- DOM refs ---------------- */

  var el = {
    views: {
      desk: document.getElementById('view-desk'),
      library: document.getElementById('view-library'),
      plan: document.getElementById('view-plan')
    },
    nav: document.getElementById('nav'),
    profileSwitch: document.getElementById('profileSwitch'),
    channelGrid: document.getElementById('channelGrid'),
    libraryList: document.getElementById('libraryList'),
    libraryFilters: document.getElementById('libraryFilters'),
    planList: document.getElementById('planList'),
    navPieceCount: document.getElementById('navPieceCount'),
    deskPieceCount: document.getElementById('deskPieceCount'),
    heroTitle: document.getElementById('heroTitle'),
    heroLede: document.getElementById('heroLede'),
    sourceName: document.getElementById('sourceName'),
    sourceBlurb: document.getElementById('sourceBlurb'),
    sourceStatus: document.getElementById('sourceStatus'),
    summaryContent: document.getElementById('summaryContent'),
    summaryToggle: document.getElementById('summaryToggle'),
    summaryToggleLabel: document.getElementById('summaryToggleLabel'),
    drawer: document.getElementById('drawer'),
    drawerEyebrow: document.getElementById('drawerEyebrow'),
    drawerTitle: document.getElementById('drawerTitle'),
    drawerBody: document.getElementById('drawerBody'),
    drawerCopyBtn: document.getElementById('drawerCopyBtn'),
    drawerSaveBtn: document.getElementById('drawerSaveBtn'),
    drawerClose: document.getElementById('drawerClose'),
    scrim: document.getElementById('scrim'),
    toast: document.getElementById('toast'),
    writeAllBtn: document.getElementById('writeAllBtn'),
    myOwnPieceBtn: document.getElementById('myOwnPieceBtn'),
    editSourceBtn: document.getElementById('editSourceBtn')
  };

  /* ---------------- Helpers ---------------- */

  function h(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  var toastTimer = null;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.remove('is-hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.add('is-hidden');
    }, 2400);
  }

  function piecesFor(channelId) {
    return state.pieces.filter(function (p) {
      return p.channel === channelId;
    });
  }

  /* ---------------- Markdown (bold, italic, lists) ---------------- */

  function inlineNodes(text) {
    var frag = document.createDocumentFragment();
    var re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_/g;
    var last = 0;
    var m;

    while ((m = re.exec(text)) !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      if (m[1] !== undefined) {
        var strong = document.createElement('strong');
        strong.textContent = m[1];
        frag.appendChild(strong);
      } else {
        var em = document.createElement('em');
        em.textContent = m[2] !== undefined ? m[2] : m[3];
        frag.appendChild(em);
      }
      last = re.lastIndex;
    }

    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    return frag;
  }

  function renderMarkdown(container, text) {
    container.textContent = '';

    String(text || '')
      .split(/\n\s*\n/)
      .forEach(function (block) {
        var lines = block.split('\n').filter(function (l) {
          return l.trim().length;
        });
        if (!lines.length) return;

        if (lines.length === 1) {
          var heading = lines[0].match(/^(#{2,4})\s+(.*)$/);
          if (heading) {
            var level = Math.min(6, heading[1].length + 1);
            var node = document.createElement('h' + level);
            node.className = 'drawer__prose-heading';
            node.appendChild(inlineNodes(heading[2]));
            container.appendChild(node);
            return;
          }
        }

        var isOrdered = lines.every(function (l) {
          return /^\d+\.\s+/.test(l);
        });
        var isBullet = lines.every(function (l) {
          return /^[•\-]\s+/.test(l);
        });

        if (isOrdered || isBullet) {
          var list = document.createElement(isOrdered ? 'ol' : 'ul');
          lines.forEach(function (line) {
            var li = document.createElement('li');
            li.appendChild(inlineNodes(line.replace(/^(\d+\.|•|-)\s+/, '')));
            list.appendChild(li);
          });
          container.appendChild(list);
          return;
        }

        var p = document.createElement('p');
        lines.forEach(function (line, i) {
          if (i) p.appendChild(document.createElement('br'));
          p.appendChild(inlineNodes(line));
        });
        container.appendChild(p);
      });
  }

  function stripMarkdown(text) {
    return String(text || '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/_([^_\n]+)_/g, '$1')
      .replace(/^\s*(?:\d+\.|•|-)\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ---------------- Rendering: profile switcher ---------------- */

  function renderProfiles() {
    el.profileSwitch.textContent = '';

    Object.keys(Model.PROFILES).forEach(function (id) {
      var p = Model.PROFILES[id];
      var btn = h('button', 'profile-pill' + (id === state.profileId ? ' is-active' : ''), p.label);
      btn.type = 'button';
      btn.setAttribute('data-profile', id);
      btn.setAttribute('aria-pressed', id === state.profileId ? 'true' : 'false');
      el.profileSwitch.appendChild(btn);
    });
  }

  /* ---------------- Rendering: source of truth ---------------- */

  function renderHero() {
    var hero = profile().hero;
    if (!hero) return;

    el.heroTitle.textContent = '';
    hero.lines.forEach(function (line, i) {
      if (i) {
        el.heroTitle.appendChild(document.createElement('br'));
        el.heroTitle.appendChild(document.createTextNode(' '));
      }
      el.heroTitle.appendChild(document.createTextNode(line));
    });

    el.heroLede.textContent = hero.lede;
  }

  function renderSource() {
    el.sourceName.textContent = state.source.name;
    el.sourceBlurb.textContent = state.source.blurb;
    el.sourceStatus.textContent = state.source.status || 'Loaded';

    el.summaryContent.textContent = '';
    (state.source.summary || []).forEach(function (section) {
      var wrap = h('div', 'summary__section');
      wrap.appendChild(h('h4', null, section.heading));
      wrap.appendChild(h('p', null, section.body));
      el.summaryContent.appendChild(wrap);
    });
  }

  /* ---------------- Rendering: channels ---------------- */

  function renderChannels() {
    el.channelGrid.textContent = '';

    Model.CHANNELS.forEach(function (channel) {
      var written = piecesFor(channel.id).length;

      var card = h('article', 'channel');

      var top = h('div', 'channel__top');
      top.appendChild(h('span', 'channel__index', channel.index));
      top.appendChild(h('h3', 'channel__name', channel.name));
      card.appendChild(top);

      card.appendChild(h('p', 'channel__format', channel.format));
      card.appendChild(h('p', 'channel__desc', channel.description));

      var foot = h('div', 'channel__foot');
      var status = h(
        'span',
        'channel__state' + (written ? ' channel__state--done' : ''),
        written ? written + (written === 1 ? ' piece' : ' pieces') : 'No content yet'
      );
      foot.appendChild(status);

      var btn = h('button', 'btn btn--gold btn--sm', written ? 'Write again' : 'Write');
      btn.type = 'button';
      btn.setAttribute('data-channel', channel.id);
      foot.appendChild(btn);

      card.appendChild(foot);
      el.channelGrid.appendChild(card);
    });
  }

  /* ---------------- Rendering: library ---------------- */

  function renderLibrary() {
    el.libraryFilters.textContent = '';

    var filters = [{ id: 'all', name: 'All channels' }].concat(Model.CHANNELS);
    filters.forEach(function (f) {
      var btn = h('button', 'filter' + (state.filter === f.id ? ' is-active' : ''), f.name);
      btn.type = 'button';
      btn.setAttribute('data-filter', f.id);
      el.libraryFilters.appendChild(btn);
    });

    el.libraryList.textContent = '';

    var visible = state.pieces
      .filter(function (p) {
        return state.filter === 'all' || p.channel === state.filter;
      })
      .slice()
      .reverse();

    if (!visible.length) {
      el.libraryList.appendChild(
        h('div', 'empty', 'No pieces yet. Head back to the content desk and write your first one.')
      );
      return;
    }

    visible.forEach(function (piece) {
      var card = h('article', 'piece');

      var head = h('div', 'piece__head');
      head.appendChild(h('span', 'piece__channel', piece.channelIndex + ' · ' + piece.channelName));
      var copy = h('button', 'btn btn--ghost btn--sm', 'Copy');
      copy.type = 'button';
      copy.setAttribute('data-copy', piece.id);
      head.appendChild(copy);
      card.appendChild(head);

      card.appendChild(h('h3', 'piece__title', piece.title || 'Untitled piece'));
      card.appendChild(h('p', 'piece__excerpt', excerpt(piece.body || '')));

      el.libraryList.appendChild(card);
    });
  }

  function excerpt(text) {
    var clean = stripMarkdown(text);
    return clean.length > 190 ? clean.slice(0, 190) + '…' : clean;
  }

  /* ---------------- Rendering: distribution plan ---------------- */

  function renderPlan() {
    el.planList.textContent = '';

    Model.CHANNELS.forEach(function (channel) {
      var written = piecesFor(channel.id).length;
      var row = h('div', 'plan__row');

      row.appendChild(h('span', 'plan__index', channel.index));
      row.appendChild(h('span', 'plan__channel', channel.name));
      row.appendChild(
        h('span', 'plan__desc', channel.description + (written ? ' · piece ready to post' : ' · not written yet'))
      );
      row.appendChild(h('span', 'plan__cadence', channel.cadence));

      el.planList.appendChild(row);
    });
  }

  /* ---------------- Counts ---------------- */

  function renderCounts() {
    var n = state.pieces.length;
    el.navPieceCount.textContent = String(n);
    el.deskPieceCount.textContent = n + (n === 1 ? ' piece written' : ' pieces written');
  }

  /* ---------------- Drawer ---------------- */

  function openDrawer(draft) {
    state.draft = draft;
    el.drawerEyebrow.textContent = draft.channelIndex
      ? draft.channelIndex + ' · ' + draft.channelName
      : 'Your own piece';
    el.drawerTitle.textContent = draft.title || 'New piece';
    el.drawerSaveBtn.textContent = draft.sourceEdit ? 'Save source of truth' : 'Save to library';

    el.drawerBody.textContent = '';

    var titleWrap = h('div', 'drawer__field');
    titleWrap.appendChild(h('span', 'drawer__label', 'Title / hook'));
    if (draft.editable) {
      var titleInput = h('textarea');
      titleInput.rows = 2;
      titleInput.className = 'drawer__input';
      titleInput.value = draft.title || '';
      titleInput.setAttribute('data-field', 'title');
      titleWrap.appendChild(titleInput);
    } else {
      titleWrap.appendChild(h('p', 'drawer__text drawer__text--title', draft.title || ''));
    }
    el.drawerBody.appendChild(titleWrap);

    var bodyWrap = h('div', 'drawer__field');
    bodyWrap.appendChild(h('span', 'drawer__label', draft.format || 'Copy'));
    if (draft.editable) {
      var bodyInput = h('textarea');
      bodyInput.rows = 14;
      bodyInput.className = 'drawer__input';
      bodyInput.value = draft.body || '';
      bodyInput.setAttribute('data-field', 'body');
      bodyWrap.appendChild(bodyInput);
    } else {
      var prose = h('div', 'drawer__text drawer__prose');
      renderMarkdown(prose, draft.body || '');
      bodyWrap.appendChild(prose);
    }
    el.drawerBody.appendChild(bodyWrap);

    if (draft.extras && draft.extras.length) {
      var extras = h('div', 'drawer__extras');
      draft.extras.forEach(function (extra) {
        var row = h('div', 'drawer__extra');
        row.appendChild(h('b', null, extra.label));
        row.appendChild(h('span', null, extra.value));
        extras.appendChild(row);
      });
      el.drawerBody.appendChild(extras);
    }

    el.drawer.classList.remove('is-hidden');
    el.drawer.setAttribute('aria-hidden', 'false');
    el.scrim.classList.remove('is-hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    state.draft = null;
    el.drawer.classList.add('is-hidden');
    el.drawer.setAttribute('aria-hidden', 'true');
    el.scrim.classList.add('is-hidden');
    document.body.style.overflow = '';
  }

  function currentDraftText() {
    if (!state.draft) return '';
    if (state.draft.editable) {
      var titleField = el.drawerBody.querySelector('[data-field="title"]');
      var bodyField = el.drawerBody.querySelector('[data-field="body"]');
      state.draft.title = titleField ? titleField.value : state.draft.title;
      state.draft.body = bodyField ? bodyField.value : state.draft.body;
    }
    return (state.draft.title || '') + '\n\n' + (state.draft.body || '');
  }

  /* ---------------- Actions ---------------- */

  function writeChannel(channelId) {
    openDrawer(Model.generate(channelId, profile()));
  }

  function writeAll() {
    var generated = Model.generateAll(profile());
    var channelIds = Model.CHANNELS.map(function (c) {
      return c.id;
    });
    // Refresh rather than duplicate: one current piece per channel.
    state.pieces = state.pieces.filter(function (p) {
      return channelIds.indexOf(p.channel) === -1;
    });
    state.pieces = state.pieces.concat(generated);
    persistPieces();
    renderAll();
    toast('Wrote all ten pieces — they are in the Library');
    navigate('library');
  }

  function saveDraft() {
    if (!state.draft) return;
    var piece = JSON.parse(JSON.stringify(state.draft));
    piece.id = 'p' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    piece.createdAt = new Date().toISOString();
    piece.sourceName = state.source.name;
    piece.profile = state.profileId;
    state.pieces.push(piece);
    persistPieces();
    closeDrawer();
    renderAll();
    toast('Saved to Library');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast('Copied to clipboard'); },
        function () { toast('Select the text and copy manually'); }
      );
      return;
    }
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      toast('Copied to clipboard');
    } catch (e) {
      toast('Select the text and copy manually');
    }
    document.body.removeChild(area);
  }

  function editSource() {
    openDrawer({
      channelIndex: '',
      channelName: 'Source of truth',
      title: state.source.name,
      format: 'Source of truth',
      editable: false,
      body:
        state.source.blurb +
        '\n\n' +
        (state.source.summary || [])
          .map(function (s) { return s.heading + '\n' + s.body; })
          .join('\n\n'),
      extras: []
    });

    // Swap the read-only body for an editable one.
    var bodyWrap = el.drawerBody.querySelectorAll('.drawer__field')[1];
    if (bodyWrap) {
      bodyWrap.textContent = '';
      bodyWrap.appendChild(h('span', 'drawer__label', 'Summary'));
      var input = h('textarea');
      input.rows = 18;
      input.className = 'drawer__input';
      input.value = state.source.summary
        .map(function (s) { return s.heading + '\n' + s.body; })
        .join('\n\n');
      input.setAttribute('data-field', 'source');
      bodyWrap.appendChild(input);
    }
    el.drawerSaveBtn.textContent = 'Save source of truth';
    state.draft = { sourceEdit: true };
  }

  function saveSourceEdit() {
    var field = el.drawerBody.querySelector('[data-field="source"]');
    if (!field) return;

    var sections = [];
    String(field.value)
      .split(/\n\s*\n/)
      .forEach(function (block) {
        var lines = block.split('\n');
        if (!lines.length) return;
        var heading = lines[0].trim();
        var body = lines.slice(1).join('\n').trim();
        if (heading) sections.push({ heading: heading, body: body });
      });

    state.source.summary = sections;
    persistSource();
    closeDrawer();
    renderAll();
    toast('Source of truth updated');
  }

  /* ---------------- Profile switching ---------------- */

  function switchProfile(id) {
    if (!Model.PROFILES[id] || id === state.profileId) return;

    persistPieces(); // save the outgoing profile's pieces

    state.profileId = id;
    state.source = source();
    state.pieces = loadPieces();
    state.filter = 'all';

    try {
      window.localStorage.setItem(PROFILE_KEY, id);
    } catch (e) {
      /* ignore */
    }

    renderAll();
    toast('Source of truth: ' + Model.PROFILES[id].source.name);
  }

  /* ---------------- Routing ---------------- */

  function routeFromPath() {
    var path = window.location.pathname;
    if (path.indexOf(BASE) === 0) path = path.slice(BASE.length);
    path = path.replace(/^\/+|\/+$/g, '');
    if (path === 'library' || path === 'plan') return path;
    return 'desk';
  }

  function navigate(route, push) {
    state.route = route;
    if (push !== false) {
      var url = route === 'desk' ? BASE + '/' : BASE + '/' + route;
      if (window.location.pathname !== url) window.history.pushState({ route: route }, '', url);
    }

    Object.keys(el.views).forEach(function (key) {
      el.views[key].classList.toggle('is-hidden', key !== route);
    });

    Array.prototype.forEach.call(el.nav.querySelectorAll('.nav__link'), function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-route') === route);
    });

    if (route === 'library') renderLibrary();
    if (route === 'plan') renderPlan();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------------- Wiring ---------------- */

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var navBtn = target.closest('[data-route]');
    if (navBtn) {
      navigate(navBtn.getAttribute('data-route'));
      return;
    }

    var profileBtn = target.closest('[data-profile]');
    if (profileBtn) {
      switchProfile(profileBtn.getAttribute('data-profile'));
      return;
    }

    var writeBtn = target.closest('[data-channel]');
    if (writeBtn) {
      writeChannel(writeBtn.getAttribute('data-channel'));
      return;
    }

    var filterBtn = target.closest('[data-filter]');
    if (filterBtn) {
      state.filter = filterBtn.getAttribute('data-filter');
      renderLibrary();
      return;
    }

    var copyBtn = target.closest('[data-copy]');
    if (copyBtn) {
      var id = copyBtn.getAttribute('data-copy');
      var piece = state.pieces.filter(function (p) { return p.id === id; })[0];
      if (piece) copyText((piece.title || '') + '\n\n' + (piece.body || ''));
      return;
    }
  });

  el.writeAllBtn.addEventListener('click', writeAll);
  el.myOwnPieceBtn.addEventListener('click', function () {
    openDrawer({
      channelIndex: '',
      channelName: 'Your own piece',
      title: '',
      format: 'Your own piece',
      editable: true,
      body: '',
      extras: []
    });
    var bodyField = el.drawerBody.querySelector('[data-field="body"]');
    if (bodyField) bodyField.focus();
  });

  el.editSourceBtn.addEventListener('click', editSource);
  el.drawerClose.addEventListener('click', closeDrawer);
  el.scrim.addEventListener('click', closeDrawer);
  el.drawerCopyBtn.addEventListener('click', function () {
    copyText(currentDraftText());
  });
  el.drawerSaveBtn.addEventListener('click', function () {
    if (state.draft && state.draft.sourceEdit) saveSourceEdit();
    else saveDraft();
  });

  /* ---------- Source-of-truth disclosure ----------
     The original shows a "Business Overview Summary" heading, the body, and a
     toggle underneath that reads "Read full summary" when collapsed and
     "Collapse" once the body is open. */

  function setSummaryOpen(open) {
    el.summaryContent.classList.toggle('is-hidden', !open);
    el.summaryToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    el.summaryToggleLabel.textContent = open ? 'Collapse' : 'Read full summary';
  }

  el.summaryToggle.addEventListener('click', function () {
    setSummaryOpen(el.summaryContent.classList.contains('is-hidden'));
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !el.drawer.classList.contains('is-hidden')) closeDrawer();
  });

  window.addEventListener('popstate', function () {
    navigate(routeFromPath(), false);
  });

  /* ---------------- Boot ---------------- */

  function renderAll() {
    renderProfiles();
    renderHero();
    renderSource();
    renderChannels();
    renderCounts();
    renderLibrary();
    renderPlan();
  }

  state.source = source();
  state.pieces = loadPieces();
  renderAll();
  navigate(routeFromPath(), false);
})();
