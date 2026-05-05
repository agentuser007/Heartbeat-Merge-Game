#!/usr/bin/env node
/**
 * patch_i18n.js — One-time script to add missing i18n keys to both locale files.
 * Run: node scripts/patch_i18n.js
 */
const fs = require('fs');
const path = require('path');

const ZH_PATH = path.join(__dirname, '..', 'assets', 'i18n', 'zh-CN.json');
const EN_PATH = path.join(__dirname, '..', 'assets', 'i18n', 'en.json');

// ---- Missing keys to add ----
const PATCH_NESTED = {
  boss: {
    diamondReward: { zh: '💎 +{count} 钻石', en: '💎 +{count} Diamonds' }
  },
  collection: {
    gachaCardPct: { zh: '🎴 卡牌 {collected}/{total} {pct}%', en: '🎴 Cards {collected}/{total} {pct}%' }
  },
  ad: {
    energyReward: { zh: '⚡ 恢复 {count} 体力！', en: '⚡ Recovered {count} energy!' },
    diamondReward: { zh: '💎 获得 {count} 钻石！', en: '💎 Got {count} diamonds!' },
    energyBtn: { zh: '🎬 内测福利 +{count}体力 剩余{remaining}次', en: '🎬 Beta Benefit +{count} Energy {remaining} left' },
    diamondBtn: { zh: '🎬 内测福利 +{count}钻石 剩余{remaining}次', en: '🎬 Beta Benefit +{count} Diamonds {remaining} left' },
    freePullBtn: { zh: '🎬 内测福利免费抽卡 剩余{remaining}次', en: '🎬 Beta Benefit Free Pull {remaining} left' }
  },
  inventory: {
    descAddDiamond: { zh: '💎 钻石，使用后获得{amount}钻石', en: '💎 Diamonds, gain {amount} diamonds when used' },
    descAddGold: { zh: '💰 金币，使用后获得{amount}金币', en: '💰 Gold, gain {amount} gold when used' },
    usedItem: { zh: '✨ 使用了 {name}', en: '✨ Used {name}' },
    fragmentAdded: { zh: '🧩 +{count} 碎片', en: '🧩 +{count} Fragment' },
    luckyFragmentAdded: { zh: '🍀 +{count} 幸运碎片', en: '🍀 +{count} Lucky Fragment' },
    energyRecovered: { zh: '⚡ 恢复 {count} 体力', en: '⚡ Recovered {count} energy' },
    gotItem: { zh: '🎁 获得 {name}', en: '🎁 Got {name}' },
    gotGenerator: { zh: '📦 放置 {name}', en: '📦 Placed {name}' },
    ssrPlaced: { zh: '👑 放置SSR生成器 {name}', en: '👑 Placed SSR Generator {name}' },
    clearedLv1: { zh: '🧹 清除了 {count} 个Lv.1物品', en: '🧹 Cleared {count} Lv.1 items' },
    gotSpawnItem: { zh: '{emoji} 召唤了 {name}', en: '{emoji} Summoned {name}' },
    timeFreezeUsed: { zh: '❄️ 时间冻结 {seconds}秒', en: '❄️ Time Freeze {seconds}s' },
    luckyCoinUsed: { zh: '🍀 幸运币 ×{count}', en: '🍀 Lucky Coin ×{count}' },
    doubleGenUsed: { zh: '⚡ 双倍产出 剩余{turns}次', en: '⚡ Double Output {turns} left' },
    rerolled: { zh: '🔄 置换了 {count} 个物品', en: '🔄 Rerolled {count} items' },
    genRefreshed: { zh: '🔁 刷新了 {count} 个合成器', en: '🔁 Refreshed {count} generators' },
    diamondAdded: { zh: '💎 +{count} 钻石', en: '💎 +{count} Diamonds' },
    diamondAddedNoSystem: { zh: '💎 获得 {count} 钻石（无货币系统）', en: '💎 Got {count} diamonds (no currency system)' },
    goldAdded: { zh: '💰 +{count} 金币', en: '💰 +{count} Gold' },
    goldAddedNoSystem: { zh: '💰 获得 {count} 金币（无货币系统）', en: '💰 Got {count} gold (no currency system)' },
    spaceCleaned: { zh: '🧽 清理了 {count} 个物品', en: '🧽 Cleaned {count} items' },
    upgradeSuccess: { zh: '⬆️ {oldName} → {newName}', en: '⬆️ {oldName} → {newName}' },
    scissorSuccess: { zh: '✂️ 拆分得到 {name}', en: '✂️ Split into {name}' }
  },
  loop: {
    badge: { zh: '🏫 第{index}轮 · {title}', en: '🏫 Loop {index} · {title}' },
    maxedEffect: { zh: '当前效果：{effect}', en: 'Current: {effect}' },
    currentEffect: { zh: '当前：{effect}', en: 'Current: {effect}' },
    nextEffect: { zh: '→ 下一级：{effect}', en: '→ Next: {effect}' }
  }
};

const PATCH_ROOT = {
  dialogueSkip: { zh: '⏩ 跳过', en: '⏩ Skip' },
  gachaToBag: { zh: '🎁 {name} 已放入背包', en: '🎁 {name} added to bag' },
  bossEventReward: { zh: '🎁 事件奖励：{items}', en: '🎁 Event Reward: {items}' },
  cgMemoryFragments: { zh: '🧩 记忆碎片 {current}/{max}', en: '🧩 Memory Fragments {current}/{max}' },
  cgUnlockStory: { zh: '✨ 解锁回忆：{title}', en: '✨ Unlocked Memory: {title}' },
  collectionSSRFragments: { zh: '👑 SSR碎片 {collected}/{total}', en: '👑 SSR Fragments {collected}/{total}' },
  fragmentAdded: { zh: '{icon} +{count} {chain} Lv.{level} 碎片 {current}/{max}', en: '{icon} +{count} {chain} Lv.{level} Fragment {current}/{max}' },
  memoryFragmentAdded: { zh: '🧩 +{count} 记忆碎片 {current}/{max}', en: '🧩 +{count} Memory Fragment {current}/{max}' },
  fragmentSynthSuccess: { zh: '✨ 合成成功：{name}', en: '✨ Synthesized: {name}' },
  fragmentFullNotice: { zh: '{icon} {chain} Lv.{level} 碎片已满 {current}/{max}', en: '{icon} {chain} Lv.{level} Fragments Full {current}/{max}' },
  heroineBought: { zh: '🛒 购买成功：{name}', en: '🛒 Purchased: {name}' }
};

// ---- Apply patches ----
function patchLocale(filePath, locale) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${filePath}: ${e.message}`);
    process.exit(1);
  }

  let added = 0;

  // Nested keys
  for (const [section, keys] of Object.entries(PATCH_NESTED)) {
    if (!data[section]) data[section] = {};
    for (const [key, translations] of Object.entries(keys)) {
      if (data[section][key] === undefined) {
        data[section][key] = translations[locale];
        added++;
      } else {
        console.log(`  SKIP ${section}.${key} (already exists)`);
      }
    }
  }

  // Root-level keys
  for (const [key, translations] of Object.entries(PATCH_ROOT)) {
    if (data[key] === undefined) {
      data[key] = translations[locale];
      added++;
    } else {
      console.log(`  SKIP ${key} (already exists)`);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`${path.basename(filePath)}: added ${added} keys`);
}

console.log('Patching zh-CN.json...');
patchLocale(ZH_PATH, 'zh');

console.log('Patching en.json...');
patchLocale(EN_PATH, 'en');

console.log('Done!');
