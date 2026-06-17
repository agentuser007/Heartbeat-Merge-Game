# 《项目现状审计报告》 — Heartbeat Merge

> 审计时间：2026-06-16 | 代码库规模：72 TS + 37 Vue | 测试：908 pass

---

## 1. 🏗️ 系统架构与模块关系现状

### 当前目录结构

```
src/
  logic/              # 6 模块，纯类/对象，有状态 + serialize/deserialize
  services/           # 12 模块（含 ServiceResultTypes），纯函数编排层
  stores/             # 22 Pinia Store 模块
  core/               # EventBus, StateMachine, DevConfig, deepMerge
  composables/        # 12 composable（useGameLoop, useGameInit, useDrag 等）
  components/         # board/(7) + sheets/(11) + overlays/(8) + common/(5)
  features/           # 离线产出策略模式（IOfflineProduction + 2 实现 + Manager）
  schemas/            # 存档 schema 定义（core/economy/loop/affection + registry）
  types/              # game.d.ts（全局类型 + GameEvents 事件映射）+ serialize.ts
  views/              # GameView.vue（唯一路由页面）
  styles/             # fonts.css + fonts.css.d.ts
public/assets/data/   # 23 个 JSON 配置表（含 en/ 子目录 15 个英文覆盖文件）
```

### 模块间耦合度

**三层架构实际执行情况：**

| 层 | 模块数 | 是否引用 configStore | 是否引用 globalBus | 返回模式 |
|---|---|---|---|---|
| **Logic** | 6 | ❌ 零引用 | ❌ 零引用（返回 `LogicEvent[]`） | 类实例方法，有状态 |
| **Service** | 12 | ❌ 零引用 | ❌ 零引用 | 返回 `ResolveResult` 或自定义 Result |
| **Store** | 22 | ✅ 16/22 直接读取 | ✅ 20/22 直接 emit | 调用 Service/Logic，apply + emit |

**关键耦合路径：**

- **Store → configStore 直读**：boardStore、gachaStore、affectionStore、bossStore 等 16 个 store 在 action 中直接读取 `configStore.xxx`，配置值不经 deps 传入。这是当前最大的跨层耦合点。
- **BoardService 的特殊地位**：BoardService 不调用任何 Logic 模块，自身包含完整的棋盘纯计算逻辑（find、resolve 等 28 个函数），是事实上的"Logic+Service 合体"。
- **SaveService 的命令式 apply**：`applyMetaResult()` / `applyRunResult()` 直接调用 `deps.*Store.deserialize()`，是唯一绕过 ResolveResult 模式、直接命令式操作 Store 的 Service 函数。
- **useGameLoop 作为中枢总线**：订阅 18+ 全局事件，持有 `applyResolveResult` 函数，负责将所有 Service 返回的 `ResolveResult` 分发到各 Store。这是事件驱动架构的实际路由层。

**状态流转触发方式：**

```
用户交互 → Composable/Component
  → Store.action()
    → Service.resolve*(deps) → ResolveResult
      → Store.apply(ResolveResult.applyTo)
      → Store.emit(globalBus / events)
        → useGameLoop 订阅 → 再次分发到其他 Store
```

---

## 2. 🧠 核心业务逻辑白描

### 合成逻辑（Merge 2）现状

**棋盘数据模型：**
- `cells: (string | null)[]` — 一维扁平数组，索引即格子位置，值为 item ID
- `locked: Set<number>` — 被锁定的格子索引集合
- `generatorStates: Record<number, { currentClicks, cooldownUntil, maxClicks }>` — 每格生成器状态

**升级判定规则：**
- 升级链由 `ItemData.nextId` 字段驱动，形成 per-chain 的单向链表（如 `lip_1.nextId = "lip_2"` → `lip_2.nextId = "lip_3"` ... → `lip_8.nextId = null`）
- `BoardLogic.tryMergeOrSwap()` 判定逻辑：两个格子 `s === t`（同 ID）且 `items[s].nextId !== null` 时，目标格变为 `nextId`，源格清空
- 生成器合并额外约束：`canMergeGenerators()` 要求双方 `type === 'GENERATOR'`、同 `chain`、同 `level`、且 `nextId !== null`
- Joker 合并走独立路径：Joker + 普通物品 → 普通物品升级为 `nextId`，Joker 消耗
- 随机性注入：`random` 通过 `deps: RandomDeps` 传入，仅在 `rollGeneratorDrop`（掉落抽取）和 `isFreeProduction`（免费产出概率）中使用

**生成器产出流程：**
1. 用户点击生成器 → `boardStore.produceFromGenerator()`
2. 前置校验（非空、是生成器、非冷却、未达最大点击数）在 Store 层 inline 完成
3. 调用 `BoardService.resolveProduction()` 返回 `ResolveProductionResult`（含 `resolveResult` + `storeMeta`）
4. Store 根据 `storeMeta.placements` 命令式 apply：`logic.setCell()` + `logic.initGeneratorState()`

