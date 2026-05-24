// ============================================================
// heroine.js — Heroine Attribute Upgrade System
// ============================================================

class HeroineSystem {
    constructor(game) {
        this.game = game;
        this.upgrades = {}; // { upgrade_id: current_level (0-based, -1 = not purchased) }
        this.panelEl = document.getElementById('heroine-sheet');
        this.listEl = document.getElementById('heroine-upgrade-list');
        this.shopListEl = document.getElementById('shop-list');
        // FB-3: Shop is now an independent sheet
        this.shopPanelEl = document.getElementById('shop-sheet');

        // Initialize upgrade levels to -1 (none purchased)
        for (const upg of HEROINE_UPGRADES) {
            this.upgrades[upg.id] = -1;
        }

        this.renderUpgrades();
        this.renderShop();
    }

    // Open the heroine bottom sheet (called from nav bar)
    open() {
        if (this.panelEl) {
            this.panelEl.classList.add('open');
            this.renderUpgrades();
        }
    }

    close() {
        if (this.panelEl) {
            this.panelEl.classList.remove('open');
        }
    }

    // FB-3: Open the independent gold shop sheet
    openShop() {
        if (this.shopPanelEl) {
            this.shopPanelEl.classList.add('open');
            this.renderShop();
        }
    }

    // FB-3: Close the independent gold shop sheet
    closeShop() {
        if (this.shopPanelEl) {
            this.shopPanelEl.classList.remove('open');
        }
    }

    renderUpgrades() {
        if (!this.listEl) return;
        this.listEl.innerHTML = '';

        for (const upg of HEROINE_UPGRADES) {
            const currentLvl = this.upgrades[upg.id];
            const maxed = currentLvl >= upg.levels.length - 1;
            const nextLvl = maxed ? null : upg.levels[currentLvl + 1];

            const card = document.createElement('div');
            card.className = 'heroine-card' + (maxed ? ' maxed' : '');

            // Icon + Name
            const header = document.createElement('div');
            header.className = 'heroine-card-header';
            header.innerHTML = `
                <span class="heroine-icon">${upg.icon}</span>
                <div class="heroine-card-info">
                    <div class="heroine-card-name">${upg.name}</div>
                    <div class="heroine-card-desc">${upg.description}</div>
                </div>
            `;

            // Level indicators
            const lvlBar = document.createElement('div');
            lvlBar.className = 'heroine-level-bar';
            for (let i = 0; i < upg.levels.length; i++) {
                const dot = document.createElement('div');
                dot.className = 'heroine-level-dot' + (i <= currentLvl ? ' active' : '');
                dot.title = upg.levels[i].label;
                lvlBar.appendChild(dot);
            }

            // Current effect text
            const effectEl = document.createElement('div');
            effectEl.className = 'heroine-effect';
            if (currentLvl >= 0) {
                effectEl.textContent = I18n.t('heroine.currentLabel') + upg.levels[currentLvl].label;
            } else {
                effectEl.textContent = I18n.t('heroine.unlockedLabel');
            }

            // Upgrade button
            const btn = document.createElement('button');
            btn.className = 'heroine-upgrade-btn';
            if (maxed) {
                btn.textContent = I18n.t('heroine.maxLevel');
                btn.disabled = true;
            } else {
                const cost = nextLvl.cost;
                const canAfford = this.game.currency.canAffordGold(cost);
                btn.textContent = `${I18n.emoji('coin')} ${cost} ${I18n.t('heroine.upgrade')} → ${nextLvl.label}`;
                btn.disabled = !canAfford;
                if (canAfford) btn.classList.add('affordable');
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.purchaseUpgrade(upg.id);
                });
            }

