// ============================================================
// BoardLogic.ts — Pure Board Business Logic
// ============================================================

import { globalBus } from '../core/EventBus';

// Define interfaces for our data structures
export interface ItemData {
  id: string;
  name: string;
  level: number;
  chain: string;
  nextId: string | null;
  sellPrice: number;
  emoji: string;
  color: string;
  type?: string; // For special items like GENERATOR, JOKER, SCISSOR
  sellable?: boolean; // For generators that can't be sold
}

export interface GeneratorConfig {
  id: string;
  name: string;
  emoji: string;
  chains: string[];
  levels: {
    [level: string]: {
      drop_pool: Array<{ itemId: string; weight: number }>;
      free_production_chance: number;
      capacity: number;
      cooldown: number;
      special_drop: {
        chance: number;
        items: Array<{ itemId: string; weight: number }>;
      } | null;
    };
  };
}

export interface GeneratorState {
  currentClicks: number;
  cooldownUntil: number;
  maxClicks: number;
}

export interface ScissorResult {
  success: boolean;
  reason?: string;
  resultItems?: string[];
  targetIdx?: number;
  emptyIdx?: number;
}

export interface MergeResult {
  action: 'move' | 'joker' | 'merge' | 'swap';
  nextId?: string;
  srcIdx?: number;
  tgtIdx?: number;
  isGenerator?: boolean;
}

export interface UnlockResult {
  indices: number[];
}

export class BoardLogic {
  cols: number;
  rows: number;
  cells: (string | null)[];
  locked: Set<number>;
  cellsUnlocked: number;
  generatorStates: { [key: number]: GeneratorState };
  scissorMode: boolean;

