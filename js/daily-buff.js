// ============================================================
// daily-buff.js — Daily Buff System (每日增益)
// Figma 标注: "每日 Buff"
// Each day, a random buff is active for the entire play session.
// ============================================================

const DAILY_BUFF_TYPES = [
    {
        id: 'merge_bonus',
        icon: '✨',
        nameKey: 'dailyBuff.mergeBonus',
        descKey: 'dailyBuff.mergeBonusDesc',
        apply(game) { game._dailyBuffMergeBonus = true; },
        remove(game) { game._dailyBuffMergeBonus = false; }
    },
    {
        id: 'energy_discount',
        icon: '⚡',
        nameKey: 'dailyBuff.energyDiscount',
        descKey: 'dailyBuff.energyDiscountDesc',
        apply(game) { game._dailyBuffEnergyDiscount = true; },
        remove(game) { game._dailyBuffEnergyDiscount = false; }
    },
    {
        id: 'sell_price_up',
        icon: '🪙',
        nameKey: 'dailyBuff.sellPriceUp',
        descKey: 'dailyBuff.sellPriceUpDesc',
        apply(game) { game._dailyBuffSellPriceUp = true; },
        remove(game) { game._dailyBuffSellPriceUp = false; }
    },
    {
        id: 'gen_speed_up',
        icon: '⏩',
        nameKey: 'dailyBuff.genSpeedUp',
        descKey: 'dailyBuff.genSpeedUpDesc',
        apply(game) { game._dailyBuffGenSpeedUp = true; },
        remove(game) { game._dailyBuffGenSpeedUp = false; }
    },
    {
        id: 'lucky_merge',
        icon: '🍀',
        nameKey: 'dailyBuff.luckyMerge',
        descKey: 'dailyBuff.luckyMergeDesc',
        apply(game) { game._dailyBuffLuckyMerge = true; },
        remove(game) { game._dailyBuffLuckyMerge = false; }
    }
];

class DailyBuffSystem {
    constructor(game) {
        this.game = game;
        this.currentBuff = null;   // reference to DAILY_BUFF_TYPES entry
        this.buffDate = null;      // 'YYYY-MM-DD' string for daily reset check
        this.indicatorEl = document.getElementById('daily-buff-indicator');
    }

    // Called on game init / new day
    rollDailyBuff() {
        const today = this._todayStr();
        if (this.buffDate === today && this.currentBuff) return; // already rolled today

        // Remove previous buff effect
        if (this.currentBuff) {
            this.currentBuff.remove(this.game);
        }

        // Roll a new buff
        const idx = Math.floor(Math.random() * DAILY_BUFF_TYPES.length);
        this.currentBuff = DAILY_BUFF_TYPES[idx];
        this.buffDate = today;

        // Apply the new buff
        this.currentBuff.apply(this.game);

        // Show indicator
        this._renderIndicator();

        // Show toast on first roll of the day
        if (this.game.effects) {
            const name = I18n.t(this.currentBuff.nameKey);
            const desc = I18n.t(this.currentBuff.descKey);
            this.game.effects.showToast(`${this.currentBuff.icon} ${name}: ${desc}`, 'info');
        }
    }

    // Check if a specific buff is active
    isActive(buffId) {
        return this.currentBuff && this.currentBuff.id === buffId;
    }

    // Render the buff indicator in the top status bar
    _renderIndicator() {
        if (!this.indicatorEl) return;
        if (!this.currentBuff) {
            this.indicatorEl.style.display = 'none';
            return;
        }
        this.indicatorEl.style.display = '';
        const name = I18n.t(this.currentBuff.nameKey);
        const desc = I18n.t(this.currentBuff.descKey);
        this.indicatorEl.innerHTML = `<span class="buff-icon">${this.currentBuff.icon}</span><span class="buff-name">${name}</span>`;
        this.indicatorEl.title = desc;
    }

    _todayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // Serialization
    serialize() {
        return {
            buffId: this.currentBuff ? this.currentBuff.id : null,
            buffDate: this.buffDate
        };
    }

    deserialize(data) {
        if (!data) return;
        this.buffDate = data.buffDate || null;
        if (data.buffId) {
            const buff = DAILY_BUFF_TYPES.find(b => b.id === data.buffId);
            if (buff) {
                // Remove any existing buff first
                if (this.currentBuff) this.currentBuff.remove(this.game);
                this.currentBuff = buff;
                this.currentBuff.apply(this.game);
                this._renderIndicator();
            }
        }
        // Check if day has changed — if so, re-roll
        if (this.buffDate !== this._todayStr()) {
            this.rollDailyBuff();
        }
    }
}
