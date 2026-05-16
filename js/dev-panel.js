/**
 * Dev Mode UI Navigator for 心动合成 (Heartbeat Merge)
 * Floating panel for UI artists to instantly preview any page, boss,
 * dialogue, CG story, or overlay without playing through the game.
 */
(function () {
  'use strict';

  console.log('[DevPanel] Script loaded');

  function waitForGame(cb) {
    if (window.game && window.game.boss && window.game.dialogue) {
      console.log('[DevPanel] Game ready — building panel content');
      cb();
    } else {
      setTimeout(function () { waitForGame(cb); }, 200);
    }
  }

  /* ── Global accessor for let-declared variables ─────────── */
  // let-declared globals (LEVELS, LOOP_NARRATIVES, etc.) are NOT on window,
  // so window.X returns undefined.  new Function() evaluates in the global
  // scope where bare identifiers can reach them.
  function getGlobal(name) {
    try { return new Function('return ' + name)(); } catch (e) { return undefined; }
  }

  function dataReady() {
    var lv = getGlobal('LEVELS');
    return lv && lv.length > 0;
  }

  /* ── Drag helpers ───────────────────────────────────────────── */
  function makeDraggable(el, handle) {
    var sx, sy, ox, oy, drag = false;
    handle.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.dev-panel-close')) return;
      drag = true; handle.setPointerCapture(e.pointerId);
      var r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      sx = e.clientX; sy = e.clientY;
      el.classList.add('dev-dragging'); e.preventDefault();
    });
    handle.addEventListener('pointermove', function (e) {
      if (!drag) return;
      el.style.left = (ox + e.clientX - sx) + 'px';
      el.style.top = (oy + e.clientY - sy) + 'px';
      el.style.right = 'auto';
    });
    handle.addEventListener('pointerup', function () { drag = false; el.classList.remove('dev-dragging'); });
    handle.addEventListener('pointercancel', function () { drag = false; el.classList.remove('dev-dragging'); });
  }

  function makeToggleDraggable(el, onToggle) {
    var sx, sy, ox, oy, drag = false, moved = false;
    el.addEventListener('pointerdown', function (e) {
      drag = true; moved = false; el.setPointerCapture(e.pointerId);
      var r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      sx = e.clientX; sy = e.clientY; e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (Math.abs(e.clientX - sx) > 3 || Math.abs(e.clientY - sy) > 3) moved = true;
      el.style.left = (ox + e.clientX - sx) + 'px';
      el.style.top = (oy + e.clientY - sy) + 'px';
      el.style.right = 'auto';
    });
    el.addEventListener('pointerup', function () { drag = false; if (!moved) onToggle(); });
    el.addEventListener('pointercancel', function () { drag = false; });
  }

  /* ── State ──────────────────────────────────────────────────── */
  var panel, toggleBtn, currentTab = 'sheets';

  function togglePanel() {
    if (!panel) return; // Panel not built yet — ignore early clicks
    panel.classList.toggle('dev-hidden');
    toggleBtn.classList.toggle('dev-hidden');
  }

  /* ── Close All ──────────────────────────────────────────────── */
  function closeAll() {
    var g = window.game;
    if (g && g.dialogue) try { g.dialogue.close(); } catch (e) {}
    if (g && g.closeAllSheets) try { g.closeAllSheets(); } catch (e) {}
    try {
      document.querySelectorAll(
        '.vn-overlay,.cg-memory-overlay,.gacha-card-detail-overlay,' +
        '.cg-preview-overlay,.cg-reader-overlay,.fragment-synthesis-overlay,' +
        '.max-level-overlay,.confirm-dialog-overlay,#reward-modal-overlay'
      ).forEach(function (el) { el.remove(); });
      var ids = ['loop-summary-overlay','parade-overlay','game-complete-overlay','dialogue-overlay'];
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('active');
      });
      var ls = document.getElementById('lang-select-overlay');
      if (ls) ls.style.display = 'none';
    } catch (e) {}
  }

  /* ── DOM factories ──────────────────────────────────────────── */
  function makeBtn(label, action, cls) {
    var b = document.createElement('button');
    b.className = 'dev-action-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      try { action(); } catch (err) { console.error('[DevPanel]', err); }
    });
    return b;
  }

  function makeHeader(text, color) {
    var h = document.createElement('div');
    h.className = 'dev-section-header' + (color ? ' dev-boss-header' : '');
    h.textContent = text;
    if (color) h.style.borderLeftColor = color;
    return h;
  }

  function makeCloseAll() {
    var b = document.createElement('button');
    b.className = 'dev-close-all-btn';
    b.textContent = '✕ Close All';
    b.addEventListener('click', function (e) { e.stopPropagation(); closeAll(); });
    return b;
  }

  function makeDataPending(varName) {
    var s = document.createElement('span');
    s.className = 'dev-data-pending';
    s.textContent = '⏳ ' + varName + ' not loaded yet…';
    return s;
  }

  /* ── Tab: 📦 Sheets ────────────────────────────────────────── */
  function buildSheets(c) {
    c.appendChild(makeCloseAll());
    var items = [
      ['👑 养成 (Heroine)', function () { window.game.closeAllSheets(); window.game.heroine.open(); }],
      ['📋 日常订单 (Daily Orders)', function () { window.game.closeAllSheets(); window.game.dailyOrders.open(); }],
      ['🎁 扭蛋 (Gacha)', function () { window.game.closeAllSheets(); window.game.gacha.open(); }],
      ['🎒 背包 (Inventory)', function () { window.game.closeAllSheets(); window.game.inventory.openSheet(); }],
      ['📖 图鉴 (Collection)', function () { window.game.closeAllSheets(); window.game.collection.openSheet(); }],
      ['🖼 CG相册 (CG Album)', function () { window.game.closeAllSheets(); window.game.cgAlbum.open(); }],
      ['🏆 成就 (Achievements)', function () { window.game.closeAllSheets(); window.game.achievements.openSheet(); }]
    ];
    items.forEach(function (it) { c.appendChild(makeBtn(it[0], it[1])); });
  }

  /* ── Tab: 👹 Bosses ────────────────────────────────────────── */
  function buildBosses(c) {
    c.appendChild(makeCloseAll());
    var LEVELS = getGlobal('LEVELS');
    if (!LEVELS || !LEVELS.length) { c.appendChild(makeDataPending('LEVELS')); return; }

    for (var i = 0; i < LEVELS.length; i++) {
      (function (li) {
        var lv = LEVELS[li];
        var hdr = makeHeader(lv.bossName + ' — ' + lv.bossTitle, lv.bossColor || '#4A90D9');
        c.appendChild(hdr);
        if (lv.bossAvatar) {
          var img = document.createElement('img');
          img.className = 'dev-boss-avatar'; img.src = lv.bossAvatar; img.loading = 'lazy';
          hdr.insertBefore(img, hdr.firstChild);
        }
        c.appendChild(makeBtn('⚔️ Load Boss', function () { window.game.boss.loadLevel(li); }));
        if (lv.orders) {
          for (var j = 0; j < lv.orders.length; j++) {
            (function (oi) {
              var ord = lv.orders[oi];
              c.appendChild(makeBtn('Order ' + (oi + 1) + ': ' + ord.name, function () {
                window.game.dialogue.close();
                window.game.dialogue.show(lv.bossName, lv.bossAvatar, ord.dialogue.npc, ord.dialogue.player, { skipBGM: true });
              }));
            })(j);
          }
        }
      })(i);
    }
  }

  /* ── Tab: 💬 Dialogues ─────────────────────────────────────── */
  function buildDialogues(c) {
    c.appendChild(makeCloseAll());
    var LN = getGlobal('LOOP_NARRATIVES'), LE = getGlobal('LOOP_EVENTS'), LV = getGlobal('LEVELS');
    if (!LN && !LE) { c.appendChild(makeDataPending('LOOP_NARRATIVES / LOOP_EVENTS')); return; }

    c.appendChild(makeHeader('Loop Intros / Outros'));
    if (LN) {
      for (var i = 1; i <= 8; i++) {
        (function (li) {
          var n = LN[li.toString()]; if (!n) return;
          c.appendChild(makeBtn('Loop ' + li + ' Intro', function () {
            window.game.dialogue.close();
            window.game.dialogue.show('🏫', null, n.loopIntro, (function () { var i = getGlobal('I18n'); return i ? i.t('loop.newStart') : 'New Start'; })(), { skipBGM: true });
          }));
          c.appendChild(makeBtn('Loop ' + li + ' Outro', function () {
            window.game.dialogue.close();
            window.game.dialogue.show('🏫', null, n.loopOutro, null, { skipBGM: true });
          }));
        })(i);
      }
    }

    c.appendChild(makeHeader('Boss Intros / Defeat Outros'));
    if (LN && LV) {
      for (var li2 = 2; li2 <= 8; li2++) {
        (function (li) {
          var n = LN[li.toString()]; if (!n) return;
          for (var bi = 0; bi < 4; bi++) {
            (function (b) {
              var bn = n['boss_' + b]; if (!bn) return;
              if (bn.intro) c.appendChild(makeBtn('Loop ' + li + ' Boss ' + b + ' Intro', function () {
                window.game.dialogue.close();
                window.game.dialogue.show(LV[b].bossName, LV[b].bossAvatar, bn.intro, null);
              }));
              if (bn.defeatOutro) c.appendChild(makeBtn('Loop ' + li + ' Boss ' + b + ' Defeat', function () {
                window.game.dialogue.close();
                window.game.dialogue.show(LV[b].bossName, LV[b].bossAvatar, bn.defeatOutro, null);
              }));
            })(bi);
          }
        })(li2);
      }
    }

    c.appendChild(makeHeader('Loop Events'));
    if (LE) {
      Object.keys(LE).sort().forEach(function (key) {
        var ed = LE[key];
        c.appendChild(makeBtn('Event ' + key, function () {
          window.game.dialogue.close();
          window.game.dialogue.show(ed.npcName, ed.npcAvatar || null, ed.text, ed.playerText || null);
        }));
      });
    }
  }

  /* ── Tab: 🎬 CG Stories ────────────────────────────────────── */
  function buildCG(c) {
    c.appendChild(makeCloseAll());
    c.appendChild(makeBtn('🖼 Open CG Album', function () { window.game.cgAlbum.open(); }));
    var CG = getGlobal('CG_STORIES');
    if (!CG || !Object.keys(CG).length) { c.appendChild(makeDataPending('CG_STORIES')); return; }
    Object.keys(CG).forEach(function (ssrId) {
      var cg = CG[ssrId];
      c.appendChild(makeHeader(cg.title + ' (' + cg.maleLead + ')'));
      (function (cid) {
        c.appendChild(makeBtn('📂 Open Memory Panel', function () { window.game.cgAlbum.openStoryForCG(cid); }));
      })(cg.cgId);
      if (cg.stories) {
        for (var si = 0; si < cg.stories.length; si++) {
          (function (idx, cid, t) {
            c.appendChild(makeBtn('📖 ' + t, function () { window.game.cgAlbum.readStory(cid, idx); }));
          })(si, cg.cgId, cg.stories[si].title);
        }
      }
    });
  }

  /* ── Tab: 🎰 Gacha ─────────────────────────────────────────── */
  function buildGacha(c) {
    c.appendChild(makeCloseAll());
    c.appendChild(makeBtn('🎁 Open Gacha Panel', function () { window.game.closeAllSheets(); window.game.gacha.open(); }));
    var pool = getGlobal('GACHA_POOL_V2');
    if (pool) {
      var ssr = pool.filter(function (card) { return card.rarity === 'SSR'; });
      if (ssr.length) {
        c.appendChild(makeHeader('SSR Card Previews'));
        ssr.forEach(function (card) {
          c.appendChild(makeBtn(card.icon + ' ' + card.name, function () { window.game.gacha.showCGPreview(card.id); }));
        });
      }
    }
    c.appendChild(makeHeader('Quick Resources'));
    c.appendChild(makeBtn('💎 +999 Diamonds', function () { window.game.currency.diamonds += 999; window.game.currency.render(); }, 'dev-resource-btn'));
    c.appendChild(makeBtn('💰 +9999 Gold', function () { window.game.currency.gold += 9999; window.game.currency.render(); }, 'dev-resource-btn'));
  }

  /* ── Tab: 🎉 Overlays ──────────────────────────────────────── */
  function buildOverlays(c) {
    c.appendChild(makeCloseAll());
    var items = [
      ['🗣 Language Select', function () { document.getElementById('lang-select-overlay').style.display = 'flex'; }],
      ['🔄 Loop Summary', function () { document.getElementById('loop-summary-overlay').classList.add('active'); }],
      ['👑 Parade Celebration', function () { document.getElementById('parade-overlay').classList.add('active'); }],
      ['🏁 Game Complete', function () { document.getElementById('game-complete-overlay').classList.add('active'); }],
      ['🔄 Transition Effect', function () { getGlobal('Effects').levelTransition(); }],
      ['✨ Celebrate Effect', function () { getGlobal('Effects').celebrate(); }],
      ['✕ Close All Overlays', function () {
        document.querySelectorAll(
          '.vn-overlay,.cg-memory-overlay,.gacha-card-detail-overlay,' +
          '.cg-preview-overlay,.cg-reader-overlay,.fragment-synthesis-overlay,' +
          '.max-level-overlay,.confirm-dialog-overlay,#reward-modal-overlay'
        ).forEach(function (el) { el.remove(); });
        ['loop-summary-overlay','parade-overlay','game-complete-overlay','dialogue-overlay'].forEach(function (id) {
          var el = document.getElementById(id); if (el) el.classList.remove('active');
        });
        var ls = document.getElementById('lang-select-overlay'); if (ls) ls.style.display = 'none';
      }]
    ];
    items.forEach(function (it) { c.appendChild(makeBtn(it[0], it[1])); });
  }

  /* ── Tab registry ───────────────────────────────────────────── */
  var TABS = [
    { id: 'sheets',    icon: '📦', label: 'Sheets',     build: buildSheets },
    { id: 'bosses',    icon: '👹', label: 'Bosses',     build: buildBosses },
    { id: 'dialogues', icon: '💬', label: 'Dialogues',  build: buildDialogues },
    { id: 'cg',        icon: '🎬', label: 'CG Stories', build: buildCG },
    { id: 'gacha',     icon: '🎰', label: 'Gacha',      build: buildGacha },
    { id: 'overlays',  icon: '🎉', label: 'Overlays',   build: buildOverlays }
  ];

  /* ── Switch tab ─────────────────────────────────────────────── */
  function switchTab(tabId) {
    currentTab = tabId;
    panel.querySelectorAll('.dev-tab-btn').forEach(function (b) {
      b.classList.toggle('dev-active', b.getAttribute('data-tab') === tabId);
    });
    panel.querySelectorAll('.dev-tab-page').forEach(function (p) {
      p.classList.toggle('dev-active', p.getAttribute('data-tab') === tabId);
    });
    /* Lazy-rebuild: if the target tab has pending data and data is now ready, rebuild it */
    if (dataReady()) {
      var page = panel.querySelector('.dev-tab-page[data-tab="' + tabId + '"]');
      if (page && page.querySelector('.dev-data-pending')) {
        var tab = TABS.filter(function (t) { return t.id === tabId; })[0];
        if (tab) {
          while (page.firstChild) page.removeChild(page.firstChild);
          tab.build(page);
        }
      }
    }
  }

  /* ── Build panel ────────────────────────────────────────────── */
  function buildPanel() {
    /* Panel */
    panel = document.createElement('div');
    panel.className = 'dev-panel dev-hidden';

    /* Header */
    var header = document.createElement('div');
    header.className = 'dev-panel-header';
    var title = document.createElement('span');
    title.className = 'dev-panel-title';
    title.textContent = '🛠 Dev Navigator';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'dev-panel-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    /* Tab bar */
    var tabBar = document.createElement('div');
    tabBar.className = 'dev-tab-bar';
    TABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.className = 'dev-tab-btn';
      btn.setAttribute('data-tab', tab.id);
      btn.textContent = tab.icon + ' ' + tab.label;
      btn.addEventListener('click', function () { switchTab(tab.id); });
      tabBar.appendChild(btn);
    });
    panel.appendChild(tabBar);

    /* Tab content area */
    var contentArea = document.createElement('div');
    contentArea.className = 'dev-tab-content';

    TABS.forEach(function (tab) {
      var page = document.createElement('div');
      page.className = 'dev-tab-page';
      page.setAttribute('data-tab', tab.id);
      tab.build(page);
      contentArea.appendChild(page);
    });

    panel.appendChild(contentArea);

    /* Footer */
    var footer = document.createElement('div');
    footer.className = 'dev-panel-footer';
    var footerText = document.createElement('span');
    footerText.textContent = 'Dev Mode | ?dev=true';
    var persistBtn = document.createElement('button');
    persistBtn.className = 'dev-persist-btn';
    if (localStorage.getItem('dev_mode') === '1') persistBtn.classList.add('dev-persist-on');
    persistBtn.textContent = localStorage.getItem('dev_mode') === '1' ? '💾 Persist: ON' : '💾 Persist: OFF';
    persistBtn.addEventListener('click', function () {
      if (localStorage.getItem('dev_mode') === '1') {
        localStorage.removeItem('dev_mode');
        persistBtn.classList.remove('dev-persist-on');
        persistBtn.textContent = '💾 Persist: OFF';
      } else {
        localStorage.setItem('dev_mode', '1');
        persistBtn.classList.add('dev-persist-on');
        persistBtn.textContent = '💾 Persist: ON';
      }
    });
    footer.appendChild(footerText);
    footer.appendChild(persistBtn);
    panel.appendChild(footer);

    document.body.appendChild(panel);
    makeDraggable(panel, header);

    /* Activate first tab */
    switchTab('sheets');
  }

  /* ── Auto-rebuild pending tabs once data arrives ───────────── */
  function rebuildPendingTabs() {
    if (!panel || !dataReady()) return;
    var anyRebuilt = false;
    TABS.forEach(function (tab) {
      var page = panel.querySelector('.dev-tab-page[data-tab="' + tab.id + '"]');
      if (page && page.querySelector('.dev-data-pending')) {
        while (page.firstChild) page.removeChild(page.firstChild);
        tab.build(page);
        anyRebuilt = true;
      }
    });
    if (anyRebuilt) console.log('[DevPanel] Data loaded — tabs rebuilt');
  }

  /* ── Init ───────────────────────────────────────────────────── */

  /* Create toggle button IMMEDIATELY — visible even before game loads */
  toggleBtn = document.createElement('div');
  toggleBtn.className = 'dev-toggle-btn';
  toggleBtn.textContent = '🛠';
  document.body.appendChild(toggleBtn);
  makeToggleDraggable(toggleBtn, togglePanel);
  console.log('[DevPanel] Toggle button created');

  /* Build panel content once the game is ready */
  waitForGame(function () {
    buildPanel();
    console.log('[DevPanel] UI Navigator ready');
    /* If data globals aren't populated yet, poll until they are */
    if (!dataReady()) {
      var pollId = setInterval(function () {
        if (dataReady()) {
          clearInterval(pollId);
          rebuildPendingTabs();
        }
      }, 500);
    }
  });

})();