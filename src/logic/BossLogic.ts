// ============================================================
// BossLogic.ts — Pure Boss Business Logic + State Machine
// ============================================================
// NO DOM references. Returns events arrays (no globalBus).
// State Machine: IDLE → BATTLE → SUBMITTING → DEFEATED → COMPLETE
// ============================================================

import { StateMachine } from '../core/StateMachine';
import type { LogicEvent } from './BoardLogic';
import type { OrderRequirement } from '@/types/game';

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
  type?: string;
}

export interface OrderData {
  required: OrderRequirement[];
  damage: number;
  isTimed?: boolean;
  timeLimit?: number;
  diamondReward?: number;
  affectionReward?: number;
}

export interface LevelData {
  bossName: string;
  bossTitle: string;
  bossAvatar: string;
  bossColor: string;
  bgGradient: string;
  totalHp: number;
  orders: OrderData[];
}

export interface TierBoostEntry {
  maxLoop: number | null;
  boost: number;
}

export interface BossProgressionDeps {
  orderTierBoost: TierBoostEntry[];
  maxItemTier: number;
}

export interface BossLevelLoadedEvent {
  levelIdx: number;
  bossName: string;
  bossTitle: string;
  bossAvatar: string;
  bossColor: string;
  bgGradient: string;
  currentHp: number;
  totalHp: number;
}

export interface BossOrderLoadedEvent {
  orderIdx: number;
  order: OrderData;
  isTimed: boolean;
  timeLimit: number;
}

export interface BossHpChangedEvent {
  currentHp: number;
  totalHp: number;
  pct: number;
}

export interface BossOrderFailedEvent {
  orderIdx: number;
  nextOrderIdx: number;
}

export interface BossDefeatedEvent {
  levelIdx: number;
}

export interface ApplyDamageResult {
  hpLeft: number;
  isDefeated: boolean;
}

export interface BoardLike {
  findAllItems: (itemId: string) => number[];
}

export interface BossSnapshot {
  levelIdx: number;
  orderIdx: number;
  hp: number;
  totalHp: number;
  state: string;
  timerRemaining: number;
}

export class BossLogic {
  currentLevelIdx: number;
  currentOrderIdx: number;
  currentHp: number;
  totalHp: number;
  orderFailed: boolean;
  timerRemaining: number;
  fsm: StateMachine;

  constructor() {
    this.currentLevelIdx = -1;
    this.currentOrderIdx = 0;
    this.currentHp = 0;
    this.totalHp = 0;
    this.orderFailed = false;
    this.timerRemaining = 0;

    // State Machine
    this.fsm = new StateMachine({
      name: 'BossFSM',
      initial: 'IDLE',
      states: {
        IDLE: { on: { LOAD_LEVEL: 'BATTLE' } },
        BATTLE: { on: { SUBMIT: 'SUBMITTING', DEFEAT: 'DEFEATED', FAIL_ORDER: 'BATTLE' } },
        SUBMITTING: { on: { ORDER_DONE: 'BATTLE', DEFEAT: 'DEFEATED' } },
        DEFEATED: { on: { NEXT_LEVEL: 'BATTLE', GAME_OVER: 'COMPLETE' } },
        COMPLETE: { on: { RESET: 'IDLE' } }
      }
    });
  }

  /**
   * Get the tier boost for boss order items based on loop index.
   * Loop 1: +0; Loop 2-3: +1; Loop 4-5: +2; Loop 6-7: +3; Loop 8+: +4 (capped)
   */
  getOrderTierBoost(loopIndex: number, deps: BossProgressionDeps): number {
    for (const entry of deps.orderTierBoost) {
      if (entry.maxLoop === null || loopIndex <= entry.maxLoop) {
        return entry.boost;
      }
    }
    return 0;
  }

  /**
   * Scale an order's required items based on the current loop index.
   * Increases item tier (itemId suffix) by the boost amount, capped at MAX_TIER (8).
   * Only scales if the target item ID exists in the ITEMS registry.
   */
  getScaledOrder(order: OrderData, items: { [key: string]: ItemData }, deps: BossProgressionDeps, loopIndex: number, hpMultiplier: number): OrderData {
    const boost = this.getOrderTierBoost(loopIndex, deps);
    if (boost === 0) return order;

    const MAX_TIER = deps.maxItemTier;
    const scaledRequired = order.required.map(req => {
      // Parse itemId like "study_3" → prefix "study", tier 3
      const match = req.itemId.match(/^(.+)_(\d+)$/);
      if (!match) return req; // Can't parse, return as-is

      const prefix = match[1];
      const baseTier = parseInt(match[2], 10);
      const newTier = Math.min(MAX_TIER, baseTier + boost);
      const newItemId = `${prefix}_${newTier}`;

      // Validate the new itemId exists in ITEMS
      if (items[newItemId]) {
        return { ...req, itemId: newItemId };
      }
      return req; // Item doesn't exist, keep original
    });

    const hpMult = hpMultiplier;
    return { ...order, required: scaledRequired, damage: Math.ceil(order.damage * hpMult) };
  }

