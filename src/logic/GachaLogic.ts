// ============================================================
// GachaLogic.ts — Pure Gacha Business Logic + State Machine
// (Pity system removed — pure random rolls)
// ============================================================

import { StateMachine } from '../core/StateMachine';
import { globalBus } from '../core/EventBus';

export interface GachaItem {
  id: string;
  rarity: 'R' | 'SR' | 'SSR';
  subCategory?: string;
  weight: number;
  icon: string;
  name: string;
  effect: string;
  value: any;
}

export interface GachaRarityConfig {
  probability: number;
  color: string;
  glow: string;
}

export interface GachaCostConfig {
  singleCost: number;
  tenCost: number;
}

export interface GachaSubWeights {
  [rarity: string]: {
    [subCategory: string]: number;
  };
}

export interface GachaConfig {
  rarityConfig: {
    [key: string]: GachaRarityConfig;
  };
  gachaCost: GachaCostConfig;
  subWeights: GachaSubWeights;
  gachaPoolV2: GachaItem[];
}

export interface GachaPulledEvent {
  results: GachaItem[];
}

export class GachaLogic {
  ssrOwned: { [key: string]: boolean };
  fsm: StateMachine;

  constructor() {
    this.ssrOwned = {};
    this.fsm = new StateMachine({
      name: 'GachaFSM',
      initial: 'IDLE',
      states: {
        IDLE: { on: { PULL: 'ROLLING' } },
        ROLLING: { on: { DONE: 'RESULT' } },
        RESULT: { on: { ACK: 'IDLE' } }
      }
    });
  }

  rollOne(gachaConfig: GachaConfig, maxRarity?: 'R' | 'SR' | 'SSR'): GachaItem | null {
    const roll = Math.random();
    const rarityConfig = (gachaConfig as any)?.rarityConfig;
    const ssrThreshold = rarityConfig?.SSR?.probability ?? 0;
    const srThreshold = ssrThreshold + (rarityConfig?.SR?.probability ?? 0);
    let rarity: 'R' | 'SR' | 'SSR' = roll < ssrThreshold ? 'SSR' : roll < srThreshold ? 'SR' : 'R';
    // Enforce max rarity cap (e.g., free pull caps at SR)
    if (maxRarity && rarity === 'SSR' && maxRarity === 'SR') {
      rarity = 'SR';
    }
    let pool = gachaConfig.gachaPoolV2.filter(i => i.rarity === rarity);
    if ((rarity === 'R' || rarity === 'SR') && gachaConfig.subWeights[rarity]) {
      const sw = gachaConfig.subWeights[rarity];
      const subRoll = Math.random();
      let subCat: string | null = null, cum = 0;
      for (const [cat, w] of Object.entries(sw)) {
        cum += w;
        if (subRoll < cum) { subCat = cat; break; }
      }
      if (subCat) {
        const subPool = pool.filter(i => i.subCategory === subCat);
        if (subPool.length > 0) pool = subPool;
      }
    }
    const result = this.weightedPick(pool);
    // Fallback: if subPool was empty, try full rarity pool
    if (!result && pool.length === 0) {
      const fullPool = gachaConfig.gachaPoolV2.filter(i => i.rarity === rarity);
      return this.weightedPick(fullPool);
    }
    return result;
  }

  pullSingle(gachaConfig: GachaConfig, maxRarity?: 'R' | 'SR' | 'SSR'): GachaItem | null {
    if (!this.fsm.can('PULL')) return null;
    this.fsm.send('PULL');
    const result = this.rollOne(gachaConfig, maxRarity);
    if (!result) {
      this.fsm.reset('IDLE');
      return null;
    }
    this.fsm.send('DONE');
    globalBus.emit('gacha:pulled', { results: [result] } as GachaPulledEvent);
    return result;
  }

  pullTen(gachaConfig: GachaConfig): GachaItem[] | null {
    if (!this.fsm.can('PULL')) return null;
    this.fsm.send('PULL');
    const results: GachaItem[] = [];
    let hasSrPlus = false;
    for (let i = 0; i < 10; i++) {
      const r = this.rollOne(gachaConfig);
      if (r) {
        results.push(r);
        if (r.rarity === 'SR' || r.rarity === 'SSR') hasSrPlus = true;
      }
    }
    // Ten-pull SR guarantee: if no SR+ in 10 pulls, replace last with random SR
    if (!hasSrPlus && results.length > 0) {
      const srPool = gachaConfig.gachaPoolV2.filter(i => i.rarity === 'SR');
      if (srPool.length > 0) results[results.length - 1] = this.weightedPick(srPool)!;
    }
    this.fsm.send('DONE');
    if (results.length > 0) globalBus.emit('gacha:pulled', { results } as GachaPulledEvent);
    return results;
  }

  acknowledge(): void {
    if (this.fsm.can('ACK')) this.fsm.send('ACK');
  }

  weightedPick(pool: GachaItem[]): GachaItem | null {
    if (!pool || pool.length === 0) return null;
    const total = pool.reduce((s, i) => s + i.weight, 0);
    if (total <= 0) return pool[0];
    let r = Math.random() * total;
    for (const item of pool) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return pool[0];
  }

  canAffordSingle(currency: any, gachaConfig: GachaConfig): boolean {
    return currency.canAffordDiamonds(gachaConfig.gachaCost.singleCost);
  }

  canAffordTen(currency: any, gachaConfig: GachaConfig): boolean {
    return currency.canAffordDiamonds(gachaConfig.gachaCost.tenCost);
  }

  markSSROwned(ssrId: string): boolean {
    const isFirst = !this.ssrOwned[ssrId];
    this.ssrOwned[ssrId] = true;
    return isFirst;
  }

  isSSRFirst(ssrId: string): boolean {
    return !this.ssrOwned[ssrId];
  }

  serialize(): any {
    return { ssrOwned: { ...this.ssrOwned } };
  }

  deserialize(data: any): void {
    if (!data) return;
    this.ssrOwned = data.ssrOwned || {};
    // Old save data with pity counters is safely ignored
  }
}