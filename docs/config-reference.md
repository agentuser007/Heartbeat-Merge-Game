# Heartbeat Merge — 配表参考手册

> 策划专用。每个 JSON 文件控制什么、字段含义与取值范围、改了是否需要重启。

---

## 通用规则

- **所有 JSON 修改后都需要刷新页面**（F5）。当前没有运行时热加载机制。
- 刷新页面后，大部分配置立即生效；少数字段需要在**新一周目**才生效（见各表标注）。
- JSON 不支持注释。如果需要备注，用 `"_comment"` 或 `"__note"` 开头的 key（schema 会 strip 掉）。
- 修改前先备份。JSON 语法错误会导致整张表加载失败，游戏无法启动。
- 所有时间单位统一为**毫秒**（`1000` = 1秒），除非特别标注。
- 概率字段统一为 `0.0 ~ 1.0` 的浮点数（`0.3` = 30%）。

---

## 生效方式标注说明

| 标注 | 含义 |
|------|------|
| ⚡ 实时 | 刷新页面后立即生效，下次触发对应逻辑时使用新值 |
| 🔄 需刷新 | 刷新页面后生效，但已创建的定时器/实例不会更新 |
| 🔁 新周目 | 仅在新一周目（新 loop 或新游戏）中生效，当前存档不受影响 |
| 🚫 未消费 | 字段已加载但代码未读取，改了也没有效果 |

---

## 1. settings.json — 全局参数

控制棋盘尺寸、体力系统、解锁费用、UI动画/颜色/计时器等基础参数。

### GAME_CONFIG

| 字段 | 类型 | 默认值 | 单位 | 生效 | 说明 |
|------|------|--------|------|------|------|
| `BOARD_COLS` | int | `7` | 格 | 🔁 新周目 | 棋盘列数。修改后当前存档棋盘不会变，新游戏才生效 |
| `BOARD_ROWS` | int | `9` | 格 | 🔁 新周目 | 棋盘行数。同上 |
| `MAX_ENERGY` | int | `100` | 点 | ⚡ 实时 | 体力上限。heroine 升级效果会叠加在此基础值上 |
| `ENERGY_REGEN_CAP` | int | `100` | 点 | ⚡ 实时 | 体力恢复上限。超过此值后不再自动恢复 |
| `ENERGY_REGEN_INTERVAL` | int | `120000` | ms | ⚡ 实时 | 体力恢复间隔。`120000` = 每2分钟恢复1点 |
| `ENERGY_REGEN_AMOUNT` | int | `1` | 点 | 🔄 需刷新 | 每次恢复的体力点数。刷新后生效 |
| `ENERGY_COST_PER_SPAWN` | int | `1` | 点 | ⚡ 实时 | 生成器每次产出的体力消耗 |
| `ENERGY_REGEN_DOWN_MULTIPLIER` | float | `1.5` | 倍 | ⚡ 实时 | "体力减速"loop规则生效时的恢复间隔倍率。`1.5` = 间隔变为1.5倍（恢复变慢） |

### RECYCLE_ENERGY_TABLE

| 字段 | 类型 | 说明 |
|------|------|------|
| `"1"` ~ `"8"` | int | 物品等级 → 回收返回的体力点数。`"1": 0` 表示Lv1物品回收不返体力 |

**生效**：⚡ 实时

### DAILY_ORDER_CONFIG

| 字段 | 类型 | 默认值 | 生效 | 说明 |
|------|------|--------|------|------|
| `MAX_ACTIVE` | int | `5` | ⚡ 实时 | 同时显示的日常订单数量上限 |
| `REFRESH_COST` | int | `0` | 🚫 未消费 | 刷新订单的钻石费用。**功能未实现**，当前刷新免费 |

### CELL_UNLOCK_COSTS

`number[]`，长度 20。按顺序对应 20 个锁定格子的解锁费用（金币）。

**生效**：⚡ 实时

### HEROINE_UPGRADES

女主角升级配置，4 个升级项（`energy_cap` / `regen_speed` / `recycle_bonus` / `gold_bonus`），每项含多级。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 升级标识，勿改 |
| `name` / `icon` / `description` | string | 显示文本，可改 |
| `levels[]` | array | 每级的 `cost`（钻石）、`value`（效果值）、`label`（显示文本） |

**生效**：🔄 需刷新

### LOCKED_CELLS_INITIAL

`number[]`，初始锁定格子索引（0-based，行主序）。棋盘 7×9 共 63 格。

**生效**：🔁 新周目

### UNLOCK_PER_BOSS

