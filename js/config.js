// ============================================================
// config.js — 心动合成：电眼女王 — Remote Game Data Loading
// ============================================================

let GAME_CONFIG = {};
let ITEMS = {};
let GENERATORS = {};
let LOCKED_CELLS_INITIAL = [];
let UNLOCK_PER_BOSS = [];
let LEVELS = [];
let UI_TEXT = {};
let RECYCLE_ENERGY_TABLE = {};
let DAILY_ORDER_CONFIG = {};
let DAILY_ORDER_POOL = [];
let CELL_UNLOCK_COSTS = [];
let HEROINE_UPGRADES = [];
let GACHA_POOL = [];
let ACHIEVEMENT_DATA = [];
let UI_ANIMATION = {};
let UI_COLORS = {};
let DIALOGUE_CONFIG = {};

// Gacha pool data (loaded from gacha_pool.json + cg_stories.json)
let GACHA_RARITY_CONFIG = {};
let GACHA_COST = {};
let GACHA_SUB_WEIGHTS = {};
let GACHA_POOL_V2 = [];
let CG_STORIES = {};
let LOOP_RULES = {};
let LOOP_NARRATIVES = {};
let LOOP_EVENTS = {};
let CHAINS = [];
let CHAIN_NAMES = {};
let CHAIN_ICONS = {};
let CHAIN_TO_GEN = {};
let CHAIN_ITEM_PREFIX = {};
let FRAGMENT_TO_GENERATOR = 60;
let FRAGMENT_TO_STORY = 60;
let RECYCLE_ENERGY = {};

// Gold Shop items — purchased with gold, items go to inventory
let SHOP_ITEMS = [
    { id: 'shop_energy_small', name: '小瓶体力药水', icon: '⚡', description: '恢复30点体力', cost: 50, effect: 'add_energy_item', value: { energy: 30 }, i18nName: 'shopEnergySmall', i18nDesc: 'shopEnergySmallDesc' },
    { id: 'shop_energy_large', name: '大瓶体力药水', icon: '🔋', description: '恢复80点体力', cost: 120, effect: 'add_energy_item', value: { energy: 80 }, i18nName: 'shopEnergyLarge', i18nDesc: 'shopEnergyLargeDesc' },
    { id: 'shop_joker', name: '百搭牌', icon: '🃏', description: '放置到棋盘，与任意物品合成为更高级', cost: 200, effect: 'add_joker', value: {}, i18nName: 'shopJoker', i18nDesc: 'shopJokerDesc' },
    { id: 'shop_scissor', name: '剪刀', icon: '✂️', description: '点击棋盘物品拆分为2个低级物品', cost: 150, effect: 'add_scissor', value: {}, i18nName: 'shopScissor', i18nDesc: 'shopScissorDesc' },
    { id: 'shop_clear_lv1', name: '扫帚', icon: '🧹', description: '清除所有Lv.1物品，回收体力', cost: 80, effect: 'clear_lv1', value: {}, i18nName: 'shopClearLv1', i18nDesc: 'shopClearLv1Desc' },
];

