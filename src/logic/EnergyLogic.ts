// ============================================================
// EnergyLogic.ts — Pure Energy Business Logic + State Machine
// ============================================================
// NO DOM references. Emits events via EventBus.
// State Machine: FULL → REGENNING → EMPTY (and back)
// ============================================================

import { StateMachine } from '../core/StateMachine';
import { globalBus } from '../core/EventBus';

export interface GameConfig {
  ENERGY_REGEN_CAP: number;
  MAX_ENERGY: number;
  ENERGY_REGEN_INTERVAL: number;
  ENERGY_REGEN_AMOUNT: number;
  ENERGY_COST_PER_SPAWN: number;
}

export interface EnergyChangedEvent {
  current: number;
  max: number;
}

export class EnergyLogic {
  regenCap: number;
  max: number;
  current: number;
  regenInterval: number;
  regenAmount: number;
  regenTimer: any | null;
  fsm: StateMachine;

  constructor(gameConfig: GameConfig) {
    this.regenCap = gameConfig.ENERGY_REGEN_CAP || gameConfig.MAX_ENERGY;
    this.max = this.regenCap; // kept for FSM / display compatibility
    this.current = this.regenCap;
    this.regenInterval = gameConfig.ENERGY_REGEN_INTERVAL || 3000;
    this.regenAmount = gameConfig.ENERGY_REGEN_AMOUNT || 1;
    this.regenTimer = null;

    // State Machine
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

  spend(amount?: number): boolean {
    amount = amount ?? 1;
    if (!this.canSpend(amount)) return false;
    this.current -= amount;
    this._emitChanged();
    this._updateFSM();
    return true;
  }

  recover(amount: number): void {
    // No hard cap — items/rewards can push current above regenCap freely
    this.current = this.current + amount;
    this._emitChanged();
    this._updateFSM();
  }

  setMax(newMax: number): void {
    this.max = newMax;
    this.regenCap = newMax; // sync regenCap so natural recovery & UI reflect new cap
    // Do NOT cap current — items/rewards may have pushed it above max
    this._emitChanged();
    this._updateFSM();
  }

  setRegenCap(newCap: number): void {
    // Only changes regenCap (natural recovery ceiling), NOT max
    this.regenCap = newCap;
    this._emitChanged();
    this._updateFSM();
  }

  setRegenInterval(newInterval: number): void {
    this.regenInterval = newInterval;
    this.stopRegen();
    this.startRegen();
  }

  startRegen(): void {
    this.stopRegen();
    this.regenTimer = setInterval(() => {
      // Natural regen stops at regenCap, not at max
      if (this.current < this.regenCap) {
        this.current += this.regenAmount;
        this.current = Math.min(this.current, this.regenCap);
        this._emitChanged();
        this._updateFSM();
      }
    }, this.regenInterval);
  }

  stopRegen(): void {
    if (this.regenTimer) {
      clearInterval(this.regenTimer);
      this.regenTimer = null;
    }
  }

  _updateFSM(): void {
    // FULL when current >= regenCap (natural regen ceiling)
    if (this.current >= this.regenCap && !this.fsm.is('FULL')) {
      if (this.fsm.can('FILL')) this.fsm.send('FILL');
    } else if (this.current <= 0 && !this.fsm.is('EMPTY')) {
      if (this.fsm.can('DEPLETE')) this.fsm.send('DEPLETE');
    } else if (this.current > 0 && this.current < this.regenCap && !this.fsm.is('REGENNING')) {
      if (this.fsm.can('RECOVER')) this.fsm.send('RECOVER');
      else if (this.fsm.can('CONSUME')) this.fsm.send('CONSUME');
    }
  }

  _emitChanged(): void {
    globalBus.emit('energy:changed', {
      current: this.current,
      max: this.regenCap // display denominator = regenCap
    } as EnergyChangedEvent);
  }

  destroy(): void {
    this.stopRegen();
  }
}