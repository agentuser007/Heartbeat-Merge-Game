// ============================================================
// boss.js — Boss HP, Orders, Level Progression
// ============================================================

class BossSystem {
    constructor(game) {
        this.game = game;
        this.currentLevelIdx = 0;
        this.currentOrderIdx = 0;
        this.currentHp = 0;
        this.totalHp = 0;
        this.timerInterval = null;
        this.timerRemaining = 0;
        this.orderFailed = false;

        // DOM
        this.bossNameEl = document.getElementById('boss-name');
        this.bossTitleEl = document.getElementById('boss-title');
        this.bossPortraitEl = document.getElementById('boss-portrait');
        this.hpBarEl = document.getElementById('hp-bar-fill');
        this.hpTextEl = document.getElementById('hp-text');
        this.orderPanel = document.getElementById('order-panel');
        this.orderNameEl = document.getElementById('order-name');
        this.orderItemsEl = document.getElementById('order-items');
        this.orderTimerEl = document.getElementById('order-timer');
        this.submitBtn = document.getElementById('submit-order-btn');

        this.submitBtn.addEventListener('click', () => this.trySubmitOrder());
    }

    loadLevel(levelIdx) {
        if (levelIdx >= LEVELS.length) {
            this.showGameComplete();
            return;
        }
        this.currentLevelIdx = levelIdx;
        this.currentOrderIdx = 0;
        const level = LEVELS[levelIdx];
        this.currentHp = level.totalHp;
        this.totalHp = level.totalHp;

        // Update UI
        this.bossNameEl.textContent = level.bossName;
        this.bossTitleEl.textContent = level.bossTitle;
        const span = this.bossPortraitEl.querySelector('span');
        if (span) span.textContent = '';
        this.bossPortraitEl.style.backgroundImage = `url('${level.bossAvatar}')`;
        this.bossPortraitEl.style.backgroundSize = 'cover';
        this.bossPortraitEl.style.backgroundPosition = 'center top';
        this.bossPortraitEl.style.backgroundColor = level.bossColor;

        // Change background
        document.getElementById('game-container').style.background = level.bgGradient;

        this.renderHp();
        this.loadOrder(0);
    }

    renderHp() {
        const pct = Math.max(0, (this.currentHp / this.totalHp) * 100);
        this.hpBarEl.style.width = pct + '%';
        this.hpTextEl.textContent = `${Math.max(0, this.currentHp)} / ${this.totalHp}`;

        // Color based on HP
        if (pct > 50) this.hpBarEl.style.background = 'linear-gradient(90deg, #FF6B6B, #EE5A24)';
        else if (pct > 25) this.hpBarEl.style.background = 'linear-gradient(90deg, #FECA57, #FF9F43)';
        else this.hpBarEl.style.background = 'linear-gradient(90deg, #FF3838, #C0392B)';
    }

    loadOrder(orderIdx) {
        const level = LEVELS[this.currentLevelIdx];
        if (orderIdx >= level.orders.length) {
            // All orders exhausted — but boss might still have HP
            // This shouldn't happen with correct data, but handle gracefully
            this.defeatBoss();
            return;
        }
        this.currentOrderIdx = orderIdx;
        const order = level.orders[orderIdx];
        this.orderFailed = false;

        // Render order
        this.orderNameEl.textContent = `📋 ${order.name}`;
        this.orderItemsEl.innerHTML = '';

        for (const req of order.required) {
            const item = ITEMS[req.itemId];
            const tag = document.createElement('div');
            tag.className = 'order-item-tag';
            tag.innerHTML = `<span class="order-item-emoji">${item.emoji}</span><span class="order-item-name">${item.name}</span><span class="order-item-count">×${req.count}</span>`;
            tag.dataset.itemId = req.itemId;
            this.orderItemsEl.appendChild(tag);
        }

        // Timer
        this.clearTimer();
        if (order.isTimed) {
            this.timerRemaining = order.timeLimit;
            this.orderTimerEl.style.display = 'block';
            this.renderTimer();
            this.timerInterval = setInterval(() => {
                this.timerRemaining--;
                this.renderTimer();
                if (this.timerRemaining <= 5) {
                    Effects.startTimerWarning(this.orderPanel);
                }
                if (this.timerRemaining <= 0) {
                    this.clearTimer();
                    this.onOrderFailed(order);
                }
            }, 1000);
        } else {
            this.orderTimerEl.style.display = 'none';
        }

        this.updateOrderHighlights();
    }

