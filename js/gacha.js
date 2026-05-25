// ============================================================
// gacha.js — Heartbeat Gacha UI Layer
// Delegates business logic to GachaLogic.
// (Pity system removed)
// ============================================================

class GachaSystem {
    constructor(game) {
        this.game = game;
        this.logic = new GachaLogic();
        this.panelEl = document.getElementById('gacha-sheet');
        this.resultArea = document.getElementById('gacha-result');
        this.singleBtn = document.getElementById('gacha-single');
        this.tenBtn = document.getElementById('gacha-ten');
        if (this.singleBtn) this.singleBtn.addEventListener('click', () => this.pullSingle());
        if (this.tenBtn) this.tenBtn.addEventListener('click', () => this.pullTen());
        this.updateButtons();
    }

    // ---- Compatibility accessors ----
    get ssrOwned() { return this.logic.ssrOwned; }
    set ssrOwned(v) { this.logic.ssrOwned = v; }

    open() {
        if (this.panelEl) {
            this.panelEl.classList.add('open');
            this.resultArea.innerHTML = `<div class="gacha-hint">${I18n.t('gacha.hint')}</div>`;
            this.updateButtons();
            // Update ad buttons when gacha panel opens
            if (this.game.ad) this.game.ad.updateAllButtons();
        }
    }
    close() { if (this.panelEl) this.panelEl.classList.remove('open'); }

    updateButtons() {
        if (this.singleBtn) {
            this.singleBtn.disabled = !this.logic.canAffordSingle(this.game.currency);
        }
        if (this.tenBtn) {
            this.tenBtn.disabled = !this.logic.canAffordTen(this.game.currency);
        }
        const singleCostEl = document.getElementById('gacha-single-cost');
        if (singleCostEl) {
            singleCostEl.textContent = `x${GACHA_COST.singleCost}`;
        }
        const tenCostEl = document.getElementById('gacha-ten-cost');
        if (tenCostEl) {
            tenCostEl.textContent = `x${GACHA_COST.tenCost}`;
        }
    }

    pullSingle() {
        AudioManager.playSound('btn_click');
        // Check FSM state before spending diamonds to prevent loss
        if (!this.logic.fsm.can('PULL')) return;
        if (!this.game.currency.spendDiamonds(GACHA_COST.singleCost)) return;
        const result = this.logic.pullSingle();
        if (!result) {
            // Refund diamonds if roll failed (e.g. empty pool)
            this.game.currency.addDiamonds(GACHA_COST.singleCost);
            this.logic.acknowledge();
            return;
        }
        this.showResults([result]);
        this.updateButtons();
        this.logic.acknowledge();
        if (this.game.achievements) this.game.achievements.increment('gachaPulls');
        if (this.game.save) this.game.save.saveAll();
    }

    pullTen() {
        AudioManager.playSound('btn_click');
        // Check FSM state before spending diamonds to prevent loss
        if (!this.logic.fsm.can('PULL')) return;
        if (!this.game.currency.spendDiamonds(GACHA_COST.tenCost)) return;
        const results = this.logic.pullTen();
        if (!results || results.length === 0) {
            // Refund diamonds if all rolls failed
            this.game.currency.addDiamonds(GACHA_COST.tenCost);
            this.logic.acknowledge();
            return;
        }
        this.showResults(results);
        this.updateButtons();
        this.logic.acknowledge();
        if (this.game.achievements) this.game.achievements.increment('gachaPulls', results.length);
        if (this.game.save) this.game.save.saveAll();
    }

