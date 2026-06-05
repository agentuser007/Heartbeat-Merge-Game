// ============================================================
// BossLogic.ts — Pure Boss Business Logic + State Machine
// ============================================================
// NO DOM references. Emits events via EventBus.
// State Machine: IDLE → BATTLE → SUBMITTING → DEFEATED → COMPLETE
// ============================================================

import { StateMachine } from '../core/StateMachine';
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
  type?: string;
}

export interface OrderRequired {
  itemId: string;
  count: number;
}

export interface OrderData {
  required: OrderRequired[];
  damage: number;
  isTimed?: boolean;
  timeLimit?: number;
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

export interface LoopConfig {
  loopIndex: number;
  hpMultiplier: number;
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

export class BossLogic {
  currentLevelIdx: number;
  currentOrderIdx: number;
  currentHp: number;
  totalHp: number;
  orderFailed: boolean;
  timerRemaining: number;
  loopConfig: LoopConfig | null;
  fsm: StateMachine;

  constructor() {
    this.currentLevelIdx = -1;
    this.currentOrderIdx = 0;
    this.currentHp = 0;
    this.totalHp = 0;
    this.orderFailed = false;
    this.timerRemaining = 0;
    this.loopConfig = null;

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
   * Set loop config for HP/reward scaling.
   */
  setLoopConfig(loopConfig: LoopConfig): void {
    this.loopConfig = loopConfig;
  }

  /**
   * Get the tier boost for boss order items based on loop index.
   * Loop 1: +0; Loop 2-3: +1; Loop 4-5: +2; Loop 6-7: +3; Loop 8+: +4 (capped)
   */
  getOrderTierBoost(loopIndex: number): number {
    if (loopIndex <= 1) return 0;
    if (loopIndex <= 3) return 1;
    if (loopIndex <= 5) return 2;
    if (loopIndex <= 7) return 3;
    return 4; // Loop 8+ cap at +4
  }

  /**
   * Scale an order's required items based on the current loop index.
   * Increases item tier (itemId suffix) by the boost amount, capped at MAX_TIER (8).
   * Only scales if the target item ID exists in the ITEMS registry.
   */
  getScaledOrder(order: OrderData, items: { [key: string]: ItemData }): OrderData {
    const loopIndex = this.loopConfig ? this.loopConfig.loopIndex : 1;
    const boost = this.getOrderTierBoost(loopIndex);
    if (boost === 0) return order; // No scaling needed

    const MAX_TIER = 8;
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

    const hpMult = this.loopConfig?.hpMultiplier || 1.0;
    return { ...order, required: scaledRequired, damage: Math.ceil(order.damage * hpMult) };
  }

  /**
   * Load a boss level. Returns level data or null if game complete.
   */
  loadLevel(levelIdx: number, levels: LevelData[]): LevelData | null {
    if (levelIdx >= levels.length) {
      this.fsm.send('GAME_OVER');
      globalBus.emit('boss:gameComplete');
      return null;
    }
    this.currentLevelIdx = levelIdx;
    this.currentOrderIdx = 0;
    this.orderFailed = false;
    const level = levels[levelIdx];

    // Apply loop HP multiplier if available
    const hpMultiplier = (this.loopConfig && this.loopConfig.hpMultiplier) ? this.loopConfig.hpMultiplier : 1.0;
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

    globalBus.emit('boss:levelLoaded', {
      levelIdx,
      bossName: level.bossName,
      bossTitle: level.bossTitle,
      bossAvatar: level.bossAvatar,
      bossColor: level.bossColor,
      bgGradient: level.bgGradient,
      currentHp: this.currentHp,
      totalHp: this.totalHp
    } as BossLevelLoadedEvent);

    this.loadOrder(0, levels);
    return level;
  }

  /**
   * Load an order within the current level.
   */
  loadOrder(orderIdx: number, levels: LevelData[], items?: { [key: string]: ItemData }): OrderData | null {
    const level = levels[this.currentLevelIdx];
    if (orderIdx >= level.orders.length) {
      this.defeatBoss();
      return null;
    }
    this.currentOrderIdx = orderIdx;
    this.orderFailed = false;
    const rawOrder = level.orders[orderIdx];
    const order = items ? this.getScaledOrder(rawOrder, items) : rawOrder;
    this.timerRemaining = order.isTimed ? order.timeLimit || 0 : 0;

    globalBus.emit('boss:orderLoaded', {
      orderIdx,
      order,
      isTimed: order.isTimed || false,
      timeLimit: order.timeLimit || 0
    } as BossOrderLoadedEvent);

    return order;
  }

  /**
   * Apply damage from a submitted order.
   * Returns { hpLeft, isDefeated }.
   */
  applyDamage(damage: number): ApplyDamageResult {
    this.currentHp -= damage;
    const isDefeated = this.currentHp <= 0;

    globalBus.emit('boss:hpChanged', {
      currentHp: Math.max(0, this.currentHp),
      totalHp: this.totalHp,
      pct: Math.max(0, ((this.totalHp - this.currentHp) / this.totalHp) * 100)
    } as BossHpChangedEvent);

    return { hpLeft: Math.max(0, this.currentHp), isDefeated };
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
  commitSubmit(damage: number, levels: LevelData[]): ApplyDamageResult {
    const result = this.applyDamage(damage);
    if (result.isDefeated) {
      if (this.fsm.can('DEFEAT')) this.fsm.send('DEFEAT');
    } else {
      const level = levels[this.currentLevelIdx];
      const isLastOrder = this.currentOrderIdx >= level.orders.length - 1;
      if (isLastOrder) {
        this.currentHp = 0;
        if (this.fsm.can('DEFEAT')) this.fsm.send('DEFEAT');
        return { hpLeft: 0, isDefeated: true };
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
  finishSubmit(damage: number, levels: LevelData[]): ApplyDamageResult {
    const result = this.applyDamage(damage);
    if (result.isDefeated) {
      this.defeatBoss();
    } else {
      const level = levels[this.currentLevelIdx];
      const isLastOrder = this.currentOrderIdx >= level.orders.length - 1;
      if (isLastOrder) {
        this.currentHp = 0;
        this.defeatBoss();
        return { hpLeft: 0, isDefeated: true };
      }
      if (this.fsm.can('ORDER_DONE')) this.fsm.send('ORDER_DONE');
      this.currentOrderIdx++;
      globalBus.emit('boss:orderComplete', { nextOrderIdx: this.currentOrderIdx + 1 });
    }
    return result;
  }

  /**
   * Handle order failure (timeout).
   */
  failOrder(): void {
    this.orderFailed = true;
    if (this.fsm.can('FAIL_ORDER')) this.fsm.send('FAIL_ORDER');
    globalBus.emit('boss:orderFailed', {
      orderIdx: this.currentOrderIdx,
      nextOrderIdx: this.currentOrderIdx + 1
    } as BossOrderFailedEvent);
  }

  /**
   * Boss defeated.
   */
  defeatBoss(): void {
    if (this.fsm.can('DEFEAT')) this.fsm.send('DEFEAT');
    globalBus.emit('boss:defeated', {
      levelIdx: this.currentLevelIdx
    } as BossDefeatedEvent);
  }

  /**
   * Tick the timer. Returns remaining seconds or -1 if time's up.
   */
  tickTimer(): number {
    if (this.timerRemaining <= 0) return -1;
    this.timerRemaining--;
    globalBus.emit('boss:timerTick', { remaining: this.timerRemaining });
    if (this.timerRemaining <= 0) {
      return -1;
    }
    return this.timerRemaining;
  }

  /**
   * Check if current order can be fulfilled.
   */
  canFulfillOrder(board: any, levels: LevelData[], items: { [key: string]: ItemData }): boolean {
    const order = this.getCurrentOrder(levels, items);
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
  getCurrentOrder(levels: LevelData[], items?: { [key: string]: ItemData }): OrderData | null {
    if (this.currentLevelIdx < 0) return null;
    const level = levels[this.currentLevelIdx];
    if (!level || this.currentOrderIdx >= level.orders.length) return null;
    const rawOrder = level.orders[this.currentOrderIdx];
    return items ? this.getScaledOrder(rawOrder, items) : rawOrder;
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
  serialize(): any {
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
  deserialize(data: any): void {
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