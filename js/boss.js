// ============================================================
// boss.js — Boss HP, Orders, Level Progression
// ============================================================

class BossSystem {
    constructor(game) {
        this.game = game;
        this.logic = new BossLogic();
        this.timerInterval = null;

        // DOM
        this.bossNameEl = document.getElementById('boss-name');
        this.bossTitleEl = document.getElementById('boss-title');
        this.bossPortraitEl = document.getElementById('boss-portrait');
        this.hpBarEl = document.getElementById('hp-bar-fill');
        this.hpTextEl = document.getElementById('hp-text');
        this.bossHeaderEl = document.getElementById('boss-header');
        this.orderPanel = document.getElementById('main-quest-card');
        this.orderNameEl = null; // removed in new UI
        this.orderItemsEl = document.getElementById('order-items');
        this.orderTimerEl = null; // removed in new UI
        this.submitBtn = document.getElementById('submit-order-btn');

        this.submitBtn.addEventListener('click', () => this.trySubmitOrder());

        // Subscribe to logic events
        globalBus.on('boss:levelLoaded', (data) => this._onLevelLoaded(data));
        globalBus.on('boss:hpChanged', (data) => this.renderHp(data));
        globalBus.on('boss:orderLoaded', (data) => this._onOrderLoaded(data));
        globalBus.on('boss:orderComplete', (data) => this._onOrderComplete(data));
        globalBus.on('boss:orderFailed', (data) => this._onOrderFailed(data));
        globalBus.on('boss:defeated', () => this._onDefeated());
        globalBus.on('boss:gameComplete', () => this._onLoopComplete());
        globalBus.on('boss:timerTick', (data) => this._onTimerTick(data));
    }

    loadLevel(levelIdx) {
        this.clearTimer();
        // Inject loop config for HP scaling
        if (this.game.loop && this.game.loop.currentLoopConfig) {
            this.logic.setLoopConfig(this.game.loop.currentLoopConfig);
        }
        this.logic.loadLevel(levelIdx);
    }

    _onLevelLoaded(data) {
        this.bossNameEl.textContent = data.bossName;
        this.bossTitleEl.textContent = data.bossTitle;
        const span = this.bossPortraitEl.querySelector('span');
        if (span) span.textContent = '';
        this.bossPortraitEl.style.backgroundImage = `url('${data.bossAvatar}')`;
        this.bossPortraitEl.style.backgroundSize = 'cover';
        this.bossPortraitEl.style.backgroundPosition = 'center top';
        this.bossPortraitEl.style.backgroundColor = data.bossColor;
        document.getElementById('game-container').style.background = data.bgGradient;

        // Reset HP bar to 0% (full HP = empty damage bar)
        this.renderHp();

        // Show loop-specific boss intro narrative
        this._showBossNarrativeIntro(data);
    }

    _showBossNarrativeIntro(data) {
        if (!this.game.loop || !this.game.loop.currentLoopConfig) return;
        const loopIdx = String(this.game.loop.loopIndex);
        const narrative = typeof LOOP_NARRATIVES !== 'undefined' ? LOOP_NARRATIVES[loopIdx] : null;
        if (!narrative) return;
        const bossKey = 'boss_' + this.logic.currentLevelIdx;
        const bossNarrative = narrative[bossKey];
        if (bossNarrative && bossNarrative.intro) {
            this.game.dialogue.show(data.bossName, data.bossAvatar, bossNarrative.intro, null);
        }
    }

    renderHp(data) {
        // pct = damage progress: 0% = full HP (empty bar), 100% = defeated (full bar)
        const pct = data ? data.pct : Math.max(0, ((this.logic.totalHp - this.logic.currentHp) / this.logic.totalHp) * 100);
        const hp = data ? data.currentHp : Math.max(0, this.logic.currentHp);
        const total = data ? data.totalHp : this.logic.totalHp;
        this.hpBarEl.style.width = pct + '%';
        this.hpTextEl.textContent = `${Math.max(0, hp)} / ${total}`;

        // Color: low damage progress → green, mid → yellow, high (near defeat) → red
        if (pct > I18n.config('colors.hpHighThreshold')) this.hpBarEl.style.background = I18n.config('colors.hpGradientLow');
        else if (pct > I18n.config('colors.hpMidThreshold')) this.hpBarEl.style.background = I18n.config('colors.hpGradientMid');
        else this.hpBarEl.style.background = I18n.config('colors.hpGradientHigh');
    }