`number[][]`，4 个子数组，对应击败 Boss 0~3 时解锁的格子索引。

**生效**：⚡ 实时（下次击败 Boss 时使用新值）

### UI_ANIMATION

| 字段 | 默认值 | 单位 | 生效 | 说明 |
|------|--------|------|------|------|
| `mergePopDuration` | `500` | ms | ⚡ 实时 | 合成弹跳动画时长 |
| `heartFlyDuration` | `700` | ms | ⚡ 实时 | 爱心飞行动画时长 |
| `interactiveTransition` | `200` | ms | ⚡ 实时 | 全局交互过渡时长（按钮、卡片等 30+ 处 CSS 引用） |
| `autoSaveInterval` | `5000` | ms | 🔄 需刷新 | 自动保存间隔。刷新后新定时器使用新值 |
| `flashDuration` | `500` | ms | 🚫 未消费 | — |
| `spawnPopDuration` | `400` | ms | 🚫 未消费 | — |
| `transitionDuration` | `500` | ms | 🚫 未消费 | — |
| `energyPulseDuration` | `400` | ms | 🚫 未消费 | — |
| `genClickDuration` | `300` | ms | 🚫 未消费 | — |
| `shakeDuration` | `400` | ms | 🚫 未消费 | — |
| `particleDistance` | `120` | px | 🚫 未消费 | — |
| `particleFallStartY` | `-30` | px | 🚫 未消费 | — |
| `particleFallDriftX` | `200` | px | 🚫 未消费 | — |
| `diamondParticleCount` | `6` | 个 | 🚫 未消费 | — |
| `confettiCount` | `25` | 个 | 🚫 未消费 | — |
| `defeatBossDelay` | `1500` | ms | 🚫 未消费 | — |
| `paradeToCompleteDelay` | `6000` | ms | 🚫 未消费 | — |
| `swipeCloseThreshold` | `80` | px | 🚫 未消费 | — |
| `swipeHandleArea` | `40` | px | 🚫 未消费 | — |
| `timerWarningThreshold` | `5` | 秒 | 🚫 未消费 | — |

### UI_COLORS

| 字段 | 默认值 | 生效 | 说明 |
|------|--------|------|------|
| `toastSSR` | CSS gradient | ⚡ 实时 | SSR 稀有度 Toast 背景色 |
| `toastSR` | CSS gradient | ⚡ 实时 | SR 稀有度 Toast 背景色 |
| `toastDefault` | CSS rgba | ⚡ 实时 | 默认 Toast 背景色 |

### DIALOGUE_CONFIG

| 字段 | 默认值 | 单位 | 生效 | 说明 |
|------|--------|------|------|------|
| `typewriterSpeedNormal` | `30` | ms/字 | ⚡ 实时 | 普通打字机速度。越小越快 |
| `typewriterSpeedFast` | `25` | ms/字 | ⚡ 实时 | 快进打字机速度 |

### UI_TEXT

| 字段 | 类型 | 生效 | 说明 |
|------|------|------|------|
| `intro` | `{ npc, emoji, text, player }` | ⚡ 实时 | 开场对话文本。新游戏/新周目开始时显示 |
| `game_complete` | `{ title, subtitle, emoji, button }` | ⚡ 实时 | 通关画面文本 |
| `default_fail` | `{ text, player }` | ⚡ 实时 | 默认失败文本 |

### UI_TIMERS

