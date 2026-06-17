# Tech Debt Register

## TD-001: Logic 层直接引用 globalBus

- **影响范围**: CurrencyLogic, BossLogic, EnergyLogic, GachaLogic, BoardLogic
- **违规描述**: 直接 `import globalBus` 并 emit 事件，Logic 层应为纯函数零外部依赖
- **当前状态**: 已修复 — 所有 5 个 Logic 类的 globalBus 引用已移除，方法改为返回 `LogicEvent[]`，Store 层负责 emit

## TD-002: EnergyLogic.startRegen 使用 setInterval/clearInterval

- **影响范围**: EnergyLogic
- **违规描述**: Logic 层不应有副作用，timer 应通过 deps 注入
- **当前状态**: 已修复 — Approach B：timer 管理移至 energyStore，Logic 提供 `tick()` 纯函数

## TD-003: GachaPoolItem schema 曾缺少 itemId/description 字段

- **影响范围**: `GachaPoolItemSchema`, `GachaPoolItem` 类型
- **违规描述**: Zod 默认 strip 未知 key，导致 `itemId`（实际数据全量存在）和 `description`（部分存在）被静默丢弃
- **当前状态**: 已修复（B2-B5 阶段补充）
- **教训**: 新增 schema 时应与实际 JSON 数据对跑验证，避免 strip 模式掩盖字段缺失

## TD-004: boardStore.produceFromGenerator 返回类型使用联合类型临时绕过 TS2322

- **影响范围**: `boardStore.ts`, `BoardGrid.vue`
- **违规描述**: `ResolveProductionResult` 与 `ResolveResult` 的 `applyTo.board` 形状不同（前者用 `placements`，后者用 `placeItems`），导致 TS2322。临时用 `ResolveResult | ResolveProductionResult` 联合类型 + `as ResolveResult` 断言绕过
- **当前状态**: 已修复 — 方案 B：`ResolveProductionResult` 重构为 `resolveResult: ResolveResult`（energy spend + events）+ `storeMeta`（placements/incrementGeneratorClicks/decrementDoubleGenBy），明确分离声明式指令与 Store 专用操作。`fail()` 返回 `incrementGeneratorClicks: null`（不递增）。Store 只传 `resolveResult` 给 `applyResolveResult`，手动处理 `storeMeta`。删除联合类型、TEMP 注释、`as ResolveResult` cast

## TD-005: saveStore migrateLegacySave 内部使用 any 访问旧存档字段

- **影响范围**: `saveStore.ts` `migrateLegacySave()`
- **违规描述**: 旧存档 JSON 无类型定义，migration 函数内部用 `Record<string, any>` 访问 30+ 个字段
- **当前状态**: 局部 `as Record<string, any>` + `// TEMP: see TD-005` 标记，仅限 legacy migration 内部
- **修复方案**: 如需彻底消除，可定义 `LegacySaveDataV0` 接口（字段全 optional），但投入产出比低
- **预计时机**: 如有存档格式大改时一并处理

## TD-006: InventoryService.resolveConsumableUse 不安全的 unknown → GachaPoolItemValue 类型断言

- **影响范围**: `InventoryService.ts` `resolveConsumableUse()`
- **违规描述**: `value: unknown`（来自事件 payload `ItemUsedData.value`）通过 `as GachaPoolItemValue` 断言传入 `ItemEffectService.resolveConsumableEffect`，无运行时校验
- **当前状态**: 已修复 — 双轨方案：(1) `ItemUsedData.value` 类型从 `unknown` 收紧为 `GachaPoolItemValue | undefined`，消除源头类型丢失；(2) 新增 `isGachaPoolItemValue` type guard（选项X：防御 null/原始类型/数组，`!Array.isArray(v)` 排除数组，空 `{}` 为合法值）+ fallback 返回 error toast。`resolveConsumableUse` 参数改为 `GachaPoolItemValue | undefined`。TEMP 注释已删除
- **已知局限**: type guard 不校验对象字段结构（因 GachaPoolItemValue 所有字段 optional，6/74 实际数据为空 `{}`，无普适 discriminant 字段）

## TD-007: DailyOrder 双重接口 — game.d.ts 与 dailyOrderStore 结构不一致

- **影响范围**: `useGameLoop.ts`, `boardStore.ts`, `BoardService.ts`, `ServiceResultTypes.ts`
- **违规描述**: `DailyOrder` 在 game.d.ts、dailyOrderStore、BoardService 中有三套定义，结构不一致。game.d.ts 无 `fulfilled`（配置表结构），store/BoardService 各自定义混合版。跨层赋值时需 bridge-cast，且 `useGameLoop` 中 `fulfilled: false` 硬编码覆盖了真实的 `fulfilled` 值（已完成订单在 board switch 恢复后会被重置为未完成）
- **当前状态**: 已修复 — 方案 B：新增 `DailyOrderState extends DailyOrder { fulfilled: boolean }` 明确区分配置与运行时状态；删除 dailyOrderStore/BoardService 本地 `DailyOrder` 定义；`BoardSnapshot.frozenDailyOrders` / `ResolveResult.setFrozenOrders` / `DailyOrderSerializeData` 统一改用 `DailyOrderState[]`；`dailyOrderStore.deserialize` 用 `normalizeDailyOrder()` + `satisfies` 补默认值保证旧存档兼容；boardStore 删除 `as ServiceDailyOrder[]` cast；useGameLoop 删除 bridge-cast，直接赋值（修复 fulfilled 覆盖 bug）

