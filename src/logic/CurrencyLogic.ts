// ============================================================
// CurrencyLogic.ts — Pure Currency Business Logic
// ============================================================

import { globalBus } from '../core/EventBus';

export interface CurrencyChangedEvent {
  gold: number;
  diamonds: number;
}

export interface CurrencyFlashEvent {
  type: 'gold' | 'diamonds';
  effect: 'add' | 'spend';
}

export interface CurrencyInsufficientEvent {
  type: 'gold' | 'diamonds';
  current: number;
  needed: number;
}

export interface CurrencyGoldEarnedEvent {
  amount: number;
}

export class CurrencyLogic {
  gold: number;
  diamonds: number;

  constructor(initialGold: number = 0, initialDiamonds: number = 0) {
    this.gold = initialGold;
    this.diamonds = initialDiamonds;
  }

  addGold(amount: number): void {
    this.gold += amount;
    this._emitChanged();
    globalBus.emit('currency:flash', { type: 'gold', effect: 'add' } as CurrencyFlashEvent);
    globalBus.emit('currency:goldEarned', { amount } as CurrencyGoldEarnedEvent);
  }

  setGold(value: number): void {
    this.gold = value;
    this._emitChanged();
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) {
      globalBus.emit('currency:insufficient', { type: 'gold', current: this.gold, needed: amount } as CurrencyInsufficientEvent);
      return false;
    }
    this.gold -= amount;
    this._emitChanged();
    globalBus.emit('currency:flash', { type: 'gold', effect: 'spend' } as CurrencyFlashEvent);
    return true;
  }

  canAffordGold(amount: number): boolean {
    return this.gold >= amount;
  }

  addDiamonds(amount: number): void {
    this.diamonds += amount;
    this._emitChanged();
    globalBus.emit('currency:flash', { type: 'diamonds', effect: 'add' } as CurrencyFlashEvent);
  }

  spendDiamonds(amount: number): boolean {
    if (this.diamonds < amount) {
      globalBus.emit('currency:insufficient', { type: 'diamonds', current: this.diamonds, needed: amount } as CurrencyInsufficientEvent);
      return false;
    }
    this.diamonds -= amount;
    this._emitChanged();
    globalBus.emit('currency:flash', { type: 'diamonds', effect: 'spend' } as CurrencyFlashEvent);
    return true;
  }

  canAffordDiamonds(amount: number): boolean {
    return this.diamonds >= amount;
  }

  _emitChanged(): void {
    globalBus.emit('currency:changed', { gold: this.gold, diamonds: this.diamonds } as CurrencyChangedEvent);
  }
}