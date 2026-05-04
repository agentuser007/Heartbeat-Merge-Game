// ============================================================
// CurrencyLogic.js — Pure Currency Business Logic
// ============================================================

class CurrencyLogic {
    constructor() {
        this.gold = 0;
        this.diamonds = 0;
    }

    addGold(amount) {
        this.gold += amount;
        this._emitChanged();
        globalBus.emit('currency:flash', { type: 'gold', effect: 'add' });
        globalBus.emit('currency:goldEarned', { amount });
    }

    spendGold(amount) {
        if (this.gold < amount) {
            globalBus.emit('currency:insufficient', { type: 'gold', current: this.gold, needed: amount });
            return false;
        }
        this.gold -= amount;
        this._emitChanged();
        globalBus.emit('currency:flash', { type: 'gold', effect: 'spend' });
        return true;
    }

    canAffordGold(amount) { return this.gold >= amount; }

    addDiamonds(amount) {
        this.diamonds += amount;
        this._emitChanged();
        globalBus.emit('currency:flash', { type: 'diamonds', effect: 'add' });
    }

    spendDiamonds(amount) {
        if (this.diamonds < amount) {
            globalBus.emit('currency:insufficient', { type: 'diamonds', current: this.diamonds, needed: amount });
            return false;
        }
        this.diamonds -= amount;
        this._emitChanged();
        globalBus.emit('currency:flash', { type: 'diamonds', effect: 'spend' });
        return true;
    }

    canAffordDiamonds(amount) { return this.diamonds >= amount; }

    _emitChanged() {
        globalBus.emit('currency:changed', { gold: this.gold, diamonds: this.diamonds });
    }
}