    showResults(items) {
        if (!this.resultArea) return;
        AudioManager.playSound('reward');
        this.resultArea.innerHTML = '';
        items.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = `gacha-card rarity-${item.rarity.toLowerCase()}`;
            card.style.animationDelay = `${idx * 0.08}s`;
            if (item.rarity === 'SSR') card.classList.add('gacha-ssr-reveal');
            const rc = GACHA_RARITY_CONFIG[item.rarity];
            card.innerHTML = `<div class="gacha-card-rarity-badge rarity-${item.rarity.toLowerCase()}">${item.rarity}</div>
                <div class="gacha-card-icon">${item.icon}</div>
                <div class="gacha-card-name">${item.name}</div>
                <div class="gacha-card-rarity" style="color:${rc.color}">${item.rarity}</div>`;
            this.resultArea.appendChild(card);
            this.applyResult(item);
        });
    }

    applyResult(item) {
        const fx = this.game.effects;

        // Record card in gacha collection
        if (this.game.collection) {
            this.game.collection.discoverGachaCard(item.id);
        }

        // SSR: give first-obtain rewards immediately (CG, diamonds, memories)
        // Generator card goes to inventory for manual placement
        let skipInventory = false;
        if (item.effect === 'ssr_generator') {
            const ssrId = item.id;
            // Use cg_stories.json as the authoritative source for cgId
            const cgStory = CG_STORIES[ssrId];
            const cgId = cgStory ? cgStory.cgId : (item.value.cgId || ssrId);
            const isFirst = this.logic.markSSROwned(ssrId);
            // C-01 fix: Read actual SSR level from board state, not pool definition
            // The pool always defines level 6/7, but the player's generator may have
            // been merged to level 8+. Scan the board for the highest-level SSR
            // generator of the same chain to determine the real level.
            let ssrLevel = (item.value && item.value.level) || 7;
            const genChain = item.value && item.value.genChain;
            if (genChain && this.game.board && this.game.board.cells) {
                for (let i = 0; i < this.game.board.cells.length; i++) {
                    const cellItemId = this.game.board.cells[i];
                    if (cellItemId && typeof ITEMS !== 'undefined' && ITEMS[cellItemId]) {
                        const cellItem = ITEMS[cellItemId];
                        if (cellItem.effect === 'ssr_generator' && cellItem.value && cellItem.value.genChain === genChain) {
                            ssrLevel = Math.max(ssrLevel, cellItem.value.level || 7);
                        }
                    }
                }
            }

            if (isFirst) {
                if (this.game.cgAlbum) this.game.cgAlbum.unlockStory(cgId, 0);
                if (fx) {
                    
                    fx.showToast(`👑 SSR！${item.name}${cgStory ? ' — ' + cgStory.title : ''}`, 'ssr');
                    if (typeof VNReader !== 'undefined') {
                        var vn = new VNReader(this.game);
                        vn.open(ssrId, 0);
                    }
                }
                this.game.currency.addDiamonds(100);
                if (fx) fx.showToast(I18n.t('gachaFirstSSR'), 'ssr');
            } else {
                if (this.game.cgAlbum) {
                    this.game.cgAlbum.addMemoryFragments(cgId, 20);
                }
                // Lv8+ duplicate SSR: no generator in inventory, give diamonds instead
                if (ssrLevel >= 8) {
                    skipInventory = true;
                    this.game.currency.addDiamonds(200);
                    if (fx) fx.showToast(I18n.t('gachaDupSSRFull'), 'ssr');
                } else {
                    if (fx) fx.showToast(I18n.t('gachaDupSSR'), 'sr');
                }
            }
        }

        // Items go to inventory — player uses them manually from backpack
        // Lv8+ duplicate SSR skips inventory (only gives fragments + diamonds)
        if (!skipInventory && this.game.inventory) {
            this.game.inventory.addItem(item);
            if (fx) fx.showToast(I18n.t('gachaToBag', {name: item.name}), 'info');
        }
    }

    showCGPreview(ssrId) {
        const cg = CG_STORIES[ssrId];
        if (!cg) return;
        // Build preview text from lines array (new format) or fallback to text (legacy)
        const story = cg.stories[0];
        let previewText = '';
        if (story.lines && story.lines.length > 0) {
            previewText = story.lines.map(function(l) {
                return l.speaker ? '<b>' + l.speaker + '</b>：' + l.text : l.text;
            }).join('<br>');
        } else if (story.text) {
            previewText = story.text;
        }
        const overlay = document.createElement('div');
        overlay.className = 'cg-preview-overlay';
        overlay.innerHTML = `<div class="cg-preview-card">
            <div class="cg-preview-title">${cg.title}</div>
            <div class="cg-preview-lead">${cg.maleLead}</div>
            <div class="cg-preview-story">📖 ${story.title}<br><p>${previewText}</p></div>
            <button class="cg-preview-close" onclick="this.closest('.cg-preview-overlay').remove()">${I18n.t('gachaClose')}</button>
        </div>`;
        document.body.appendChild(overlay);
    }
}