**ResolveResult 在 Board 层的非标准用法：**
- `resolvePlaceItem` / `resolveClearCell` 返回自定义 `applyTo.board.setCell` / `clearCell`（单数），不走标准 `placeItems` / `clearCells`（复数）
- `resolveMerge` 返回自定义 `applyTo.board.setCells: MergePlacement[]`，含 `initGenerator` 标记
- `resolveProduction` 返回混合结构：`resolveResult`（标准）+ `storeMeta`（非标准，含 `placements`、`incrementGeneratorClicks`）

### 剧情树与条件分支现状

**当前状态：无分支树，全部为线性序列。**

- **VN Reader**：数据结构为 `CGStory { stories: StoryChapter[] { lines: StoryLine[] } }`，每条 story 是纯线性 `lines[]` 数组，逐条 advance。无选择节点、无条件跳转、无 goto 标签。
- **Dialogue 系统**：`dialogueStore` 持有单条对话 + `dialogueQueue`（顺序队列），`close()` 后自动展示下一条。无分支逻辑。
- **Loop 叙事**：`loop_narratives.json` 中 `boss_0..3.intro/defeatOutro` 字段已定义、已校验、已加载到 `configStore`，但**代码中无任何消费者**。`loop_events.json` 同理，加载后零消费。
- **叙事 Flag 系统**：`loopStore.unlockedNarrativeFlags` / `hasNarrativeFlag()` / `unlockNarrativeFlag()` 已实现但处于"仅写"状态——`unlockNarrativeFlag()` 无调用方，`hasNarrativeFlag()` 无查询方。

**已加载但未消费的叙事数据：**

| 数据字段 | 加载位置 | 是否有消费代码 |
|---|---|---|
| `loop_narratives.loopIntro` | configStore | ✅ useGameInit + MapOverlay |
| `loop_narratives.loopOutro` | configStore | ❌ |
| `loop_narratives.boss_X.intro` | configStore | ❌ |
| `loop_narratives.boss_X.defeatOutro` | configStore | ❌ |
| `loop_events` 全部 | configStore | ❌ |
| `unlockedNarrativeFlags` | loopStore | ❌ |

### 主角养成数据现状

**好感度系统（affectionStore，属 META 存档，跨 Loop 持久化）：**

| 数据 | 存储位置 | 结构 |
|---|---|---|
| 好感度点数 | `affection: Record<string, number>` | characterId → points |
| 好感币 | `affectionCoins: number` | 单值 |
| 商店购买记录 | `shopPurchaseHistory: Record<string, ShopPurchaseRecord>` | itemId → { totalPurchased, lastPurchaseDate } |
| 礼物记录 | `giftHistory: Record<string, Record<string, number>>` | characterId → giftId → count |
| 触摸冷却 | `lastTouchTime: Record<string, Record<string, number>>` | characterId → zoneId → timestamp |

**好感度等级（affection_config.json 驱动）：**
- 6 级：陌生人(0-99) → 熟识(100-299) → 好友(300-599) → 暧昧(600-999) → 心动(1000-1499) → 牵绊(1500+)
- 等级影响：触摸区域解锁（Lv1 解锁脸颊/手背）、商店道具解锁（Lv0-3）、触摸对话内容分级（6 级 × 4 区域 × 4 角色）

**好感度写入来源：**
1. Boss 击败 → `AffectionService.resolveBossDefeat()`（boss→角色映射 + 基础值 + 循环递增）
2. VN 故事完成 → `AffectionService.resolveVnCompleted()`（SSR=50, SR=20）
3. 送礼 → `affectionStore.giftItem()`（含 1.5x/1.2x 偏好倍率，**inline 在 Store 中**）
4. 触摸互动 → `TouchInteractionService.resolvePerformTouch()`
5. 商店购买 → `affectionStore.purchaseShopItem()`

**女主角强化系统（heroineStore，属 META 存档）：**
- `upgrades: Record<string, number>` — 升级 ID → 当前等级
- 4 种强化：startingGold / startingDiamonds / startingEnergy / dailyBonus
- 购买流程：`HeroineService.resolvePurchaseUpgrade()` 返回 `PurchaseUpgradeResult`，Store 直接写入 `upgrades.value[upgradeId] = newLevel`
- 效果应用：`applyPermanentEffects()` emit `heroine:effectApplied` 事件，注释标注"placeholder"

---

## 3. 💾 数据隔离与硬编码（Hardcode）专项审计

### 游戏数值/道具配置

**已抽离为 JSON 配置表（23 个文件）：**

