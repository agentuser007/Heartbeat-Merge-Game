# Fix Missing I18n Keys — Plan

## Problem Summary

125 `I18n.t()` calls exist across the codebase, plus 33 `data-i18n` attributes in HTML. Cross-referencing with [`zh-CN.json`](assets/i18n/zh-CN.json) and [`en.json`](assets/i18n/en.json), **45 keys are missing** — when called, the raw key string (e.g. `ad.energyBtn`) is displayed to the player instead of localized text.

The [`I18n.t()`](js/i18n.js:39) fallback returns the key itself when undefined, which means players see technical placeholders in UI.

---

## Missing Keys by Module

### ad — 5 keys

| Key                | Source                      | Params               | Proposed zh-CN                           | Proposed en                              |
| ------------------ | --------------------------- | -------------------- | ---------------------------------------- | ---------------------------------------- |
| `ad.energyReward`  | [`ad.js:135`](js/ad.js:135) | `{count}`            | ⚡ 恢复 {count} 体力！                   | ⚡ Recovered {count} energy!             |
| `ad.diamondReward` | [`ad.js:141`](js/ad.js:141) | `{count}`            | 💎 获得 {count} 钻石！                   | 💎 Got {count} diamonds!                 |
| `ad.energyBtn`     | [`ad.js:282`](js/ad.js:282) | `{count, remaining}` | 🎬 看广告 +{count}体力 剩余{remaining}次 | 🎬 Ad +{count} Energy {remaining} left   |
| `ad.diamondBtn`    | [`ad.js:297`](js/ad.js:297) | `{count, remaining}` | 🎬 看广告 +{count}钻石 剩余{remaining}次 | 🎬 Ad +{count} Diamonds {remaining} left |
| `ad.freePullBtn`   | [`ad.js:312`](js/ad.js:312) | `{remaining}`        | 🎬 看广告免费抽卡 剩余{remaining}次      | 🎬 Ad Free Pull {remaining} left         |

### boss — 2 keys

| Key                  | Source                          | Params    | Proposed zh-CN       | Proposed en              |
| -------------------- | ------------------------------- | --------- | -------------------- | ------------------------ |
| `boss.diamondReward` | [`boss.js:292`](js/boss.js:292) | `{count}` | 💎 +{count} 钻石     | 💎 +{count} Diamonds     |
| `bossEventReward`    | [`boss.js:189`](js/boss.js:189) | `{items}` | 🎁 事件奖励：{items} | 🎁 Event Reward: {items} |

### cg-album / cg — 2 keys

| Key                 | Source                                                                               | Params           | Proposed zh-CN              | Proposed en                         |
| ------------------- | ------------------------------------------------------------------------------------ | ---------------- | --------------------------- | ----------------------------------- |
| `cgMemoryFragments` | [`cg-album.js:279`](js/cg-album.js:279), [`collection.js:282`](js/collection.js:282) | `{current, max}` | 🧩 记忆碎片 {current}/{max} | 🧩 Memory Fragments {current}/{max} |
| `cgUnlockStory`     | [`cg-album.js:93`](js/cg-album.js:93)                                                | `{title}`        | ✨ 解锁回忆：{title}        | ✨ Unlocked Memory: {title}         |

### collection — 2 keys

| Key                       | Source                                    | Params                    | Proposed zh-CN                     | Proposed en                          |
| ------------------------- | ----------------------------------------- | ------------------------- | ---------------------------------- | ------------------------------------ |
| `collection.gachaCardPct` | [`collection.js:75`](js/collection.js:75) | `{collected, total, pct}` | 🎴 卡牌 {collected}/{total} {pct}% | 🎴 Cards {collected}/{total} {pct}%  |
| `collectionSSRFragments`  | [`collection.js:79`](js/collection.js:79) | `{collected, total}`      | 👑 SSR碎片 {collected}/{total}     | 👑 SSR Fragments {collected}/{total} |

### fragment — 4 keys

