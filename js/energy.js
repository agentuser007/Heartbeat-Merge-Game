// ============================================================
// energy.js — Energy System
// ============================================================

class EnergySystem {
    constructor() {
        this.max = GAME_CONFIG.MAX_ENERGY;
        this.current = this.max;
        this.regenTimer = null;
        this.el = document.getElementById('energy-bar-fill');
        this.textEl = document.getElementById('energy-text');
        this.render();
        this.startRegen();
    }

    canSpend(amount = GAME_CONFIG.ENERGY_COST_PER_SPAWN) {
        return this.current >= amount;
    }

    spend(amount = GAME_CONFIG.ENERGY_COST_PER_SPAWN) {
        if (!this.canSpend(amount)) return false;
        this.current -= amount;
        this.render();
        return true;
    }

    recover(amount) {
        this.current = Math.min(this.max, this.current + amount);
        this.render();
    }

    startRegen() {
        this.regenTimer = setInterval(() => {
            if (this.current < this.max) {
                this.current++;
                this.render();
            }
        }, GAME_CONFIG.ENERGY_REGEN_INTERVAL);
    }

    render() {
        const pct = (this.current / this.max) * 100;
        if (this.el) {
            this.el.style.width = pct + '%';
            // color shift: green → yellow → red
            if (pct > 50) this.el.style.background = 'linear-gradient(90deg, #00E676, #69F0AE)';
            else if (pct > 20) this.el.style.background = 'linear-gradient(90deg, #FFD600, #FFAB00)';
            else this.el.style.background = 'linear-gradient(90deg, #FF5252, #FF1744)';
        }
        if (this.textEl) {
            this.textEl.textContent = `⚡ ${this.current}/${this.max}`;
        }
    }

    destroy() {
        clearInterval(this.regenTimer);
    }
}
