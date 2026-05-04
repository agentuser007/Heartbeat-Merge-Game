// ============================================================
// EnergyUI.js — Pure Energy Rendering (Observer Pattern)
// ============================================================
// Listens to 'energy:changed' from EventBus.
// NO business logic. Only DOM updates.
// ============================================================

class EnergyUI {
    constructor() {
        this.el = document.getElementById('energy-bar-fill');
        this.textEl = document.getElementById('energy-text');
        this.barEl = document.getElementById('energy-bar');

        // Subscribe to energy changes
        this._onChanged = (data) => this.render(data);
        globalBus.on('energy:changed', this._onChanged);

        // Subscribe to energy state changes for pulse effect
        this._onStateChanged = (data) => {
            if (data.to === 'REGENNING' && this.barEl) {
                this.barEl.classList.add('energy-pulse');
                setTimeout(() => this.barEl.classList.remove('energy-pulse'),
                    UI_ANIMATION.energyPulseDuration || 400);
            }
        };
        globalBus.on('energyfsm:stateChanged', this._onStateChanged);
    }

    render(data) {
        const { current, max } = data;
        // Progress bar capped at 100% even when current > max (overflow from items/rewards)
        const pct = Math.min((current / max) * 100, 100);

        if (this.el) {
            this.el.style.width = pct + '%';
            if (pct > I18n.config('colors.energyHighThreshold')) {
                this.el.style.background = I18n.config('colors.energyGradientHigh');
            } else if (pct > I18n.config('colors.energyLowThreshold')) {
                this.el.style.background = I18n.config('colors.energyGradientMid');
            } else {
                this.el.style.background = I18n.config('colors.energyGradientLow');
            }
        }

        if (this.textEl) {
            // Show current/max — can display overflow like 120/100
            this.textEl.textContent = `${I18n.emoji('energy')} ${current}/${max}`;
        }
    }

    destroy() {
        globalBus.off('energy:changed', this._onChanged);
        globalBus.off('energyfsm:stateChanged', this._onStateChanged);
    }
}