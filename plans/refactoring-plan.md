# 心动合成 — 工业化重构计划

> 版本：1.0 | 日期：2026-06-04
> 原则：最小风险、最大收益、渐进式推进

## 概述

本次重构聚焦三个目标，不改变任何游戏业务逻辑和 Store 数量：

| 编号 | 目标 | 风险 | 预计工时 |
|---|---|---|---|
| R1 | EventBus 强类型协议化 | 低 | 3-4h |
| R2 | 音频层 Howler.js 换装 | 低-中 | 4-5h |
| R3 | CSS 变量高频色值收拢 | 低 | 3-4h |

**不做的项目**（附理由）：
- ~~Pixi.js 合成盘~~：20-30 个 DOM 节点无需 Canvas，@pixi/vue v0.1.0 不稳定
- ~~双语 JSON 合并~~：按语言分文件是业界标准，当前有校验脚本即可
- ~~core/gameplay 目录拆分~~：过早抽象，单一游戏项目无复用需求

---

## R1：EventBus 强类型协议化

### 现状分析

- 59 个事件名，全部为**魔法字符串**
- 其中 **37 个事件无监听器**（orphaned emissions）
- `loop:completed` 从两个位置发出但 **payload 不一致**（`{ loopIndex }` vs `{ nextLoopIndex }`）
- `dialogue:opened` 有监听器但**无发射器**（死代码）
- Local bus 已实现但**未使用**
- 多个 Store 注释了 HMR 监听器堆积问题

### 实施步骤

#### 步骤 1.1：定义 `GameEvents` 类型协议

**文件**：`src/types/game.d.ts`

新增强类型事件映射：

```typescript
export interface GameEvents {
  // --- Boss ---
  'boss:defeated': { levelIdx: number }
  'boss:gameComplete': void
  'boss:hpChanged': { currentHp: number; totalHp: number; pct: number }
  'boss:levelLoaded': {
    levelIdx: number; bossName: string; bossTitle: string
    bossAvatar: string; bossColor: string; bgGradient: string
    currentHp: number; totalHp: number
  }
  'boss:orderComplete': { nextOrderIdx: number }
  'boss:orderFailed': { orderIdx: number; nextOrderIdx: number }
  'boss:orderLoaded': {
    orderIdx: number; order: OrderData
    isTimed: boolean; timeLimit: number
  }
  'boss:timerTick': { remaining: number }

  // --- FSM ---
  'bossfsm:stateChanged': { from: string; to: string; event: string; data?: any }
  'energyfsm:stateChanged': { from: string; to: string; event: string; data?: any }
  'gachafsm:stateChanged': { from: string; to: string; event: string; data?: any }

  // --- Board ---
  'board:cellsUnlocked': { indices: number[] }

  // --- Currency ---
  'currency:changed': { gold: number; diamonds: number }
  'currency:flash': { type: 'gold' | 'diamonds'; effect: 'add' | 'spend' }
  'currency:goldEarned': { amount: number }
  'currency:insufficient': { type: 'gold' | 'diamonds'; current: number; needed: number }

  // --- Energy ---
  'energy:changed': { current: number; max: number }

  // --- Dialogue ---
  'dialogue:closed': void

  // ... (完整 59 个事件)
}
```

#### 步骤 1.2：重构 `EventBus.ts` 泛型约束

```typescript
// 改前
emit(eventName: string, data?: any): void
on(eventName: string, handler: Function): void

// 改后
emit<K extends keyof GameEvents>(
  eventName: K,
  ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
): void

on<K extends keyof GameEvents>(
  eventName: K,
  handler: GameEvents[K] extends void
    ? () => void
    : (payload: GameEvents[K]) => void
): void
```

保持 `off()`、`once()`、`clear()` 同步泛型化。

#### 步骤 1.3：修复 payload 不一致

- `loop:completed`：统一为 `{ loopIndex: number }`，修改 `useGameInit.ts:243` 的 `nextLoopIndex` → `loopIndex`

#### 步骤 1.4：清理死代码

- 删除 `dialogueStore.ts:33` 对 `dialogue:opened` 的监听（无发射器）
- 清理 37 个无监听器事件中的**明显废弃事件**（保留可能被未来 UI 使用的事件）
- 移除 `useEventBus.ts` 中未使用的 local bus 功能，或标记 `@deprecated`

#### 步骤 1.5：解决 HMR 监听器堆积

