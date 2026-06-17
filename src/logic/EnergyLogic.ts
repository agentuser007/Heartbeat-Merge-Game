// ============================================================
// EnergyLogic.ts — Pure Energy Business Logic + State Machine
// ============================================================
// NO DOM references. Returns events arrays (no globalBus).
// Timer management lives in the Store layer; this class
// provides tick() for pure regen computation.
// State Machine: FULL → REGENNING → EMPTY (and back)
// ============================================================

import { StateMachine } from '../core/StateMachine';
import type { LogicEvent } from './BoardLogic';

export interface GameConfig {
  ENERGY_REGEN_CAP: number;
  MAX_ENERGY: number;
  ENERGY_REGEN_INTERVAL: number;
  ENERGY_REGEN_AMOUNT: number;
  ENERGY_COST_PER_SPAWN: number;
}

export interface RegenTickResult {
  newCurrent: number;
  previousCurrent: number;
  changed: boolean;
  events: LogicEvent[];
}

export class EnergyLogic {
  regenCap: number;
  max: number;
  current: number;
  regenInterval: number;
  regenAmount: number;
  fsm: StateMachine;

  constructor(gameConfig: GameConfig) {
    if (!gameConfig.ENERGY_REGEN_INTERVAL || gameConfig.ENERGY_REGEN_INTERVAL <= 0) {
      throw new Error('[EnergyLogic] ENERGY_REGEN_INTERVAL is required and must be > 0');
    }
    if (!gameConfig.ENERGY_REGEN_AMOUNT || gameConfig.ENERGY_REGEN_AMOUNT <= 0) {
      throw new Error('[EnergyLogic] ENERGY_REGEN_AMOUNT is required and must be > 0');
    }
    this.regenCap = gameConfig.ENERGY_REGEN_CAP;
    this.max = this.regenCap;
    this.current = this.regenCap;
    this.regenInterval = gameConfig.ENERGY_REGEN_INTERVAL;
    this.regenAmount = gameConfig.ENERGY_REGEN_AMOUNT;

    this.fsm = new StateMachine({
      name: 'EnergyFSM',
      initial: this.current >= this.regenCap ? 'FULL' : 'REGENNING',
      states: {
        FULL: { on: { CONSUME: 'REGENNING' } },
        REGENNING: { on: { FILL: 'FULL', DEPLETE: 'EMPTY' } },
        EMPTY: { on: { RECOVER: 'REGENNING' } }
      }
    });
  }

  canSpend(amount?: number): boolean {
    amount = amount ?? 1;
    return this.current >= amount;
  }

  spend(amount?: number): { success: boolean; events: LogicEvent[] } {
    amount = amount ?? 1;
    if (!this.canSpend(amount)) return { success: false, events: [] };
    this.current -= amount;
    const events = this._changedEvents();
    this._updateFSM();
    return { success: true, events };
  }

  recover(amount: number): LogicEvent[] {
    this.current = this.current + amount;
    const events = this._changedEvents();
    this._updateFSM();
    return events;
  }

  setMax(newMax: number): LogicEvent[] {
    this.max = newMax;
    this.regenCap = newMax;
    const events = this._changedEvents();
    this._updateFSM();
    return events;
  }

  setRegenCap(newCap: number): LogicEvent[] {
    this.regenCap = newCap;
    const events = this._changedEvents();
    this._updateFSM();
    return events;
  }

  shouldRegen(): boolean {
    return this.current < this.regenCap;
  }

  tick(): RegenTickResult {
    if (this.current >= this.regenCap) {
      return { newCurrent: this.current, previousCurrent: this.current, changed: false, events: [] };
    }
    const previousCurrent = this.current;
    this.current = Math.min(this.current + this.regenAmount, this.regenCap);
    const events = this._changedEvents();
    this._updateFSM();
    return { newCurrent: this.current, previousCurrent, changed: true, events };
  }

  _updateFSM(): void {
    if (this.current >= this.regenCap && !this.fsm.is('FULL')) {
      if (this.fsm.can('FILL')) this.fsm.send('FILL');
    } else if (this.current <= 0 && !this.fsm.is('EMPTY')) {
      if (this.fsm.can('DEPLETE')) this.fsm.send('DEPLETE');
    } else if (this.current > 0 && this.current < this.regenCap && !this.fsm.is('REGENNING')) {
      if (this.fsm.can('RECOVER')) this.fsm.send('RECOVER');
      else if (this.fsm.can('CONSUME')) this.fsm.send('CONSUME');
    }
  }

  _changedEvents(): LogicEvent[] {
    return [{ type: 'energy:changed', payload: { current: this.current, max: this.regenCap } }];
  }
}
