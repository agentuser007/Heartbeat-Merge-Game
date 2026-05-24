// ============================================================
// CurrencyUI.js — Currency DOM Rendering (Observer Pattern)
// ============================================================
// Listens to CurrencyLogic events and updates DOM.
// NO business logic — pure presentation layer.
// ============================================================

class CurrencyUI {
    constructor() {
        this.goldEl = document.getElementById('gold-text');
        this.diamondEl = document.getElementById('diamond-text');
        this.goldValueEl = document.getElementById('gold-value');       // New status bar gold value (inside gold-label)
        this.diamondValueEl = document.getElementById('diamond-value'); // New status bar diamonds

        // Subscribe to logic events
        globalBus.on('currency:changed', (data) => this.render(data));
        globalBus.on('currency:flash', (data) => this.flash(data));
    }

    /**
     * Format large numbers compactly: 1500 → 1.5k, 2.5m → 2.5m, 1.2b → 1.2b
     */
    static formatGold(n) {
        if (n < 1000) return String(n);
        if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
        return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'b';
    }

    render(data) {
        if (this.goldEl) this.goldEl.textContent = `${I18n.emoji('coin')} ${data.gold}`;
        if (this.diamondEl) this.diamondEl.textContent = `${I18n.emoji('diamond')} ${data.diamonds}`;

        // Update new status bar elements with formatted values
        if (this.goldValueEl) this.goldValueEl.textContent = CurrencyUI.formatGold(data.gold);
        if (this.diamondValueEl) this.diamondValueEl.textContent = CurrencyUI.formatGold(data.diamonds);
    }

    flash(data) {
        const el = data.type === 'gold' ? this.goldEl : this.diamondEl;
        if (!el) return;
        const cls = data.effect === 'add' ? 'currency-add' : 'currency-spend';
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 500);
        // Diamond sparkle on add
        if (data.type === 'diamonds' && data.effect === 'add') {
            Effects.spawnParticles(el, 6, I18n.emoji('diamond'));
        }
    }
}