| Key                    | Source                                  | Params                                      | Proposed zh-CN                                          | Proposed en                                                 |
| ---------------------- | --------------------------------------- | ------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| `fragmentAdded`        | [`fragment.js:18`](js/fragment.js:18)   | `{icon, count, chain, level, current, max}` | {icon} +{count} {chain} Lv.{level} 碎片 {current}/{max} | {icon} +{count} {chain} Lv.{level} Fragment {current}/{max} |
| `memoryFragmentAdded`  | [`fragment.js:26`](js/fragment.js:26)   | `{count, current, max}`                     | 🧩 +{count} 记忆碎片 {current}/{max}                    | 🧩 +{count} Memory Fragment {current}/{max}                 |
| `fragmentSynthSuccess` | [`fragment.js:82`](js/fragment.js:82)   | `{name}`                                    | ✨ 合成成功：{name}                                     | ✨ Synthesized: {name}                                      |
| `fragmentFullNotice`   | [`fragment.js:112`](js/fragment.js:112) | `{icon, chain, level, current, max}`        | {icon} {chain} Lv.{level} 碎片已满 {current}/{max}      | {icon} {chain} Lv.{level} Fragments Full {current}/{max}    |

### gacha — 1 key

| Key          | Source                            | Params   | Proposed zh-CN       | Proposed en            |
| ------------ | --------------------------------- | -------- | -------------------- | ---------------------- |
| `gachaToBag` | [`gacha.js:165`](js/gacha.js:165) | `{name}` | 🎁 {name} 已放入背包 | 🎁 {name} added to bag |

### heroine — 1 key

| Key             | Source                                | Params   | Proposed zh-CN      | Proposed en          |
| --------------- | ------------------------------------- | -------- | ------------------- | -------------------- |
| `heroineBought` | [`heroine.js:180`](js/heroine.js:180) | `{name}` | 🛒 购买成功：{name} | 🛒 Purchased: {name} |

### inventory — 20 keys

| Key                              | Source                                    | Params               | Proposed zh-CN                     | Proposed en                                   |
| -------------------------------- | ----------------------------------------- | -------------------- | ---------------------------------- | --------------------------------------------- |
| `inventory.descAddDiamond`       | [`inventory.js:116`](js/inventory.js:116) | `{amount}`           | 💎 钻石，使用后获得{amount}钻石    | 💎 Diamonds, gain {amount} diamonds when used |
| `inventory.descAddGold`          | [`inventory.js:117`](js/inventory.js:117) | `{amount}`           | 💰 金币，使用后获得{amount}金币    | 💰 Gold, gain {amount} gold when used         |
| `inventory.usedItem`             | [`inventory.js:155`](js/inventory.js:155) | `{name}`             | ✨ 使用了 {name}                   | ✨ Used {name}                                |
| `inventory.fragmentAdded`        | [`inventory.js:174`](js/inventory.js:174) | `{count}`            | 🧩 +{count} 碎片                   | 🧩 +{count} Fragment                          |
| `inventory.luckyFragmentAdded`   | [`inventory.js:184`](js/inventory.js:184) | `{count}`            | 🍀 +{count} 幸运碎片               | 🍀 +{count} Lucky Fragment                    |
| `inventory.energyRecovered`      | [`inventory.js:194`](js/inventory.js:194) | `{count}`            | ⚡ 恢复 {count} 体力               | ⚡ Recovered {count} energy                   |
| `inventory.gotItem`              | [`inventory.js:218`](js/inventory.js:218) | `{name}`             | 🎁 获得 {name}                     | 🎁 Got {name}                                 |
| `inventory.gotGenerator`         | [`inventory.js:232`](js/inventory.js:232) | `{name}`             | 📦 放置 {name}                     | 📦 Placed {name}                              |
| `inventory.ssrPlaced`            | [`inventory.js:249`](js/inventory.js:249) | `{name}`             | 👑 放置SSR生成器 {name}            | 👑 Placed SSR Generator {name}                |
| `inventory.clearedLv1`           | [`inventory.js:272`](js/inventory.js:272) | `{count}`            | 🧹 清除了 {count} 个Lv.1物品       | 🧹 Cleared {count} Lv.1 items                 |
| `inventory.gotSpawnItem`         | [`inventory.js:290`](js/inventory.js:290) | `{emoji, name}`      | {emoji} 召唤了 {name}              | {emoji} Summoned {name}                       |
| `inventory.timeFreezeUsed`       | [`inventory.js:297`](js/inventory.js:297) | `{seconds}`          | ❄️ 时间冻结 {seconds}秒            | ❄️ Time Freeze {seconds}s                     |
| `inventory.luckyCoinUsed`        | [`inventory.js:304`](js/inventory.js:304) | `{count}`            | 🍀 幸运币 ×{count}                 | 🍀 Lucky Coin ×{count}                        |
| `inventory.doubleGenUsed`        | [`inventory.js:311`](js/inventory.js:311) | `{turns}`            | ⚡ 双倍产出 剩余{turns}次          | ⚡ Double Output {turns} left                 |
| `inventory.rerolled`             | [`inventory.js:350`](js/inventory.js:350) | `{count}`            | 🔄 置换了 {count} 个物品           | 🔄 Rerolled {count} items                     |
| `inventory.genRefreshed`         | [`inventory.js:371`](js/inventory.js:371) | `{count}`            | 🔁 刷新了 {count} 个合成器         | 🔁 Refreshed {count} generators               |
| `inventory.diamondAdded`         | [`inventory.js:382`](js/inventory.js:382) | `{count}`            | 💎 +{count} 钻石                   | 💎 +{count} Diamonds                          |
| `inventory.diamondAddedNoSystem` | [`inventory.js:384`](js/inventory.js:384) | `{count}`            | 💎 获得 {count} 钻石（无货币系统） | 💎 Got {count} diamonds (no currency system)  |
| `inventory.goldAdded`            | [`inventory.js:393`](js/inventory.js:393) | `{count}`            | 💰 +{count} 金币                   | 💰 +{count} Gold                              |
| `inventory.goldAddedNoSystem`    | [`inventory.js:395`](js/inventory.js:395) | `{count}`            | 💰 获得 {count} 金币（无货币系统） | 💰 Got {count} gold (no currency system)      |
| `inventory.spaceCleaned`         | [`inventory.js:415`](js/inventory.js:415) | `{count}`            | 🧽 清理了 {count} 个物品           | 🧽 Cleaned {count} items                      |
| `inventory.upgradeSuccess`       | [`inventory.js:460`](js/inventory.js:460) | `{oldName, newName}` | ⬆️ {oldName} → {newName}           | ⬆️ {oldName} → {newName}                      |
| `inventory.scissorSuccess`       | [`inventory.js:516`](js/inventory.js:516) | `{name}`             | ✂️ 拆分得到 {name}                 | ✂️ Split into {name}                          |