  /**
   * Load a boss level. Returns level data or null if game complete.
   */
  loadLevel(levelIdx: number, levels: LevelData[], deps: BossProgressionDeps, hpMultiplier: number): { level: LevelData | null; events: LogicEvent[] } {
    if (levelIdx >= levels.length) {
      this.fsm.send('GAME_OVER');
      return { level: null, events: [{ type: 'boss:gameComplete' }] };
    }
    this.currentLevelIdx = levelIdx;
    this.currentOrderIdx = 0;
    this.orderFailed = false;
    const level = levels[levelIdx];

    this.currentHp = Math.floor(level.totalHp * hpMultiplier);
    this.totalHp = Math.floor(level.totalHp * hpMultiplier);

    // Force FSM to IDLE so the transition below always works,
    // preventing stale states (BATTLE/SUBMITTING/COMPLETE) on re-entry (e.g. save restore).
    if (!this.fsm.is('IDLE') && !this.fsm.is('DEFEATED')) {
      this.fsm.reset('IDLE');
    }

    if (this.fsm.is('IDLE')) {
      this.fsm.send('LOAD_LEVEL');
    } else if (this.fsm.is('DEFEATED')) {
      this.fsm.send('NEXT_LEVEL');
    }

    const events: LogicEvent[] = [{
      type: 'boss:levelLoaded',
      payload: {
        levelIdx,
        bossName: level.bossName,
        bossTitle: level.bossTitle,
        bossAvatar: level.bossAvatar,
        bossColor: level.bossColor,
        bgGradient: level.bgGradient,
        currentHp: this.currentHp,
        totalHp: this.totalHp
      }
    }];

    const orderResult = this.loadOrder(0, levels, deps);
    events.push(...orderResult.events);

    return { level, events };
  }

  /**
   * Load an order within the current level.
   */
  loadOrder(orderIdx: number, levels: LevelData[], deps: BossProgressionDeps, items?: { [key: string]: ItemData }, loopIndex?: number, hpMultiplier?: number): { order: OrderData | null; events: LogicEvent[] } {
    const level = levels[this.currentLevelIdx];
    if (orderIdx >= level.orders.length) {
      const defeatEvents = this.defeatBoss();
      return { order: null, events: defeatEvents };
    }
    this.currentOrderIdx = orderIdx;
    this.orderFailed = false;
    const rawOrder = level.orders[orderIdx];
    const order = (items && loopIndex !== undefined && hpMultiplier !== undefined) ? this.getScaledOrder(rawOrder, items, deps, loopIndex, hpMultiplier) : rawOrder;
    this.timerRemaining = order.isTimed ? order.timeLimit || 0 : 0;

    return {
      order,
      events: [{
        type: 'boss:orderLoaded',
        payload: {
          orderIdx,
          order,
          isTimed: order.isTimed || false,
          timeLimit: order.timeLimit || 0
        }
      }]
    };
  }

  /**
   * Apply damage from a submitted order.
   * Returns { hpLeft, isDefeated }.
   */
  applyDamage(damage: number): ApplyDamageResult & { events: LogicEvent[] } {
    this.currentHp -= damage;
    const isDefeated = this.currentHp <= 0;

    return {
      hpLeft: Math.max(0, this.currentHp),
      isDefeated,
      events: [{
        type: 'boss:hpChanged',
        payload: {
          currentHp: Math.max(0, this.currentHp),
          totalHp: this.totalHp,
          pct: Math.max(0, ((this.totalHp - this.currentHp) / this.totalHp) * 100)
        }
      }]
    };
  }

  /**
   * Mark order submission start.
   */
  beginSubmit(): boolean {
    if (this.fsm.can('SUBMIT')) {
      this.fsm.send('SUBMIT');
      return true;
    }
    return false;
  }

  /**
   * Transactional commit: apply damage + advance order index + transition FSM.
   * Does NOT emit UI events (boss:orderComplete / boss:defeated) — those are
   * deferred until after the dialogue so that a page refresh mid-dialogue won't
   * lose progress.  Callers must emit those events themselves after saving.
   */
  commitSubmit(damage: number, levels: LevelData[]): ApplyDamageResult & { events: LogicEvent[] } {
    const result = this.applyDamage(damage);
    if (result.isDefeated) {
      if (this.fsm.can('DEFEAT')) this.fsm.send('DEFEAT');
    } else {
      const level = levels[this.currentLevelIdx];
      const isLastOrder = this.currentOrderIdx >= level.orders.length - 1;
      if (isLastOrder) {
        this.currentHp = 0;
        if (this.fsm.can('DEFEAT')) this.fsm.send('DEFEAT');
        return { hpLeft: 0, isDefeated: true, events: result.events };
      }
      if (this.fsm.can('ORDER_DONE')) this.fsm.send('ORDER_DONE');
      this.currentOrderIdx++;
    }
    return result;
  }