// ============================================================
// Deep Merge Utility — recursively merges overlay onto base data
// ============================================================
// - Plain objects: merge by key, overlay wins for primitives
// - Arrays with `id` fields: match elements by `id`, then recursively merge
// - Arrays without `id`: merge by index
// - Primitives: overlay wins if present
function deepMerge(base, overlay) {
  // If overlay is null/undefined, keep base unchanged
  if (overlay === null || overlay === undefined) return base;
  // If overlay is not an object (primitive), it wins
  if (typeof overlay !== 'object') return overlay;
  // If base is not an object (primitive) but overlay is, overlay wins
  if (typeof base !== 'object' || base === null) return overlay;

  // Both are arrays
  if (Array.isArray(base) && Array.isArray(overlay)) {
    // If both arrays have elements with 'id', merge by id matching
    if (base.length > 0 && overlay.length > 0 &&
        base[0] && typeof base[0] === 'object' && 'id' in base[0] &&
        overlay[0] && typeof overlay[0] === 'object' && 'id' in overlay[0]) {
      // Build a lookup map from overlay elements by id
      var overlayById = {};
      for (var oi = 0; oi < overlay.length; oi++) {
        if (overlay[oi] && typeof overlay[oi] === 'object' && 'id' in overlay[oi]) {
          overlayById[overlay[oi].id] = overlay[oi];
        }
      }
      // Map over base: merge matched overlay element, keep unmatched base element
      return base.map(function(baseEl) {
        if (baseEl && typeof baseEl === 'object' && 'id' in baseEl && baseEl.id in overlayById) {
          return deepMerge(baseEl, overlayById[baseEl.id]);
        }
        return baseEl;
      });
    }
    // Fallback: merge by index
    return base.map(function(item, i) {
      return i < overlay.length ? deepMerge(item, overlay[i]) : item;
    });
  }

  // Both are plain objects: merge by key
  var result = Object.assign({}, base);
  var keys = Object.keys(overlay);
  for (var ki = 0; ki < keys.length; ki++) {
    var key = keys[ki];
    if (key in result) {
      result[key] = deepMerge(result[key], overlay[key]);
    } else {
      result[key] = overlay[key];
    }
  }
  return result;
}