### loop — 4 keys

| Key                  | Source                          | Params           | Proposed zh-CN           | Proposed en               |
| -------------------- | ------------------------------- | ---------------- | ------------------------ | ------------------------- |
| `loop.badge`         | [`main.js:341`](js/main.js:341) | `{index, title}` | 🏫 第{index}轮 · {title} | 🏫 Loop {index} · {title} |
| `loop.maxedEffect`   | [`main.js:451`](js/main.js:451) | `{effect}`       | 当前效果：{effect}       | Current: {effect}         |
| `loop.currentEffect` | [`main.js:451`](js/main.js:451) | `{effect}`       | 当前：{effect}           | Current: {effect}         |
| `loop.nextEffect`    | [`main.js:451`](js/main.js:451) | `{effect}`       | → 下一级：{effect}       | → Next: {effect}          |

### zh-CN only missing — 1 key

| Key            | Source                             | Proposed zh-CN |
| -------------- | ---------------------------------- | -------------- |
| `dialogueSkip` | [`index.html:186`](index.html:186) | ⏩ 跳过        |

> Note: `dialogueSkip` already exists in [`en.json`](assets/i18n/en.json:181) but is missing from [`zh-CN.json`](assets/i18n/zh-CN.json).

---

## Total: 45 missing keys

- **44 keys** missing from both locale files
- **1 key** missing from zh-CN only (`dialogueSkip`)

---

## Implementation Steps

### Step 1: Add missing keys to `assets/i18n/zh-CN.json`

Insert the 45 keys into their correct nested positions within the existing JSON structure. Keys at root level (e.g. `bossEventReward`, `cgMemoryFragments`, `fragmentAdded`, etc.) should be added alongside existing root-level keys like `gachaFirstSSR`, `boardCantRecycle`, etc.

### Step 2: Add missing keys to `assets/i18n/en.json`

Mirror the same 45 keys with English translations.

### Step 3: Create `scripts/check_i18n_keys.js` validation script

A Node.js script that:

1. Parses all `I18n.t('key')` and `data-i18n="key"` references from JS/HTML files
2. Loads each locale JSON file
3. Reports any key present in code but missing from any locale file
4. Exits with non-zero code if any keys are missing (CI-friendly)

Usage: `node scripts/check_i18n_keys.js`

### Step 4:
