// ============================================================
// main.js — Game Init & Wiring (Loop Mode)
// ============================================================

class Game {
    constructor() {
        this.energy = null;
        this.board = null;
        this.boss = null;
        this.dialogue = null;
        this.currency = null;
        this.dailyOrders = null;
        this.heroine = null;
        this.gacha = null;
        this.inventory = null;
        this.fragmentSystem = null;
        this.cgAlbum = null;
        this.save = null;
        this.collection = null;
        this.achievements = null;
        this.loop = null;  // LoopLogic instance
        this.ad = null;    // AdSystem instance
        this._timeFreezeBonus = 0;
        this._luckyCoinsLeft = 0;
        this._doubleGenTurns = 0;
        this._actionCount = 0;
    }

    async init() {
        // ---- One-time listener to resume BGM if autoplay was blocked ----
        const resumeBGM = () => {
            AudioManager.tryResumeBGM();
            document.removeEventListener('click', resumeBGM);
            document.removeEventListener('touchstart', resumeBGM);
        };
        document.addEventListener('click', resumeBGM);
        document.addEventListener('touchstart', resumeBGM);

        // ---- CrazyGames SDK: loading start ----
        CrazyGamesSDK.loadingStart();

        // ---- CrazyGames SDK: initialize ----
        await CrazyGamesSDK.init();

        // ---- Language selection (before I18n init) ----
        const savedLocale = localStorage.getItem('i18n_locale');
        if (!savedLocale) {
            // No saved language — hide loading overlay entirely so the
            // language selection overlay is fully visible and clickable.
            const _loadingEl = document.getElementById('loading-overlay');
            if (_loadingEl) _loadingEl.style.display = 'none';

            const selectedLocale = await I18n.showLangSelectIfNeeded();

            // Restore loading overlay after language is chosen
            if (_loadingEl) _loadingEl.style.display = '';
            if (selectedLocale) {
                // User just chose a language — init with that locale
                try { await I18n.init(selectedLocale); } catch(e) { console.warn('I18n init failed, using defaults', e); }
            } else {
                try { await I18n.init(); } catch(e) { console.warn('I18n init failed, using defaults', e); }
            }
        } else {
            // Already has saved locale — skip overlay
            try { await I18n.init(); } catch(e) { console.warn('I18n init failed, using defaults', e); }
        }

        await loadGameData();
        if (I18n._loaded) I18n.applyToDOM();

        // Listen for locale changes to refresh loop badge (since it no longer has data-i18n)
        window.addEventListener('localeChanged', () => {
            this.updateLoopUI();
        });

        this.effects = Effects;
        this.dialogue = new DialogueSystem();
        this.energy = new EnergySystem();
        this.currency = new CurrencyManager(this);
        this.board = new Board(this);
        this.boss = new BossSystem(this);
        this.dailyOrders = new DailyOrderSystem(this);
        this.heroine = new HeroineSystem(this);
        this.collection = new CollectionSystem(this);
        this.achievements = new AchievementSystem(this);
        this.inventory = new InventorySystem(this);
        this.gacha = new GachaSystem(this);
        this.fragmentSystem = new FragmentSystem(this);
        this.cgAlbum = new CGAlbumSystem(this);
        this.loop = new LoopLogic();
        this.ad = new AdSystem(this);
        this.save = new SaveSystem(this);

        // Initialize audio manager
        AudioManager.preloadAll();

        // Initialize daily orders with loaded data (pass current loop index)
        this.dailyOrders.init(DAILY_ORDER_POOL, this.loop ? this.loop.loopIndex : 1);

        // Wire bottom navigation bar
        this.setupBottomNav();

        // Wire bottom sheet close buttons & swipe-to-close
        this.setupBottomSheets();

        // Wire click sound for interactive elements
        this.setupClickSound();

        // Wire quest card click → open daily orders sheet
        this.setupQuestCarousel();

        // Populate game complete overlay
        document.querySelector('.complete-emoji').textContent = UI_TEXT.game_complete.emoji;
        document.querySelector('.complete-title').textContent = UI_TEXT.game_complete.title;
        document.querySelector('.complete-subtitle').textContent = UI_TEXT.game_complete.subtitle;
        document.querySelector('.restart-btn').textContent = UI_TEXT.game_complete.button;

        // C-05 fix: Start energy regen AFTER subsystems are created, before save load
        this.energy.startRegen();

        // Try loading save
        if (this.save.hasSave()) {
            // Try legacy migration first
            this.save.migrateLegacySave();

            const loaded = this.save.loadAll();
            if (loaded) {
                // If we have a loop config, apply it
                if (this.loop.currentLoopConfig) {
                    this.loop.applyLoopConfig(this.loop.currentLoopConfig);
                } else {
                    // No loop config in save — build for current loopIndex
                    const config = this.loop.buildLoopConfig(this.loop.loopIndex);
                    this.loop.applyLoopConfig(config);
                }
                this.board.renderAll();
                this.updateLoopUI();

                // Safety net: ensure daily orders are populated after save load
                if (this.dailyOrders && (!this.dailyOrders.activeOrders || this.dailyOrders.activeOrders.length === 0 || this.dailyOrders.activeOrders.every(o => o.fulfilled))) {
                    this.dailyOrders.rollNewOrders();
                }

                // ---- CrazyGames SDK: loading done, gameplay starts ----
                CrazyGamesSDK.loadingStop();
                CrazyGamesSDK.gameplayStart();

                // Dismiss loading overlay
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) { loadingEl.classList.add('fade-out'); setTimeout(() => loadingEl.remove(), 600); }

                // Start game BGM
                AudioManager.playBGM('game_bgm');

                return;
            }
        }

        // Fresh start — new meta game + first run
        this.startNewMetaGame();

        // ---- CrazyGames SDK: loading done, gameplay starts ----
        CrazyGamesSDK.loadingStop();
        CrazyGamesSDK.gameplayStart();

        // Dismiss loading overlay
        const _loadingEl = document.getElementById('loading-overlay');
        if (_loadingEl) { _loadingEl.classList.add('fade-out'); setTimeout(() => _loadingEl.remove(), 600); }

        // Start game BGM
        AudioManager.playBGM('game_bgm');
    }

    // ============================================================
    // LOOP MODE LIFECYCLE
    // ============================================================

    /**
     * Start a brand new meta game (first time or after full reset).
     */
    async startNewMetaGame() {
        this.loop = new LoopLogic();
        const config = this.loop.buildLoopConfig(1);
        this.loop.applyLoopConfig(config);

        // Reset all run state to fresh
        this.resetRunState();

        // Place initial generators and load first boss
        this.board.renderAll();
        this.board.placeInitialGenerators();
        this.boss.loadLevel(0);

        // Show generic intro, then Loop 1 narrative
        await this.showIntro();
        await this.showLoopIntro();

        this.updateLoopUI();

        // Save
        this.save.saveAll();
    }

    /**
     * Start a new run for the given loop index.
     */
    startNewRun(loopIndex) {
        // Build and apply new loop config
        const config = this.loop.buildLoopConfig(loopIndex);
        this.loop.applyLoopConfig(config);

        // Reset run state
        this.resetRunState();

        // Place initial generators and load first boss
        this.board.renderAll();
        this.board.placeInitialGenerators();
        this.boss.loadLevel(0);

        // Show loop intro narrative
        this.showLoopIntro();

        this.updateLoopUI();

        // Save both meta and run
        this.save.saveAll();

        // ---- CrazyGames SDK: gameplay resumes ----
        CrazyGamesSDK.gameplayStart();
    }

    /**
     * Complete the current loop and transition to the next.
     * Called when the 4th boss is defeated.
     */
    completeCurrentLoop() {
        // Calculate rewards first (before incrementing loopIndex)
        const summary = {
            newDiscoveries: 0,
            achievementsUnlocked: 0
        };
        const rewards = this.loop.calculateLoopRewards(this.loop.loopIndex, summary);

        // Award loop tokens
        this.loop.loopTokens += rewards.loopTokens;

        // Increment loop index
        const nextLoopIndex = this.loop.loopIndex + 1;

        // Save meta immediately (so progress isn't lost even if user closes browser)
        this.save.saveMeta();
        // Clear old run data
        this.save.clearRun();

        // ---- CrazyGames SDK: celebrate & gameplay stop ----
        CrazyGamesSDK.happytime();
        CrazyGamesSDK.gameplayStop();

        // Show loop summary UI
        this.showLoopSummary(rewards, nextLoopIndex);
    }

    /**
     * Reset all run-level state for a new loop.
     * Keeps meta state intact (loop, heroine upgrades, diamonds, collection, etc.)
     */
    resetRunState() {
        // Gold: reset to starting value + meta bonuses
        const startingGold = this.loop.getStartingGold();
        this.currency.gold = startingGold;
        this.currency.render();

        // Diamonds: NOT reset (meta currency), but add meta bonus
        const startingDiamonds = this.loop.getStartingDiamonds();
        this.currency.diamonds = (this.currency.diamonds || 0) + startingDiamonds;
        this.currency.render();

        // Energy: reset to base, then apply permanent upgrades + meta bonus
        this.energy.stopRegen();
        this.energy.max = GAME_CONFIG.MAX_ENERGY;
        this.energy.regenCap = GAME_CONFIG.ENERGY_REGEN_CAP || GAME_CONFIG.MAX_ENERGY;
        this.energy.regenInterval = GAME_CONFIG.ENERGY_REGEN_INTERVAL;
        // Apply heroine permanent upgrades to energy
        this.applyHeroineEffectsToEnergy();
        // Set current energy to max + meta bonus
        const energyBonus = this.loop.getStartingEnergyBonus();
        this.energy.current = this.energy.max + energyBonus;
        this.energy.render();
        // C-04 fix: Restart energy regen timer with reset values
        this.energy.startRegen();

        // Board: full reset
        this.board.cells = new Array(this.board.cols * this.board.rows).fill(null);
        this.board.locked = new Set(LOCKED_CELLS_INITIAL || []);
        this.board.cellsUnlocked = 0;
        this.board.generatorStates = {};
        this.board.renderAll();

        // Boss: reset (C-04 fix: also reset orderFailed and timerRemaining)
        this.boss.clearTimer();
        this.boss.logic.currentLevelIdx = -1;
        this.boss.logic.currentOrderIdx = 0;
        this.boss.logic.currentHp = 0;
        this.boss.logic.totalHp = 0;
        this.boss.logic.orderFailed = false;
        this.boss.logic.timerRemaining = 0;
        this.boss.logic.fsm.reset('IDLE');

        // Inventory: clear all items
        if (this.inventory) {
            this.inventory.items = {};
            this.inventory.updateBadge();
        }

        // Buffs: clear
        this._timeFreezeBonus = 0;
        this._luckyCoinsLeft = 0;
        this._doubleGenTurns = 0;

        // Daily orders: update loop index and re-roll
        if (this.dailyOrders) {
            this.dailyOrders.setLoopIndex(this.loop.loopIndex);
            this.dailyOrders.rollNewOrders();
        }

        // Action counter: reset
        this._actionCount = 0;
    }

    /**
     * Apply permanent heroine upgrades to energy system.
     */
    applyHeroineEffectsToEnergy() {
        if (!this.heroine) return;
        for (const upg of HEROINE_UPGRADES) {
            const lvl = this.heroine.upgrades[upg.id];
            if (lvl >= 0 && lvl < upg.levels.length) {
                this.heroine.applyUpgrade(upg.id, upg.levels[lvl].value);
            }
        }
    }

    // ============================================================
    // LOOP UI
    // ============================================================

    updateLoopUI() {
        const loopBadge = document.getElementById('loop-badge');
        if (loopBadge) {
            const config = this.loop.currentLoopConfig;
            if (config) {
                loopBadge.textContent = I18n.t('loop.titleDefault', {index: config.loopIndex});
                loopBadge.style.display = 'block';
            }
        }
        const rewardBadge = document.getElementById('reward-badge');
        if (rewardBadge && this.loop.currentLoopConfig) {
            const rm = this.loop.currentLoopConfig.rewardMultiplier;
            if (rm > 1) {
                rewardBadge.textContent = I18n.t('loop.rewardBadge', {multiplier: rm.toFixed(1)});
                rewardBadge.style.display = 'block';
            } else {
                rewardBadge.style.display = 'none';
            }
        }
    }

    showLoopIntro() {
        const loopIdx = String(this.loop.loopIndex);
        const narrative = LOOP_NARRATIVES[loopIdx];
        if (narrative && narrative.loopIntro) {
            return this.dialogue.show(
                '🏫',
                null,
                narrative.loopIntro,
                I18n.t('loop.newStart'),
                { skipBGM: true }
            );
        }
    }

    showLoopSummary(rewards, nextLoopIndex) {
        const overlay = document.getElementById('loop-summary-overlay');
        if (!overlay) {
            // Fallback: just start next run
            this.startNewRun(nextLoopIndex);
            return;
        }

        const loopIdx = this.loop.loopIndex;
        const narrative = LOOP_NARRATIVES[String(loopIdx)];
        const outroText = narrative ? narrative.loopOutro : I18n.t('loop.congratsClear');

        const summaryLoopNum = overlay.querySelector('.summary-loop-num');
        if (summaryLoopNum) summaryLoopNum.textContent = I18n.t('loop.loopComplete', {index: loopIdx});

        const summaryOutro = overlay.querySelector('.summary-outro');
        if (summaryOutro) summaryOutro.textContent = outroText;

        const summaryTokens = overlay.querySelector('.summary-tokens');
        if (summaryTokens) summaryTokens.textContent = I18n.t('loop.tokensEarned', {count: rewards.loopTokens});

        const summaryTokenDetail = overlay.querySelector('.summary-token-detail');
        if (summaryTokenDetail) {
            summaryTokenDetail.textContent = I18n.t('loop.tokenDetail', {base: rewards.baseTokens, bonus: rewards.bonusTokens});
        }

        const summaryTokenBalance = overlay.querySelector('.summary-token-balance');
        if (summaryTokenBalance) summaryTokenBalance.textContent = I18n.t('loop.tokenBalance', {balance: this.loop.loopTokens});

        // Meta shop
        this.renderMetaShop(overlay);

        // Next loop preview
        const nextConfig = this.loop.buildLoopConfig(nextLoopIndex);
        const summaryNext = overlay.querySelector('.summary-next');
        if (summaryNext) {
            summaryNext.textContent = I18n.t('loop.nextLoop', {index: nextLoopIndex, title: nextConfig.title, hp: nextConfig.hpMultiplier.toFixed(2), reward: nextConfig.rewardMultiplier.toFixed(2)});
        }

        // Next loop button
        const nextBtn = overlay.querySelector('.summary-next-btn');
        if (nextBtn) {
            nextBtn.onclick = () => {
                overlay.classList.remove('active');
                this.startNewRun(nextLoopIndex);
            };
        }

        // Show overlay
        overlay.classList.add('active');
        Effects.celebrate();
    }

    renderMetaShop(overlay) {
        const shopContainer = overlay.querySelector('.meta-shop-list');
        if (!shopContainer) return;

        shopContainer.innerHTML = '';
        const upgradeIds = ['startingGold', 'startingDiamonds', 'startingEnergy', 'dailyBonus'];

        for (const id of upgradeIds) {
            const lvl = this.loop.metaUpgrades[id] || 0;
            const maxLvl = this.loop.getMetaUpgradeMaxLevel(id);
            const cost = this.loop.getMetaUpgradeCost(id, lvl);
            const icon = this.loop.getMetaUpgradeIcon(id);
            const name = this.loop.getMetaUpgradeName(id);
            const desc = this.loop.getMetaUpgradeDesc(id);
            const currentEffect = this.loop.getMetaUpgradeEffect(id, lvl);
            const nextEffect = this.loop.getMetaUpgradeEffect(id, lvl + 1);
            const canAfford = this.loop.loopTokens >= cost;
            const maxed = lvl >= maxLvl;

            const card = document.createElement('div');
            card.className = 'meta-shop-card' + (maxed ? ' maxed' : '');

            const infoEl = document.createElement('div');
            infoEl.className = 'meta-shop-info';
            infoEl.innerHTML = '<span class="meta-shop-icon">' + icon + '</span>' +
                '<div class="meta-shop-text">' +
                '<div class="meta-shop-name">' + name + ' Lv.' + lvl + '/' + maxLvl + '</div>' +
                '<div class="meta-shop-desc">' + desc + '</div>' +
                '<div class="meta-shop-effect">' + (maxed ? I18n.t('loop.maxedEffect', {effect: currentEffect}) : I18n.t('loop.currentEffect', {effect: currentEffect}) + I18n.t('loop.nextEffect', {effect: nextEffect})) + '</div>' +
                '</div>';

            const btn = document.createElement('button');
            btn.className = 'meta-shop-buy-btn' + (canAfford && !maxed ? ' affordable' : '');
            btn.disabled = !canAfford || maxed;
            btn.textContent = maxed ? I18n.t('loop.maxed') : '🏫 ' + cost;

            if (!maxed && canAfford) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.loop.purchaseMetaUpgrade(id)) {
                        this.renderMetaShop(overlay);
                        // Update token balance display
                        const balEl = overlay.querySelector('.summary-token-balance');
                        if (balEl) balEl.textContent = I18n.t('loop.tokenBalance', {balance: this.loop.loopTokens});
                        this.save.saveMeta();
                    }
                });
            }

            card.appendChild(infoEl);
            card.appendChild(btn);
            shopContainer.appendChild(card);
        }
    }

    // ============================================================
    // ORIGINAL METHODS
    // ============================================================

    async showIntro() {
        await this.dialogue.show(
            UI_TEXT.intro.npc,
            UI_TEXT.intro.emoji,
            UI_TEXT.intro.text,
            UI_TEXT.intro.player
        );
    }

    checkOrderCompletion() {
        if (this.boss) {
            this.boss.updateOrderHighlights();
        }
    }

    shakeElement(el) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 400);
    }

    // ---- Bottom Navigation Bar ----
    setupBottomNav() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.tab;
                this.handleNavClick(target);
            });
        });
    }

    handleNavClick(tab) {
        this.closeAllSheets();

        switch (tab) {
            case 'inventory':
                if (this.inventory) this.inventory.openSheet();
                this.setActiveNav('inventory');
                break;
            case 'heroine':
                if (this.heroine) this.heroine.open();
                this.setActiveNav('heroine');
                break;
            case 'gacha':
                if (this.gacha) this.gacha.open();
                this.setActiveNav('gacha');
                break;
            case 'collection':
                if (this.collection) this.collection.openSheet();
                this.setActiveNav('collection');
                break;
            case 'achievement':
                if (this.achievements) this.achievements.openSheet();
                this.setActiveNav('achievement');
                break;
        }
    }

    setActiveNav(tab) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tab);
        });
    }

    closeAllSheets() {
        if (this.heroine) this.heroine.close();
        if (this.gacha) this.gacha.close();
        if (this.inventory) this.inventory.closeSheet();
        if (this.dailyOrders) this.dailyOrders.close();
        if (this.collection && this.collection.closeSheet) this.collection.closeSheet();
        if (this.cgAlbum) this.cgAlbum.close();
        if (this.achievements) this.achievements.closeSheet();
        this.setActiveNav('board');
    }

    // ---- Bottom Sheets: Backdrop + Close Buttons & Swipe-to-Close ----
    setupBottomSheets() {
        const backdrop = document.getElementById('sheet-backdrop');
        const sheets = document.querySelectorAll('.bottom-sheet');

        // Helper: update backdrop and body class based on any open sheet
        const updateBackdrop = () => {
            const anyOpen = document.querySelector('.bottom-sheet.open');
            if (anyOpen) {
                backdrop.classList.add('visible');
                document.body.classList.add('sheet-open');
            } else {
                backdrop.classList.remove('visible');
                document.body.classList.remove('sheet-open');
            }
        };

        // Click backdrop to close all sheets
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                sheets.forEach(s => s.classList.remove('open'));
                updateBackdrop();
                this.setActiveNav('board');
            });
        }

        // MutationObserver: watch for .open class changes on all sheets
        const observer = new MutationObserver(updateBackdrop);
        sheets.forEach(sheet => {
            observer.observe(sheet, { attributes: true, attributeFilter: ['class'] });
        });

        sheets.forEach(sheet => {
            const closeBtn = sheet.querySelector('.sheet-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    sheet.classList.remove('open');
                    updateBackdrop();
                    this.setActiveNav('board');
                });
            }

            let startY = 0;
            let currentY = 0;
            let isDragging = false;

            sheet.addEventListener('touchstart', (e) => {
                const rect = sheet.getBoundingClientRect();
                const touchY = e.touches[0].clientY;
                if (touchY < rect.top + 40) {
                    startY = touchY;
                    isDragging = true;
                }
            });

            sheet.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                currentY = e.touches[0].clientY;
                const diff = currentY - startY;
                if (diff > 0) {
                    sheet.style.transform = `translateX(-50%) translateY(${diff}px)`;
                }
            });

            sheet.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;
                const diff = currentY - startY;
                if (diff > 80) {
                    sheet.classList.remove('open');
                    updateBackdrop();
                    this.setActiveNav('board');
                    // Delay transform reset so the CSS close transition
                    // plays from the current drag position without a visual jump
                    requestAnimationFrame(() => { sheet.style.transform = ''; });
                } else {
                    // Snap back immediately when not closing
                    sheet.style.transform = '';
                }
            });
        });
    }

    // ---- Click Sound for Interactive Elements ----
    setupClickSound() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .nav-item, .sheet-close, .gacha-pull-btn, .ad-btn, .shop-buy-btn, .heroine-upgrade-btn, .daily-submit-btn, .daily-carousel-submit-btn, .achievement-claim-btn, .inventory-use-btn, .unlock-yes, .unlock-no, .recycle-yes, .recycle-no, .cg-btn, .cg-memory-unlock-btn, .fragment-unlock-btn');
            if (target && typeof AudioManager !== 'undefined' && AudioManager.play) {
                AudioManager.play('btn_click');
            }
        }, { passive: true });
    }

    // ---- Quest Carousel ----
    setupQuestCarousel() {
        const mainQuestCard = document.getElementById('main-quest-card');
        if (mainQuestCard) {
            mainQuestCard.addEventListener('click', () => {
                if (this.dailyOrders) this.dailyOrders.open();
            });
        }
    }
}


// ---- Disable copy / select on game UI ----
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

// ---- Start ----
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    window.game.init();

    // Save on page close
    window.addEventListener('beforeunload', () => {
        if (window.game.save) window.game.save.saveAll();
    });
});
