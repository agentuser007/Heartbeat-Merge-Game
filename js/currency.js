// ============================================================
// currency.js — Gold & Diamond Currency Manager
// ============================================================
// Now delegates to CurrencyLogic for business rules.
// CurrencyUI handles DOM rendering via EventBus.
// ============================================================

class CurrencyManager {
    constructor(game) {
        this.game = game;
        this.logic = new CurrencyLogic();
        this.ui = new CurrencyUI();

        // Subscribe to logic events for achievement tracking
        globalBus.on('currency:goldEarned', (data) => {
            if (this.game && this.game.achievements) {
                this.game.achievements.increment('totalGoldEarned', data.amount);
            }
        });
    }

    // ---- Gold ----
    addGold(amount) {
        // 🍀 Lucky Coin bonus: double gold rewards while active
        if (this.game && this.game._luckyCoinsLeft > 0) {
            amount *= 2;
            this.game._luckyCoinsLeft--;
            Effects.showToast(I18n.t('currency.luckyCoinBoost', { count: this.game._luckyCoinsLeft }));
        }
        this.logic.addGold(amount);
    }

    spendGold(amount) {
        return this.logic.spendGold(amount);
    }

    canAffordGold(amount) {
        return this.logic.canAffordGold(amount);
    }

    // ---- Diamonds ----
    addDiamonds(amount) {
        this.logic.addDiamonds(amount);
    }

    spendDiamonds(amount) {
        return this.logic.spendDiamonds(amount);
    }

    canAffordDiamonds(amount) {
        return this.logic.canAffordDiamonds(amount);
    }

    // ---- Compatibility (accessed by save.js) ----
    get gold() { return this.logic.gold; }
    set gold(v) { this.logic.gold = v; this.logic._emitChanged(); }
    get diamonds() { return this.logic.diamonds; }
    set diamonds(v) { this.logic.diamonds = v; this.logic._emitChanged(); }

    // ---- Render (called by save.js load) ----
    render() {
        this.ui.render({ gold: this.logic.gold, diamonds: this.logic.diamonds });
    }
}