| 字段 | 默认值 | 单位 | 生效 | 说明 |
|------|--------|------|------|------|
| `achievementToastDisplay` | `3500` | ms | ⚡ 实时 | 成就 Toast 显示时长 |
| `achievementToastFadeOut` | `500` | ms | ⚡ 实时 | 成就 Toast 淡出时长 |
| `orderTimerInterval` | `1000` | ms | ⚡ 实时 | 订单倒计时刷新间隔 |
| `affectionToastDisplay` | `2000` | ms | ⚡ 实时 | 好感度 Toast 显示时长 |
| `affectionLevelUpToastDisplay` | `3000` | ms | ⚡ 实时 | 好感度升级 Toast 显示时长 |
| `touchDialogueDisplay` | `3000` | ms | ⚡ 实时 | 触摸互动对话显示时长 |
| `vnTitleDisplay` | `2000` | ms | ⚡ 实时 | VN 故事标题显示时长 |
| `bgmFadeIn` | `800` | ms | ⚡ 实时 | BGM 淡入时长 |
| `bgmResumeFade` | `500` | ms | ⚡ 实时 | BGM 恢复淡入时长 |
| `bgmSwitchDelay` | `50` | ms | ⚡ 实时 | BGM 切换延迟 |
| `itemUseDelay` | `300` | ms | ⚡ 实时 | 道具使用延迟 |
| `sparkleStartDelay` | `50` | ms | ⚡ 实时 | 闪光特效启动延迟 |
| `toastFadeOut` | `300` | ms | ⚡ 实时 | 通用 Toast 淡出时长 |
| `unlockConfirmAutoClose` | `5000` | ms | 🚫 未消费 | — |
| `unlockConfirmCloseDelay` | `100` | ms | 🚫 未消费 | — |
| `unlockAnimation` | `600` | ms | 🚫 未消费 | — |
| `bossDefeatAnim` | `2000` | ms | 🚫 未消费 | — |
| `dialogueAutoAdvance` | `3000` | ms | 🚫 未消费 | — |
| `energyRegenInterval` | `5000` | ms | 🚫 未消费 | — |
| `particleLifespan` | `800` | ms | 🚫 未消费 | — |
| `paradeStepInterval` | `1500` | ms | 🚫 未消费 | — |
| `gachaRevealDelay` | `300` | ms | 🚫 未消费 | — |
| `gachaCardFlipDuration` | `600` | ms | 🚫 未消费 | — |

### UI_COLOR_THEME / UI_LAYOUT

🚫 **全部未消费**。预留给未来的设计 token 系统，当前改了没有效果。

---

## 2. items.json — 物品定义

**生效**：⚡ 实时

按物品 ID 索引的对象。每个物品：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，如 `"lip_1"`。**勿改**，代码中大量引用 |
| `name` | string | 显示名称 |
| `level` | int | 物品等级 1~8。8 为当前最高级 |
| `chain` | string | 所属链条：`lips` / `perfume` / `study` / `food` / `special` / `random` |
| `nextId` | string \| null | 合成后的目标物品 ID。`null` 表示最高级，无法再合成 |
| `sellPrice` | int | 出售金币数 |
| `emoji` | string | 显示 emoji |
| `color` | string | 十六进制颜色，如 `"#FFB6C1"` |

**生成器物品**额外字段：`type: "GENERATOR"`, `sellable: false`

**特殊物品**额外字段：`type`（`JOKER` / `SCISSOR` / `ENERGY_POTION` / `SPECIAL` / `SURPRISE_BOX`），可选 `description`、`energyRecover`

### 链条 → 物品映射

| 链条 | 物品 | 生成器 |
|------|------|--------|
| `lips` | lip_1 ~ lip_8 | gen_makeup |
| `perfume` | perf_1 ~ perf_8 | gen_makeup |
| `study` | study_1 ~ study_8 | gen_study |
| `food` | food_1 ~ food_8 | gen_study |

---

## 3. generators.json — 生成器定义

**生效**：⚡ 实时

按生成器 ID 索引（`gen_makeup` / `gen_study`）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 生成器链 ID，**勿改** |
| `name` | string | 显示名称 |
| `emoji` | string | 显示 emoji |
| `chains` | string[] | 产出的物品链条列表 |
| `levels` | object | 按 "1"~"8" 索引的等级配置 |

### levels["N"] 子结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `drop_pool` | `{ itemId, weight }[]` | 产出物品的权重表。`weight` 是相对权重 |
| `free_production_chance` | float | 免费产出概率 0.0~1.0 |
| `capacity` | int | 离线产出容量。`0` = 无离线产出 |
| `cooldown` | int | 冷却时间（ms）。`0` = 无冷却 |
| `special_drop` | object \| null | 特殊掉落配置，含 `chance`（概率）和 `items`（权重表） |

**修改示例**：想让 Lv3 化妆包更容易产出 Lv2 物品 → 增加 `levels["3"].drop_pool` 中 `lip_2` 的 `weight`。

---

## 4. levels.json — Boss 关卡定义

**生效**：⚡ 实时（新 Boss 遭遇时使用新值）

顶级数组，4 个 Boss 关卡。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 关卡索引 0~3 |
| `characterId` | string | 角色 ID：`morven` / `leo` / `daniel` / `vincent` |
| `bossName` / `bossTitle` | string | Boss 名称和称号 |
| `bossAvatar` | string | 头像资源路径 |
| `bossColor` | string | 主题色 |
| `bgGradient` | string | 背景渐变 CSS |
| `totalHp` | int | Boss 总血量。**核心平衡参数** |
| `orders[]` | array | Boss 订单（任务）列表 |