  /**
   * Mark order submission complete. Returns true if boss defeated.
   * (Kept for backward compatibility; new code should use commitSubmit.)
   */
  finishSubmit(damage: number, levels: LevelData[]): ApplyDamageResult & { events: LogicEvent[] } {
    const result = this.applyDamage(damage);
    const events = [...result.events];
    if (result.isDefeated) {
      events.push(...this.defeatBoss());
    } else {
      const level = levels[this.currentLevelIdx];
      const isLastOrder = this.currentOrderIdx >= level.orders.length - 1;
      if (isLastOrder) {
        this.currentHp = 0;
        events.push(...this.defeatBoss());
        return { hpLeft: 0, isDefeated: true, events };
      }
      if (this.fsm.can('ORDER_DONE')) this.fsm.send('ORDER_DONE');
      this.currentOrderIdx++;
      events.push({ type: 'boss:orderComplete', payload: { nextOrderIdx: this.currentOrderIdx + 1 } });
    }
    return { ...result, events };
  }

  /**
   * Handle order failure (timeout).
   */
  failOrder(): LogicEvent[] {
    this.orderFailed = true;
    if (this.fsm.can('FAIL_ORDER')) this.fsm.send('FAIL_ORDER');
    return [{ type: 'boss:orderFailed', payload: { orderIdx: this.currentOrderIdx, nextOrderIdx: this.currentOrderIdx + 1 } }];
  }

  /**
   * Boss defeated.
   */
  defeatBoss(): LogicEvent[] {
    if (this.fsm.can('DEFEAT')) this.fsm.send('DEFEAT');
    return [{ type: 'boss:defeated', payload: { levelIdx: this.currentLevelIdx } }];
  }

  /**
   * Tick the timer. Returns remaining seconds or -1 if time's up.
   */
  tickTimer(): { remaining: number; events: LogicEvent[] } {
    if (this.timerRemaining <= 0) return { remaining: -1, events: [] };
    this.timerRemaining--;
    const events: LogicEvent[] = [{ type: 'boss:timerTick', payload: { remaining: this.timerRemaining } }];
    if (this.timerRemaining <= 0) {
      return { remaining: -1, events };
    }
    return { remaining: this.timerRemaining, events };
  }

  /**
   * Check if current order can be fulfilled.
   */
  canFulfillOrder(board: BoardLike, levels: LevelData[], items: { [key: string]: ItemData }, deps: BossProgressionDeps): boolean {
    const order = this.getCurrentOrder(levels, deps, items);
    if (!order) return false;

    for (const req of order.required) {
      const found = board.findAllItems(req.itemId);
      if (found.length < req.count) return false;
    }
    return true;
  }

  /**
   * Get current order.
   */
  getCurrentOrder(levels: LevelData[], deps: BossProgressionDeps, items?: { [key: string]: ItemData }, loopIndex?: number, hpMultiplier?: number): OrderData | null {
    if (this.currentLevelIdx < 0) return null;
    const level = levels[this.currentLevelIdx];
    if (!level || this.currentOrderIdx >= level.orders.length) return null;
    const rawOrder = level.orders[this.currentOrderIdx];
    if (!items || loopIndex === undefined || hpMultiplier === undefined) return rawOrder;
    return this.getScaledOrder(rawOrder, items, deps, loopIndex, hpMultiplier);
  }

  /**
   * Get current level.
   */
  getCurrentLevel(levels: LevelData[]): LevelData | null {
    if (this.currentLevelIdx < 0 || this.currentLevelIdx >= levels.length) return null;
    return levels[this.currentLevelIdx];
  }

  /**
   * Serialize for save.
   */
  serialize(): BossSnapshot {
    return {
      levelIdx: this.currentLevelIdx,
      orderIdx: this.currentOrderIdx,
      hp: this.currentHp,
      totalHp: this.totalHp,
      state: this.fsm.current,
      timerRemaining: this.timerRemaining
    };
  }

  /**
   * Restore from save.
   */
  deserialize(data: BossSnapshot | null): void {
    if (!data) return;
    this.currentLevelIdx = data.levelIdx ?? 0;
    this.currentOrderIdx = data.orderIdx ?? 0;
    this.currentHp = data.hp ?? 0;
    // totalHp: only override if present in save (old saves lack this field;
    // loadLevel() already sets it correctly before deserialize is called)
    if (data.totalHp !== undefined) this.totalHp = data.totalHp;
    this.timerRemaining = data.timerRemaining ?? 0;
    // Restore FSM state
    // Only override if present in save. Old saves lack this field;
    // loadLevel() already transitioned FSM to BATTLE which is correct.
    // SUBMITTING is a transient state (mid-animation); cannot resume the animation,
    // so fall back to BATTLE so the player can re-submit the order.
    if (data.state) {
      this.fsm.reset(data.state === 'SUBMITTING' ? 'BATTLE' : data.state);
    }
  }
}