    renderTimer() {
        this.orderTimerEl.textContent = `⏱️ ${this.timerRemaining}s`;
        if (this.timerRemaining <= 5) {
            this.orderTimerEl.classList.add('urgent');
        } else {
            this.orderTimerEl.classList.remove('urgent');
        }
    }

    clearTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        Effects.stopTimerWarning(this.orderPanel);
    }

    onOrderFailed(order) {
        this.orderFailed = true;
        // Show failure message
        this.game.dialogue.show(
            LEVELS[this.currentLevelIdx].bossName,
            LEVELS[this.currentLevelIdx].bossAvatar,
            order.failText || '时间到了……失败了！',
            '（唉，下次要更快才行……）'
        ).then(() => {
            // Move to next order
            this.loadOrder(this.currentOrderIdx + 1);
        });
    }

    // Check if required items exist on board
    canFulfillOrder() {
        const level = LEVELS[this.currentLevelIdx];
        const order = level.orders[this.currentOrderIdx];
        if (!order) return false;

        for (const req of order.required) {
            const found = this.game.board.findAllItems(req.itemId);
            if (found.length < req.count) return false;
        }
        return true;
    }

    updateOrderHighlights() {
        const level = LEVELS[this.currentLevelIdx];
        const order = level.orders[this.currentOrderIdx];
        if (!order) return;

        // Update tag states
        const tags = this.orderItemsEl.querySelectorAll('.order-item-tag');
        tags.forEach(tag => {
            const itemId = tag.dataset.itemId;
            const req = order.required.find(r => r.itemId === itemId);
            const found = this.game.board.findAllItems(itemId);
            if (found.length >= req.count) {
                tag.classList.add('fulfilled');
            } else {
                tag.classList.remove('fulfilled');
            }
        });

        // Submit button
        if (this.canFulfillOrder()) {
            this.submitBtn.classList.add('ready');
            this.submitBtn.disabled = false;
        } else {
            this.submitBtn.classList.remove('ready');
            this.submitBtn.disabled = true;
        }
    }

    async trySubmitOrder() {
        if (!this.canFulfillOrder()) return;

        const level = LEVELS[this.currentLevelIdx];
        const order = level.orders[this.currentOrderIdx];

        this.clearTimer();

        // Consume items from board & animate
        for (const req of order.required) {
            for (let n = 0; n < req.count; n++) {
                const idx = this.game.board.findItem(req.itemId);
                if (idx !== -1) {
                    const cellEl = this.game.board.getCellEl(idx);
                    Effects.heartFlyTo(cellEl);
                    this.game.board.removeItem(idx);
                }
            }
        }

        // Wait for fly animation
        await new Promise(r => setTimeout(r, 700));

        // Deal damage
        this.currentHp -= order.damage;
        this.renderHp();

        // Show dialogue
        await this.game.dialogue.show(
            level.bossName,
            level.bossAvatar,
            order.dialogue.npc,
            order.dialogue.player
        );

        // Check if boss defeated
        if (this.currentHp <= 0) {
            this.defeatBoss();
        } else {
            // Next order
            this.loadOrder(this.currentOrderIdx + 1);
        }
    }

    defeatBoss() {
        Effects.celebrate();

        // Unlock cells
        if (UNLOCK_PER_BOSS[this.currentLevelIdx]) {
            this.game.board.unlockCells(UNLOCK_PER_BOSS[this.currentLevelIdx]);
        }

        // Next level after a delay
        setTimeout(() => {
            Effects.levelTransition(() => {
                this.loadLevel(this.currentLevelIdx + 1);
            });
        }, 1500);
    }

    showGameComplete() {
        const overlay = document.getElementById('game-complete-overlay');
        overlay.classList.add('active');
        Effects.celebrate();
    }
}
