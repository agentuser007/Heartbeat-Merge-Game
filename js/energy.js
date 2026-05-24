// ============================================================
// energy.js — Energy System
// ============================================================

class EnergySystem {
    constructor() {
        this.regenCap = GAME_CONFIG.ENERGY_REGEN_CAP || GAME_CONFIG.MAX_ENERGY;
        this.max = this.regenCap;
        this.current = this.regenCap;
        this.regenInterval = GAME_CONFIG.ENERGY_REGEN_INTERVAL;
        this.regenTimer = null;
        this.el = document.getElementById('energy-bar-fill');
        this.textEl = document.getElementById('energy-text');
        this.valueEl = document.getElementById('energy-value'); // New status bar value
        this.regenTimerEl = document.getElementById('energy-regen-timer'); // Regen countdown
        this._regenStartTime = null;
        this._regenDisplayTimer = null;
        this.render();
        // C-05 fix: Do NOT start regen in constructor — defer until after save load
        // to prevent the timer from overwriting saved energy state with defaults.
        // startRegen() is now called explicitly from Game.init() after load.
    }

    canSpend(amount = GAME_CONFIG.ENERGY_COST_PER_SPAWN) {
        return this.current >= amount;
    }

    spend(amount = GAME_CONFIG.ENERGY_COST_PER_SPAWN) {
        if (!this.canSpend(amount)) {
            if (typeof globalBus !== 'undefined') {
                globalBus.emit('energy:insufficient', { current: this.current, needed: amount });
            }
            return false;
        }
        this.current -= amount;
        this.render();
        return true;
    }

    recover(amount) {
        // No hard cap — items/rewards can push current above regenCap freely
        this.current = this.current + amount;
        this.render();
    }

    // Dynamically update max energy (from heroine upgrades)
    setMax(newMax) {
        this.max = newMax;
        this.regenCap = newMax; // sync regenCap so natural recovery & UI reflect new cap
        // Do NOT cap current — items/rewards may have pushed it above max
        this.render();
    }

    setRegenCap(newCap) {
        this.regenCap = newCap;
        this.render();
    }

    // Dynamically update regen interval (from heroine upgrades)
    setRegenInterval(newInterval) {
        this.regenInterval = newInterval;
        // Restart the timer with new interval
        this.stopRegen();
        this.startRegen();
    }

    startRegen() {
        this._regenStartTime = Date.now();
        this.regenTimer = setInterval(() => {
            // Natural regen stops at regenCap, not at max
            if (this.current < this.regenCap) {
                this.current++;
                this.render();
                this._regenStartTime = Date.now(); // Reset countdown
            }
        }, this.regenInterval);

        // Start countdown display timer (updates every second)
        if (this.regenTimerEl) {
            this._regenDisplayTimer = setInterval(() => {
                this._updateRegenCountdown();
            }, 1000);
        }
    }

    stopRegen() {
        if (this.regenTimer) {
            clearInterval(this.regenTimer);
            this.regenTimer = null;
        }
        if (this._regenDisplayTimer) {
            clearInterval(this._regenDisplayTimer);
            this._regenDisplayTimer = null;
        }
        if (this.regenTimerEl) this.regenTimerEl.style.display = 'none';
    }

    _updateRegenCountdown() {
        if (!this.regenTimerEl) return;
        if (this.current >= this.regenCap) {
            this.regenTimerEl.style.display = 'none';
            return;
        }
        this.regenTimerEl.style.display = '';
        const elapsed = Date.now() - (this._regenStartTime || Date.now());
        const remaining = Math.max(0, this.regenInterval - elapsed);
        const totalSecs = Math.ceil(remaining / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        this.regenTimerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }

    render() {
        const pct = Math.min((this.current / this.regenCap) * 100, 100);
        if (this.el) {
            this.el.style.width = pct + '%';
            // color shift: green → yellow → red
            if (pct > I18n.config('colors.energyHighThreshold')) this.el.style.background = I18n.config('colors.energyGradientHigh');
            else if (pct > I18n.config('colors.energyLowThreshold')) this.el.style.background = I18n.config('colors.energyGradientMid');
            else this.el.style.background = I18n.config('colors.energyGradientLow');
        }
        if (this.textEl) {
            // Show current/regenCap — can display overflow like 130/100
            this.textEl.textContent = `${I18n.emoji('energy')} ${this.current}/${this.regenCap}`;
        }
        // Update new status bar value display
        if (this.valueEl) {
            this.valueEl.textContent = `${this.current}`;
        }
    }

    destroy() {
        this.stopRegen();
        if (this._regenDisplayTimer) {
            clearInterval(this._regenDisplayTimer);
            this._regenDisplayTimer = null;
        }
    }
}