// ============================================================
// Locale Overlay Loader — fetches and merges locale-specific
// data overlays onto the base (Chinese) data
// ============================================================
async function applyLocaleOverlays(locale) {
  var overlayFiles = [
    'items',           // 0  → ITEMS
    'generators',      // 1  → GENERATORS
    'levels',          // 2  → LEVELS
    'settings',        // 3  → GAME_CONFIG, UI_TEXT, HEROINE_UPGRADES, etc.
    'daily_orders',    // 4  → DAILY_ORDER_POOL
    'gacha_pool',      // 5  → GACHA_RARITY_CONFIG, CHAIN_NAMES, GACHA_POOL_V2, etc.
    'achievements',    // 6  → ACHIEVEMENT_DATA
    'cg_stories',      // 7  → CG_STORIES
    'loop_rules',      // 8  → LOOP_RULES
    'loop_narratives', // 9  → LOOP_NARRATIVES
    'loop_events'      // 10 → LOOP_EVENTS
  ];
  var cacheBust = '?v=' + Date.now();

  // Fetch all overlay files gracefully — missing files return null
  var results = await Promise.allSettled(
    overlayFiles.map(function(f) {
      return fetch('assets/data/' + locale + '/' + f + '.json' + cacheBust)
        .then(function(r) {
          if (!r.ok) return null;  // 404 or other HTTP error → skip
          return r.json();
        })
        .catch(function() { return null; });  // JSON parse error → skip
    })
  );

  // Helper: apply overlay if fetch succeeded and data is valid
  function applyOverlay(index, fn) {
    var result = results[index];
    if (result.status === 'fulfilled' && result.value) {
      fn(result.value);
    }
  }

  // 0: items.json → ITEMS
  applyOverlay(0, function(data) { ITEMS = deepMerge(ITEMS, data); });

  // 1: generators.json → GENERATORS
  applyOverlay(1, function(data) { GENERATORS = deepMerge(GENERATORS, data); });

  // 2: levels.json → LEVELS
  applyOverlay(2, function(data) { LEVELS = deepMerge(LEVELS, data); });

  // 3: settings.json → multiple globals (only merge translatable sub-objects)
  applyOverlay(3, function(data) {
    if (data.GAME_CONFIG) GAME_CONFIG = deepMerge(GAME_CONFIG, data.GAME_CONFIG);
    if (data.LOCKED_CELLS_INITIAL) LOCKED_CELLS_INITIAL = deepMerge(LOCKED_CELLS_INITIAL, data.LOCKED_CELLS_INITIAL);
    if (data.UNLOCK_PER_BOSS) UNLOCK_PER_BOSS = deepMerge(UNLOCK_PER_BOSS, data.UNLOCK_PER_BOSS);
    if (data.UI_TEXT) UI_TEXT = deepMerge(UI_TEXT, data.UI_TEXT);
    if (data.RECYCLE_ENERGY_TABLE) RECYCLE_ENERGY_TABLE = deepMerge(RECYCLE_ENERGY_TABLE, data.RECYCLE_ENERGY_TABLE);
    if (data.DAILY_ORDER_CONFIG) DAILY_ORDER_CONFIG = deepMerge(DAILY_ORDER_CONFIG, data.DAILY_ORDER_CONFIG);
    if (data.CELL_UNLOCK_COSTS) CELL_UNLOCK_COSTS = deepMerge(CELL_UNLOCK_COSTS, data.CELL_UNLOCK_COSTS);
    if (data.HEROINE_UPGRADES) HEROINE_UPGRADES = deepMerge(HEROINE_UPGRADES, data.HEROINE_UPGRADES);
    if (data.UI_ANIMATION) UI_ANIMATION = deepMerge(UI_ANIMATION, data.UI_ANIMATION);
    if (data.UI_COLORS) UI_COLORS = deepMerge(UI_COLORS, data.UI_COLORS);
    if (data.DIALOGUE_CONFIG) DIALOGUE_CONFIG = deepMerge(DIALOGUE_CONFIG, data.DIALOGUE_CONFIG);
  });

  // 4: daily_orders.json → DAILY_ORDER_POOL (nested under orderPool key)
  applyOverlay(4, function(data) {
    if (data.orderPool) DAILY_ORDER_POOL = deepMerge(DAILY_ORDER_POOL, data.orderPool);
  });

  // 5: gacha_pool.json → multiple globals
  applyOverlay(5, function(data) {
    if (data.rarityConfig) GACHA_RARITY_CONFIG = deepMerge(GACHA_RARITY_CONFIG, data.rarityConfig);
    if (data.gachaCost) GACHA_COST = deepMerge(GACHA_COST, data.gachaCost);
    if (data.subWeights) GACHA_SUB_WEIGHTS = deepMerge(GACHA_SUB_WEIGHTS, data.subWeights);
    if (data.gachaPoolV2) GACHA_POOL_V2 = deepMerge(GACHA_POOL_V2, data.gachaPoolV2);
    if (data.gachaPool) GACHA_POOL = deepMerge(GACHA_POOL, data.gachaPool);
    if (data.chains) CHAINS = deepMerge(CHAINS, data.chains);
    if (data.chainNames) CHAIN_NAMES = deepMerge(CHAIN_NAMES, data.chainNames);
    if (data.chainIcons) CHAIN_ICONS = deepMerge(CHAIN_ICONS, data.chainIcons);
    if (data.chainToGen) CHAIN_TO_GEN = deepMerge(CHAIN_TO_GEN, data.chainToGen);
    if (data.chainItemPrefix) CHAIN_ITEM_PREFIX = deepMerge(CHAIN_ITEM_PREFIX, data.chainItemPrefix);
    if (data.recycleEnergy) RECYCLE_ENERGY = deepMerge(RECYCLE_ENERGY, data.recycleEnergy);
    // Scalar values — direct assignment
    if (data.fragmentToGenerator !== undefined) FRAGMENT_TO_GENERATOR = data.fragmentToGenerator;
    if (data.fragmentToStory !== undefined) FRAGMENT_TO_STORY = data.fragmentToStory;
  });

  // 6: achievements.json → ACHIEVEMENT_DATA (nested under achievements key)
  applyOverlay(6, function(data) {
    if (data.achievements) ACHIEVEMENT_DATA = deepMerge(ACHIEVEMENT_DATA, data.achievements);
  });

  // 7: cg_stories.json → CG_STORIES
  applyOverlay(7, function(data) { CG_STORIES = deepMerge(CG_STORIES, data); });

  // 8: loop_rules.json → LOOP_RULES
  applyOverlay(8, function(data) { LOOP_RULES = deepMerge(LOOP_RULES, data); });

  // 9: loop_narratives.json → LOOP_NARRATIVES
  applyOverlay(9, function(data) { LOOP_NARRATIVES = deepMerge(LOOP_NARRATIVES, data); });

  // 10: loop_events.json → LOOP_EVENTS
  applyOverlay(10, function(data) { LOOP_EVENTS = deepMerge(LOOP_EVENTS, data); });

  console.log('[Locale] Overlays applied for locale: ' + locale);
}

