# 心跳合合（Heartbeat Merge）— 完整玩法说明

> 本文档详细说明游戏中每个系统的功能、工作流及对应 JSON 配置文件与字段。
> 最后更新：2026-06

---

## 目录

1. [游戏概览](#1-游戏概览)
2. [核心循环：棋盘合成系统](#2-核心循环棋盘合成系统)
3. [生成器系统](#3-生成器系统)
4. [物品与合成链](#4-物品与合成链)
5. [体力系统](#5-体力系统)
6. [Boss 战斗系统](#6-boss-战斗系统)
7. [循环系统（周目）](#7-循环系统周目)
8. [日常订单系统](#8-日常订单系统)
9. [抽卡系统](#9-抽卡系统)
10. [好感度系统](#10-好感度系统)
11. [触摸互动系统](#11-触摸互动系统)
12. [好感商店系统](#12-好感商店系统)
13. [道具效果系统](#13-道具效果系统)
14. [背包/道具栏系统](#14-背包道具栏系统)
15. [货币系统](#15-货币系统)
16. [棋盘扩展系统](#16-棋盘扩展系统)
17. [女主角升级系统](#17-女主角升级系统)
18. [广告奖励系统](#18-广告奖励系统)
19. [每日 Buff 系统](#19-每日-buff-系统)
20. [成就系统](#20-成就系统)
21. [图鉴/收集系统](#21-图鉴收集系统)
22. [碎片系统](#22-碎片系统)
23. [CG 相册系统](#23-cg-相册系统)
24. [女主角系统](#24-女主角系统)
25. [对话/VN 系统](#25-对话vn-系统)
26. [商店系统](#26-商店系统)
27. [奖励结算系统](#27-奖励结算系统)
28. [存档系统](#28-存档系统)
29. [音频系统](#29-音频系统)
30. [国际化系统](#30-国际化系统)
31. [整体游戏流程](#31-整体游戏流程)
32. [升级工作流详解](#32-升级工作流详解)
33. [配置文件索引](#33-配置文件索引)

---

## 1. 游戏概览

**心跳合合**是一款合成类手游，融合了 Merge 玩法与 Galgame 元素。玩家在棋盘上通过点击生成器产出物品、拖拽合成更高级道具，完成 Boss 订单推进恋爱剧情，同时体验多轮循环的周目机制与丰富的角色互动。

**核心体验**：合成 → 攻略 → 剧情解锁 → 轮回重来（更强）

**双货币体系**：
- 金币（gold）：游戏内主要流通货币，通过回收物品、完成日常订单、Boss 奖励等获得
- 钻石（diamonds）：高级货币，通过 Boss 奖励、成就、循环结算等获得

**四位攻略对象**：

| 角色 | 称号 | 性格关键词 | 代表色 |
|------|------|-----------|--------|
| 林墨白（Morven） | 冰山学霸 | 高冷、反差萌 | #7B68EE |
| Daniel | 阳光学长 | 热情、吉他少年 | #4169E1 |
| 司徒渊（Vincent） | 铁面副会长 | 严谨、规则破坏者 | #483D8B |
| 陆之昂（Leo） | 傲娇毒舌王 | 傲娇、游戏宅 | #FF6347 |

> 📄 配置文件：`character_profiles.json` — 角色姓名、头衔、喜好、感官签名、礼物偏好

---

## 2. 核心循环：棋盘合成系统

### 功能说明

棋盘是游戏主界面，玩家在此进行物品的产出、合成与提交操作。

### 棋盘结构

- **尺寸**：7 列 × 9 行 = 63 格
- **初始状态**：部分格子被锁定，需要通过 Boss 击败或金币购买解锁
- **格子内容**：可为空（null）或放置一个物品 ID

### 合成规则

1. **同物品合成**：两个相同 ID 的物品拖拽到一起，合成为该物品 `nextId` 指向的更高级物品
2. **Joker 合成**：Joker（万能牌）可以与任意非特殊物品合成，效果等同于该物品与自身合成（升级）
3. **剪刀拆分**：剪刀可以将一个 ≥ Lv.2 的物品拆分为 2 个上一级的物品（需要空格）
4. **不同物品交换**：两个不同物品拖拽到一起会交换位置
5. **生成器合成**：同链同等级的两个生成器可以合并升级为更高级生成器
6. **不可合成**：Lv.8（满级）物品 `nextId` 为 null，无法继续合成

### 幸运合成

- 30% 概率触发幸运合成（合成结果额外跳一级）
- 仅对唇妆链和香水链生效

### 回收（出售）

- 将棋盘上的物品拖到回收区可回收，获得能量点
- 不可回收：生成器（sellable=false）、Joker、剪刀、体力药水、特殊物品
- 回收能量按物品等级从 `RECYCLE_ENERGY_TABLE` 查表

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 棋盘尺寸 | `settings.json` | `GAME_CONFIG.BOARD_COLS`, `GAME_CONFIG.BOARD_ROWS` |
| 回收能量表 | `settings.json` | `RECYCLE_ENERGY_TABLE` |
| 出售价格加成 | `board_economy.json` | `sellPriceBoost` |
| 幸运合成概率 | `board_economy.json` | `luckyMergeChance` |
| 幸运合成链 | `board_economy.json` | `perfumeBoostChains` |
| 每日金币加成 | `board_economy.json` | `dailyGoldBoost` |
| 成就令牌加成 | `board_economy.json` | `achievementTokenBonus` |
| 免费生成概率 | `board_economy.json` | `energyDiscountFreeChance` |
| 初始锁定格子 | `settings.json` | `LOCKED_CELLS_INITIAL` |
| 每次Boss击败解锁 | `settings.json` | `UNLOCK_PER_BOSS` |
| 格子解锁费用 | `settings.json` | `CELL_UNLOCK_COSTS` |

> 📄 回收能量表：Lv.1→0, Lv.2→1, Lv.3→3, Lv.4→6, Lv.5→12, Lv.6→24, Lv.7→48, Lv.8→96

---

## 3. 生成器系统

### 功能说明

生成器是棋盘上的核心产出工具，点击后消耗体力在棋盘空位产出低级物品。生成器本身也可以合并升级，产出更高级别的物品。

### 生成器类型

| 生成器 | 名称 | 产出链 | Emoji |
|--------|------|--------|-------|
| gen_makeup | 化妆包 | 唇妆(lips) + 香水(perfume) | 👛 |
| gen_study | 书包 | 学业(study) + 美食(food) | 🎒 |

### 生成器等级与产出

生成器共 8 级，升级后产出池逐渐从低级物品扩展到高级物品：

- **Lv.1-3**：仅产出 Lv.1 物品，无容量限制，无免费产出概率
- **Lv.4-5**：产出 Lv.1 + Lv.2 物品，无容量限制
- **Lv.6**：产出 Lv.1-3 物品，5% 免费产出概率，容量 15 次
- **Lv.7**：产出 Lv.1-4 物品，10% 免费产出概率，容量 25 次
- **Lv.8**：产出 Lv.2-4 物品，5% 免费产出概率，容量 40 次，有 5% 概率触发特殊掉落（Joker/高级物品）

### 生成器特殊掉落（仅 Lv.8）

当触发特殊掉落时（5% 概率），按权重随机产出：
- **gen_makeup Lv.8**：Joker(50) / lip_4(25) / perf_4(25)
- **gen_study Lv.8**：Joker(50) / study_4(30) / food_4(20)

### 冷却机制

- 当前版本冷却已禁用（`cooldown` 值均为 0）
- 代码中保留了冷却逻辑，恢复方式：取消 `incrementGeneratorClicks` 中 `startCooldown` 的调用，并将 `generators.json` 中的 `cooldown` 值改回 `_cooldownOriginal` 标注的原值
- 原设计：Lv.6 冷却 3600秒、Lv.7 冷却 3000秒、Lv.8 冷却 2400秒

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 生成器定义 | `generators.json` | `gen_makeup`, `gen_study` |
| 产出池 | `generators.json` | `*.levels[N].drop_pool` (itemId + weight) |
| 免费产出概率 | `generators.json` | `*.levels[N].free_production_chance` |
| 容量限制 | `generators.json` | `*.levels[N].capacity` |
| 冷却时间 | `generators.json` | `*.levels[N].cooldown` (当前为 0) |
| 特殊掉落 | `generators.json` | `*.levels[N].special_drop` (chance + items) |
| 每次点击体力消耗 | `settings.json` | `GAME_CONFIG.ENERGY_COST_PER_SPAWN` |

---

## 4. 物品与合成链

### 功能说明

游戏中有 4 条主要合成链，每条链 8 级，两个相同物品合成升级为下一级。

### 四条合成链

#### 唇妆链（lips）

| 等级 | ID | 名称 | 售价 | Emoji | 颜色 |
|------|----|------|------|-------|------|
| 1 | lip_1 | 润唇膏 | 1 | 💋 | #FFB6C1 |
| 2 | lip_2 | 变色唇膏 | 3 | 💄 | #FF69B4 |
| 3 | lip_3 | 雾面唇釉 | 8 | 👄 | #FF1493 |
| 4 | lip_4 | 丝绒口红 | 20 | 🌹 | #DC143C |
| 5 | lip_5 | 气质女王 | 50 | ❤️‍🔥 | #B22222 |
| 6 | lip_6 | 倾城之吻 | 120 | 💋 | #FF0055 |
| 7 | lip_7 | 绝世红颜 | 300 | 👑 | #CC0044 |
| 8 | lip_8 | 魅惑天成 | 800 | ✨ | #990022 |

#### 香水链（perfume）

| 等级 | ID | 名称 | 售价 | Emoji | 颜色 |
|------|----|------|------|-------|------|
| 1 | perf_1 | 试管香水 | 1 | 🧪 | #DDA0DD |
| 2 | perf_2 | 走珠香膏 | 3 | 🧴 | #DA70D6 |
| 3 | perf_3 | 清新淡香 | 8 | 🌸 | #BA55D3 |
| 4 | perf_4 | 斩男迷香 | 20 | 💐 | #9932CC |
| 5 | perf_5 | 致命费洛蒙 | 50 | 💜 | #800080 |
| 6 | perf_6 | 月下迷雾 | 120 | 🌙 | #6A0DAD |
| 7 | perf_7 | 永夜幽香 | 300 | 🦋 | #4B0082 |
| 8 | perf_8 | 魅影永驻 | 800 | ✨ | #3D0066 |

#### 学业链（study）

| 等级 | ID | 名称 | 售价 | Emoji | 颜色 |
|------|----|------|------|-------|------|
| 1 | study_1 | 笔记 | 1 | 📝 | #87CEEB |
| 2 | study_2 | 教材 | 3 | 📚 | #4682B4 |
| 3 | study_3 | 论文 | 8 | 🎓 | #4169E1 |
| 4 | study_4 | 奖学金 | 20 | 🏆 | #1E90FF |
| 5 | study_5 | 学术发表 | 50 | 🌟 | #0000CD |
| 6 | study_6 | 课题组长 | 120 | 👁️ | #00008B |
| 7 | study_7 | 学术权威 | 300 | 🔮 | #191970 |
| 8 | study_8 | 知识殿堂 | 800 | ✨ | #0D0D5E |

#### 美食链（food）

| 等级 | ID | 名称 | 售价 | Emoji | 颜色 |
|------|----|------|------|-------|------|
| 1 | food_1 | 糖果 | 1 | 🍬 | #FFB347 |
| 2 | food_2 | 饮料 | 3 | 🥤 | #FF8C00 |
| 3 | food_3 | 甜点 | 8 | 🍰 | #FF6347 |
| 4 | food_4 | 拿手菜 | 20 | 🍱 | #DC143C |
| 5 | food_5 | 美食家 | 50 | 🍽️ | #B22222 |
| 6 | food_6 | 宴会料理 | 120 | 🎂 | #8B0000 |
| 7 | food_7 | 传世珍味 | 300 | 👑 | #5C0000 |
| 8 | food_8 | 味蕾极致 | 800 | ✨ | #330000 |

### 特殊物品

| ID | 类型 | 名称 | 说明 |
|----|------|------|------|
| joker | JOKER | 万能牌 | 可与任意非特殊物品合成升级 |
| scissor | SCISSOR | 剪刀 | 可拆分 ≥Lv.2 物品为 2 个上一级物品 |
| energy_potion | ENERGY_POTION | 体力药水 | 使用后恢复体力 |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 所有物品定义 | `items.json` | 每个物品 ID 对应的对象 |
| 物品名称 | `items.json` | `*.name` |
| 物品等级 | `items.json` | `*.level` |
| 合成链归属 | `items.json` | `*.chain` |
| 合成目标 | `items.json` | `*.nextId` |
| 出售价格 | `items.json` | `*.sellPrice` |
| 物品类型 | `items.json` | `*.type` (GENERATOR/JOKER/SCISSOR/ENERGY_POTION/SPECIAL) |

---

## 5. 体力系统

### 功能说明

体力是玩家的核心操作资源，点击生成器产出物品时消耗体力。体力耗尽后需要等待恢复或通过其他途径补充。

### 体力参数

| 参数 | 值 | 配置路径 |
|------|----|----------|
| 体力上限 | 100 | `settings.json` → `GAME_CONFIG.MAX_ENERGY` |
| 恢复上限 | 100 | `settings.json` → `GAME_CONFIG.ENERGY_REGEN_CAP` |
| 恢复间隔 | 120 秒 | `settings.json` → `GAME_CONFIG.ENERGY_REGEN_INTERVAL` |
| 每次恢复量 | 1 | `settings.json` → `GAME_CONFIG.ENERGY_REGEN_AMOUNT` |
| 每次生成消耗 | 1 | `settings.json` → `GAME_CONFIG.ENERGY_COST_PER_SPAWN` |
| 低体力恢复加速 | ×1.5 | `settings.json` → `GAME_CONFIG.ENERGY_REGEN_DOWN_MULTIPLIER` |

### 体力状态机

```
FULL → (消耗体力) → REGENNING → (恢复满) → FULL
REGENNING → (体力归零) → EMPTY → (恢复) → REGENNING
```

### 体力恢复方式

1. **自然恢复**：每 120 秒恢复 1 点，低体力时加速 ×1.5
2. **回收物品**：将物品拖到回收区，按等级获得能量
3. **好感商店**：购买角色饮料/便当/蛋糕恢复
4. **普通商店**：购买体力药水
5. **广告**：观看广告获得 20 体力
6. **循环事件**：部分剧情事件奖励体力

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 体力上限 | `settings.json` | `GAME_CONFIG.MAX_ENERGY` |
| 恢复上限 | `settings.json` | `GAME_CONFIG.ENERGY_REGEN_CAP` |
| 恢复间隔 | `settings.json` | `GAME_CONFIG.ENERGY_REGEN_INTERVAL` |
| 恢复量 | `settings.json` | `GAME_CONFIG.ENERGY_REGEN_AMOUNT` |
| 生成消耗 | `settings.json` | `GAME_CONFIG.ENERGY_COST_PER_SPAWN` |
| 低体力加速 | `settings.json` | `GAME_CONFIG.ENERGY_REGEN_DOWN_MULTIPLIER` |
| 女主角升级-体力上限 | `settings.json` | `HEROINE_UPGRADES[id="energy_cap"]` |

---

## 6. Boss 战斗系统

### 功能说明

Boss 战斗是推进主线剧情的核心机制。每个 Boss 对应一位攻略角色，玩家需要合成指定物品并提交来对 Boss 造成伤害。

### Boss 关卡

游戏共有 4 个 Boss 关卡，每位角色一个：

| 关卡 | 角色 | 称号 | 总HP | 订单数 |
|------|------|------|------|--------|
| 0 | 林墨白 | 高冷校草 | 120 | 3 |
| 1 | 陆之昂 | 热血体育老师 | 300 | 3 |
| 2 | Daniel | 金发外教 | 500 | 3 |
| 3 | 司徒渊 | 铁面副会长 | 800 | 3 |

### 订单机制

每个 Boss 有 3 个订单，每个订单要求提交指定物品：
- 玩家需要在棋盘上拥有对应物品，点击提交
- 提交成功后对 Boss 造成伤害（`damage` 值）
- 完成所有订单 = 击败 Boss

### 限时订单

部分订单有倒计时限制（当前未实现）：
- 默认时限 30 秒
- 循环越高，时限越短（乘以时间倍率 `timeMultiplier`）

### Boss 状态机

```
IDLE → (加载关卡) → BATTLE → (提交) → SUBMITTING → (伤害结算) → BATTLE/DEFEATED
BATTLE → (订单超时) → BATTLE (失败当前订单)
DEFEATED → (下一关) → BATTLE
DEFEATED → (全部完成) → COMPLETE
```

### 循环难度缩放

Boss 在高轮循环中会变强：
- **HP 倍率**：从 1.0 逐轮增长至 3.15+
- **订单物品升级**：循环越高，要求的物品等级越高（Tier Boost）
- **订单伤害升级**：damage 乘以 HP 倍率

### Tier Boost 规则

| 循环轮次 | 物品等级提升 |
|----------|-------------|
| 第 1 轮 | +0 |
| 第 2-3 轮 | +1 |
| 第 4-5 轮 | +2 |
| 第 6-7 轮 | +3 |
| 第 8 轮+ | +4（上限 8） |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| Boss 关卡定义 | `levels.json` | 每个关卡对象 (bossName, totalHp, orders[]) |
| 订单需求 | `levels.json` | `*.orders[].required[]` (itemId + count) |
| 订单伤害 | `levels.json` | `*.orders[].damage` |
| 限时订单 | `levels.json` | `*.orders[].isTimed`, `*.orders[].timeLimit` |
| 钻石奖励 | `levels.json` | `*.orders[].diamondReward` |
| 对话文本 | `levels.json` | `*.orders[].dialogue` (npc + player) |
| HP 倍率表 | `loop_multipliers.json` | `hpMultiplier.table[]` |
| HP 倍率溢出 | `loop_multipliers.json` | `hpMultiplier.overflowBase`, `overflowGrowth` |
| 奖励倍率 | `loop_multipliers.json` | `rewardMultiplier.table[]` |
| 时间倍率 | `loop_multipliers.json` | `timeMultiplier.table[]` |
| Tier Boost | `boss_progression.json` | `orderTierBoost[]` (maxLoop + boost) |
| 最大物品等级 | `boss_progression.json` | `maxItemTier` |
| 限时订单默认 | `boss_progression.json` | `timedOrdersUp.defaultTimeLimit` |
| 限时订单倍率 | `boss_progression.json` | `timedOrdersUp.timeMultiplier` |
| Boss 角色映射 | `affection_config.json` | `bossToCharacter` |
| HP 颜色阈值 | `settings.json` | `UI_COLOR_THEME.hpHighThreshold`, `hpMidThreshold` |

---

## 7. 循环系统（周目）

### 功能说明

当玩家击败所有 4 个 Boss 后，游戏不会结束，而是进入新一轮循环（周目）。每轮循环难度递增，但奖励也更丰厚，形成"合成→攻略→轮回重来（更强）"的核心循环。

### 8 轮循环主题

| 轮次 | 主题名称 | 特殊规则组合 |
|------|---------|-------------|
| 1 | 新生试炼 | — |
| 2 | 第二学期 | — |
| 3 | 校庆季 | — |
| 4 | 期末风暴 | — |
| 5 | 盛夏合宿 | — |
| 6 | 文化祭 | — |
| 7 | 修学旅行 | — |
| 8 | 毕业前夜 | — |

### 循环难度递增

| 参数 | 第1轮 | 第2轮 | 第3轮 | 第4轮 | 第5轮 | 第6轮 | 第7轮 | 第8轮 |
|------|-------|-------|-------|-------|-------|-------|-------|-------|
| HP 倍率 | 1.00 | 1.20 | 1.40 | 1.65 | 1.95 | 2.30 | 2.70 | 3.15 |
| 奖励倍率 | 1.00 | 1.10 | 1.20 | 1.30 | 1.40 | 1.55 | 1.70 | 1.85 |
| 时间倍率 | 1.00 | 0.95 | 0.90 | 0.88 | 0.85 | 0.82 | 0.80 | 0.78 |
| Token 奖励 | 0 | 10 | 15 | 20 | 25 | 30 | 36 | 42 |

- 超出第 8 轮后：HP 倍率每轮 +0.16，奖励倍率每轮 +0.12（上限 3.0），Token 每轮 +5

### 循环事件

每轮循环中会触发剧情事件，提供金币/钻石/体力奖励，并推进故事线。事件以 `"轮次_订单索引"` 为 key。

### 循环叙事

每轮循环有开场文本（loopIntro）和结尾文本（loopOutro），每个 Boss 有 intro 和 defeatOutro 对话。

### Meta 升级（跨轮回继承）

使用 Token 进行永久升级，每轮循环开始时生效：

| 升级项 | 基础费用 | 费用缩放 | 每级效果 | 最大等级 |
|--------|---------|---------|---------|---------|
| 起始金币 | 10 | ×0.8 | +50 金币 | 10 |
| 起始钻石 | 20 | ×0.8 | +5 钻石 | 5 |
| 起始体力 | 15 | ×0.8 | +20 体力 | 8 |
| 每日加成 | 25 | ×0.8 | +5% | 10 |

### 循环起始资源

每轮循环开始时玩家获得：100 基础金币 + Meta 升级加成

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 循环主题与规则 | `loop_rules.json` | 每轮 (title + rules) |
| HP/奖励/时间倍率 | `loop_multipliers.json` | `hpMultiplier`, `rewardMultiplier`, `timeMultiplier` |
| Token 奖励表 | `loop_multipliers.json` | `tokenReward.table[]` |
| 起始金币 | `loop_multipliers.json` | `startingGoldBase` |
| Meta 升级 | `loop_multipliers.json` | `metaUpgrades` (4 项) |
| 循环事件 | `loop_events.json` | `"轮次_订单"` → text, playerText, rewards |
| 循环叙事 | `loop_narratives.json` | `"轮次"` → loopIntro, loopOutro, boss_N 对话 |

---

## 8. 日常订单系统

### 功能说明

日常订单是每天刷新的独立任务系统，玩家提交指定物品换取金币奖励。与 Boss 订单不同，日常订单不消耗物品（仅检查是否拥有），且奖励以金币为主。

### 订单池

- 订单池共 56 个订单，按 `minLoop` 字段控制出现条件
- 每天随机刷新，同时最多 5 个活跃订单
- 订单难度随循环轮次递增：低轮要求 Lv.2-3 物品，高轮要求 Lv.5-6 物品

### 订单示例

| ID | 名称 | 需求物品 | 金币奖励 | 最低循环 |
|----|------|---------|---------|---------|
| daily_1 | 同学借笔记 | study_2 ×1 | 15 | 1 |
| daily_5 | 老师要资料 | study_3 ×1 | 30 | 1 |
| daily_20 | 学长要笔记 | study_5 ×1 | 100 | 4 |

### 刷新机制

- 每日自动刷新
- 手动刷新费用为 0（`REFRESH_COST: 0`）
- 可通过好感商店的「订单刷新」道具刷新

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 订单池 | `daily_orders.json` | `orderPool[]` (id, name, required[], goldReward, minLoop, dialogue) |
| 最大活跃数 | `settings.json` | `DAILY_ORDER_CONFIG.MAX_ACTIVE` |
| 刷新费用 | `settings.json` | `DAILY_ORDER_CONFIG.REFRESH_COST` |

---

## 9. 抽卡系统

### 功能说明

消耗钻石进行抽卡，随机获得物品、生成器碎片、Joker、剪刀等道具。SSR 级可获得角色故事碎片。

### 稀有度与概率

| 稀有度 | 概率 | 颜色 | 发光效果 |
|--------|------|------|---------|
| R | 74% | #4a90d9 | 蓝色微光 |
| SR | 25% | #9b59b6 | 紫色闪光 |
| SSR | 1% | #f1c40f | 金色强光 |

### 抽卡费用

| 方式 | 钻石费用 |
|------|---------|
| 单抽 | 100 |
| 十连 | 900 (九折) |

### 免费抽卡

- 每日 1 次免费抽卡，最高稀有度 SR（不会出 SSR）

### SR 子类别权重

| 子类别 | 权重 | 说明 |
|--------|------|------|
| generator | 0.25 | 生成器碎片 |
| joker | 0.20 | Joker 卡 |
| scissor | 0.20 | 剪刀 |
| energy | 0.20 | 体力药水 |
| special | 0.15 | 特殊道具 |

### 抽卡池

抽卡池（gachaPoolV2）包含大量物品条目，每个条目定义：
- `id`：池内唯一 ID
- `rarity`：R/SR/SSR
- `subCategory`：子类别（item/generator/joker/scissor/energy/special）
- `weight`：在子类别内的权重
- `effect`：效果类型（spawn_board_item/spawn_generator/add_joker/add_scissor/add_energy/story_unlock 等）
- `value`：效果参数（chain + level / fragment 等）
- `itemId`：对应的物品 ID

### 碎片兑换

- 60 碎片可兑换一个生成器
- 60 碎片可解锁一个 SSR 故事

### 抽卡状态机

```
IDLE → (发起抽卡) → ROLLING → (出结果) → RESULT → (确认) → IDLE
```

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 稀有度概率 | `gacha_pool.json` | `rarityConfig.R/SR/SSR.probability` |
| 稀有度颜色 | `gacha_pool.json` | `rarityConfig.*.color`, `*.glow` |
| 抽卡费用 | `gacha_pool.json` | `gachaCost.singleCost`, `gachaCost.tenCost` |
| SR 子权重 | `gacha_pool.json` | `subWeights.SR` |
| 抽卡池 | `gacha_pool.json` | `gachaPoolV2[]` |
| 链信息 | `gacha_pool.json` | `chains[]`, `chainNames`, `chainIcons`, `chainToGen`, `chainItemPrefix` |
| 碎片兑换 | `gacha_pool.json` | `fragmentToGenerator`, `fragmentToStory` |
| 十连数量 | `gacha_config.json` | `tenPullCount` |
| 免费抽最高稀有度 | `gacha_config.json` | `freePullMaxRarity` |

---

## 10. 好感度系统

### 功能说明

好感度是衡量玩家与角色亲密程度的数值。提升好感度可解锁新的触摸互动区域、好感商店物品，并获得好感币奖励。

### 好感等级

| 等级 | 名称 | 所需点数 | 解锁内容 |
|------|------|---------|---------|
| 0 | 陌生人 | 0-99 | 基础触摸区域（头顶、肩膀） |
| 1 | 熟识 | 100-299 | 解锁脸颊、手背触摸；好感商店 Lv.1 物品 |
| 2 | 好友 | 300-599 | 好感商店 Lv.2 物品 |
| 3 | 暧昧 | 600-999 | 好感商店 Lv.3 物品 |
| 4 | 心动 | 1000-1499 | 全部触摸互动 |
| 5 | 牵绊 | 1500+ | 最高好感 |

### 好感度来源

| 来源 | 好感点数 |
|------|---------|
| Boss 击败 | 15 + (循环轮次 × 3) |
| VN 故事（SR） | 20 |
| VN 故事（SSR） | 50 |
| 触摸互动 | 1-8（根据等级和区域） |
| 日常订单奖励 | 15 |
| 特殊事件 | 30-100 |
| 送礼物 | 10-50（根据礼物品质，受偏好倍率影响） |

### 礼物偏好倍率

| 偏好 | 倍率 |
|------|------|
| loved | ×1.5 |
| liked | ×1.2 |
| normal | ×1.0 |

### 好感币

- 获得好感点时同步获得等量好感币
- 升级奖励：Lv.1→50, Lv.2→100, Lv.3→200, Lv.4→300, Lv.5→500

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 好感等级 | `affection_config.json` | `levels[]` (level, name, minPoints, maxPoints) |
| 角色定义 | `affection_config.json` | `characters[]` (id, name, color, avatar, background) |
| Boss→角色映射 | `affection_config.json` | `bossToCharacter` |
| 好感来源 | `affection_config.json` | `sources` (bossDefeat, vnStorySR, vnStorySSR, touchBase, dailyOrderBonus, specialEvent) |
| 触摸冷却 | `affection_config.json` | `touchCooldown` (3000ms) |
| 每日触摸奖励 | `affection_config.json` | `dailyTouchBonus` (threshold:10, bonus:20) |
| 礼物偏好倍率 | `affection_config.json` | `giftPreferenceMultipliers` |
| 好感币 | `affection_config.json` | `affectionCoins.earnRate`, `affectionCoins.levelUpBonuses` |

---

## 11. 触摸互动系统

### 功能说明

在角色详情界面，玩家可以触摸角色的不同部位来增加好感度并触发对话。不同触摸区域和好感等级会触发不同的对话和动画。

### 触摸区域

| 区域 | ID | 解锁等级 | 图标 |
|------|----|---------|------|
| 头顶 | hair | 0 | 👋 |
| 肩膀 | shoulder | 0 | 🤝 |
| 脸颊 | cheek | 1 | 🫳 |
| 手背 | handBack | 1 | ✋ |

### 互动规则

1. 每个区域 × 每个好感等级 都有独立的对话和好感值
2. 未解锁的区域显示 🔒，触发 locked 动画
3. 触摸有 3 秒冷却时间（`touchCooldown: 3000`）
4. 每日触摸 10 次以上触发额外 20 好感奖励
5. 好感值随等级递增：Lv.0→1, Lv.1→2, Lv.2→3, Lv.3→4-5, Lv.4→5-6, Lv.5→8

### 动画类型

| 动画 | 说明 |
|------|------|
| pull_back | 后退闪避 |
| surprise | 惊讶 |
| look_away | 别过脸 |
| soft_smile | 温柔微笑 |
| close_eyes | 闭上眼 |
| lean_in | 靠近 |
| locked | 未解锁 |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 触摸区域定义 | `touch_interactions.json` | `zones[]` (id, name, icon, unlockLevel) |
| 角色回应 | `touch_interactions.json` | `responses.[角色ID].[区域ID].[好感等级]` |
| 回应内容 | `touch_interactions.json` | `*.dialogue`, `*.affection`, `*.animation` |
| 触摸冷却 | `affection_config.json` | `touchCooldown` |
| 每日触摸奖励 | `affection_config.json` | `dailyTouchBonus` |

---

## 12. 好感商店系统

### 功能说明

使用好感币购买物品的特殊商店。商品按好感等级解锁，部分商品有每日购买限制。分为三大类别：体力恢复、礼物、道具。

### 商品类目

#### 体力恢复类

| 商品 | 价格 | 解锁等级 | 每日限制 | 效果 |
|------|------|---------|---------|------|
| 墨白的咖啡 | 30 | 1 | 3 | 恢复 20 体力 |
| Daniel的果汁 | 30 | 1 | 3 | 恢复 20 体力 |
| 司徒渊的茶 | 30 | 1 | 3 | 恢复 20 体力 |
| 陆之昂的可乐 | 30 | 1 | 3 | 恢复 20 体力 |
| 便当套餐 | 80 | 2 | 2 | 恢复 50 体力 |
| 特制蛋糕 | 150 | 3 | 1 | 体力全满 |

#### 礼物类

| 商品 | 价格 | 解锁等级 | 效果 | 偏好 | 对应角色 |
|------|------|---------|------|------|---------|
| 旧书签 | 20 | 0 | +15 好感 | loved | morven |
| 手冲咖啡豆 | 25 | 1 | +20 好感 | loved | morven |
| 运动饮料 | 20 | 0 | +15 好感 | loved | daniel |
| 吉他拨片 | 25 | 1 | +20 好感 | loved | daniel |
| 文件夹 | 20 | 0 | +15 好感 | loved | vincent |
| 钢笔 | 25 | 1 | +20 好感 | loved | vincent |
| 辣条 | 20 | 0 | +15 好感 | loved | leo |
| 游戏卡带 | 25 | 1 | +20 好感 | loved | leo |
| 饼干 | 15 | 0 | +10 好感 | normal | 通用 |
| 花束 | 50 | 2 | +30 好感 | liked | 通用 |
| 手链 | 100 | 3 | +50 好感 | liked | 通用 |

#### 道具类

| 商品 | 价格 | 解锁等级 | 每日限制 | 效果 |
|------|------|---------|---------|------|
| 合并加速 | 40 | 1 | 3 | 合并效果翻倍 |
| 幸运草 | 60 | 2 | 1 | SSR 概率 +5% |
| 护盾 | 50 | 2 | 2 | Boss 伤害护盾 |
| 碎片加速 | 80 | 3 | 1 | 碎片获取翻倍（1小时） |
| 订单刷新 | 30 | 1 | 2 | 刷新日常订单 |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 商品类目 | `affection_shop.json` | `categories[]` (id, name, icon) |
| 商品列表 | `affection_shop.json` | `items[]` (id, categoryId, name, icon, price, unlockLevel, dailyLimit, characterId, effect, thankDialogue, giftPreference) |
| 解锁判定 | `affection_config.json` | `levels[].level` (与 `items[].unlockLevel` 比较) |

---

## 13. 道具效果系统

### 功能说明

定义游戏中各种特殊道具的使用效果和参数。

### 道具效果配置

| 道具 | 参数 |
|------|------|
| 幸运硬币（luckyCoin） | 默认7次、50%金币(100)、50%钻石(10) |
| 碎片（fragment） | 默认10碎片、默认兑换 Lv.3 生成器 |
| 体力药水（energyItem） | 默认恢复 20 体力 |
| 双倍生成（doubleGen） | 持续 3 回合 |
| 清除 Lv.1（clearLv1） | 目标 Lv.1、每个返还 2 体力 |
| 空间清理（spaceClean） | 目标 Lv.1-2、每个返还 3 体力 |
| 重投（reroll） | 默认 3 次 |
| 剪刀 | 映射到 scissor 物品 |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 幸运硬币 | `item_effects.json` | `luckyCoin` (defaultCount, goldChance, goldAmount, diamondAmount) |
| 碎片 | `item_effects.json` | `fragment` (defaultCount, defaultGenLevel) |
| 体力药水 | `item_effects.json` | `energyItem` (defaultRecover) |
| 双倍生成 | `item_effects.json` | `doubleGen` (defaultTurns) |
| 清除 Lv.1 | `item_effects.json` | `clearLv1` (targetLevels, energyPerItem) |
| 空间清理 | `item_effects.json` | `spaceClean` (targetLevels, energyPerItem) |
| 重投 | `item_effects.json` | `reroll` (defaultCount) |
| 工具物品 | `item_effects.json` | `toolItems.scissor` |

---

## 14. 背包/道具栏系统

### 功能说明

玩家从抽卡等途径获得的道具存储在背包中。背包中的道具可以使用（放到棋盘上）或管理。

### 道具类型

- **物品类**（spawn_board_item）：放到棋盘空位
- **生成器碎片**（fragment）：收集足够后兑换生成器
- **Joker**：放到棋盘上作为万能合成牌
- **剪刀**：放到棋盘上使用
- **体力药水**：使用后直接恢复体力
- **故事解锁**（SSR 专属）：解锁 CG 故事

### 配置文件与字段

道具的具体效果由 `gacha_pool.json` 中的 `effect` 和 `value` 字段决定，使用参数由 `item_effects.json` 配置。

---

## 15. 货币系统

### 功能说明

游戏使用双货币体系：金币和钻石。

### 金币获取方式

- 回收物品（按 sellPrice × sellPriceBoost）
- 完成日常订单（goldReward × 金币加成）
- Boss 击败奖励
- 循环事件奖励
- 广告奖励（50 金币/次，每日3次）
- Meta 升级起始金币

### 金币用途

- 解锁棋盘格子
- 女主角升级
- 普通商店购买

### 钻石获取方式

- Boss 订单奖励
- 成就奖励
- 循环结算 Token → 钻石
- 循环事件奖励
- 广告奖励（50 钻石/次，每日3次）

### 钻石用途

- 抽卡（单抽 100 / 十连 900）
- 普通商店购买

### 配置文件与字段

金币和钻石的获取和消耗分散在各个系统的配置文件中，无独立的货币配置文件。

---

## 16. 棋盘扩展系统

### 功能说明

棋盘初始有部分格子被锁定，玩家需要通过击败 Boss 或花费金币来解锁更多格子。

### 解锁方式

1. **Boss 击败免费解锁**：每次击败一个 Boss，解锁 5 个格子
   - Boss 0 击败 → 解锁格子 [0, 1, 5, 6, 62]
   - Boss 1 击败 → 解锁格子 [2, 4, 7, 13, 42]
   - Boss 2 击败 → 解锁格子 [14, 20, 48, 49, 55]
   - Boss 3 击败 → 解锁格子 [56, 57, 58, 59, 60]

2. **金币购买解锁**：按序从 `CELL_UNLOCK_COSTS` 查费用
   - [50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000, ...]

> 注意：Boss 击败的免费解锁会推进 `cellsUnlocked` 计数器，影响后续金币解锁的价格索引。这是有意设计——Boss 进度减少总金币需求。

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 初始锁定格子 | `settings.json` | `LOCKED_CELLS_INITIAL` |
| Boss 击败解锁 | `settings.json` | `UNLOCK_PER_BOSS` (4 个数组) |
| 解锁费用表 | `settings.json` | `CELL_UNLOCK_COSTS` |

---

## 17. 女主角升级系统

### 功能说明

使用金币对女主角进行永久升级，提升基础能力。升级在当前循环内生效。

### 升级项目

| ID | 名称 | 图标 | 等级 | 费用 | 效果 |
|----|------|------|------|------|------|
| energy_cap | 体力上限提升 | 💪 | 1 | 100 | 上限 120 |
| | | | 2 | 300 | 上限 150 |
| | | | 3 | 800 | 上限 200 |
| regen_speed | 恢复加速 | ⏱️ | 1 | 150 | 100秒/点 |
| | | | 2 | 400 | 80秒/点 |
| | | | 3 | 1000 | 60秒/点 |
| recycle_bonus | 回收大师 | ♻️ | 1 | 200 | +1 额外体力 |
| | | | 2 | 500 | +2 额外体力 |
| | | | 3 | 1200 | +3 额外体力 |
| gold_bonus | 财运亨通 | 🍀 | 1 | 250 | 金币 ×1.2 |
| | | | 2 | 600 | 金币 ×1.5 |
| | | | 3 | 1500 | 金币 ×2.0 |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 升级定义 | `settings.json` | `HEROINE_UPGRADES[]` (id, name, icon, description, levels[]) |
| 等级费用 | `settings.json` | `HEROINE_UPGRADES[].levels[].cost` |
| 等级效果 | `settings.json` | `HEROINE_UPGRADES[].levels[].value` |
| 等级标签 | `settings.json` | `HEROINE_UPGRADES[].levels[].label` |

---

## 18. 广告奖励系统

### 功能说明

观看广告获取奖励，每种广告类型有每日次数限制。

### 广告类型

| 类型 | 奖励 | 每日限制 | 冷却 | 特殊说明 |
|------|------|---------|------|---------|
| energy | 20 体力 | 无限 | 0ms | — |
| gold | 50 金币 | 3 次 | 0ms | — |
| diamonds | 50 钻石 | 3 次 | 0ms | 有 Beta 福利标记 |
| freePull | 免费抽卡1次 | 1 次 | 0ms | 最高稀有度 SR |

### 每日重置

每日 0 点重置所有广告计数。

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 广告配置 | `ad_config.json` | 每个类型 (reward, dailyLimit, cooldownMs, emoji) |
| Beta 福利 | `ad_config.json` | `diamonds.betaBenefit` |

---

## 19. 每日 Buff 系统

### 功能说明

每日可随机获得一个 Buff，持续 30 分钟，为游戏提供临时增益。

### Buff 类型

| ID | 图标 | 名称 Key | 说明 |
|----|------|---------|------|
| merge_bonus | ✨ | dailyBuff.mergeBonus | 合并加成 |
| energy_discount | ⚡ | dailyBuff.energyDiscount | 体力消耗折扣 |
| sell_price_up | 🪙 | dailyBuff.sellPriceUp | 出售价格提升 |
| gen_speed_up | ⏩ | dailyBuff.genSpeedUp | 生成器加速 |
| lucky_merge | 🍀 | dailyBuff.luckyMerge | 幸运合成提升 |

### Buff 机制

- 每日随机抽取一个 Buff
- 持续时间：30 分钟（1,800,000 毫秒）
- 过期后自动失效
- 每日重置时可再次抽取

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| Buff 持续时间 | `daily_buff_config.json` | `buffDurationMs` |
| Buff 类型列表 | `daily_buff_config.json` | `buffTypes[]` (id, icon, nameKey, descKey) |

---

## 20. 成就系统

### 功能说明

完成特定条件后解锁成就，获得钻石和体力奖励。共 30 个成就。

### 成就分类

#### 合成类

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| first_merge | 初次合成 | 累计合成 1 次 | 50钻石 + 20体力 |
| merge_10 | 合成入门 | 累计合成 10 次 | 50钻石 + 30体力 |
| merge_50 | 合成达人 | 累计合成 50 次 | 50钻石 + 50体力 |
| merge_200 | 合成大师 | 累计合成 200 次 | 50钻石 |

#### Boss 类

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| first_boss | 初战告捷 | 击败 1 个 Boss | 50钻石 + 30体力 |
| boss_3 | 攻略高手 | 击败 3 个 Boss | 50钻石 |

#### 图鉴类

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| collection_25 | 小小收藏家 | 图鉴 25% | 100钻石 |
| collection_50 | 博物学者 | 图鉴 50% | 50钻石 |
| collection_100 | 百科全书 | 图鉴 100% | 200钻石 |

#### 满级物品类

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| max_level_item | 终极合成 | 合成 1 个 Lv.8 | 80钻石 |
| max_level_4 | 传说收藏家 | 合成 4 个不同 Lv.8 | 200钻石 |

#### 经济类

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| gold_1000 | 小康之家 | 累计获得 1000 金币 | 100金币 |
| recycle_20 | 断舍离 | 累计回收 20 个物品 | 150金币 |

#### 抽卡类

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| gacha_10 | 手气不错 | 累计抽卡 10 次 | 50钻石 |

#### 棋盘类

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| unlock_5 | 开疆拓土 | 解锁 5 个格子 | 200金币 |

#### 日常类

| ID | 名称 | 条件 | 奖励 |
|----|------|------|------|
| daily_10 | 勤劳跑腿 | 完成 10 个日常订单 | 50钻石 |

#### 循环类（每轮 2 个）

每轮循环有 2 个成就：到达该轮 + 该轮挑战条件：

| 循环 | 到达成就 | 挑战成就 |
|------|---------|---------|
| 1 | 新生入学 | 试炼初成（合成30次） |
| 2 | 二度启程 | 金币猎手（累计5000金币） |
| 3 | 校庆来客 | 校庆收藏（抽卡20次） |
| 4 | 风暴来袭 | 限时达人（完成20日常订单） |
| 5 | 盛夏出发 | 节能先锋（回收50个物品） |
| 6 | 文化祭典 | 祭典合成（合成300次） |
| 7 | 旅人足迹 | 开拓先锋（解锁12格子） |
| 8 | 毕业前夜 | 传说缔造者（6个满级物品） |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 成就列表 | `achievements.json` | `achievements[]` (id, name, icon, description, condition, target, reward) |

---

## 21. 图鉴/收集系统

### 功能说明

记录玩家在游戏中合成过的所有物品。每当棋盘上出现新的物品 ID，自动收录到图鉴中。

### 收集进度

- 总图鉴数 = 所有可合成物品数量
- 收集百分比 = 已收集 / 总数 × 100%
- 图鉴百分比触发对应成就（25%/50%/100%）

### 配置文件与字段

图鉴收集基于 `items.json` 中的物品定义，系统自动追踪。无独立配置文件。

---

## 22. 碎片系统

### 功能说明

从抽卡中获得碎片，收集足够数量后可兑换生成器或解锁 SSR 故事。

### 碎片用途

- **60 碎片 → 1 个生成器**（等级由 `fragment.defaultGenLevel` 控制，默认 Lv.3）
- **60 碎片 → 解锁 1 个 SSR 故事**

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 碎片兑换生成器 | `gacha_pool.json` | `fragmentToGenerator` (60) |
| 碎片兑换故事 | `gacha_pool.json` | `fragmentToStory` (60) |
| 默认碎片数量 | `item_effects.json` | `fragment.defaultCount` (10) |
| 默认生成器等级 | `item_effects.json` | `fragment.defaultGenLevel` (3) |

---

## 23. CG 相册系统

### 功能说明

记录玩家解锁的 SSR 级角色故事。每个 SSR 故事有 4 个章节，通过抽卡获得 SSR 故事碎片后解锁。

### SSR 故事列表

共 8 个 SSR 故事，对应 4 条链 × 2 个角色方向：

| 故事 ID | 链 | 章节 |
|---------|----|------|
| ssr_lip6 | 唇妆·Lv6 方向 | 4 章 |
| ssr_lip7 | 唇妆·Lv7 方向 | 4 章 |
| ssr_perf6 | 香水·Lv6 方向 | 4 章 |
| ssr_perf7 | 香水·Lv7 方向 | 4 章 |
| ssr_study6 | 学业·Lv6 方向 | 4 章 |
| ssr_study7 | 学业·Lv7 方向 | 4 章 |
| ssr_food6 | 美食·Lv6 方向 | 4 章 |
| ssr_food7 | 美食·Lv7 方向 | 4 章 |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 故事内容 | `cg_stories.json` | 每个故事 ID → chapters[] (title, paragraphs[]) |
| 碎片兑换门槛 | `gacha_pool.json` | `fragmentToStory` (60) |

---

## 24. 女主角系统

### 功能说明

女主角（玩家角色）拥有可升级的能力系统，通过金币进行永久强化。详见[第 17 节](#17-女主角升级系统)。

此外，女主角系统还管理跨循环的持久化状态，包括：
- 当前 Meta 升级等级
- 各项升级效果的累计值

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 升级定义 | `settings.json` | `HEROINE_UPGRADES[]` |
| Meta 升级 | `loop_multipliers.json` | `metaUpgrades` (startingGold, startingDiamonds, startingEnergy, dailyBonus) |

---

## 25. 对话/VN 系统

### 功能说明

游戏内嵌 Galgame 风格的对话系统，用于展示：
- Boss 订单提交后的剧情对话
- 循环事件的剧情文本
- 触摸互动的角色回应
- 好感商店购买后的感谢对话
- CG 故事的章节内容

### 对话参数

| 参数 | 值 | 配置路径 |
|------|----|----------|
| 正常打字速度 | 30ms/字 | `settings.json` → `DIALOGUE_CONFIG.typewriterSpeedNormal` |
| 快速打字速度 | 25ms/字 | `settings.json` → `DIALOGUE_CONFIG.typewriterSpeedFast` |
| 自动前进延迟 | 3000ms | `settings.json` → `UI_TIMERS.dialogueAutoAdvance` |

### VN 阅读器

- 支持 VNReader 状态机管理阅读流程
- 支持章节式故事展示（如 CG 故事）
- 支持打字机效果和手动翻页

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 对话速度 | `settings.json` | `DIALOGUE_CONFIG.typewriterSpeedNormal`, `typewriterSpeedFast` |
| 自动前进 | `settings.json` | `UI_TIMERS.dialogueAutoAdvance` |
| Boss 对话 | `levels.json` | `*.orders[].dialogue` (npc + player) |
| 循环事件 | `loop_events.json` | 各事件的 text + playerText |
| 循环叙事 | `loop_narratives.json` | loopIntro, loopOutro, boss_N.intro, boss_N.defeatOutro |
| CG 故事 | `cg_stories.json` | 各故事的 chapters[].paragraphs[] |

---

## 26. 商店系统

### 功能说明

使用钻石购买的普通商店，提供消耗品和工具。

### 商品列表

| ID | 名称 | 图标 | 钻石费用 | 效果 |
|----|------|------|---------|------|
| shop_energy_small | 体力小瓶 | ⚡ | 50 | 恢复 30 体力 |
| shop_energy_large | 体力大瓶 | 🔋 | 120 | 恢复 80 体力 |
| shop_joker | Joker | 🃏 | 200 | 获得 1 张 Joker |
| shop_scissor | 剪刀 | ✂️ | 150 | 获得 1 把剪刀 |
| shop_clear_lv1 | 清理扫帚 | 🧹 | 80 | 清除所有 Lv.1 物品（每个返还2体力） |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 商品列表 | `shop_items.json` | 数组元素 (id, icon, cost, effect, value, i18nName, i18nDesc) |

---

## 27. 奖励结算系统

### 功能说明

统一处理游戏中各种奖励的发放，包括金币、钻石、体力、好感点、碎片等。由 RewardService 编排。

### 奖励来源

- Boss 击败奖励（金币 + 钻石 × 奖励倍率）
- 日常订单奖励（金币 × 金币加成）
- 循环事件奖励
- 成就奖励
- 广告奖励
- 抽卡附带奖励

### 奖励倍率

循环越高奖励越多，详见 `loop_multipliers.json` 的 `rewardMultiplier` 表。

### 配置文件与字段

奖励值分散在各系统的配置文件中，倍率由 `loop_multipliers.json` 的 `rewardMultiplier` 统一控制。

---

## 28. 存档系统

### 功能说明

自动保存游戏进度，支持手动存档和读档。采用双层存档架构（META + RUN）。

### 存档内容

- **META 层**：跨循环持久数据（Meta 升级等级、Token 余额、成就、图鉴、CG 解锁等）
- **RUN 层**：当前循环的运行时数据（棋盘状态、Boss 进度、体力、货币、好感度等）

### 存档特性

- 自动保存间隔：5 秒（`UI_TIMERS.autoSaveInterval`）
- 支持离线产出计算
- 存档版本号 + 迁移系统
- Schema 验证

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 自动保存间隔 | `settings.json` | `UI_ANIMATION.autoSaveInterval` |

---

## 29. 音频系统

### 功能说明

管理游戏的背景音乐和音效播放。

### 默认音量

| 类型 | 音量 |
|------|------|
| 主音量 | 1.0 |
| BGM | 0.3 |
| SFX | 0.8 |

### 音效注册表

| ID | 文件 | 音量 | 事件触发 |
|----|------|------|---------|
| btn_click | btn_click.ogg | 0.8 | — |
| merge | merge.ogg | 1.0 | — |
| pop | pop.ogg | 0.9 | — |
| reward | reward.ogg | 1.0 | boss:defeated |
| task_complete | task_complete.ogg | 1.0 | dailyOrders:fulfilled |

### BGM 注册表

| ID | 文件 | 音量 |
|----|------|------|
| game_bgm | game_bgm.ogg | 1.0 |
| story_bgm | story_bgm.ogg | 1.0 |

### 淡入淡出参数

| 参数 | 时长(ms) |
|------|---------|
| BGM 淡入 | 800 |
| BGM 淡出 | 500 |
| BGM 恢复淡入 | 500 |
| BGM 交叉淡入 | 600 |
| BGM 切换延迟 | 50 |

### 配置文件与字段

| 配置项 | 文件 | 字段 |
|--------|------|------|
| 默认音量 | `audio_config.json` | `defaults.masterVolume`, `bgmVolume`, `sfxVolume` |
| 淡入淡出 | `audio_config.json` | `fade.bgmFadeIn`, `bgmFadeOut`, `bgmResumeFade`, `bgmCrossfade`, `bgmSwitchDelay` |
| 音效表 | `audio_config.json` | `sfxRegistry` |
| BGM 表 | `audio_config.json` | `bgmRegistry` |

---

## 30. 国际化系统

### 功能说明

支持多语言，当前有中文（默认）和英文（`en/`）两套配置。

### 机制

- 根目录 JSON 文件为中文默认配置（包含所有字段）
- `en/` 目录下的 JSON 文件为英文覆盖层（仅包含可本地化字段：名称、描述、对话等）
- 运行时英文覆盖层与根配置合并，数值字段从根配置继承

### 覆盖文件列表

`en/achievements.json`, `en/affection_config.json`, `en/affection_shop.json`, `en/cg_stories.json`, `en/character_profiles.json`, `en/daily_orders.json`, `en/gacha_pool.json`, `en/generators.json`, `en/items.json`, `en/levels.json`, `en/loop_events.json`, `en/loop_narratives.json`, `en/loop_rules.json`, `en/settings.json`, `en/touch_interactions.json`

---

## 31. 整体游戏流程

```
┌─────────────────────────────────────────────────────────┐
│                     游戏启动                              │
│  · 加载配置 → 初始化棋盘 → 放置初始生成器                │
│  · 体力满 (100) → 显示新手引导对话                        │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  核心玩法循环                              │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ 点击生成器 │──▶│  合成物品  │──▶│  完成订单  │            │
│  │ (消耗体力) │   │ (拖拽合并) │   │ (Boss/日常) │           │
│  └──────────┘   └──────────┘   └──────┬───┘            │
│       ▲                              │                   │
│       │         ┌──────────┐         │                   │
│       │         │  回收物品  │◀────────┤                   │
│       │         │ (获得体力) │         │                   │
│       │         └──────────┘         │                   │
│       │                              ▼                   │
│       │    ┌────────────────────────────────┐            │
│       │    │     Boss 击败 → 解锁格子         │            │
│       │    │     → 推进剧情 → 增加好感        │            │
│       │    │     → 金币/钻石奖励              │            │
│       │    └──────────────┬─────────────────┘            │
│       │                   │                              │
│       │    ┌──────────────▼─────────────────┐            │
│       │    │   所有 Boss 击败 → 循环结算       │            │
│       │    │   → 获得 Token → Meta 升级       │            │
│       │    │   → 进入下一轮循环 (难度↑奖励↑)   │            │
│       │    └──────────────┬─────────────────┘            │
│       │                   │                              │
│       └───────────────────┘                              │
│                                                          │
│  并行系统：                                               │
│  · 抽卡 → 获得物品/碎片/Joker                            │
│  · 好感系统 → 触摸/送礼 → 解锁商店/互动                   │
│  · 成就 → 完成条件 → 获得奖励                             │
│  · 广告 → 获得体力/金币/钻石/免费抽                        │
│  · 每日 Buff → 30分钟增益                                │
│  · 图鉴 → 收集记录                                       │
│  · CG 相册 → SSR 故事阅读                                │
└─────────────────────────────────────────────────────────┘
```

---

## 32. 升级工作流详解

### 32.1 物品合成升级流程

```
两个相同 Lv.N 物品 → 拖拽合成 → 产出 Lv.(N+1) 物品
                                    │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              Lv.1-7 可继续      Lv.8 满级         特殊情况
              合成升级           不可再合成        Joker 升级任意物品
```

### 32.2 生成器升级流程

```
gen_X_Lv1 + gen_X_Lv1 → gen_X_Lv2
gen_X_Lv2 + gen_X_Lv2 → gen_X_Lv3
...
gen_X_Lv7 + gen_X_Lv7 → gen_X_Lv8

升级效果：
· 产出池从低级扩展到高级物品
· Lv.6+ 增加免费产出概率
· Lv.6+ 增加容量限制
· Lv.8 增加特殊掉落 (Joker/高级物品)
```

### 32.3 Boss 进度流程

```
进入关卡 → 加载 Boss (HP, 对话)
         → 加载订单 1 (物品需求)
         → 玩家合成所需物品
         → 提交订单 → 扣除 Boss HP
         → 加载订单 2
         → ...
         → 订单 3 提交 → Boss HP=0 → 击败
         → 解锁格子 + 剧情对话 + 好感 + 奖励
         → 进入下一个 Boss
```

### 32.4 循环升级流程

```
第 N 轮循环开始
│
├─ 重置运行时状态 (棋盘、Boss进度、体力)
├─ 保留 META 数据 (Meta升级、成就、图鉴、CG)
├─ 应用 Meta 升级加成 (起始金币/钻石/体力)
│
├─ 难度提升：
│   · Boss HP × hpMultiplier[N]
│   · 订单需求物品等级 + tierBoost[N]
│   · 订单伤害 × hpMultiplier[N]
│   · 限时订单时间 × timeMultiplier[N]
│
├─ 奖励提升：
│   · 奖励 × rewardMultiplier[N]
│   · 循环完成获得 tokenReward[N]
│
└─ 进入核心玩法循环 (同第31节)
```

### 32.5 好感度升级流程

```
各种好感来源 (Boss击败/触摸/送礼/日常/事件)
│
├─ 好感点数累积 → 好感等级提升
│
├─ 等级提升解锁：
│   · 新触摸区域 (Lv.1: 脸颊、手背)
│   · 好感商店新商品
│   · 等级升级奖励 (好感币)
│
└─ 好感币 → 在好感商店购买物品
```

### 32.6 女主角升级流程

```
金币 → 选择升级项目
│
├─ 体力上限提升 (100→120→150→200)
├─ 恢复加速 (120s→100s→80s→60s)
├─ 回收大师 (额外+1→+2→+3 体力)
└─ 财运亨通 (金币×1.2→×1.5→×2.0)
```

### 32.7 Meta 升级流程（跨循环）

```
循环完成 → 获得 Token
│
├─ Token 消耗：
│   · 起始金币 (10→50/级, 最大10级)
│   · 起始钻石 (20→5/级, 最大5级)
│   · 起始体力 (15→20/级, 最大8级)
│   · 每日加成 (25→5%/级, 最大10级)
│
└─ 下一轮循环开始时自动应用加成
```

---

## 33. 配置文件索引

### 完整配置文件清单

| 文件 | 行数 | 主要用途 |
|------|------|---------|
| `achievements.json` | 292 | 30 个成就定义（条件、奖励） |
| `ad_config.json` | 6 | 4 种广告类型（奖励、限制、冷却） |
| `affection_config.json` | 37 | 好感等级、角色、来源、触摸参数 |
| `affection_shop.json` | 266 | 3 类 21 个好感商店商品 |
| `audio_config.json` | 25 | 音效/BGM 注册表、音量、淡入淡出 |
| `board_economy.json` | 8 | 棋盘经济参数（出售加成、幸运合成等） |
| `boss_progression.json` | 14 | Boss 难度缩放（Tier Boost、HP 倍率） |
| `cg_stories.json` | 999 | 8 个 SSR 故事内容（4 章节每个） |
| `character_profiles.json` | 90 | 4 位角色档案（喜好、感官签名、礼物偏好） |
| `daily_buff_config.json` | 10 | 5 种每日 Buff 类型 |
| `daily_orders.json` | 952 | 56 个日常订单池 |
| `gacha_config.json` | 4 | 抽卡基础配置（十连数量、免费抽最高稀有度） |
| `gacha_pool.json` | 1083 | 抽卡池完整定义（概率、费用、物品池、链映射） |
| `generators.json` | 228 | 2 个生成器 × 8 级（产出池、容量、特殊掉落） |
| `item_effects.json` | 32 | 8 种道具效果参数 |
| `items.json` | 845 | 全部物品定义（4链×8级 + 特殊物品） |
| `levels.json` | 336 | 4 个 Boss 关卡（HP、订单、对话） |
| `loop_events.json` | 121 | 14 个循环剧情事件 |
| `loop_multipliers.json` | 29 | 循环倍率表（HP/奖励/时间/Token）+ Meta 升级 |
| `loop_narratives.json` | 162 | 8 轮循环叙事（开场/结尾/Boss 对话） |
| `loop_rules.json` | 10 | 8 轮循环主题与规则 |
| `settings.json` | 216 | 核心游戏配置、棋盘、升级、UI 参数 |
| `shop_items.json` | 47 | 5 个普通商店商品 |
| `touch_interactions.json` | 146 | 4 区域 × 4 角色 × 6 等级触摸回应 |

### 按功能模块索引

| 功能模块 | 涉及配置文件 |
|----------|-------------|
| 棋盘与合成 | `settings.json`, `items.json`, `board_economy.json`, `generators.json` |
| Boss 战斗 | `levels.json`, `boss_progression.json`, `loop_multipliers.json` |
| 循环系统 | `loop_rules.json`, `loop_multipliers.json`, `loop_events.json`, `loop_narratives.json` |
| 体力 | `settings.json` (GAME_CONFIG, HEROINE_UPGRADES) |
| 抽卡 | `gacha_config.json`, `gacha_pool.json`, `item_effects.json` |
| 好感度 | `affection_config.json`, `affection_shop.json`, `touch_interactions.json` |
| 角色档案 | `character_profiles.json`, `affection_config.json` |
| 日常订单 | `daily_orders.json`, `settings.json` (DAILY_ORDER_CONFIG) |
| 成就 | `achievements.json` |
| 商店 | `shop_items.json`, `affection_shop.json` |
| 道具效果 | `item_effects.json` |
| CG 故事 | `cg_stories.json` |
| 广告 | `ad_config.json` |
| 每日 Buff | `daily_buff_config.json` |
| 音频 | `audio_config.json` |
| UI/动画 | `settings.json` (UI_ANIMATION, UI_TIMERS, UI_COLORS, UI_COLOR_THEME, UI_LAYOUT) |
| 国际化 | `en/*.json` (15 个覆盖文件) |

---

> **文档维护说明**：当新增或修改 JSON 配置字段时，请同步更新本文档对应章节。配置表结构已冻结（Architecture Freeze v1.0），新增字段需经过评审。
