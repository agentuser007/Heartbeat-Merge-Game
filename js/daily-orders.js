// ============================================================
// daily-orders.js — Daily Order System (Gold Income)
// ============================================================

class DailyOrderSystem {
    constructor(game) {
        this.game = game;
        this.orderPool = [];
        this.activeOrders = [];
        this.maxActive = DAILY_ORDER_CONFIG.MAX_ACTIVE;
        this.currentLoopIndex = 1;

        // DOM — now targets bottom sheet + quest carousel
        this.sheetEl = document.getElementById('daily-sheet');
        this.listEl = document.getElementById('daily-order-list');
        this.carouselEl = document.getElementById('quest-carousel');
    }

    init(orderPoolData, loopIndex) {
        this.orderPool = orderPoolData || [];
        this.currentLoopIndex = loopIndex || 1;
        this.rollNewOrders();
    }

    /**
     * Get max active daily orders for a given loop index.
     * Loop 1-2: 3 orders, Loop 3-4: 4 orders, Loop 5+: 5 orders
     */
    _getMaxActiveForLoop(loopIndex) {
        if (loopIndex >= 5) return 5;
        if (loopIndex >= 3) return 4;
        return DAILY_ORDER_CONFIG.MAX_ACTIVE; // default 3
    }

    /**
     * Update the loop index and re-roll orders if needed.
     */
    setLoopIndex(loopIndex) {
        this.currentLoopIndex = loopIndex || 1;
    }

    // Open the daily orders bottom sheet (called from quest card or nav)
    open() {
        if (this.sheetEl) {
            this.sheetEl.classList.add('open');
            this.renderOrders();
        }
    }

    close() {
        if (this.sheetEl) {
            this.sheetEl.classList.remove('open');
        }
    }

    // Pick random orders from pool (loop-aware filtering)
    rollNewOrders() {
        // Filter pool by current loop index
        const loopIdx = this.currentLoopIndex || 1;
        const available = this.orderPool.filter(order => (order.minLoop || 1) <= loopIdx);

        // Determine max active orders for this loop
        const maxActive = this._getMaxActiveForLoop(loopIdx);

        const shuffled = [...available].sort(() => Math.random() - 0.5);
        this.activeOrders = shuffled.slice(0, maxActive).map(order => ({
            ...order,
            fulfilled: false
        }));
        this.renderOrders();
        this.renderCarouselCards();
    }