### orders[] 子结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 订单 ID |
| `name` | string | 显示名称 |
| `required[]` | `{ itemId, count }[]` | 需要提交的物品和数量 |
| `isTimed` | boolean | 是否限时 |
| `timeLimit` | int | 限时秒数（仅 `isTimed: true` 时有效） |
| `damage` | int | 完成后对 Boss 造成的伤害。**核心平衡参数** |
| `diamondReward` | int | 完成后获得的钻石 |
| `dialogue` | `{ npc, player }` | 完成对话 |
| `failText` | string | 限时失败文本 |

**修改示例**：想让 Boss 更容易击败 → 减少 `totalHp` 或增加单个订单的 `damage`。

---

## 5. gacha_pool.json — 扭蛋池

**生效**：⚡ 实时

| 字段 | 类型 | 说明 |
|------|------|------|
| `rarityConfig` | object | 稀有度概率和视觉配置 |
| `gachaCost` | object | 抽卡费用 |
| `subWeights` | object | 子类别权重 |
| `chains` | string[] | 物品链条列表 |
| `chainNames` | object | 链条 → 显示名映射 |
| `chainIcons` | object | 链条 → emoji 映射 |
| `chainToGen` | object | 链条 → 生成器链映射。🚫 未消费 |
| `chainItemPrefix` | object | 链条 → 物品 ID 前缀映射 |
| `fragmentToGenerator` | int | 碎片兑换生成器所需数量。🚫 未消费 |
| `fragmentToStory` | int | 碎片解锁故事所需数量 |
| `gachaPoolV2` | array | 扭蛋池条目（见下方） |

### rarityConfig

按稀有度 `R` / `SR` / `SSR` 索引：

| 字段 | 类型 | 说明 |
|------|------|------|
| `probability` | float | 抽中概率。三者之和应 = 1.0 |
| `color` | string | 稀有度显示色 |
| `glow` | string | 发光效果 CSS |

### gachaCost

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `singleCost` | `100` | 单抽钻石费用 |
| `tenCost` | `900` | 十连抽钻石费用 |

### gachaPoolV2[] 条目

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 池条目 ID |
| `rarity` | string | `R` / `SR` / `SSR` |
| `subCategory` | string | 子类别：`item` / `generator` / `joker` / `scissor` / `energy` / `special` / `energy_potion` |
| `weight` | int | 同稀有度内的相对权重。**核心平衡参数** |
| `effect` | string | 效果类型（见下方列表） |
| `value` | object | 效果参数，因 effect 而异 |
| `itemId` | string | 对应物品 ID |
| `name` / `icon` / `description` | string | 显示信息 |

**effect 类型与 value 格式**：

| effect | value 格式 | 说明 |
|--------|-----------|------|
| `spawn_board_item` | `{ chain, level }` | 在棋盘生成指定链/级的物品 |
| `place_generator` | `{ genChain, level }` | 放置指定生成器 |
| `ssr_generator` | `{ genChain, level, cgId? }` | SSR 生成器，可能关联 CG 故事 |
| `add_joker` | `{}` | 获得百搭牌 |
| `add_scissor` | `{}` | 获得剪刀 |
| `add_energy_item` | `{ energy }` | 获得体力药水 |
| `double_gen` | `{ turns }` | 生成器双倍产出 N 回合 |
| `clear_lv1` | `{}` | 清除所有 Lv1 物品 |
| `space_clean` | `{}` | 清除 Lv1~2 物品 |
| `reroll` | `{ count }` | 重置 N 个格子 |
| `lucky_coin` | `{ count }` | 幸运七号翻转 N 次 |
| `add_fragment` | `{ chain, genLevel, count }` | 获得指定链碎片 |
| `add_diamond` | `{ amount }` | 获得钻石 |
| `add_gold` | `{ amount }` | 获得金币 |
| `gen_refresh` | `{}` | 刷新生成器产出 |
| `upgrade_item` | `{}` | 升级一个物品 |

---

## 6. gacha_config.json — 扭蛋规则

**生效**：⚡ 实时

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tenPullCount` | int | `10` | 十连抽的次数。通常不改 |
| `freePullMaxRarity` | string | `"SR"` | 广告免费抽的最大稀有度。`"SR"` = 不会出 SSR |

---

## 7. board_economy.json — 棋盘经济参数

**生效**：⚡ 实时

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sellPriceBoost` | float | `1.5` | "售价提升"buff 生效时的出售倍率 |
| `luckyMergeChance` | float | `0.3` | "幸运合成"buff 生效时的跳级概率 |
| `dailyGoldBoost` | float | `1.5` | "日常金币提升"loop 规则的订单金币倍率 |
| `achievementTokenBonus` | int | `2` | 每个成就解锁奖励的额外 token 数 |
| `energyDiscountFreeChance` | float | `0.5` | "体力折扣"buff 生效时免费产出概率 |
| `perfumeBoostChains` | string[] | `["perfume","lips"]` | "香水加成"loop 规则适用的链条列表 |