在 `EventBus.ts` 中增加 `offAllForOwner(owner: string)` 方法，Store 在 setup 时注册带 owner 标记，HMR 时按 owner 清理旧监听器。

### 验收标准

- [ ] `emit('boss:defeated', { wrongKey: 1 })` 编译报错
- [ ] `emit('boss:defeated')` 编译报错（缺少 payload）
- [ ] 所有 `.on()` / `.emit()` 调用零 TS 报错
- [ ] `npm run build` 成功
- [ ] `npm run test` 全部通过

---

## R2：音频层 Howler.js 换装

### 现状分析

| 指标 | 现状 |
|---|---|
| SFX | 5 个（btn_click, merge, pop, reward, task_complete） |
| BGM | 2 个（game_bgm, story_bgm） |
| API 面 | 10 个公开方法 |
| 调用点 | 5 个文件，共 ~15 次调用 |
| 已知问题 | iOS Safari AudioContext unlock、微信 WebView 静音、无音频格式 fallback |

### 实施步骤

#### 步骤 2.1：安装 Howler.js

```bash
npm install howler@^2.2.4
```

#### 步骤 2.2：重写 `useAudio.ts`

保持**完全相同的公开 API**，内部替换实现：

```typescript
import { Howl, Howler } from 'howler'

const SOUNDS: Record<string, string> = {
  btn_click: '/assets/audio/btn_click.ogg',
  merge:     '/assets/audio/merge.ogg',
  pop:       '/assets/audio/pop.ogg',
  reward:    '/assets/audio/reward.ogg',
  task_complete: '/assets/audio/task_complete.ogg',
}

const BGM: Record<string, string> = {
  game_bgm:  '/assets/audio/game_bgm.ogg',
  story_bgm: '/assets/audio/story_bgm.ogg',
}

const howls: Record<string, Howl> = {}
let currentBGM: Howl | null = null
let currentBGMName: string | null = null

function init() { /* Howler 自动处理 AudioContext unlock */ }
function preloadAll() { /* 预创建所有 Howl 实例 */ }
function playSound(name: string) { howls[name]?.play() }
function playBGM(name: string) { /* fadeIn + loop */ }
function pauseBGM(fadeMs = 0) { /* fadeOut then pause */ }
function tryResumeBGM() { /* Howler.ctx().resume() */ }
function setBGMVolume(v: number) { currentBGM?.volume(v) }
function muteAudio() { Howler.mute(true) }
function unmuteAudio() { Howler.mute(false) }
function getCurrentBGM() { return currentBGMName }
```

关键改动点：

| 原实现 | Howler 实现 |
|---|---|
| `new AudioContext()` + `decodeAudioData()` | `new Howl({ src, preload })` |
| `new Audio()` + `.play()` | `new Howl({ loop, volume })` + `.play()` |
| 手动 fade out（`setInterval` 改 volume） | `howl.fade(from, to, duration)` |
| 手动 mute 追踪 | `Howler.mute(true/false)` 全局 |
| 无格式 fallback | Howler 自动检测支持格式，可配 `['.ogg', '.mp3']` |

#### 步骤 2.3：添加移动端防御

```typescript
function init() {
  if (Howler.ctx()?.state === 'suspended') {
    const unlock = () => {
      Howler.ctx()?.resume()
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('click', unlock)
    }
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('click', unlock, { once: true })
  }
}
```

#### 步骤 2.4：验证调用点兼容性

5 个调用文件无需任何修改（API 签名完全兼容）：

| 文件 | 使用的 API |
|---|---|
| `useGameInit.ts` | `tryResumeBGM()`, `preloadAll()`, `playBGM()` |
| `useEffects.ts` | `playSound('pop')` |
| `VNReaderOverlay.vue` | `playBGM()`, `playBGM()` |
| `DialogueOverlay.vue` | `getCurrentBGM()`, `pauseBGM()`, `playBGM()` |
| `GameView.vue` | `playSound('btn_click')` |

### 验收标准

- [ ] 所有 5 个调用文件零修改，功能不变
- [ ] iOS Safari 首次触摸后音频正常播放
- [ ] BGM fade in/out 平滑无爆音
- [ ] mute/unmute 全局生效
- [ ] `npm run build` + `npm run test` 通过
- [ ] `Howler._codecs()` 确认 ogg 格式支持

---

## R3：CSS 变量高频色值收拢

### 现状分析