    // Render compact daily order cards in the quest carousel
    renderCarouselCards() {
        const carousel = document.getElementById('quest-carousel');
        if (!carousel) return;
        this.sortActiveOrders();

        // Remove previously generated daily quest cards (no wrapper div needed)
        carousel.querySelectorAll('.daily-quest-carousel-card').forEach(el => el.remove());

        this.activeOrders.forEach((order, idx) => {
            // Skip fulfilled orders — remove completed tasks from carousel
            if (order.fulfilled) return;

            const card = document.createElement('div');
            card.className = 'quest-card daily-quest-carousel-card';

            // Boss avatar container — same style as main-quest-card portrait
            const avatarEl = document.createElement('div');
            avatarEl.className = 'daily-npc-avatar';
            avatarEl.style.backgroundImage = "url('assets/avatar/boss_bg.webp')";
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center bottom';
            avatarEl.style.backgroundRepeat = 'no-repeat';

            // Details container on the right side of the card
            const detailsEl = document.createElement('div');
            detailsEl.className = 'daily-card-details';

            // Body container (column: tag pill on top, items row below)
            const bodyEl = document.createElement('div');
            bodyEl.className = 'daily-carousel-body';

            // Row 1: "Daliy" tag pill — inside body as first child
            const tagPill = document.createElement('div');
            tagPill.className = 'daily-npc-tag-pill';
            const tagText = document.createElement('span');
            tagText.className = 'daily-npc-tag-text';
            tagText.textContent = 'Daliy';
            tagPill.appendChild(tagText);
            bodyEl.appendChild(tagPill);

            // Row 2: Required items + submit button (wrapped in items-row)
            const itemsRow = document.createElement('div');
            itemsRow.className = 'daily-carousel-items-row';

            // Required items — icon only, no name/count
            const reqEl = document.createElement('div');
            reqEl.className = 'daily-carousel-req';
            order.required.forEach(req => {
                const item = ITEMS[req.itemId];
                if (!item) return;
                const found = this.game.board.findAllItems(req.itemId);
                const tag = document.createElement('span');
                tag.className = 'carousel-req-tag' + (found.length >= req.count ? ' has-item' : '');
                tag.innerHTML = `<span class="order-item-emoji">${item.emoji}</span>`;
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Effects.showChainTooltip(tag, req.itemId);
                });
                reqEl.appendChild(tag);
            });

            // Submit button directly in carousel card
            const btn = document.createElement('button');
            btn.className = 'daily-carousel-submit-btn';
            btn.type = 'button';
            btn.textContent = I18n.t('dailyOrder.submit');
            const canSubmit = !order.fulfilled && this.canFulfill(order);
            btn.disabled = !canSubmit;
            if (canSubmit) {
                btn.classList.add('ready');
                card.classList.add('ready');
            }
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!order.fulfilled && this.canFulfill(order)) {
                    this.submitOrder(idx);
                }
            });
            card.addEventListener('click', (e) => {
                if (!order.fulfilled && this.canFulfill(order)) {
                    this.submitOrder(idx);
                }
            });

            itemsRow.appendChild(reqEl);
            itemsRow.appendChild(btn);
            bodyEl.appendChild(itemsRow);
            detailsEl.appendChild(bodyEl);

            card.appendChild(avatarEl);
            card.appendChild(detailsEl);

            // Figma: Reward preview tooltip on daily quest card
            if (order.goldReward) {
                const preview = document.createElement('div');
                preview.className = 'order-reward-preview';
                const line = document.createElement('div');
                line.className = 'order-reward-line';
                line.innerHTML = `+${CurrencyUI.formatGold(order.goldReward)} <span style="font-size:10px">💰</span>`;
                preview.appendChild(line);
                card.style.position = 'relative';
                card.appendChild(preview);
            }

            carousel.appendChild(card);
        });
        this.renderNpcSilhouettes();
    }

    renderOrders() {
        if (!this.listEl) return;
        this.sortActiveOrders();
        this.listEl.innerHTML = '';

        this.activeOrders.forEach((order, idx) => {
            // Skip fulfilled orders — remove completed tasks from display
            if (order.fulfilled) return;
            const card = document.createElement('div');
            card.className = 'daily-order-card' + (order.fulfilled ? ' fulfilled' : '');
            card.dataset.index = idx;

            // Order name
            const nameEl = document.createElement('div');
            nameEl.className = 'daily-order-name';
            nameEl.textContent = order.name;

            // Required items
            const reqEl = document.createElement('div');
            reqEl.className = 'daily-order-req';
            order.required.forEach(req => {
                const item = ITEMS[req.itemId];
                if (!item) return;
                const found = this.game.board.findAllItems(req.itemId);
                const tag = document.createElement('span');
                tag.className = 'daily-req-tag' + (found.length >= req.count ? ' has-item' : '');
                tag.textContent = `${item.emoji}`;
                reqEl.appendChild(tag);
            });

            // Reward
            const rewardEl = document.createElement('div');
            rewardEl.className = 'daily-order-reward';
            rewardEl.textContent = `${I18n.emoji('coin')} +${order.goldReward}`;

            // Submit button
            const btn = document.createElement('button');
            btn.className = 'daily-submit-btn';
            btn.type = 'button';
            btn.textContent = I18n.t('dailyOrder.submit');
            const canSubmit = !order.fulfilled && this.canFulfill(order);
            btn.disabled = !canSubmit;
            if (canSubmit) {
                btn.classList.add('ready');
            }
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!order.fulfilled && this.canFulfill(order)) {
                    this.submitOrder(idx);
                }
            });

            card.appendChild(nameEl);
            card.appendChild(reqEl);
            card.appendChild(rewardEl);
            if (!order.fulfilled) {
                card.appendChild(btn);
            } else {
                const doneEl = document.createElement('div');
                doneEl.className = 'daily-order-done';
                doneEl.textContent = I18n.t('dailyOrder.completed');
                card.appendChild(doneEl);
            }

            this.listEl.appendChild(card);
        });
    }

    // Dynamic sort: completable daily orders first, others after
    sortActiveOrders() {
        this.activeOrders.sort((a, b) => {
            const aCan = !a.fulfilled && this.canFulfill(a);
            const bCan = !b.fulfilled && this.canFulfill(b);
            if (aCan !== bCan) return aCan ? -1 : 1;
            return 0;
        });
    }

    canFulfill(order) {
        for (const req of order.required) {
            const found = this.game.board.findAllItems(req.itemId);
            if (found.length < req.count) return false;
        }
        return true;
    }

    submitOrder(idx) {
        const order = this.activeOrders[idx];
        if (!order || order.fulfilled || !this.canFulfill(order)) return;

        // Consume items
        for (const req of order.required) {
            for (let n = 0; n < req.count; n++) {
                const cellIdx = this.game.board.findItem(req.itemId);
                if (cellIdx !== -1) {
                    const cellEl = this.game.board.getCellEl(cellIdx);
                    Effects.spawnParticles(cellEl, 4, I18n.emoji('coin'));
                    this.game.board.removeItem(cellIdx);
                }
            }
        }

        // Award gold (apply heroine gold multiplier + loop daily bonus)
        let goldAmount = order.goldReward;
        if (this.game.heroine) {
            goldAmount = Math.floor(goldAmount * this.game.heroine.getGoldMultiplier());
        }
        // Apply loop daily bonus multiplier (from meta upgrade)
        if (this.game.loop && this.game.loop.getDailyBonusMultiplier) {
            goldAmount = Math.floor(goldAmount * this.game.loop.getDailyBonusMultiplier());
        }
        this.game.currency.addGold(goldAmount);
        order.fulfilled = true;

        if (this.game.achievements) {
            this.game.achievements.increment('dailyCompleted');
        }

        // Play task complete sound
        AudioManager.playSound('task_complete');

        // Show brief toast
        this.showToast(order.dialogue || I18n.t('dailyOrder.orderComplete'));

        // Re-render
        this.renderOrders();
        this.renderCarouselCards();

        // Update boss order highlights since board items changed
        if (this.game.boss) this.game.boss.updateOrderHighlights();

        // Check if all orders completed, then refresh
        if (this.activeOrders.every(o => o.fulfilled)) {
            setTimeout(() => {
                this.rollNewOrders();
                this.showToast(I18n.emoji('dailyOrder') + ' ' + I18n.t('dailyOrder.refreshed'));
            }, 1000);
        }
    }

    showToast(text) {
        const toast = document.createElement('div');
        toast.className = 'daily-toast';
        toast.textContent = text;
        (document.getElementById('toast-root') || document.body).appendChild(toast);
        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // Called when board changes to update button states
    updateHighlights() {
        this.renderOrders();
        this.renderCarouselCards();
        this.renderNpcSilhouettes();
    }

    // Render NPC silhouette cards in boss-header area (图2 layout) - Now a no-op
    renderNpcSilhouettes() {
        // No-op: Daily silhouettes are now inside the quest carousel cards (.daily-npc-avatar) per Fig 2.
    }
}