// ============================================================
// EnergyLogic.js — Pure Energy Business Logic + State Machine
// ============================================================
// NO DOM references. Emits events via EventBus.
// State Machine: FULL → REGENNING → EMPTY (and back)
// ============================================================

class EnergyLogic {
    constructor() {
        this.regenCap = GAME_CONFIG.ENERGY_REGEN_CAP || GAME_CONFIG.MAX_ENERGY;
        this.max = this.regenCap; // kept for FSM / display compatibility
        this.current = this.regenCap;
        this.regenInterval = GAME_CONFIG.ENERGY_REGEN_INTERVAL;
        this.regenAmount = GAME_CONFIG.ENERGY_REGEN_AMOUNT || 1;
        this.regenTimer = null;

        // State Machine
        this.fsm = new StateMachine({
            name: 'EnergyFSM',
            initial: this.current >= this.regenCap ? 'FULL' : 'REGENNING',
            states: {
                FULL:      { on: { CONSUME: 'REGENNING' } },
                REGENNING: { on: { FILL: 'FULL', DEPLETE: 'EMPTY' } },
                EMPTY:     { on: { RECOVER: 'REGENNING' } }
            }
        });

        // Start regen loop
        this.startRegen();
    }

    canSpend(amount) {
        amount = amount || GAME_CONFIG.ENERGY_COST_PER_SPAWN;
        return this.current >= amount;
    }

    spend(amount) {
        amount = amount || GAME_CONFIG.ENERGY_COST_PER_SPAWN;
        if (!this.canSpend(amount)) return false;
        this.current -= amount;
        this._emitChanged();
        this._updateFSM();
        return true;
    }

    recover(amount) {
        // No hard cap — items/rewards can push current above regenCap freely
        this.current = this.current + amount;
        this._emitChanged();
        this._updateFSM();
    }

    setMax(newMax) {
        this.max = newMax;
        this.regenCap = newMax; // sync regenCap so natural recovery & UI reflect new cap
        // Do NOT cap current — items/rewards may have pushed it above max
        this._emitChanged();
        this._updateFSM();
    }

    setRegenCap(newCap) {
        // Only changes regenCap (natural recovery ceiling), NOT max
        this.regenCap = newCap;
        this._emitChanged();
        this._updateFSM();
    }

    setRegenInterval(newInterval) {
        this.regenInterval = newInterval;
        this.stopRegen();
        this.startRegen();
    }

    startRegen() {
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

    stopRegen() {
        if (this.regenTimer) {
            clearInterval(this.regenTimer);
            this.regenTimer = null;
        }
    }

    _updateFSM() {
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

    _emitChanged() {
        globalBus.emit('energy:changed', {
            current: this.current,
            max: this.regenCap   // display denominator = regenCap
        });
    }

    destroy() {
        this.stopRegen();
    }
}