            card.appendChild(header);
            card.appendChild(lvlBar);
            card.appendChild(effectEl);
            card.appendChild(btn);
            this.listEl.appendChild(card);
        }

        // Restart game button
        const restartBtn = document.createElement('button');
        restartBtn.className = 'heroine-restart-btn';
        restartBtn.textContent = I18n.t('heroine.restartGame');
        restartBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await showConfirmDialog(I18n.t('heroine.confirmRestart'));
            if (confirmed) {
                this.game.save.clearAll();
                location.reload();
            }
        });
        this.listEl.appendChild(restartBtn);
    }

    // ---- Gold Shop ----
    renderShop() {
        if (!this.shopListEl) return;
        this.shopListEl.innerHTML = '';

        for (const item of SHOP_ITEMS) {
            const card = document.createElement('div');
            card.className = 'shop-card';

            const info = document.createElement('div');
            info.className = 'shop-card-info';
            const shopNameKeys = { shop_energy_small: 'shopEnergySmall', shop_energy_large: 'shopEnergyLarge', shop_joker: 'shopJoker', shop_scissor: 'shopScissor', shop_clear_lv1: 'shopClearLv1' };
            const shopDescKeys = { shop_energy_small: 'shopEnergySmallDesc', shop_energy_large: 'shopEnergyLargeDesc', shop_joker: 'shopJokerDesc', shop_scissor: 'shopScissorDesc', shop_clear_lv1: 'shopClearLv1Desc' };
            const sName = shopNameKeys[item.id] ? I18n.t(shopNameKeys[item.id]) : item.name;
            const sDesc = shopDescKeys[item.id] ? I18n.t(shopDescKeys[item.id]) : item.description;
            info.innerHTML = `
                <span class="shop-icon">${item.icon}</span>
                <div class="shop-text">
                    <div class="shop-name">${sName}</div>
                    <div class="shop-desc">${sDesc}</div>
                </div>
            `;

            const btn = document.createElement('button');
            btn.className = 'shop-buy-btn';
            const canAfford = this.game.currency.canAffordGold(item.cost);
            btn.textContent = `💰 ${item.cost}`;
            btn.disabled = !canAfford;
            if (canAfford) btn.classList.add('affordable');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.purchaseShopItem(item.id);
            });

            card.appendChild(info);
            card.appendChild(btn);
            this.shopListEl.appendChild(card);
        }
    }

    purchaseShopItem(itemId) {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (!this.game.currency.spendGold(item.cost)) return;

        // Add to inventory as a gacha-like item so inventory.useItem() can handle it
        const gachaItem = {
            id: item.id,
            name: item.name,
            icon: item.icon,
            description: item.description,
            effect: item.effect,
            value: item.value,
            rarity: 'R'
        };

        if (this.game.inventory) {
            this.game.inventory.addItem(gachaItem);
        }

        const fx = this.game.effects;
        if (fx) fx.showToast(I18n.t('heroineBought', {name: item.name}), 'info');

        // Re-render shop to update afford status
        this.renderShop();

        if (this.game.save) this.game.save.saveAll();
    }

    purchaseUpgrade(upgradeId) {
        const upg = HEROINE_UPGRADES.find(u => u.id === upgradeId);
        if (!upg) return;

        const currentLvl = this.upgrades[upgradeId];
        if (currentLvl >= upg.levels.length - 1) return; // maxed

        const nextLvl = upg.levels[currentLvl + 1];
        if (!this.game.currency.spendGold(nextLvl.cost)) return; // can't afford

        // Level up
        this.upgrades[upgradeId] = currentLvl + 1;

        // Apply effect
        this.applyUpgrade(upgradeId, nextLvl.value);

        // Particles on the panel
        Effects.spawnParticles(this.panelEl, 8, I18n.emoji('sparkle'));

        // Re-render
        this.renderUpgrades();
    }

    applyUpgrade(upgradeId, value) {
        switch (upgradeId) {
            case 'energy_cap':
                this.game.energy.setMax(value);
                this.game.energy.setRegenCap(value);
                break;
            case 'regen_speed':
                this.game.energy.setRegenInterval(value);
                break;
            case 'recycle_bonus':
                // Stored and read by board.sellItem()
                break;
            case 'gold_bonus':
                // Stored and read by daily-orders submitOrder()
                break;
        }
    }

    // Get current recycle bonus (extra energy per recycle)
    getRecycleBonus() {
        const lvl = this.upgrades['recycle_bonus'];
        if (lvl < 0) return 0;
        return HEROINE_UPGRADES.find(u => u.id === 'recycle_bonus').levels[lvl].value;
    }

    // Get current gold multiplier
    getGoldMultiplier() {
        const lvl = this.upgrades['gold_bonus'];
        if (lvl < 0) return 1.0;
        return HEROINE_UPGRADES.find(u => u.id === 'gold_bonus').levels[lvl].value;
    }
}