---

## 8. boss_progression.json — Boss 进程规则

**生效**：⚡ 实时

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderTierBoost[]` | array | 订单等级提升阶梯表（见下方） |
| `maxItemTier` | int `8` | 物品最大等级上限 |
| `timedOrdersUp` | object | 限时订单规则配置 |

### orderTierBoost[] — 按周目数递增的等级加成

| 字段 | 类型 | 说明 |
|------|------|------|
| `maxLoop` | int \| null | 周目数上限。`null` = 兜底 |
| `boost` | int | 物品等级 +N |

默认阶梯：loop ≤1 → +0, ≤3 → +1, ≤5 → +2, ≤7 → +3, 8+ → +4

### timedOrdersUp

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `defaultTimeLimit` | `30` 秒 | 默认限时 |
| `timeMultiplier` | `0.7` | 规则生效时的限时倍率（0.7 = 时间缩短到 70%） |

---

## 9. item_effects.json — 道具效果参数

**生效**：⚡ 实时

按效果类型分组，每组包含该效果的所有可调参数：

| 分组 | 字段 | 默认值 | 说明 |
|------|------|--------|------|
| **luckyCoin** | `defaultCount` | `7` | 默认翻转次数 |
| | `goldChance` | `0.5` | 每次出金币的概率 |
| | `goldAmount` | `100` | 每次出金币的数量 |
| | `diamondAmount` | `10` | 每次出钻石的数量 |
| **fragment** | `defaultCount` | `10` | 默认碎片数量 |
| | `defaultGenLevel` | `3` | 默认生成器等级 |
| **energyItem** | `defaultRecover` | `20` | 默认体力恢复量 |
| **doubleGen** | `defaultTurns` | `3` | 默认双倍产出回合数 |
| **clearLv1** | `targetLevels` | `[1]` | 清除目标等级列表 |
| | `energyPerItem` | `2` | 每清除一个物品的体力奖励 |
| **spaceClean** | `targetLevels` | `[1, 2]` | 清除目标等级列表 |
| | `energyPerItem` | `3` | 每清除一个物品的体力奖励 |
| **reroll** | `defaultCount` | `3` | 默认重置格子数 |
| **toolItems** | `scissor` | `"scissor"` | 剪刀道具的物品 ID |

---

## 10. shop_items.json — 商店商品

**生效**：⚡ 实时

顶级数组，每个商品：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 商品 ID |
| `icon` | string | 显示 emoji |
| `cost` | int | 钻石价格 |
| `effect` | string | 效果类型（同 gacha_pool effect） |
| `value` | object | 效果参数 |
| `i18nName` | string | 名称 i18n key |
| `i18nDesc` | string | 描述 i18n key |

---

## 11. daily_orders.json — 日常订单池

**生效**：⚡ 实时（下次刷新订单时使用新值）

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderPool[]` | array | 可用订单池 |

### orderPool[] 条目

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 订单 ID |
| `name` | string | 显示名称 |
| `required[]` | `{ itemId, count }[]` | 需要的物品 |
| `goldReward` | int | 金币奖励 |
| `minLoop` | int | 最低出现的周目数 |
| `dialogue` | string | 完成对话文本 |

共 56 条订单，`minLoop` 从 1 到 9。

---

## 12. achievements.json — 成就定义

**生效**：⚡ 实时

| 字段 | 类型 | 说明 |
|------|------|------|
| `achievements[]` | array | 成就列表 |

### achievements[] 条目

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 成就 ID |
| `name` | string | 显示名称 |
| `icon` | string | 显示 emoji |
| `description` | string | 描述文本 |
| `condition` | string | 条件类型（见下方） |
| `target` | int | 目标值 |
| `reward` | object | 奖励：`{ diamonds?, energy?, gold? }` |

**condition 类型**：`merges` / `bossDefeats` / `collectionPct` / `maxLevelItems` / `totalGoldEarned` / `recycled` / `gachaPulls` / `cellsUnlocked` / `dailyCompleted` / `loopReached`

共 30 个成就。

---

## 13. affection_config.json — 好感度系统

**生效**：⚡ 实时