| 配置文件 | 内容 | 中文文案 | 纯数值 |
|---|---|---|---|
| items.json | 45+ 物品定义（ID/名称/等级/链/emoji/颜色/售价） | ✅ name/description | |
| generators.json | 2 生成器 × 8 级（掉落池/容量/冷却/特殊掉落） | ✅ name | |
| levels.json | 4 Boss × 多订单（HP/需求/伤害/对话/限时） | ✅ 全量 | |
| gacha_pool.json | 53 卡池物品 + 稀有度/权重/子分类 | ✅ chainNames/name | |
| gacha_config.json | 十连数量、免费抽上限 | | ✅ |
| board_economy.json | 售价加成/幸运合并/日常金币等 6 项 | | ✅ |
| boss_progression.json | 订单等级提升表 + 最大等级 | | ✅ |
| item_effects.json | 8 种道具效果配置 | | ✅ |
| settings.json | 游戏设定 + UI 动画 + 计时器 + 布局 | ✅ 升级名/描述 | |
| shop_items.json | 5 商店道具 | | ✅（用 i18nName/i18nDesc） |
| affection_config.json | 等级/角色/来源/触摸/币 | ✅ | |
| affection_shop.json | 3 分类 × 20 道具 | ✅ | |
| character_profiles.json | 4 角色 × 完整档案 | ✅ | |
| cg_stories.json | 8 CG × 4 故事 × 多行对话 | ✅ | |
| daily_orders.json | 56 日常订单 | ✅ | |
| touch_interactions.json | 4 区域 × 4 角色 × 6 等级响应 | ✅ | |
| achievements.json | 30 成就 | ✅ | |
| loop_rules.json | 8 循环规则 + 特殊规则 | ✅ title | |
| loop_narratives.json | 8 循环叙事（intro/outro/boss） | ✅ | |
| loop_events.json | 17 循环事件 | ✅ | |

**仍在代码中硬编码的数值：**

| 位置 | 硬编码内容 |
|---|---|
| `loopStore.getHpMultiplier()` | 查找表 `[0, 1.00, 1.20, 1.40, 1.65, 1.95, 2.30, 2.70, 3.15]` + 公式 `3.15 * (1 + 0.16 * (i-8))` |
| `loopStore.getRewardMultiplier()` | 查找表 + `Math.min(3.0, 1.85 + 0.12 * (i-8))` |
| `loopStore.getTimeMultiplier()` | 查找表 |
| `loopStore.getLoopTokenReward()` | 查找表 + 公式 |
| `loopStore.getMetaUpgradeCost()` | 基础费用 `{ startingGold: 10, startingDiamonds: 20, startingEnergy: 15, dailyBonus: 25 }` + `base + level * ceil(base * 0.8)` |
| `loopStore.getMetaUpgradeEffect()` | `level * 50 / 5 / 20 / 0.05` |
| `dailyBuffStore.BUFF_DURATION_MS` | `30 * 60 * 1000` |
| `dailyBuffStore.DAILY_BUFF_TYPES` | 5 种 buff 定义（id/name/desc/icon/effect） |
| `adStore.adConfig` | 全部广告配置（奖励/日限/冷却/emoji） |
| `configStore.loadGameData()` | `fragmentToGenerator ?? 60`, `fragmentToStory ?? 60` |
| `DefaultOfflineProduction` | `MAX_OFFLINE_PRODUCES_PER_GENERATOR = 20` |
| `EnergyLogic` 构造函数 | `ENERGY_REGEN_CAP || gameConfig.MAX_ENERGY`（`||` 兜底） |

### 文本/剧情文案

**中文硬编码在代码中的分布（共约 158 处）：**

| 类别 | 数量 | 位置 | 特征 |
|---|---|---|---|
| **A. Vue 模板裸写中文** | ~15 处 | BoardGrid、BossHeader、GachaSheet、DailyOrderCard 等 7 个组件 | `ok-text="解锁"`、`title="扭蛋"`、`提交` 等 |
| **B. i18n fallback 中文** | ~27 处 | BoardGrid、StatusBar、GachaSheet、GameView 等 5 个组件 | `i18nStore.t('key') \|\| '中文'` 模式 |
| **C. Service 层裸写中文 toast** | ~35 处 | ItemEffectService(20)、InventoryService(6)、BoardService(4)、useGameLoop(4)、SaveService(1) | `fallback: '棋盘已满'`、`'✨ SSR生成器已放置！'` 等 |
| **D. i18nStore 默认字典中文** | ~9 处 | i18nStore.ts | VN Reader 相关默认文本 |

**英文国际化（i18n）覆盖：**
- 15/20 个 JSON 配置表有 `en/` 覆盖文件，使用 `deepMerge` 叠加模式
- `shop_items.json` 采用 `i18nName`/`i18nDesc` 字段而非覆盖文件
- 未覆盖的 5 个文件均为纯数值配置（无文案）
- 部分覆盖缺口：`en/character_profiles.json` 的 `sensorySignature` 和 `gifts` 文本未翻译