    _onOrderLoaded(data) {
        const order = data.order;
        if (this.orderNameEl) this.orderNameEl.textContent = `${I18n.emoji('clipboard')} ${order.name}`;
        this.orderItemsEl.innerHTML = '';

        for (const req of order.required) {
            const item = ITEMS[req.itemId];
            const tag = document.createElement('div');
            tag.className = 'order-item-tag';
            tag.innerHTML = `<span class="order-item-emoji">${item.emoji}</span>`;
            tag.dataset.itemId = req.itemId;
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                Effects.showChainTooltip(tag, req.itemId);
            });
            this.orderItemsEl.appendChild(tag);
        }

        // Timer — DISABLED: no countdown, orders never time out
        this.clearTimer();
        if (this.orderTimerEl) this.orderTimerEl.style.display = 'none';

        this.updateOrderHighlights();
    }

    _onOrderComplete(data) {
        this.logic.loadOrder(data.nextOrderIdx);
    }

    _onOrderFailed(data) {
        const level = this.logic.getCurrentLevel();
        const order = this.logic.getCurrentOrder();
        this.game.dialogue.show(
            level.bossName,
            level.bossAvatar,
            (order ? order.failText : null) || I18n.t('boss.orderTimeUp'),
            I18n.t('boss.orderFailPlayer')
        ).then(() => {
            this.logic.loadOrder(data.nextOrderIdx);
        });
    }

    _onDefeated() {
        Effects.celebrate();
        AudioManager.playSound('task_complete');
        if (this.game.achievements) {
            this.game.achievements.increment('bossDefeats');
        }
        this._showBossDefeatOutro().then(() => {
            this._checkLoopEvents().then(() => {
                setTimeout(() => {
                    Effects.levelTransition(() => {
                        this.loadLevel(this.logic.currentLevelIdx + 1);
                    });
                }, 1500);
            });
        });
    }

    async _showBossDefeatOutro() {
        if (!this.game.loop || !this.game.loop.currentLoopConfig) return;
        const loopIdx = String(this.game.loop.loopIndex);
        const narrative = typeof LOOP_NARRATIVES !== 'undefined' ? LOOP_NARRATIVES[loopIdx] : null;
        if (!narrative) return;
        const bossKey = 'boss_' + this.logic.currentLevelIdx;
        const bossNarrative = narrative[bossKey];
        if (bossNarrative && bossNarrative.defeatOutro) {
            const level = this.logic.getCurrentLevel();
            await this.game.dialogue.show(
                level ? level.bossName : '???',
                level ? level.bossAvatar : null,
                bossNarrative.defeatOutro,
                null
            );
        }
    }

    async _checkLoopEvents() {
        if (!this.game.loop || typeof LOOP_EVENTS === 'undefined') return;
        const loopIdx = this.game.loop.loopIndex;
        const bossIdx = this.logic.currentLevelIdx;
        const eventKey = loopIdx + '_' + bossIdx;
        const eventData = LOOP_EVENTS[eventKey];
        if (!eventData) return;
        const flag = 'event_' + eventKey;
        if (this.game.loop.hasNarrativeFlag(flag)) return;
        this.game.loop.unlockNarrativeFlag(flag);
        await this.game.dialogue.show(
            eventData.npcName || '📢',
            eventData.npcAvatar || null,
            eventData.text,
            eventData.playerText || null
        );
        if (eventData.goldReward && this.game.currency) this.game.currency.addGold(eventData.goldReward);
        if (eventData.diamondReward && this.game.currency) this.game.currency.addDiamonds(eventData.diamondReward);
        if (eventData.energyReward && this.game.energy) {
            this.game.energy.current = Math.min(this.game.energy.regenCap || this.game.energy.max, this.game.energy.current + eventData.energyReward);
            this.game.energy.render();
        }
        if (eventData.goldReward || eventData.diamondReward || eventData.energyReward) {
            const parts = [];
            if (eventData.goldReward) parts.push('💰 +' + eventData.goldReward);
            if (eventData.diamondReward) parts.push('💎 +' + eventData.diamondReward);
            if (eventData.energyReward) parts.push('⚡ +' + eventData.energyReward);
            this.game.dailyOrders.showToast(I18n.t('bossEventReward', {items: parts.join(' ')}));
        }
    }

    _onTimerTick(data) {
        // UI timer updates handled in setInterval above
    }

    renderTimer() {
        if (!this.orderTimerEl) return;
        this.orderTimerEl.textContent = `${I18n.emoji('timer')} ${this.logic.timerRemaining}s`;
        if (this.logic.timerRemaining <= 5) {
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

    // Check if required items exist on board
    canFulfillOrder() {
        return this.logic.canFulfillOrder(this.game.board);
    }

    updateOrderHighlights() {
        const order = this.logic.getCurrentOrder();
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

        const level = this.logic.getCurrentLevel();
        const order = this.logic.getCurrentOrder();

        this.clearTimer();
        this.logic.beginSubmit();                          // FSM → SUBMITTING

        // ① Consume items from board & animate
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

        // ② Transactional commit: apply damage + advance order + FSM transition
        const result = this.logic.commitSubmit(order.damage);

        // ③ Award diamonds
        const diamondReward = order.diamondReward || 0;
        if (diamondReward > 0 && this.game.currency) {
            this.game.currency.addDiamonds(diamondReward);
        }

        // ④ Immediate save — all state is now consistent.
        // If the player refreshes during the dialogue below, no progress is lost.
        if (this.game.save) this.game.save.saveAll();

        // ═══════════════════════════════════════════════════════════
        // Everything below is presentation-only (safe to interrupt)
        // ═══════════════════════════════════════════════════════════

        // Wait for fly animation
        await new Promise(r => setTimeout(r, 700));

        // Update daily order highlights since board items changed
        if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();

        // Show dialogue (include reward info) — skipBGM so game_bgm keeps playing
        const rewardText = diamondReward > 0 ? '\n' + I18n.emoji('diamond') + ' ' + I18n.t('boss.diamondReward', {count: diamondReward}) : '';
        await this.game.dialogue.show(
            level.bossName,
            level.bossAvatar,
            order.dialogue.npc + rewardText,
            order.dialogue.player,
            { skipBGM: true }
        );

        // ⑤ Trigger UI progression events (order complete / boss defeated)
        if (result.isDefeated) {
            globalBus.emit('boss:defeated', { levelIdx: this.logic.currentLevelIdx });
        } else {
            this.logic.loadOrder(this.logic.currentOrderIdx);
            this.updateOrderHighlights();
        }
    }

    defeatBoss() {
        this.logic.defeatBoss();
    }

    /**
     * Called when all 4 bosses are defeated — loop complete!
     * Instead of ending the game, transition to next loop.
     */
    _onLoopComplete() {
        Effects.celebrate();

        // Show parade briefly as celebration
        const paradeOverlay = document.getElementById('parade-overlay');
        if (paradeOverlay) {
            paradeOverlay.classList.add('active');
            Effects.celebrate();
            // After parade, trigger loop completion
            setTimeout(() => {
                paradeOverlay.classList.remove('active');
                if (this.game && this.game.completeCurrentLoop) {
                    this.game.completeCurrentLoop();
                }
            }, 3000);
        } else {
            // No parade overlay — go straight to loop completion
            setTimeout(() => {
                if (this.game && this.game.completeCurrentLoop) {
                    this.game.completeCurrentLoop();
                }
            }, 1500);
        }
    }

    // Keep original for reference / future use
    showGameComplete() {
        const paradeOverlay = document.getElementById('parade-overlay');
        if (paradeOverlay) {
            paradeOverlay.classList.add('active');
            Effects.celebrate();

            setTimeout(() => {
                const overlay = document.getElementById('game-complete-overlay');
                overlay.classList.add('active');
                Effects.celebrate();
            }, 6000);
        } else {
            const overlay = document.getElementById('game-complete-overlay');
            overlay.classList.add('active');
            Effects.celebrate();
        }
    }
}