async function loadGameData() {
  // Data sources: url, logical name, whether it is critical for gameplay
  var dataSources = [
    { url: 'assets/data/items.json',         name: 'items',           critical: true  },
    { url: 'assets/data/generators.json',     name: 'generators',      critical: true  },
    { url: 'assets/data/levels.json',         name: 'levels',          critical: true  },
    { url: 'assets/data/settings.json',       name: 'settings',        critical: true  },
    { url: 'assets/data/daily_orders.json',   name: 'daily_orders',    critical: false },
    { url: 'assets/data/gacha_pool.json',     name: 'gacha_pool',      critical: false },
    { url: 'assets/data/achievements.json',   name: 'achievements',    critical: false },
    { url: 'assets/data/cg_stories.json',     name: 'cg_stories',      critical: false },
    { url: 'assets/data/loop_rules.json',     name: 'loop_rules',      critical: false },
    { url: 'assets/data/loop_narratives.json', name: 'loop_narratives', critical: false },
    { url: 'assets/data/loop_events.json',    name: 'loop_events',     critical: false }
  ];

  // Fetch all data sources — one failure won't block the others
  var results = await Promise.allSettled(
    dataSources.map(function(src) {
      return fetch(src.url)
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + src.url);
          return res.json();
        });
    })
  );

  // Helper: extract data from a settled result, falling back on failure
  function getData(index, fallback) {
    var result = results[index];
    if (result.status === 'fulfilled') {
      return result.value;
    }
    console.warn('[loadGameData] Failed to load ' + dataSources[index].name + ':', result.reason);
    return fallback;
  }

  // 0: items.json → ITEMS
  ITEMS = getData(0, {});

  // 1: generators.json → GENERATORS
  GENERATORS = getData(1, {});

  // 2: levels.json → LEVELS
  LEVELS = getData(2, []);

  // 3: settings.json → multiple globals
  var settings = getData(3, {});
  GAME_CONFIG = settings.GAME_CONFIG || {};
  LOCKED_CELLS_INITIAL = settings.LOCKED_CELLS_INITIAL || [];
  UNLOCK_PER_BOSS = settings.UNLOCK_PER_BOSS || [];
  UI_TEXT = settings.UI_TEXT || {};
  RECYCLE_ENERGY_TABLE = settings.RECYCLE_ENERGY_TABLE || {};
  DAILY_ORDER_CONFIG = settings.DAILY_ORDER_CONFIG || { MAX_ACTIVE: 3 };
  CELL_UNLOCK_COSTS = settings.CELL_UNLOCK_COSTS || [50, 100, 200, 500];
  HEROINE_UPGRADES = settings.HEROINE_UPGRADES || [];
  UI_ANIMATION = settings.UI_ANIMATION || {};
  UI_COLORS = settings.UI_COLORS || {};
  DIALOGUE_CONFIG = settings.DIALOGUE_CONFIG || {};

  // 4: daily_orders.json → DAILY_ORDER_POOL
  var dailyData = getData(4, {});
  DAILY_ORDER_POOL = dailyData.orderPool || [];

  // 5: gacha_pool.json → multiple globals
  var gachaData = getData(5, {});
  // Legacy pool (kept for backward compatibility)
  GACHA_POOL = gachaData.gachaPool || [];
  // New V2 gacha data
  GACHA_RARITY_CONFIG = gachaData.rarityConfig || GACHA_RARITY_CONFIG;
  GACHA_COST = gachaData.gachaCost || GACHA_COST;
  GACHA_SUB_WEIGHTS = gachaData.subWeights || GACHA_SUB_WEIGHTS;
  GACHA_POOL_V2 = gachaData.gachaPoolV2 || GACHA_POOL_V2;
  CHAINS = gachaData.chains || CHAINS;
  CHAIN_NAMES = gachaData.chainNames || CHAIN_NAMES;
  CHAIN_ICONS = gachaData.chainIcons || CHAIN_ICONS;
  CHAIN_TO_GEN = gachaData.chainToGen || CHAIN_TO_GEN;
  CHAIN_ITEM_PREFIX = gachaData.chainItemPrefix || CHAIN_ITEM_PREFIX;
  FRAGMENT_TO_GENERATOR = gachaData.fragmentToGenerator || FRAGMENT_TO_GENERATOR;
  FRAGMENT_TO_STORY = gachaData.fragmentToStory || FRAGMENT_TO_STORY;
  RECYCLE_ENERGY = gachaData.recycleEnergy || RECYCLE_ENERGY;

  // 6: achievements.json → ACHIEVEMENT_DATA
  var achData = getData(6, {});
  ACHIEVEMENT_DATA = achData.achievements || [];

  // 7: cg_stories.json → CG_STORIES
  CG_STORIES = getData(7, {});

  // 8–10: loop data
  LOOP_RULES = getData(8, {});
  LOOP_NARRATIVES = getData(9, {});
  LOOP_EVENTS = getData(10, {});

  // ---- Check critical data: block game init if essential data is missing ----
  var criticalMissing = [];
  for (var ci = 0; ci < dataSources.length; ci++) {
    if (dataSources[ci].critical && results[ci].status === 'rejected') {
      criticalMissing.push(dataSources[ci].name);
    }
  }

  if (criticalMissing.length > 0) {
    var criticalList = criticalMissing.join(', ');
    console.error('[loadGameData] Critical data failed to load: ' + criticalList + '. Game cannot start.');

    // Show a user-friendly error overlay instead of alert()
    var errorDiv = document.createElement('div');
    errorDiv.id = 'data-load-error';
    errorDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;color:#fff;font-family:sans-serif;text-align:center;padding:20px;box-sizing:border-box;';
    var errorMsg = (typeof I18n !== 'undefined' && I18n.t) ? I18n.t('common.dataLoadError') : 'Game data failed to load. Please refresh!';
    var refreshLabel = (typeof I18n !== 'undefined' && I18n.t) ? I18n.t('common.refresh') : 'Refresh';
    errorDiv.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">⚠️</div>' +
      '<div style="font-size:20px;margin-bottom:12px;">' + errorMsg + '</div>' +
      '<button onclick="location.reload()" style="padding:12px 32px;font-size:16px;border:none;border-radius:8px;background:#4CAF50;color:#fff;cursor:pointer;">' + refreshLabel + '</button>';
    document.body.appendChild(errorDiv);

    // Throw to halt further game initialization in the caller
    throw new Error('Critical game data failed to load: ' + criticalList);
  }

  // ---- Locale overlay: merge translated data if locale is not zh-CN ----
  var locale = typeof I18n !== 'undefined' ? I18n.getLocale() : 'zh-CN';
  if (locale !== 'zh-CN') {
    try {
      await applyLocaleOverlays(locale);
    } catch(overlayErr) {
      console.warn('[Locale] Overlay loading failed, using base data:', overlayErr);
    }
  }

  console.log("Game static data loaded successfully.");
}