### UI 资产路径

| 类别 | 数量 | 位置 | 方式 |
|---|---|---|---|
| **硬编码绝对路径** | 16 处 | DailyOrderCard(5)、MainQuestCard(3)、StatusBar(4)、BottomActionBar(4) | `/assets/items/xxx.svg` |
| **CSS 背景硬编码** | 1 处 | DailyOrderCard CSS | `url('/assets/avatar/boss_bg.webp')` |
| **正确使用 BASE_URL** | 6 处 | ParadeOverlay(5)、GridCell(1) | `` `${import.meta.env.BASE_URL}assets/...` `` |
| **JSON 配置驱动** | 12+ 处 | levels.json(bossAvatar)、affection_config.json(avatar/background)、character_profiles.json(avatar/background) | 配置表中存储路径 |

---

## 4. 🗂️ 现存接口（Interface）盘点

**总计：127 个 Interface + 16 个 Type Alias + 0 个 Enum**（项目使用字面量联合类型替代 Enum）

### 按目录分布

| 目录 | Interface 数 | Type Alias 数 | 关键接口 |
|---|---|---|---|
| `src/types/game.d.ts` | 58 | 8 | `GameItem`, `LevelData`, `GachaPoolItem`, `ResolveResult`, `GameEvents`(40+事件映射), `BoardSnapshot`, `MetaUpgrade`, `MetaSaveData`, `RunSaveData` |
| `src/types/serialize.ts` | 10 | 0 | 全部存档序列化接口：`LoopSerializeData`, `BossSerializeData`, `BoardSerializedData` 等 |
| `src/logic/` | 27 | 2 | `ItemData`(BoardLogic+BossLogic 各一份), `GeneratorConfig`, `LogicEvent`, `BossProgressionDeps`, `RandomDeps`/`GachaRandomDeps`/`FragmentDeps`/`LuckyCoinDeps`/`ResolveItemIdDeps`/`EnergyItemDeps`/`DoubleGenDeps` |
| `src/services/` | 44 | 1 | `ResolveResult`(核心), `ToastType`, 25 个 BoardService deps 接口, `GachaServiceDeps`, `InstantEffectDeps`, `ConsumableEffectDeps`, `SerializeMetaDeps`/`SerializeRunDeps`/`ApplySaveDeps` |
| `src/stores/` | 10 | 1 | `ShopPurchaseRecord`, `GachaPullResult`, `DailyBuff`, `CGData`, `AdConfig`, `VNLine`, `PerformTouchReturn` |
| `src/core/` | 3 | 3 | `StateMachineConfig`, `DevConfigState`, `DeepPartial<T>` |
| `src/features/` | 5 | 0 | `IOfflineProduction`, `OfflineProductionContext`, `OfflineEnergyContext`, `OfflineProductionResult`, `OfflineEnergyResult` |
| `src/schemas/` | 0 | 1 | `ConfigKey` |
| `src/composables/` | 2 | 0 | `ApplyResolveResultDeps`, `ApplyDeps` |

### 关键接口详情

**`ResolveResult`**（ServiceResultTypes.ts）— 项目核心声明式指令模式：

```typescript
interface ResolveResult {
  applyTo: {
    currency?: { addGold?, addDiamonds?, spendDiamonds? }
    energy?: { add?, spend?, setMax?, setRegenInterval? }
    board?: { placeItems?, clearCells?, scissorActive?, activateDoubleGenTurns?, resetGenerators?, upgradeActive? }
    inventory?: { addItems? }
    fragment?: { addFragments? }
    cgAlbum?: { unlockCGs? }
    achievement?: { incrementStats?, checkAll?, resetLoopAchievements? }
    affection?: { addAffections?, recordTouch? }
    gacha?: { singlePull? }
    loop?: { syncLoopStatus?, incrementLoopIndex? }
    collection?: { resetLoopDiscoveries? }
    dailyOrders?: { rollNewOrders?, setFrozenOrders? }
    save?: { saveAll?, saveMeta? }
  }
  events?: Array<{ name: string; data: unknown }>
  ui?: { toasts?, closeSheets? }
}
```

**`GameEvents`**（game.d.ts）— 40+ 事件类型映射，所有 payload 均已注册类型定义。

**`ItemData` 重复定义**：BoardLogic.ts 和 BossLogic.ts 各自声明了一份 `ItemData`，字段基本一致但 BossLogic 版本缺少 `sellable?` 字段——两份是独立的 TypeScript 类型，未共享。

**`any` 使用**：生产代码 2 处（DevConfig `window.__DEV__`、main.ts `appEl.__vue_app__`）；ItemEffectService deps 中 `items: Record<string, any>` 2 处。
