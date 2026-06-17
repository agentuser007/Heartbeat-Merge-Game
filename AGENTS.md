# Heartbeat Merge — AI Session 导航

> Vue 3 + Pinia + TypeScript 合成类手游（心跳合合），merge玩法+galgame元素。

---

## 核心架构：Logic → Service → Store

- **Logic层** (`src/logic/`，7模块)：纯函数，零Vue依赖，所有外部值通过 deps 参数传入
- **Service层** (`src/services/`，12模块 + ServiceResultTypes)：编排Logic，返回 ResolveResult，零Vue依赖
- **Store层** (`src/stores/`，22模块)：Pinia store，调用Service，apply ResolveResult，emit事件

**ResolveResult 模式**：Service返回 `{ applyTo, events, ui }` 声明式指令，Store负责apply和emit。详细schema见 `docs/architecture.md`。

---

## ★ 铁律（违反率最高的规则）

1. **deps 必填，不许 `??` 兜底**：Logic/Service 函数签名中 deps 所有字段必填，缺失时 throw
2. **Logic/Service 不引用 configStore**：所有配置值通过 deps 从调用方（Store/composable）传入
3. **random 通过 deps 传入**：`random: Math.random` 作为 deps 字段，逻辑层不自己调 `Math.random`
4. **新增事件必须注册 GameEvents 类型**：`src/types/game.d.ts`，详见 `docs/event-map.md`
5. **Store 只做 apply + emit**：Store不包含业务计算逻辑，计算全在Logic/Service

---

## 铁律执行状态

| 铁律 | 状态 | 证据 |
|------|------|------|
| #1 deps 必填 | ✅ 全部合规 | TD-001~007 修复过程中已逐一验证 |
| #2 不引用 configStore | ✅ 全部合规 | Logic/Service 零 configStore import |
| #3 random 通过 deps | ✅ 全部合规 | BoardService.random deps 已注入（TD-004 修复），其余 Logic 本就合规 |
| #4 事件类型注册 | ✅ 全部合规 | game.d.ts 已注册所有事件 payload |
| #5 Store 只做 apply+emit | ✅ 全部合规 | emit 路径已合规（TD-001）；业务计算逻辑已合规（TD-009~013 修复：affectionStore 计算下沉到 AffectionService、loopStore 纯函数搬迁到 LoopLogic+LoopService、heroineStore 补 applyTo.heroine ResolveResult） |

**铁律 #1 作用域区分**：`??` fallback 禁令仅适用于 Logic/Service 层。UI 层 computed 中 `??` 作为防御性展示是合理的（如 GachaSheet `configStore.gachaCost?.singleCost ?? 100`）。

---

## 新文件 Checklist

新增 Logic/Service/Store 文件时逐项确认：

- [ ] Logic 层不 import globalBus（返回 LogicEvent[]，Store 负责 emit）
- [ ] Logic 层 random 通过 deps 注入（`random: Math.random` 作为 deps 字段）
- [ ] Logic/Service 不引用 configStore（配置值通过 deps 传入）
- [ ] Service 返回 ResolveResult，不直接操作 Store
- [ ] 新配置值写入对应 JSON（`public/assets/data/`），不在代码中硬编码
- [ ] 新增事件注册 GameEvents 类型（`src/types/game.d.ts`）

---

## 质量基线快照（2026-06）

- **生产代码 `any`**：2 处（SAFE-CAST：DevConfig `window.__DEV__`、main.ts `appEl.__vue_app__`）
- **测试代码 `as any`**：19 处（deepMerge 边界值 11 + 故意无效输入 8）
- **vue-tsc 生产错误**：0
- **测试**：1102 pass
- **TD 注册表**：12 已修复（含 TD-015），1 accepted risk（TD-005），1 待 CI 严格化（TD-008）→ `docs/tech-debt.md`
- **Architecture Freeze v1.0**：JSON 配置表结构已冻结，详见 `docs/hardcoded-values-audit.md`

---

## 当前任务

<!-- 每次开新任务时更新此行 -->
→ Phase 5 完成（未消费 config refs 消费化 + 3 处值不匹配 bug 修复），可开始新功能开发

---

## 目录结构

```
src/
  logic/            # 纯函数层（6模块）
  services/         # Service层（12模块 + ServiceResultTypes）
  stores/           # Pinia Store层（22模块）
  core/             # EventBus, StateMachine, DevConfig
  composables/      # useGameLoop, useGameInit, useDrag 等（10个）
  components/       # board/, sheets/, overlays/, common/
  features/         # 离线产出策略模式
  schemas/          # 存档schema定义
  types/            # game.d.ts（事件类型+全局类型）
public/assets/data/ # 所有JSON配置表（23个文件）
```

---

## 按需读取指引

- 修改 BoardService 前 → 先读 `src/services/ServiceResultTypes.ts` + 对应测试
- 修改任何Logic → 先读 `docs/conventions.md` 确认签名约定
- 新增/修改事件 → 先读 `docs/event-map.md` 确认payload和订阅方
- 详细架构 → `docs/architecture.md`
- 配置可插拔化进度 → `docs/hardcoded-values-audit.md`
- CSS/设计规范 → `docs/design-system-v1.1.md`
- **不要**一次性读整个 stores/ 或 services/ 目录
