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

async function loadGameData() {
  try {
    const [itemsRes, genRes, levelsRes, settingsRes] = await Promise.all([
      fetch('assets/data/items.json'),
      fetch('assets/data/generators.json'),
      fetch('assets/data/levels.json'),
      fetch('assets/data/settings.json')
    ]);

    ITEMS = await itemsRes.json();
    GENERATORS = await genRes.json();
    LEVELS = await levelsRes.json();

    const settings = await settingsRes.json();
    GAME_CONFIG = settings.GAME_CONFIG;
    LOCKED_CELLS_INITIAL = settings.LOCKED_CELLS_INITIAL;
    UNLOCK_PER_BOSS = settings.UNLOCK_PER_BOSS;
    UI_TEXT = settings.UI_TEXT;

    console.log("Game static data loaded successfully.");
  } catch (error) {
    console.error("Failed to load static game data:", error);
    alert("游戏数据加载失败，请刷新重试！");
  }
}

