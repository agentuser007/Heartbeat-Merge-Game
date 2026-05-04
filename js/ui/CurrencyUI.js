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

        // Subscribe to logic events
        globalBus.on('currency:changed', (data) => this.render(data));
        globalBus.on('currency:flash', (data) => this.flash(data));
    }

    render(data) {
        if (this.goldEl) this.goldEl.textContent = `${I18n.emoji('coin')} ${data.gold}`;
        if (this.diamondEl) this.diamondEl.textContent = `${I18n.emoji('diamond')} ${data.diamonds}`;
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