| 字段 | 类型 | 说明 |
|------|------|------|
| `levels[]` | array | 好感等级定义（6 级：陌生人→牵绊） |
| `characters[]` | array | 角色定义 |
| `bossToCharacter` | object | Boss 索引 → 角色 ID 映射 |
| `sources` | object | 好感度来源配置（见下方） |
| `touchCooldown` | int `3000` | ms，触摸互动冷却时间 |
| `dailyTouchBonus` | `{ threshold, bonus }` | 每日触摸奖励：`threshold` 次后奖励 `bonus` 好感 |
| `giftPreferenceMultipliers` | `{ loved, liked }` | 礼物偏好倍率：`loved: 1.5`, `liked: 1.2` |
| `affectionCoins` | `{ earnRate, levelUpBonuses }` | 好感币经济 |

### sources — 好感度来源

| 来源 | 格式 | 默认值 | 说明 |
|------|------|--------|------|
| `bossDefeat` | `{ base, perLoop }` | `{ 15, 3 }` | 击败 Boss：基础 15 + 每周目额外 3 |
| `vnStorySR` | int | `20` | 完成 SR 故事 |
| `vnStorySSR` | int | `50` | 完成 SSR 故事 |
| `touchBase` | `{ min, max }` | `{ 1, 8 }` | 触摸互动：随机 1~8 好感 |
| `dailyOrderBonus` | int | `15` | 日常订单额外好感 |
| `specialEvent` | `{ min, max }` | `{ 30, 100 }` | 特殊事件：随机 30~100 |

---

## 14. affection_shop.json — 好感商店

**生效**：⚡ 实时

| 字段 | 类型 | 说明 |
|------|------|------|
| `categories[]` | array | 商店分类（体力恢复/礼物/Buff） |
| `items[]` | array | 商品列表 |

### items[] 条目

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 商品 ID |
| `categoryId` | string | 所属分类 |
| `name` | string | 显示名称 |
| `icon` | string | emoji |
| `price` | int | 好感币价格 |
| `unlockLevel` | int | 解锁所需好感等级 |
| `dailyLimit` | int \| null | 每日限购次数，`null` = 不限 |
| `characterId` | string \| null | 角色限制，`null` = 通用 |
| `effect` | `{ type, value?, duration? }` | 效果定义 |
| `thankDialogue` | string | 角色感谢对话 |
| `giftPreference` | string | 礼物偏好：`loved` / `liked` / `normal` |

**effect.type 类型**：`energy` / `energy_full` / `affection` / `merge_double` / `gacha_ssr_boost` / `boss_damage_shield` / `fragment_double` / `daily_order_refresh`

---

## 15. touch_interactions.json — 触摸互动

**生效**：⚡ 实时

| 字段 | 类型 | 说明 |
|------|------|------|
| `zones[]` | array | 互动区域定义 |
| `responses` | object | 按角色→区域→好感等级索引的对话 |

### zones[] 条目

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 区域 ID：`hair` / `shoulder` / `cheek` / `handBack` |
| `name` | string | 显示名称 |
| `icon` | string | emoji |
| `unlockLevel` | int | 解锁所需好感等级 |

### responses 结构

`responses[characterId][zoneId][affectionLevel]` → `{ dialogue, affection, animation }`

4 个角色 × 4 个区域 × 6 个等级 = 96 条对话。

`dialogue` 为 `"🔒"` 表示未解锁。`animation` 可选值：`locked` / `pull_back` / `surprise` / `look_away` / `soft_smile` / `close_eyes` / `lean_in`

---

## 16. character_profiles.json — 角色档案

**生效**：⚡ 实时