## TD-008: 测试代码 170 处 TS 错误（TS2345/2322 为主）

- **影响范围**: `src/__tests__/` 下 16 个文件
- **违规描述**: 测试字面量与函数参数类型不匹配（如 `ItemData` 字面量 vs `{ [key: string]: ItemData }`、缺少属性、类型不兼容），vue-tsc 报 170 处错误
- **当前状态**: 运行时无影响（908 tests pass），生产代码零 TS 错误
- **修复方案**: 批量给测试字面量加 `as const satisfies` 或补全缺失字段
- **预计时机**: 待 CI 配置 `vue-tsc` 对测试目录严格检查时统一处理

## TD-009: affectionStore.giftItem() 好感度偏好倍率 inline 计算

- **影响范围**: `affectionStore.ts` `giftItem()`
- **违规描述**: 铁律 #5 违规——Store 内部计算 `loved` = `value * 1.5`、`liked` = `value * 1.2`，属于业务计算逻辑，且倍率数值硬编码。无对应 Service 函数
- **当前状态**: 已修复 — AffectionService 新增 `resolveGiftItem`，倍率外化到 `affection_config.json` 的 `giftPreferenceMultipliers` 字段，Store 改为调 Service → apply ResolveResult → emit

## TD-010: affectionStore.purchaseShopItem() 验证+扣费+记录全 inline

- **影响范围**: `affectionStore.ts` `purchaseShopItem()`
- **违规描述**: 铁律 #5 违规——解锁等级校验、购买力校验、每日限购校验、扣费、购买记录更新全部 inline。`spendCoins()` 绕过 ResolveResult 直接命令式操作
- **当前状态**: 已修复 — AffectionService 新增 `resolvePurchaseShopItem`，验证逻辑下沉到 Service；purchaseHistory 更新保留在 Store（apply 范畴）

## TD-011: loopStore 7+2 个纯函数放错层 + 数值硬编码

- **影响范围**: `loopStore.ts` `getHpMultiplier()`, `getRewardMultiplier()`, `getTimeMultiplier()`, `getLoopTokenReward()`, `calculateLoopRewards()`, `getMetaUpgradeCost()`, `getMetaUpgradeEffect()`, `getMetaUpgradeMaxLevel()`, `getLoopTitle()`, `getSpecialRules()`
- **违规描述**: 铁律 #5 违规——7 个纯计算函数（零 reactive 依赖）放在 Store 层；4 张查找表 + 溢出公式参数 + meta upgrade 配置全部硬编码在 TS。其中 `getLoopTitle`/`getSpecialRules` 同时违反铁律 #2（直接读 configStore.loopRules）。Store 版 `calculateLoopRewards` 与 LoopService 版重复，且 Store 版用硬编码 `* 2` 而非 deps 参数
- **当前状态**: 已修复 — 新建 `LoopLogic.ts` 搬入 10 个纯函数；新建 `loop_multipliers.json` 外化数值；Store 改为调 LoopLogic，deps 从 configStore 传入

## TD-012: heroineStore.purchaseUpgrade() 绕过 ResolveResult 直接赋值

- **影响范围**: `heroineStore.ts` `purchaseUpgrade()`
- **违规描述**: 铁律 #5 违规——`upgrades.value[upgradeId] = newLevel!` 直接赋值，绕过 ResolveResult 声明式模式。根因是 ResolveResult schema 缺少 `applyTo.heroine` 字段
- **当前状态**: 已修复 — ResolveResult schema 新增 `applyTo.heroine.setUpgradeLevels`；HeroineService 返回中补全该字段；heroineStore 改为纯 apply（`setUpgradeLevel` + spendDiamonds + emit events）

## TD-013: loopStore.purchaseMetaUpgrade() 验证+扣费+直接写 state inline

- **影响范围**: `loopStore.ts` `purchaseMetaUpgrade()`
- **违规描述**: 铁律 #5 违规——等级校验、费用计算、代币扣除、state 直接写入全 inline。无 Service 函数处理验证和 ResolveResult 生成
- **当前状态**: 已修复 — LoopService 新增 `resolvePurchaseMetaUpgrade`（返回 ResolveResult 含 `applyTo.loop.spendLoopTokens` + `applyTo.loop.setMetaUpgradeLevel`）；Store 改为调 Service → inline apply（TODO: 等 applyResolveResult loop 分支补全后迁移）

## TD-014: energy_cap 两条路径语义冲突

