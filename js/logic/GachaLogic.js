// ============================================================
// GachaLogic.js — Pure Gacha Business Logic + State Machine
// (Pity system removed — pure random rolls)
// ============================================================

class GachaLogic {
    constructor() {
        this.ssrOwned = {};
        this.fsm = new StateMachine({
            name: 'GachaFSM',
            initial: 'IDLE',
            states: {
                IDLE:    { on: { PULL: 'ROLLING' } },
                ROLLING: { on: { DONE: 'RESULT' } },
                RESULT:  { on: { ACK: 'IDLE' } }
            }
        });
    }

    rollOne(maxRarity) {
        const roll = Math.random();
        let rarity = roll < 0.01 ? 'SSR' : roll < 0.26 ? 'SR' : 'R';
        // Enforce max rarity cap (e.g., free pull caps at SR)
        if (maxRarity && rarity === 'SSR' && maxRarity === 'SR') {
            rarity = 'SR';
        }
        let pool = GACHA_POOL_V2.filter(i => i.rarity === rarity);
        if ((rarity === 'R' || rarity === 'SR') && GACHA_SUB_WEIGHTS[rarity]) {
            const sw = GACHA_SUB_WEIGHTS[rarity];
            const subRoll = Math.random();
            let subCat, cum = 0;
            for (const [cat, w] of Object.entries(sw)) {
                cum += w;
                if (subRoll < cum) { subCat = cat; break; }
            }
            const subPool = pool.filter(i => i.subCategory === subCat);
            if (subPool.length > 0) pool = subPool;
        }
        const result = this.weightedPick(pool);
        // Fallback: if subPool was empty, try full rarity pool
        if (!result && pool.length === 0) {
            const fullPool = GACHA_POOL_V2.filter(i => i.rarity === rarity);
            return this.weightedPick(fullPool);
        }
        return result;
    }

    pullSingle(maxRarity) {
        if (!this.fsm.can('PULL')) return null;
        this.fsm.send('PULL');
        const result = this.rollOne(maxRarity);
        if (!result) {
            // Roll failed (empty pool) — reset FSM and return null
            this.fsm.send('DONE');
            return null;
        }
        this.fsm.send('DONE');
        globalBus.emit('gacha:pulled', { results: [result] });
        return result;
    }

    pullTen() {
        if (!this.fsm.can('PULL')) return null;
        this.fsm.send('PULL');
        const results = [];
        let hasSrPlus = false;
        for (let i = 0; i < 10; i++) {
            const r = this.rollOne();
            if (r) {
                results.push(r);
                if (r.rarity === 'SR' || r.rarity === 'SSR') hasSrPlus = true;
            }
        }
        // Ten-pull SR guarantee: if no SR+ in 10 pulls, replace last with random SR
        if (!hasSrPlus && results.length > 0) {
            const srPool = GACHA_POOL_V2.filter(i => i.rarity === 'SR');
            if (srPool.length > 0) results[results.length - 1] = this.weightedPick(srPool);
        }
        this.fsm.send('DONE');
        if (results.length > 0) globalBus.emit('gacha:pulled', { results });
        return results;
    }

    acknowledge() { if (this.fsm.can('ACK')) this.fsm.send('ACK'); }

    weightedPick(pool) {
        if (!pool || pool.length === 0) return null;
        const total = pool.reduce((s, i) => s + i.weight, 0);
        if (total <= 0) return pool[0];
        let r = Math.random() * total;
        for (const item of pool) { r -= item.weight; if (r <= 0) return item; }
        return pool[0];
    }

    canAffordSingle(currency) { return currency.canAffordDiamonds(GACHA_COST.singleCost); }
    canAffordTen(currency) { return currency.canAffordDiamonds(GACHA_COST.tenCost); }

    markSSROwned(ssrId) {
        const isFirst = !this.ssrOwned[ssrId];
        this.ssrOwned[ssrId] = true;
        return isFirst;
    }

    isSSRFirst(ssrId) { return !this.ssrOwned[ssrId]; }

    serialize() {
        return { ssrOwned: { ...this.ssrOwned } };
    }

    deserialize(data) {
        if (!data) return;
        this.ssrOwned = data.ssrOwned || {};
        // Old save data with pity counters is safely ignored
    }
}