按角色 ID 索引：`morven` / `daniel` / `vincent` / `leo`

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` / `nameEn` | string | 中/英文名 |
| `color` | string | 主题色 |
| `avatar` | string | 头像资源路径 |
| `background` | string | 背景资源路径 |
| `birthday` | string | 生日 |
| `title` | string | 称号 |
| `likes[]` / `dislikes[]` | string[] | 喜好/厌恶 |
| `sensorySignature` | `{ smell, touch, sound, taste }` | 五感描述 |
| `gifts` | `{ loved[], liked[], normal[] }` | 礼物偏好列表 |

---

## 17. cg_stories.json — CG 故事

**生效**：⚡ 实时

按 SSR 池条目 ID 索引（如 `ssr_lip6`、`ssr_perf7`）。8 个 SSR 故事。

| 字段 | 类型 | 说明 |
|------|------|------|
| `cgId` | string | CG 标识 |
| `title` | string | 故事标题 |
| `stories[]` | array | 章节列表（每故事 4 章） |
| `maleLeadId` | string | 关联男主角色 ID |

### stories[] → lines[] 对话行

| 字段 | 类型 | 说明 |
|------|------|------|
| `text` | string | 文本内容 |
| `speakerId` | string \| null | 说话人角色 ID，`null` = 旁白 |
| `expression` | string | 表情标签 |

---

## 18. loop_rules.json — 周目规则

**生效**：⚡ 实时

按周目号 `"1"` ~ `"8"` 索引。

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 周目标题 |
| `specialRules[]` | string[] | 生效的特殊规则 ID |

**特殊规则 ID 与效果**：

| 规则 ID | 效果来源 | 效果 |
|---------|---------|------|
| `dailyGoldUp` | board_economy.`dailyGoldBoost` | 日常订单金币 ×1.5 |
| `perfumeBoost` | board_economy.`perfumeBoostChains` | 香水/唇妆链加成 |
| `timedOrdersUp` | boss_progression.`timedOrdersUp` | 限时订单，时间 ×0.7 |
| `energyRegenDown` | GAME_CONFIG.`ENERGY_REGEN_DOWN_MULTIPLIER` | 体力恢复间隔 ×1.5 |

**当前周目规则映射**：

| 周目 | 标题 | 规则 |
|------|------|------|
| 1 | 新生试炼 | 无 |
| 2 | 第二学期 | dailyGoldUp |
| 3 | 校庆季 | perfumeBoost |
| 4 | 期末风暴 | timedOrdersUp |
| 5 | 盛夏合宿 | energyRegenDown |
| 6 | 文化祭 | dailyGoldUp + perfumeBoost |
| 7 | 修学旅行 | timedOrdersUp + energyRegenDown |
| 8 | 毕业前夜 | dailyGoldUp + perfumeBoost + timedOrdersUp |

---

## 19. loop_narratives.json — 周目叙事

**生效**：⚡ 实时

按周目号 `"1"` ~ `"8"` 索引。

| 字段 | 类型 | 说明 |
|------|------|------|
| `loopIntro` | string | ⚡ 已消费 — 周目开始时展示 |
| `loopOutro` | string | 🚫 未消费 — 周目结束时展示（功能待实现） |
| `boss_0` ~ `boss_3` | object | 每个 Boss 的遭遇/击败叙事 |

### boss_N 子结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `intro` | string \| null | ⚡ 部分消费 — Boss 再遇对话（🚫 功能待实现） |
| `defeatOutro` | string \| null | ⚡ 部分消费 — Boss 击败后对话（🚫 功能待实现） |

---

## 20. loop_events.json — 周目事件

**生效**：⚡ 实时

按 `"{周目号}_{Boss索引}"` 索引（如 `"1_0"`、`"2_3"`、`"8_1"`）。不是每个 Boss 击败都有事件，缺少的 key = 无事件。

| 字段 | 类型 | 说明 |
|------|------|------|
| `npcName` | string | NPC 标识（通常是 emoji） |
| `text` | string | 事件叙事文本 |
| `playerText` | string | 玩家回应文本 |
| `goldReward` | int | ⚡ 可选 — 金币奖励 |
| `diamondReward` | int | ⚡ 可选 — 钻石奖励 |
| `energyReward` | int | ⚡ 可选 — 体力奖励 |

奖励在对话关闭后发放。0 也是合法值（写 `0` 不会跳过）。

共 16 个事件。

---

## 21. loop_multipliers.json — 周目数值缩放

**生效**：⚡ 实时

核心平衡参数。控制 Boss HP、奖励、时限等随周目递增的缩放。

| 字段 | 类型 | 说明 |
|------|------|------|
| `hpMultiplier` | object | Boss HP 缩放 |
| `rewardMultiplier` | object | 奖励缩放（有上限 `cap`） |
| `timeMultiplier` | object | 限时订单时间缩放 |
| `tokenReward` | object | Token 奖励缩放 |
| `startingGoldBase` | int `100` | 新周目初始金币基数 |
| `metaUpgrades` | object | Meta 升级定义 |

### 通用缩放结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `table` | number[] | 按周目索引的缩放值。index 0 = loop 1 |
| `overflowBase` | float | 超出 table 范围的起始值 |
| `overflowGrowth` | float | 超出后每周目的线性增量 |

**额外字段**：`rewardMultiplier.cap`（缩放上限）、`timeMultiplier.overflowValue`（超出固定值）

### metaUpgrades

按升级 ID 索引：`startingGold` / `startingDiamonds` / `startingEnergy` / `dailyBonus`

| 字段 | 类型 | 说明 |
|------|------|------|
| `baseCost` | int | 基础 token 费用 |
| `costScale` | float | 费用缩放指数 |
| `effectPerLevel` | int | 每级效果值 |
| `maxLevel` | int | 最大等级 |

---

## 22. ad_config.json — 广告奖励配置

**生效**：⚡ 实时

按奖励类型索引：`energy` / `gold` / `diamonds` / `freePull`

| 字段 | 类型 | 说明 |
|------|------|------|
| `reward` | int | 奖励数量（`freePull` 无此字段） |
| `dailyLimit` | int \| null | 每日次数上限，`null` = 不限 |
| `cooldownMs` | int | 两次广告间隔（ms） |
| `emoji` | string | 显示 emoji |
| `betaBenefit` | boolean | 仅 `diamonds` — 测试用户是否有额外奖励 |
| `maxRarity` | string | 仅 `freePull` — 免费抽最大稀有度 |

---

## 23. daily_buff_config.json — 每日 Buff 配置

**生效**：⚡ 实时

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `buffDurationMs` | int | `1800000` | 默认 Buff 持续时间（30 分钟） |
| `buffTypes[]` | array | — | Buff 类型定义 |

### buffTypes[] 条目

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | Buff ID：`merge_bonus` / `energy_discount` / `sell_price_up` / `gen_speed_up` / `lucky_merge` |
| `icon` | string | 显示 emoji |
| `nameKey` | string | 名称 i18n key |
| `descKey` | string | 描述 i18n key |

5 种 Buff 效果对应：

| Buff ID | 效果 |
|---------|------|
| `merge_bonus` | 合成奖励加成 |
| `energy_discount` | 体力折扣（有概率免费产出） |
| `sell_price_up` | 出售价格提升 |
| `gen_speed_up` | 生成器加速 |
| `lucky_merge` | 幸运合成（有概率跳级） |

---

## 跨表依赖关系

修改一张表时，注意其他表是否需要同步更新：

| 改了 | 需要同步检查 |
|------|-------------|
| `items.json` 物品 ID | `generators.json` 的 `drop_pool[].itemId`、`levels.json` 的 `orders[].required[].itemId`、`daily_orders.json` 的 `required[].itemId`、`gacha_pool.json` 的 `itemId` |
| `generators.json` 产出表 | `gacha_pool.json` 中 `effect: "place_generator"` 的 `value.genChain` |
| `levels.json` Boss 数值 | `loop_multipliers.json` 的 `hpMultiplier.table`（HP 缩放基于 `totalHp`） |
| `loop_rules.json` 规则 ID | `board_economy.json` 和 `boss_progression.json` 中对应的倍率参数 |
| `character_profiles.json` 角色 ID | `levels.json` 的 `characterId`、`affection_config.json` 的 `characters[].id`、`cg_stories.json` 的 `maleLeadId`、`touch_interactions.json` 的 `responses` key |
| 新增物品链 | `items.json` + `generators.json` + `gacha_pool.json`（chains/chainNames/chainIcons/chainItemPrefix） + `board_economy.json`（perfumeBoostChains 如适用） |

---

## 快速调参指南

### 想让游戏更简单

1. 减少 `levels.json` 的 `totalHp`，增加 `damage`
2. 减少 `GAME_CONFIG.ENERGY_COST_PER_SPAWN`
3. 增加 `GAME_CONFIG.ENERGY_REGEN_AMOUNT`
4. 增加 `affection_config.json` → `sources` 的好感数值
5. 增加 `item_effects.json` → `luckyCoin.goldAmount` / `diamondAmount`

### 想让游戏更难

1. 增加 `loop_multipliers.json` 的 `hpMultiplier.table` 值
2. 增加 `boss_progression.json` 的 `orderTierBoost[].boost`
3. 增加 `GAME_CONFIG.ENERGY_COST_PER_SPAWN`
4. 减少 `gacha_pool.json` → `rarityConfig.SSR.probability`
5. 增加 `levels.json` 限时订单的 `timeLimit`

### 想调整经济节奏

1. `gacha_pool.json` → `gachaCost.singleCost` / `tenCost` — 抽卡定价
2. `board_economy.json` → `sellPriceBoost` — 出售倍率
3. `items.json` → 各物品 `sellPrice` — 基础售价
4. `settings.json` → `CELL_UNLOCK_COSTS` — 解锁格子费用
5. `loop_multipliers.json` → `startingGoldBase` — 新周目起始金币