- **影响范围**: `heroineStore.purchaseUpgrade()`, `useGameInit.applyHeroineEffectsToEnergy()`
- **违规描述**: `energy_cap` JSON value 是绝对值（120/150/200，label 为"上限 120"），但两条 apply 路径语义不同：(1) `heroineStore.purchaseUpgrade` 通过 HeroineService 按 `maxEnergyBase + value` 计算（bonus 语义），(2) `useGameInit.applyHeroineEffectsToEnergy` 按 `energyStore.max + bonus` 计算（累加语义）。同一局内两条路径并存时，energy max 取决于哪条路径后执行，结果不一致
- **当前状态**: 已知 — 清理 2（Phase 1E-B 后续）保留了原 handler 的 `maxEnergyBase + value` 语义
- **修复方案**: 统一到一条 apply 路径。选项 A：确认 JSON value 是绝对值，改 `purchaseUpgrade` 为直接 set value（删 `maxEnergyBase +`），同时修复 `applyHeroineEffectsToEnergy` 为 `baseMax + level差值` 或直接 set；选项 B：确认 JSON value 是 bonus，改 labels 和 `applyHeroineEffectsToEnergy`。需要策划确认语义后统一
- **预计时机**: 下次涉及 energy_cap 配置变更时一并处理

## TD-015: BossLogic loop 缩放从未生效（`setLoopConfig` 零调用） ✅ FIXED

- **影响范围**: `BossLogic.ts` `getScaledOrder()`, `loadLevel()` — Boss HP / 订单时限 / 订单难度的 loop 缩放完全无效
- **违规描述**: `this.loopConfig` 永远为 `null`（构造函数初始值），`setLoopConfig()` 方法虽然在 `bossStore` 上暴露但从未被任何调用方调用。所有 loop 相关计算走 fallback 值（`hpMultiplier: 1.0`, `loopIndex: 1`），游戏核心平衡受影响——loop 推进对 Boss 难度没有任何作用
- **根因**: `loopConfig` 通过实例 setter 传入的隐式时序依赖模式，违反 deps 注入原则——编译器无法保证调用方在正确时机传入
- **当前状态**: ✅ 已修复（Phase 4-9）
- **修复方案**: 将 `hpMultiplier` / `loopIndex` 改为 `loadLevel()` / `getScaledOrder()` / `loadOrder()` / `getCurrentOrder()` 的 deps 显式参数，删除 `this.loopConfig` 实例属性和 `setLoopConfig()` 方法。`bossStore._bossServiceDeps()` 从 `LoopLogic.getHpMultiplier()` 计算正确值并通过 deps 传入。删除 3 处 fallback（`loopConfig ? : 1`, `hpMultiplier ? : 1.0` ×2）
- **修复日期**: 2026-06-17

## TD-016: loopNarratives 消费侧未实现（loopOutro / boss_X.intro / boss_X.defeatOutro）

- **影响范围**: `loopNarratives` 数据（`loop_narratives.json`）已加载，仅 `loopIntro` 被消费（`useGameInit.ts`、`MapOverlay.vue`），`loopOutro`/`boss_X.intro`/`boss_X.defeatOutro` 零消费者
- **违规描述**: 3/5 字段为死数据——schema 验证通过、类型完整、但无代码路径读取。与 `loopEvents` handler（TD-016 同批叙事系统）实现模式一致：触发时机明确（`boss:defeated` → boss intro/defeatOutro，loop 结束 → loopOutro），数据结构完整
- **当前状态**: 待实现
- **修复方案**: 按 `loopEvents` handler 模式新增 handler——`boss-defeated-intro`（show dialogue on boss encounter）、`boss-defeated-outro`（show dialogue after boss defeat, before unlockCells）、`loop-completed-outro`（show dialogue on loop end）。注册 handler_map.json，通过 `dialogueStore.show()` + `onClose` 回调分发
- **预计时机**: 下一个内容功能批次，与 loopEvents 增强一起做

## TD-017: chainToGen / fragmentToGenerator 消费侧未实现

- **影响范围**: `configStore.chainToGen`、`configStore.fragmentToGenerator` — 数据已从 `gacha_pool.json` 加载，零消费者
- **违规描述**: 字段设计意图明确（chain→generator ID 映射、碎片→生成器解锁费用），但对应功能尚未实现。当前代码走的是其他路径获取等价信息
- **当前状态**: 待实现
- **修复方案**: 等功能设计确认后实现消费侧——chainToGen 可用于「按链查找默认生成器」，fragmentToGenerator 可用于「碎片解锁生成器费用」
- **预计时机**: 等相关功能设计确认

## TD-018: REFRESH_COST 刷新订单扣费功能未实现

- **影响范围**: `configStore.dailyOrderConfig.REFRESH_COST` — 配置值已加载（JSON 中 `REFRESH_COST: 0`），代码未读取
- **违规描述**: `DailyOrderSheet.vue` 的「刷新订单」按钮直接调 `rollNewOrders(true)` 无任何费用检查和扣费流程。`REFRESH_COST` 字段有策划预设值但代码侧完全未接入
- **当前状态**: 待实现
- **修复方案**: `dailyOrderStore.rollNewOrders(force)` 增加 `refreshCost` 参数（从 `configStore.dailyOrderConfig.REFRESH_COST` 传入），force=true 时先校验 `currencyStore.gold >= refreshCost`，通过则 `applyTo.currency = { addGold: -refreshCost }`；UI 按钮增加费用显示和不可用态
- **预计时机**: 下一个功能批次