| 指标 | 数量 |
|---|---|
| 已有 CSS 变量 | 39 个 |
| 组件内硬编码色值 | ~331 个 |
| global.css 硬编码色值 | ~131 个 |
| 总硬编码实例 | **~462 个** |

### 渐进策略：高频色值优先

本次只收拢高频类别，其余后续迭代。

#### 第一优先级：Accent / 状态色（影响全局换皮）

| 新变量名 | 色值 | 说明 |
|---|---|---|
| `--vn-accent` | `#7B68EE` | 新增，VN/CG 场景主色 |
| `--vn-accent-light` | `#9B88FF` | 新增 |
| `--vn-pink` | `#FF6B9D` | 新增，BoardItem/CollectionSheet/VNReader |
| `--vn-pink-light` | `#FF8E9E` | 新增 |
| `--color-success` | 统一为 `#4CAF50` | 已有 + 多组件不一致 |
| `--color-danger` | `#D32F2F` | 已有 |
| `--rarity-ssr` | `#f1c40f` | 已有 |
| `--rarity-sr` | `#9b59b6` | 已有 |
| `--rarity-r` | `#4A90D9` | 已有 |

#### 第二优先级：文本色（影响可读性主题化）

| 新变量名 | 色值 | 说明 |
|---|---|---|
| `--text-dark` | `#333` | 全局出现 ~20 次 |
| `--text-medium` | `#555` | 全局出现 ~10 次 |
| `--text-light` | `#999` | 全局出现 ~8 次 |
| `--text-muted-alt` | `#666` | 全局出现 ~6 次 |
| `--text-inverse` | `#fff` | 全局出现 ~30 次 |

#### 第三优先级：背景色（影响深浅主题切换）

| 新变量名 | 色值 | 说明 |
|---|---|---|
| `--overlay-bg` | `rgba(0,0,0,0.55)` | 弹窗遮罩统一 |
| `--card-bg` | `rgba(255,255,255,0.95)` | 卡片背景统一 |
| `--divider` | `rgba(0,0,0,0.08)` | 分割线统一 |
| `--surface-raised` | `#fff` | 浮起表面 |
| `--surface-muted` | `#f5f5f5` | 弱化表面 |

### 实施步骤

#### 步骤 3.1：在 `variables.css` 中声明新变量

#### 步骤 3.2：替换 global.css 中的高频硬编码

- `#333` → `var(--text-dark)`
- `#555` → `var(--text-medium)`
- `#999` → `var(--text-light)`
- `#666` → `var(--text-muted-alt)`
- `#fff` → `var(--text-inverse)`
- `rgba(0,0,0,0.55)` → `var(--overlay-bg)`
- `rgba(255,255,255,0.95)` → `var(--card-bg)`

#### 步骤 3.3：替换组件中的高频硬编码

| 文件 | 预计替换数 | 优先级 |
|---|---|---|
| BoardItem.vue | 17 | P0 |
| BossHeader.vue | 22 | P0 |
| GridCell.vue | 16 | P0 |
| BaseBottomSheet.vue | 10 | P1 |
| ToastRoot.vue | 8 | P1 |
| GachaSheet.vue | 35 | P2 |
| VNReaderOverlay.vue | 30 | P2 |
| 其余 11 个组件 | ~193 | P3 |

### 验收标准

- [ ] `variables.css` 新增 ~15 个 CSS 变量
- [ ] global.css 中高频色值硬编码替换完成
- [ ] P0/P1 组件中高频色值替换完成
- [ ] P2/P3 组件中 `#333`、`#555`、`#fff` 替换完成
- [ ] `npm run build` 通过

---

## 执行顺序

```
R1 (EventBus 强类型) → R2 (Howler.js) → R3 (CSS 变量)
```

三个任务无代码依赖，建议串行以便逐步验证。

---

## 风险与回滚

| 风险 | 缓解措施 |
|---|---|
| R1 泛型导致编译报错扩散 | 先定义 `GameEvents`，逐步收紧 |
| R2 Howler 在特定 WebView 不兼容 | 保留原 `useAudio.legacy.ts`，1 周后删除 |
| R3 CSS 变量替换引入视觉回归 | 逐文件替换，每步可 git revert |

---

## 后续迭代（本次不执行）

1. CSS 低频色值收拢
2. EventBus 无监听器事件清理
3. stylelint 规则禁止 scoped style 中硬编码色值
4. 音频格式 fallback（.mp3 备用）
