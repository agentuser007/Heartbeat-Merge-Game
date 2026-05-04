// ============================================================
// BoardLogic.js — Pure Board Business Logic
// ============================================================

class BoardLogic {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.cells = new Array(cols * rows).fill(null);
        this.locked = new Set(LOCKED_CELLS_INITIAL);
        this.cellsUnlocked = 0;
        this.generatorStates = {};
        this.scissorMode = false;
    }

    getCell(i) { return this.cells[i] || null; }
    setCell(i, id) { this.cells[i] = id; }
    clearCell(i) { this.cells[i] = null; }
    isLocked(i) { return this.locked.has(i); }
    getTotalCells() { return this.cols * this.rows; }
    hasEmptySpace() { return this.findEmptyCell() !== -1; }

    findEmptyCell() {
        const c = Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 2);
        const idx = []; for (let i = 0; i < this.cells.length; i++) idx.push(i);
        idx.sort((a, b) => Math.abs(a - c) - Math.abs(b - c));
        for (const i of idx) { if (!this.locked.has(i) && this.cells[i] === null) return i; }
        return -1;
    }

    findItem(id) { for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === id) return i; return -1; }

    findAllItems(id) {
        const r = []; for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === id) r.push(i); return r;
    }

    findAdjacentEmptyCells(index) {
        const r = Math.floor(index / this.cols), c = index % this.cols, adj = [];
        const tryAdd = (idx) => { if (!this.locked.has(idx) && this.cells[idx] === null) adj.push(idx); };
        if (r > 0) tryAdd(index - this.cols);
        if (r < this.rows - 1) tryAdd(index + this.cols);
        if (c > 0) tryAdd(index - 1);
        if (c < this.cols - 1) tryAdd(index + 1);
        return adj;
    }

    // ---- Item type helpers ----
    isGenerator(id) { const d = ITEMS[id]; return d && d.type === 'GENERATOR'; }
    isJoker(id) { const d = ITEMS[id]; return d && d.type === 'JOKER'; }
    isScissor(id) { const d = ITEMS[id]; return d && d.type === 'SCISSOR'; }
    isSpecialItem(id) { const d = ITEMS[id]; return d && (d.type === 'JOKER' || d.type === 'SCISSOR'); }

    canMergeGenerators(a, b) {
        const s = ITEMS[a], t = ITEMS[b];
        return s && t && s.type === 'GENERATOR' && t.type === 'GENERATOR' && s.chain === t.chain && s.level === t.level && s.level < 8;
    }

    // ---- Merge logic ----
    canMerge(si, ti) {
        if (this.locked.has(ti)) return false;
        const s = this.cells[si], t = this.cells[ti];
        if (!s || !t) return false;
        if (this.isJoker(s) && !this.isSpecialItem(t) && ITEMS[t] && ITEMS[t].nextId) return true;
        if (this.isJoker(t) && !this.isSpecialItem(s) && ITEMS[s] && ITEMS[s].nextId) return true;
        if (s === t) {
            if (this.isGenerator(s)) return this.canMergeGenerators(s, t);
            return !!(ITEMS[s] && ITEMS[s].nextId);
        }
        return false;
    }

    tryMergeOrSwap(si, ti) {
        if (this.locked.has(ti)) return null;
        const s = this.cells[si], t = this.cells[ti];
        if (!s) return null;

        if (!t) { this.cells[ti] = s; this.cells[si] = null; this.moveGeneratorState(si, ti); return 'move'; }

        // Joker + normal item → upgrade
        if (this.isJoker(s) && !this.isSpecialItem(t)) {
            const d = ITEMS[t];
            if (d && d.nextId) {
                this.cells[si] = null; this.cells[ti] = d.nextId;
                this.clearGeneratorState(si); this.initGeneratorState(ti, d.nextId);
                return { action: 'joker', nextId: d.nextId, srcIdx: si, tgtIdx: ti };
            }
            this.cells[si] = t; this.cells[ti] = s; this.swapGeneratorStates(si, ti); return 'swap';
        }
        if (this.isJoker(t) && !this.isSpecialItem(s)) {
            const d = ITEMS[s];
            if (d && d.nextId) {
                this.cells[si] = d.nextId; this.cells[ti] = null;
                this.initGeneratorState(si, d.nextId); this.clearGeneratorState(ti);
                return { action: 'joker', nextId: d.nextId, srcIdx: si, tgtIdx: ti };
            }
            this.cells[si] = t; this.cells[ti] = s; this.swapGeneratorStates(si, ti); return 'swap';
        }

        // Same item merge
        if (s === t) {
            if (this.isGenerator(s) && this.canMergeGenerators(s, t)) {
                const n = ITEMS[s].nextId;
                this.cells[si] = null; this.cells[ti] = n;
                this.clearGeneratorState(si); this.initGeneratorState(ti, n);
                return { action: 'merge', nextId: n, srcIdx: si, tgtIdx: ti, isGenerator: true };
            }
            const d = ITEMS[s];
            if (d && d.nextId) {
                const n = d.nextId;
                this.cells[si] = null; this.cells[ti] = n;
                this.clearGeneratorState(si); this.initGeneratorState(ti, n);
                return { action: 'merge', nextId: n, srcIdx: si, tgtIdx: ti };
            }
        }

        this.cells[si] = t; this.cells[ti] = s; this.swapGeneratorStates(si, ti); return 'swap';
    }

    // ---- Scissor ----
    useScissorOnItem(index) {
        const id = this.cells[index];
        if (!id) return { success: false, reason: 'empty' };
        const d = ITEMS[id];
        if (!d) return { success: false, reason: 'no_data' };
        if (d.level < 2) return { success: false, reason: 'too_low' };
        if (d.type === 'GENERATOR' || d.type === 'JOKER' || d.type === 'SCISSOR') return { success: false, reason: 'invalid_type' };
        const prev = this.findPrevInChain(id);
        if (!prev) return { success: false, reason: 'no_prev' };
        const ei = this.findEmptyCell();
        if (ei === -1) return { success: false, reason: 'no_space' };
        this.cells[index] = prev; this.cells[ei] = prev;
        return { success: true, resultItems: [prev, prev], targetIdx: index, emptyIdx: ei };
    }

    findPrevInChain(itemId) {
        for (const [id, d] of Object.entries(ITEMS)) if (d.nextId === itemId) return id;
        return null;
    }

    // ---- Generator logic ----
    getGeneratorConfig(itemId) {
        const d = ITEMS[itemId]; if (!d || d.type !== 'GENERATOR') return null;
        const gc = GENERATORS[d.chain]; if (!gc) return null;
        let lc = gc.levels[String(d.level)];
        if (!lc) { for (let l = d.level; l >= 1; l--) if (gc.levels[String(l)]) { lc = gc.levels[String(l)]; break; } }
        return { genConfig: gc, levelConfig: lc, level: d.level };
    }

    rollGeneratorDrop(itemId) {
        const cfg = this.getGeneratorConfig(itemId); if (!cfg) return null;
        const { levelConfig: lc } = cfg; const pool = lc.drop_pool;

        // Special drop (Lv.8: 5% chance)
        if (lc.special_drop && Math.random() < lc.special_drop.chance) {
            const sp = lc.special_drop.items;
            const tw = sp.reduce((s, i) => s + i.weight, 0);
            let r = Math.random() * tw;
            for (const i of sp) { r -= i.weight; if (r <= 0) return i.itemId; }
            return sp[0].itemId;
        }

        const tw = pool.reduce((s, i) => s + i.weight, 0);
        let r = Math.random() * tw, chosen = pool[0].itemId;
        for (const i of pool) { r -= i.weight; if (r <= 0) { chosen = i.itemId; break; } }
        return chosen;
    }

    isFreeProduction(itemId) {
        const cfg = this.getGeneratorConfig(itemId); if (!cfg) return false;
        return cfg.levelConfig.free_production_chance > 0 && Math.random() < cfg.levelConfig.free_production_chance;
    }

    // ---- Recycle ----
    canSellItem(index) {
        if (this.locked.has(index) || !this.cells[index]) return false;
        const d = ITEMS[this.cells[index]];
        if (!d) return false;
        if (d.type === 'GENERATOR' && d.sellable === false) return false;
        if (d.type === 'JOKER' || d.type === 'SCISSOR') return false;
        return true;
    }

    getRecycleEnergy(index) {
        const d = ITEMS[this.cells[index]]; if (!d) return 0;
        return RECYCLE_ENERGY_TABLE[d.level] || 0;
    }

    // ---- Unlock ----
    getUnlockCost() { return CELL_UNLOCK_COSTS[Math.min(this.cellsUnlocked, CELL_UNLOCK_COSTS.length - 1)]; }

    unlockCells(indices) {
        for (const i of indices) this.locked.delete(i);
        this.cellsUnlocked += indices.length;
        globalBus.emit('board:cellsUnlocked', { indices });
    }

    // ---- Generator state ----
    moveGeneratorState(f, t) { if (this.generatorStates[f]) { this.generatorStates[t] = this.generatorStates[f]; delete this.generatorStates[f]; } }
    swapGeneratorStates(a, b) { const tmp = this.generatorStates[a]; this.generatorStates[a] = this.generatorStates[b]; this.generatorStates[b] = tmp; }
    clearGeneratorState(i) { delete this.generatorStates[i]; }
    initGeneratorState(i, itemId) {
        const d = ITEMS[itemId];
        if (d && d.type === 'GENERATOR' && !this.generatorStates[i]) {
            const cap = this.getGeneratorCapacity(itemId);
            this.generatorStates[i] = { currentClicks: 0, cooldownUntil: 0, maxClicks: cap };
        }
    }

    // ---- Generator capacity & cooldown helpers ----
    // [冷却机制已禁用] 以下冷却相关方法暂时不使用，但保留逻辑以便将来复用
    // 恢复方式：取消 incrementGeneratorClicks 中 startCooldown 的调用，并将 generators.json 中的 cooldown 值改回原值
    getGeneratorCapacity(itemId) {
        const cfg = this.getGeneratorConfig(itemId);
        if (!cfg || !cfg.levelConfig) return 0;
        return cfg.levelConfig.capacity || 0;
    }

    // [冷却机制已禁用] 获取生成器冷却时间（毫秒），当前 generators.json 中 cooldown 均为 0
    getGeneratorCooldown(itemId) {
        const cfg = this.getGeneratorConfig(itemId);
        if (!cfg || !cfg.levelConfig) return 0;
        return cfg.levelConfig.cooldown || 0;
    }

    // [冷却机制已禁用] 检查生成器是否在冷却中，保留逻辑以便复用
    isGeneratorCoolingDown(index) {
        const state = this.generatorStates[index];
        if (!state || !state.cooldownUntil) return false;
        return Date.now() < state.cooldownUntil;
    }

    // [冷却机制已禁用] 获取剩余冷却时间（毫秒），保留逻辑以便复用
    getCooldownRemaining(index) {
        const state = this.generatorStates[index];
        if (!state || !state.cooldownUntil) return 0;
        return Math.max(0, state.cooldownUntil - Date.now());
    }

    getRemainingCapacity(index) {
        const state = this.generatorStates[index];
        if (!state) return 0;
        const cap = state.maxClicks || 0;
        if (cap === 0) return Infinity; // No capacity limit (Lv1-5)
        return Math.max(0, cap - state.currentClicks);
    }

    hasCapacityLimit(index) {
        const state = this.generatorStates[index];
        if (!state) return false;
        return (state.maxClicks || 0) > 0;
    }

    // [冷却机制已禁用] 启动生成器冷却，保留逻辑以便复用
    startCooldown(index) {
        const itemId = this.cells[index];
        if (!itemId) return;
        const cd = this.getGeneratorCooldown(itemId);
        if (cd <= 0) return;
        const state = this.generatorStates[index];
        if (!state) return;
        state.cooldownUntil = Date.now() + cd;
    }

    incrementGeneratorClicks(index) {
        const state = this.generatorStates[index];
        if (!state) return false;
        state.currentClicks++;
        const cap = state.maxClicks || 0;
        if (cap > 0 && state.currentClicks >= cap) {
            // [冷却机制已禁用] 以下 startCooldown 调用已注释，容量耗尽后不再触发冷却
            // 恢复冷却时取消下行注释即可：
            // this.startCooldown(index);
            return true; // Capacity exhausted (cooldown disabled)
        }
        return false;
    }

    // [冷却机制已禁用] 重置生成器冷却状态，保留逻辑以便复用
    resetGeneratorAfterCooldown(index) {
        const state = this.generatorStates[index];
        if (!state) return;
        state.currentClicks = 0;
        state.cooldownUntil = 0;
    }

    // [冷却机制已禁用] 离线冷却处理：加载存档时检查所有生成器的冷却状态，保留逻辑以便复用
    processOfflineCooldown() {
        const now = Date.now();
        for (const idx of Object.keys(this.generatorStates)) {
            const state = this.generatorStates[idx];
            if (state && state.cooldownUntil && state.cooldownUntil <= now) {
                state.cooldownUntil = 0;
                state.currentClicks = 0;
            }
            // Backward compat: if maxClicks missing, re-derive from current cell
            if (state && !state.maxClicks) {
                const itemId = this.cells[parseInt(idx)];
                if (itemId) {
                    state.maxClicks = this.getGeneratorCapacity(itemId);
                }
            }
        }
    }

    placeInitialGenerators() {
        const cr = Math.floor(this.rows / 2), cc = Math.floor(this.cols / 2);
        const mi = cr * this.cols + cc - 1;
        if (!this.locked.has(mi) && this.cells[mi] === null) { this.cells[mi] = 'gen_makeup_1'; this.initGeneratorState(mi, 'gen_makeup_1'); }
        else { const f = this.findEmptyCell(); if (f !== -1) { this.cells[f] = 'gen_makeup_1'; this.initGeneratorState(f, 'gen_makeup_1'); } }
        const si = cr * this.cols + cc + 1;
        if (!this.locked.has(si) && this.cells[si] === null) { this.cells[si] = 'gen_study_1'; this.initGeneratorState(si, 'gen_study_1'); }
        else { const f = this.findEmptyCell(); if (f !== -1) { this.cells[f] = 'gen_study_1'; this.initGeneratorState(f, 'gen_study_1'); } }
    }

    serialize() {
        return { cells: [...this.cells], locked: [...this.locked], cellsUnlocked: this.cellsUnlocked, generatorStates: { ...this.generatorStates } };
    }

    deserialize(data) {
        if (!data) return;
        this.cells = data.cells || new Array(this.cols * this.rows).fill(null);
        this.locked = new Set(data.locked || []);
        this.cellsUnlocked = data.cellsUnlocked || 0;
        if (data.generatorStates) this.generatorStates = data.generatorStates;
        // [冷却机制已禁用] 处理离线期间已过期的冷却，保留调用以便复用
        this.processOfflineCooldown();
    }
}