  constructor(cols: number, rows: number, lockedCellsInitial: number[] = []) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array(cols * rows).fill(null);
    this.locked = new Set(lockedCellsInitial);
    this.cellsUnlocked = 0;
    this.generatorStates = {};
    this.scissorMode = false;
  }

  getCell(i: number): string | null {
    return this.cells[i] || null;
  }

  setCell(i: number, id: string | null): void {
    this.cells[i] = id;
  }

  clearCell(i: number): void {
    this.cells[i] = null;
  }

  isLocked(i: number): boolean {
    return this.locked.has(i);
  }

  getTotalCells(): number {
    return this.cols * this.rows;
  }

  hasEmptySpace(): boolean {
    return this.findEmptyCell() !== -1;
  }

  findEmptyCell(): number {
    const c = Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 2);
    const idx: number[] = [];
    for (let i = 0; i < this.cells.length; i++) idx.push(i);
    idx.sort((a, b) => Math.abs(a - c) - Math.abs(b - c));
    for (const i of idx) {
      if (!this.locked.has(i) && this.cells[i] === null) return i;
    }
    return -1;
  }

  findItem(id: string): number {
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === id) return i;
    return -1;
  }

  findAllItems(id: string): number[] {
    const r: number[] = [];
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === id) r.push(i);
    return r;
  }

  findAdjacentEmptyCells(index: number): number[] {
    const r = Math.floor(index / this.cols),
      c = index % this.cols,
      adj: number[] = [];
    const tryAdd = (idx: number) => {
      if (!this.locked.has(idx) && this.cells[idx] === null) adj.push(idx);
    };
    if (r > 0) tryAdd(index - this.cols);
    if (r < this.rows - 1) tryAdd(index + this.cols);
    if (c > 0) tryAdd(index - 1);
    if (c < this.cols - 1) tryAdd(index + 1);
    return adj;
  }

  // ---- Item type helpers ----
  isGenerator(id: string, items: { [key: string]: ItemData }): boolean {
    const d = items[id];
    return d && d.type === 'GENERATOR';
  }

  isJoker(id: string, items: { [key: string]: ItemData }): boolean {
    const d = items[id];
    return d && d.type === 'JOKER';
  }

  isScissor(id: string, items: { [key: string]: ItemData }): boolean {
    const d = items[id];
    return d && d.type === 'SCISSOR';
  }

  isSpecialItem(id: string, items: { [key: string]: ItemData }): boolean {
    const d = items[id];
    return d && (d.type === 'JOKER' || d.type === 'SCISSOR');
  }

  canMergeGenerators(a: string, b: string, items: { [key: string]: ItemData }): boolean {
    const s = items[a],
      t = items[b];
    return (
      s &&
      t &&
      s.type === 'GENERATOR' &&
      t.type === 'GENERATOR' &&
      s.chain === t.chain &&
      s.level === t.level &&
      s.level < 8
    );
  }

  // ---- Merge logic ----
  canMerge(si: number, ti: number, items: { [key: string]: ItemData }): boolean {
    if (this.locked.has(ti)) return false;
    const s = this.cells[si],
      t = this.cells[ti];
    if (!s || !t) return false;
    if (this.isJoker(s, items) && !this.isSpecialItem(t, items) && items[t] && items[t].nextId)
      return true;
    if (this.isJoker(t, items) && !this.isSpecialItem(s, items) && items[s] && items[s].nextId)
      return true;
    if (s === t) {
      if (this.isGenerator(s, items)) return this.canMergeGenerators(s, t, items);
      return !!(items[s] && items[s].nextId);
    }
    return false;
  }

  tryMergeOrSwap(
    si: number,
    ti: number,
    items: { [key: string]: ItemData },
    generators: Record<string, GeneratorConfig>
  ): MergeResult | 'move' | 'swap' | null {
    if (this.locked.has(ti)) return null;
    const s = this.cells[si],
      t = this.cells[ti];
    if (!s) return null;

    if (!t) {
      this.cells[ti] = s;
      this.cells[si] = null;
      this.moveGeneratorState(si, ti);
      return 'move';
    }

    // Joker + normal item → upgrade
    if (this.isJoker(s, items) && !this.isSpecialItem(t, items)) {
      const d = items[t];
      if (d && d.nextId) {
        this.cells[si] = null;
        this.cells[ti] = d.nextId;
        this.clearGeneratorState(si);
        this.initGeneratorState(ti, d.nextId, items, generators);
        return { action: 'joker', nextId: d.nextId, srcIdx: si, tgtIdx: ti };
      }
      this.cells[si] = t;
      this.cells[ti] = s;
      this.swapGeneratorStates(si, ti);
      return 'swap';
    }
    if (this.isJoker(t, items) && !this.isSpecialItem(s, items)) {
      const d = items[s];
      if (d && d.nextId) {
        this.cells[si] = d.nextId;
        this.cells[ti] = null;
        this.initGeneratorState(si, d.nextId, items, generators);
        this.clearGeneratorState(ti);
        return { action: 'joker', nextId: d.nextId, srcIdx: si, tgtIdx: ti };
      }
      this.cells[si] = t;
      this.cells[ti] = s;
      this.swapGeneratorStates(si, ti);
      return 'swap';
    }

    // Same item merge
    if (s === t) {
      if (this.isGenerator(s, items) && this.canMergeGenerators(s, t, items)) {
        const n = items[s].nextId;
        if (n) {
          this.cells[si] = null;
          this.cells[ti] = n;
          this.clearGeneratorState(si);
          this.initGeneratorState(ti, n, items, generators);
          return { action: 'merge', nextId: n, srcIdx: si, tgtIdx: ti, isGenerator: true };
        }
      }
      const d = items[s];
      if (d && d.nextId) {
        const n = d.nextId;
        this.cells[si] = null;
        this.cells[ti] = n;
        this.clearGeneratorState(si);
        this.initGeneratorState(ti, n, items, generators);
        return { action: 'merge', nextId: n, srcIdx: si, tgtIdx: ti };
      }
    }

    this.cells[si] = t;
    this.cells[ti] = s;
    this.swapGeneratorStates(si, ti);
    return 'swap';
  }

  // ---- Scissor ----
  useScissorOnItem(index: number, items: { [key: string]: ItemData }): ScissorResult {
    const id = this.cells[index];
    if (!id) return { success: false, reason: 'empty' };
    const d = items[id];
    if (!d) return { success: false, reason: 'no_data' };
    if (d.level < 2) return { success: false, reason: 'too_low' };
    if (d.type === 'GENERATOR' || d.type === 'JOKER' || d.type === 'SCISSOR')
      return { success: false, reason: 'invalid_type' };
    const prev = this.findPrevInChain(id, items);
    if (!prev) return { success: false, reason: 'no_prev' };
    const ei = this.findEmptyCell();
    if (ei === -1) return { success: false, reason: 'no_space' };
    this.cells[index] = prev;
    this.cells[ei] = prev;
    return { success: true, resultItems: [prev, prev], targetIdx: index, emptyIdx: ei };
  }

  findPrevInChain(itemId: string, items: { [key: string]: ItemData }): string | null {
    for (const [id, d] of Object.entries(items)) if (d.nextId === itemId) return id;
    return null;
  }

  // ---- Generator logic ----
  getGeneratorConfig(
    itemId: string,
    items: { [key: string]: ItemData },
    generators: { [key: string]: GeneratorConfig }
  ): { genConfig: GeneratorConfig; levelConfig: any; level: number } | null {
    const d = items[itemId];
    if (!d || d.type !== 'GENERATOR') return null;
    const genId = d.chain; // Assuming chain corresponds to generator ID
    const gc = generators[genId];
    if (!gc) return null;
    let lc = gc.levels[String(d.level)];
    if (!lc) {
      for (let l = d.level; l >= 1; l--) if (gc.levels[String(l)]) {
        lc = gc.levels[String(l)];
        break;
      }
    }
    return { genConfig: gc, levelConfig: lc, level: d.level };
  }

  rollGeneratorDrop(
    itemId: string,
    items: { [key: string]: ItemData },
    generators: { [key: string]: GeneratorConfig }
  ): string | null {
    const cfg = this.getGeneratorConfig(itemId, items, generators);
    if (!cfg) return null;
    const { levelConfig: lc } = cfg;
    const pool = lc.drop_pool;

    // Special drop (Lv.8: 5% chance)
    if (lc.special_drop && Math.random() < lc.special_drop.chance) {
      const sp = lc.special_drop.items;
      const tw = sp.reduce((s: number, i: { itemId: string; weight: number }) => s + i.weight, 0);
      let r = Math.random() * tw;
      for (const i of sp) {
        r -= i.weight;
        if (r <= 0) return i.itemId;
      }
      return sp[0].itemId;
    }

    const tw = pool.reduce((s: number, i: { itemId: string; weight: number }) => s + i.weight, 0);
    let r = Math.random() * tw,
      chosen = pool[0].itemId;
    for (const i of pool) {
      r -= i.weight;
      if (r <= 0) {
        chosen = i.itemId;
        break;
      }
    }
    return chosen;
  }

  isFreeProduction(
    itemId: string,
    items: { [key: string]: ItemData },
    generators: { [key: string]: GeneratorConfig }
  ): boolean {
    const cfg = this.getGeneratorConfig(itemId, items, generators);
    if (!cfg) return false;
    return (
      cfg.levelConfig.free_production_chance > 0 &&
      Math.random() < cfg.levelConfig.free_production_chance
    );
  }

  // ---- Recycle ----
  canSellItem(index: number, items: { [key: string]: ItemData }): boolean {
    if (this.locked.has(index) || !this.cells[index]) return false;
    const d = items[this.cells[index]!];
    if (!d) return false;
    if (d.type === 'GENERATOR' && d.sellable === false) return false;
    if (d.type === 'JOKER' || d.type === 'SCISSOR') return false;
    return true;
  }

  getRecycleEnergy(index: number, items: { [key: string]: ItemData }, recycleEnergyTable: { [key: number]: number }): number {
    const id = this.cells[index];
    if (!id) return 0;
    const d = items[id];
    if (!d) return 0;
    return recycleEnergyTable[d.level] || 0;
  }

  // ---- Unlock ----
  getUnlockCost(cellUnlockCosts: number[]): number {
    return cellUnlockCosts[Math.min(this.cellsUnlocked, cellUnlockCosts.length - 1)];
  }

  unlockCells(indices: number[]): void {
    for (const i of indices) this.locked.delete(i);
    this.cellsUnlocked += indices.length;
    globalBus.emit('board:cellsUnlocked', { indices });
  }

  // ---- Generator state ----
  moveGeneratorState(f: number, t: number): void {
    if (this.generatorStates[f]) {
      this.generatorStates[t] = this.generatorStates[f];
      delete this.generatorStates[f];
    }
  }

  swapGeneratorStates(a: number, b: number): void {
    const tmp = this.generatorStates[a];
    this.generatorStates[a] = this.generatorStates[b];
    this.generatorStates[b] = tmp;
  }

  clearGeneratorState(i: number): void {
    delete this.generatorStates[i];
  }

  initGeneratorState(i: number, itemId: string, items: { [key: string]: ItemData }, generators: Record<string, GeneratorConfig>): void {
    const d = items[itemId];
    if (d && d.type === 'GENERATOR' && !this.generatorStates[i]) {
      const cap = this.getGeneratorCapacity(itemId, items, generators);
      this.generatorStates[i] = { currentClicks: 0, cooldownUntil: 0, maxClicks: cap };
    }
  }

  // ---- Generator capacity & cooldown helpers ----
  // [冷却机制已禁用] 以下冷却相关方法暂时不使用，但保留逻辑以便将来复用
  // 恢复方式：取消 incrementGeneratorClicks 中 startCooldown 的调用，并将 generators.json 中的 cooldown 值改回原值
  getGeneratorCapacity(
    itemId: string,
    items: { [key: string]: ItemData },
    generators: { [key: string]: GeneratorConfig }
  ): number {
    const cfg = this.getGeneratorConfig(itemId, items, generators);
    if (!cfg || !cfg.levelConfig) return 0;
    return cfg.levelConfig.capacity || 0;
  }

  // [冷却机制已禁用] 获取生成器冷却时间（毫秒），当前 generators.json 中 cooldown 均为 0
  getGeneratorCooldown(
    itemId: string,
    items: { [key: string]: ItemData },
    generators: { [key: string]: GeneratorConfig }
  ): number {
    const cfg = this.getGeneratorConfig(itemId, items, generators);
    if (!cfg || !cfg.levelConfig) return 0;
    return cfg.levelConfig.cooldown || 0;
  }

  // [冷却机制已禁用] 检查生成器是否在冷却中，保留逻辑以便复用
  isGeneratorCoolingDown(index: number): boolean {
    const state = this.generatorStates[index];
    if (!state || !state.cooldownUntil) return false;
    return Date.now() < state.cooldownUntil;
  }

  // [冷却机制已禁用] 获取剩余冷却时间（毫秒），保留逻辑以便复用
  getCooldownRemaining(index: number): number {
    const state = this.generatorStates[index];
    if (!state || !state.cooldownUntil) return 0;
    return Math.max(0, state.cooldownUntil - Date.now());
  }

  getRemainingCapacity(index: number): number {
    const state = this.generatorStates[index];
    if (!state) return 0;
    const cap = state.maxClicks || 0;
    if (cap === 0) return Infinity; // No capacity limit (Lv1-5)
    return Math.max(0, cap - state.currentClicks);
  }

  hasCapacityLimit(index: number): boolean {
    const state = this.generatorStates[index];
    if (!state) return false;
    return (state.maxClicks || 0) > 0;
  }

  startCooldown(index: number, items: { [key: string]: ItemData }, generators?: Record<string, GeneratorConfig>): void {
    const itemId = this.cells[index];
    if (!itemId) return;
    let cd = 0;
    if (generators) {
      const itemData = items[itemId];
      if (itemData) {
        for (const gen of Object.values(generators)) {
          if (gen.levels && gen.levels[itemData.level?.toString()]) {
            cd = gen.levels[itemData.level.toString()].cooldown || 0;
            break;
          }
        }
      }
    }
    if (cd <= 0) return;
    const state = this.generatorStates[index];
    if (!state) return;
    state.cooldownUntil = Date.now() + cd;
  }

  incrementGeneratorClicks(index: number, items?: { [key: string]: ItemData }, generators?: Record<string, GeneratorConfig>): boolean {
    const state = this.generatorStates[index];
    if (!state) return false;
    state.currentClicks++;
    const cap = state.maxClicks || 0;
    if (cap > 0 && state.currentClicks >= cap) {
      this.startCooldown(index, items || {}, generators);
      return true;
    }
    return false;
  }

  // [冷却机制已禁用] 重置生成器冷却状态，保留逻辑以便复用
  resetGeneratorAfterCooldown(index: number): void {
    const state = this.generatorStates[index];
    if (!state) return;
    state.currentClicks = 0;
    state.cooldownUntil = 0;
  }

  // [冷却机制已禁用] 离线冷却处理：加载存档时检查所有生成器的冷却状态，保留逻辑以便复用
  processOfflineCooldown(items: { [key: string]: ItemData }, generators: Record<string, GeneratorConfig>): void {
    const now = Date.now();
    for (const idx of Object.keys(this.generatorStates)) {
      const state = this.generatorStates[parseInt(idx)];
      if (state && state.cooldownUntil && state.cooldownUntil <= now) {
        state.cooldownUntil = 0;
        state.currentClicks = 0;
      }
      if (state && !state.maxClicks) {
        const itemId = this.cells[parseInt(idx)];
        if (itemId) {
          state.maxClicks = this.getGeneratorCapacity(itemId, items, generators);
        }
      }
    }
  }

  placeInitialGenerators(items: { [key: string]: ItemData }, generators: Record<string, GeneratorConfig>): void {
    const cr = Math.floor(this.rows / 2),
      cc = Math.floor(this.cols / 2);
    const mi = cr * this.cols + cc - 1;
    if (!this.locked.has(mi) && this.cells[mi] === null) {
      this.cells[mi] = 'gen_makeup_1';
      this.initGeneratorState(mi, 'gen_makeup_1', items, generators);
    } else {
      const f = this.findEmptyCell();
      if (f !== -1) {
        this.cells[f] = 'gen_makeup_1';
        this.initGeneratorState(f, 'gen_makeup_1', items, generators);
      }
    }
    const si = cr * this.cols + cc + 1;
    if (!this.locked.has(si) && this.cells[si] === null) {
      this.cells[si] = 'gen_study_1';
      this.initGeneratorState(si, 'gen_study_1', items, generators);
    } else {
      const f = this.findEmptyCell();
      if (f !== -1) {
        this.cells[f] = 'gen_study_1';
        this.initGeneratorState(f, 'gen_study_1', items, generators);
      }
    }
  }

  serialize(): any {
    return {
      cells: [...this.cells],
      locked: [...this.locked],
      cellsUnlocked: this.cellsUnlocked,
      generatorStates: { ...this.generatorStates }
    };
  }

  deserialize(data: any, items?: { [key: string]: ItemData }, generators?: Record<string, GeneratorConfig>): void {
    if (!data) return;
    this.cells = data.cells || new Array(this.cols * this.rows).fill(null);
    this.locked = new Set(data.locked || []);
    this.cellsUnlocked = data.cellsUnlocked || 0;
    if (data.generatorStates) this.generatorStates = data.generatorStates;
    if (items && generators) {
      this.processOfflineCooldown(items, generators);
    }
  }
}