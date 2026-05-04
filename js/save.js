// ============================================================
// save.js — localStorage Save/Load System (v4 — Meta/Run Split)
// ============================================================
// Two-layer persistence:
//   SAVE_KEY_META = 'heartbeat_merge_meta' — permanent progression
//   SAVE_KEY_RUN  = 'heartbeat_merge_run'  — current loop run state
// ============================================================

class SaveSystem {
    constructor(game) {
        this.game = game;
        this.SAVE_KEY_META = 'heartbeat_merge_meta';
        this.SAVE_KEY_RUN = 'heartbeat_merge_run';
    }

    // ============================================================
    // META SAVE — Permanent progression (survives loop resets)
    // ============================================================

    saveMeta() {
        try {
            const data = {
                version: 4,
                timestamp: Date.now(),
                loop: this.game.loop ? this.game.loop.serialize() : null,
                heroine: this.game.heroine ? { ...this.game.heroine.upgrades } : {},
                gacha: {
                    ssrOwned: this.game.gacha ? { ...this.game.gacha.ssrOwned } : {}
                },
                fragments: this.game.fragmentSystem ? {
                    fragments: { ...this.game.fragmentSystem.fragments }
                    // memoryFragments removed — cgAlbum.cgData is the single source of truth
                } : { fragments: {} },
                cgAlbum: this.game.cgAlbum ? {
                    cgData: JSON.parse(JSON.stringify(this.game.cgAlbum.cgData))
                } : {},
                collection: {
                    discovered: this.game.collection ? Array.from(this.game.collection.discovered) : [],
                    gachaCollected: this.game.collection ? Array.from(this.game.collection.gachaCollected) : []
                },
                achievements: {
                    unlocked: this.game.achievements ? Array.from(this.game.achievements.unlocked) : [],
                    completed: this.game.achievements ? Array.from(this.game.achievements.completed) : [],
                    stats: this.game.achievements ? { ...this.game.achievements.stats } : {}
                },
                // Permanent currency
                diamonds: this.game.currency ? this.game.currency.diamonds : 0,
                // Ad system daily counts
                ad: this.game.ad ? this.game.ad.serialize() : null
            };
            localStorage.setItem(this.SAVE_KEY_META, JSON.stringify(data));
        } catch (e) {
            console.warn('Meta save failed:', e);
        }
    }

    loadMeta() {
        try {
            const raw = localStorage.getItem(this.SAVE_KEY_META);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (!data) return null;

            return data;
        } catch (e) {
            console.warn('Meta load failed:', e);
            return null;
        }
    }

    applyMetaData(data) {
        if (!data) return;

        // Loop
        if (data.loop && this.game.loop) {
            this.game.loop.deserialize(data.loop);
        }

        // Heroine (permanent upgrades)
        if (data.heroine && this.game.heroine) {
            this.game.heroine.upgrades = { ...data.heroine };
            // Re-apply active effects
            for (const upg of HEROINE_UPGRADES) {
                const lvl = this.game.heroine.upgrades[upg.id];
                if (lvl >= 0 && lvl < upg.levels.length) {
                    this.game.heroine.applyUpgrade(upg.id, upg.levels[lvl].value);
                }
            }
            this.game.heroine.renderUpgrades();
        }

        // Gacha
        if (data.gacha && this.game.gacha) {
            this.game.gacha.ssrOwned = data.gacha.ssrOwned || {};
        }

        // Fragments (permanent — meta progression)
        if (data.fragments && this.game.fragmentSystem) {
            this.game.fragmentSystem.fragments = data.fragments.fragments || {};
            // Migrate legacy memoryFragments from old saves into cgAlbum.cgData
            if (data.fragments.memoryFragments && this.game.cgAlbum) {
                for (var mfCgId in data.fragments.memoryFragments) {
                    var mfCount = data.fragments.memoryFragments[mfCgId] || 0;
                    if (mfCount <= 0) continue;
                    if (!this.game.cgAlbum.cgData[mfCgId]) {
                        this.game.cgAlbum.cgData[mfCgId] = { unlocked: [], memoryFragments: 0, title: '', maleLead: '', ssrId: '' };
                    }
                    // Only migrate if cgAlbum has no data yet (avoid overwriting newer saves)
                    if (!this.game.cgAlbum.cgData[mfCgId].memoryFragments) {
                        this.game.cgAlbum.cgData[mfCgId].memoryFragments = mfCount;
                    }
                }
                this.game.cgAlbum._repairCGData();
            }
        }

        // CG Album
        if (data.cgAlbum && this.game.cgAlbum) {
            if (data.cgAlbum.cgData) {
                var savedCgData = data.cgAlbum.cgData;
                for (var cgId in savedCgData) {
                    if (!this.game.cgAlbum.cgData[cgId]) {
                        this.game.cgAlbum.cgData[cgId] = savedCgData[cgId];
                    } else {
                        this.game.cgAlbum.cgData[cgId].unlocked = savedCgData[cgId].unlocked || [];
                        this.game.cgAlbum.cgData[cgId].memoryFragments = savedCgData[cgId].memoryFragments || 0;
                        if (!this.game.cgAlbum.cgData[cgId].ssrId && savedCgData[cgId].ssrId) {
                            this.game.cgAlbum.cgData[cgId].ssrId = savedCgData[cgId].ssrId;
                        }
                        if (!this.game.cgAlbum.cgData[cgId].title && savedCgData[cgId].title) {
                            this.game.cgAlbum.cgData[cgId].title = savedCgData[cgId].title;
                        }
                        if (!this.game.cgAlbum.cgData[cgId].maleLead && savedCgData[cgId].maleLead) {
                            this.game.cgAlbum.cgData[cgId].maleLead = savedCgData[cgId].maleLead;
                        }
                    }
                }
            }
            this.game.cgAlbum._repairCGData();
        }

        // Collection
        if (data.collection && this.game.collection) {
            this.game.collection.discovered = new Set(data.collection.discovered || []);
            if (data.collection.gachaCollected) {
                this.game.collection.gachaCollected = new Set(data.collection.gachaCollected);
            }
        }

        // Achievements
        if (data.achievements && this.game.achievements) {
            this.game.achievements.unlocked = new Set(data.achievements.unlocked || []);
            this.game.achievements.completed = new Set(data.achievements.completed || []);
            if (data.achievements.stats) {
                this.game.achievements.stats = { ...this.game.achievements.stats, ...data.achievements.stats };
            }
            this.game.achievements.updateBadge();
        }

        // Diamonds (permanent currency)
        if (data.diamonds !== undefined && this.game.currency) {
            this.game.currency.diamonds = data.diamonds;
            this.game.currency.render();
        }

        // Ad system daily counts
        if (data.ad && this.game.ad) {
            this.game.ad.deserialize(data.ad);
        }
    }

    // ============================================================
    // RUN SAVE — Current loop run state (reset each loop)
    // ============================================================

    saveRun() {
        try {
            const data = {
                version: 4,
                timestamp: Date.now(),
                currency: {
                    gold: this.game.currency.gold
                },
                energy: {
                    current: this.game.energy.current,
                    max: this.game.energy.max,
                    regenCap: this.game.energy.regenCap,
                    regenInterval: this.game.energy.regenInterval
                },
                boss: this.game.boss.logic.serialize(),
                board: {
                    cells: [...this.game.board.cells],
                    locked: [...this.game.board.locked],
                    cellsUnlocked: this.game.board.cellsUnlocked,
                    generatorStates: { ...this.game.board.generatorStates }
                },
                inventory: this.game.inventory ? { ...this.game.inventory.items } : {},
                buffs: {
                    timeFreezeBonus: this.game._timeFreezeBonus || 0,
                    luckyCoinsLeft: this.game._luckyCoinsLeft || 0,
                    doubleGenTurns: this.game._doubleGenTurns || 0
                },
                dailyOrders: {
                    activeOrders: this.game.dailyOrders ? this.game.dailyOrders.activeOrders : []
                }
            };
            localStorage.setItem(this.SAVE_KEY_RUN, JSON.stringify(data));
        } catch (e) {
            console.warn('Run save failed:', e);
        }
    }

    loadRun() {
        try {
            const raw = localStorage.getItem(this.SAVE_KEY_RUN);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (!data) return null;

            return data;
        } catch (e) {
            console.warn('Run load failed:', e);
            return null;
        }
    }

    applyRunData(data) {
        if (!data) return;

        // Gold (run currency)
        if (data.currency && this.game.currency) {
            this.game.currency.gold = data.currency.gold || 0;
            this.game.currency.render();
        }

        // Energy
        if (data.energy) {
            this.game.energy.max = data.energy.max || GAME_CONFIG.MAX_ENERGY;
            this.game.energy.regenCap = data.energy.regenCap || GAME_CONFIG.ENERGY_REGEN_CAP || GAME_CONFIG.MAX_ENERGY;
            this.game.energy.current = data.energy.current || 0;
            if (data.energy.regenInterval && data.energy.regenInterval !== GAME_CONFIG.ENERGY_REGEN_INTERVAL) {
                this.game.energy.setRegenInterval(data.energy.regenInterval);
            }
            this.game.energy.render();
        }

        // Board
        if (data.board) {
            this.game.board.cells = data.board.cells || new Array(this.game.board.cols * this.game.board.rows).fill(null);
            this.game.board.locked = new Set(data.board.locked || []);
            this.game.board.cellsUnlocked = data.board.cellsUnlocked || 0;
            if (data.board.generatorStates) {
                this.game.board.generatorStates = data.board.generatorStates;
                // [冷却机制已禁用] 以下冷却处理逻辑暂时注释，保留以便复用
                // 恢复冷却时取消注释即可：
                // const now = Date.now();
                // for (const idx of Object.keys(this.game.board.generatorStates)) {
                //     const state = this.game.board.generatorStates[idx];
                //     if (state.cooldownUntil && state.cooldownUntil < now) {
                //         state.cooldownUntil = 0;
                //         state.currentClicks = 0;
                //     }
                // }
            }
            this.game.board.renderAll();

            // Backward compatibility: if old save has no generators on board, place initial ones
            let hasGenerator = false;
            for (let i = 0; i < this.game.board.cells.length; i++) {
                const itemId = this.game.board.cells[i];
                if (itemId && ITEMS[itemId] && ITEMS[itemId].type === 'GENERATOR') {
                    hasGenerator = true;
                    break;
                }
            }
            if (!hasGenerator) {
                console.log('Old save detected: placing initial generators on board');
                this.game.board.placeInitialGenerators();
            }
        }

        // Boss
        if (data.boss) {
            // 1. loadLevel triggers UI rendering (portrait, name, background, initial order panel)
            //    and transitions FSM: IDLE → BATTLE (or DEFEATED → BATTLE)
            this.game.boss.loadLevel(data.boss.levelIdx || 0);
            // 2. deserialize overrides logic state (totalHp, FSM state, timer, etc.)
            //    Old saves without state/totalHp fields are handled by ?? defaults in deserialize
            this.game.boss.logic.deserialize(data.boss);
            // 3. Reload the correct order UI (loadLevel resets to order 0)
            const orderIdx = data.boss.orderIdx ?? 0;
            if (orderIdx > 0) {
                this.game.boss.logic.loadOrder(orderIdx);
            }
            // 4. Re-render HP bar with saved values (loadLevel recalculates totalHp)
            this.game.boss.renderHp();
        }

        // Inventory
        if (data.inventory && this.game.inventory) {
            this.game.inventory.items = { ...data.inventory };
            this.game.inventory.updateBadge();
        }

        // Buffs
        if (data.buffs) {
            this.game._timeFreezeBonus = data.buffs.timeFreezeBonus || 0;
            this.game._luckyCoinsLeft = data.buffs.luckyCoinsLeft || 0;
            this.game._doubleGenTurns = data.buffs.doubleGenTurns || 0;
        }

        // Daily orders
        if (data.dailyOrders && this.game.dailyOrders) {
            if (data.dailyOrders.activeOrders && data.dailyOrders.activeOrders.length > 0) {
                this.game.dailyOrders.activeOrders = data.dailyOrders.activeOrders;
                // If all orders are fulfilled, re-roll
                if (this.game.dailyOrders.activeOrders.every(o => o.fulfilled)) {
                    this.game.dailyOrders.rollNewOrders();
                } else {
                    this.game.dailyOrders.renderOrders();
                    this.game.dailyOrders.renderCarouselCards();
                }
            } else {
                // No active orders in save (e.g. after legacy migration) — roll new ones
                this.game.dailyOrders.rollNewOrders();
            }
        }

        // Recover interrupted defeat: if the boss was defeated (hp ≤ 0, FSM = DEFEATED)
        // but the defeat sequence (celebration, dialogue, level transition) hadn't fired yet,
        // re-emit the event so the player doesn't get stuck.
        if (this.game.boss && this.game.boss.logic) {
            const bossLogic = this.game.boss.logic;
            if (bossLogic.currentHp <= 0 && bossLogic.fsm.is('DEFEATED')) {
                setTimeout(() => {
                    globalBus.emit('boss:defeated', { levelIdx: bossLogic.currentLevelIdx });
                }, 100);
            }
        }
    }

    // ============================================================
    // COMBINED SAVE ALL (for auto-save compatibility)
    // ============================================================

    saveAll() {
        this.saveMeta();
        this.saveRun();
    }

    // ============================================================
    // COMBINED LOAD ALL
    // ============================================================

    loadAll() {
        const metaData = this.loadMeta();
        const runData = this.loadRun();

        if (!metaData && !runData) return false;

        // Apply meta first (permanent state)
        if (metaData) {
            this.applyMetaData(metaData);
        }

        // Then apply run state (current loop)
        if (runData) {
            this.applyRunData(runData);
        }

        console.log('Game loaded from save.');
        return true;
    }

    // ============================================================
    // CHECKS & CLEANUP
    // ============================================================

    hasSave() {
        return !!localStorage.getItem(this.SAVE_KEY_META) || !!localStorage.getItem(this.SAVE_KEY_RUN);
    }

    hasMetaSave() {
        return !!localStorage.getItem(this.SAVE_KEY_META);
    }

    hasRunSave() {
        return !!localStorage.getItem(this.SAVE_KEY_RUN);
    }

    clearRun() {
        localStorage.removeItem(this.SAVE_KEY_RUN);
    }

    clearAll() {
        localStorage.removeItem(this.SAVE_KEY_META);
        localStorage.removeItem(this.SAVE_KEY_RUN);
        // Also clear legacy key if it exists
        localStorage.removeItem('heartbeat_merge_save');
    }

    // Legacy migration: convert old single-key save to new dual-key format
    migrateLegacySave() {
        try {
            const raw = localStorage.getItem('heartbeat_merge_save');
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (!data || data.version < 4) {
                // Old format — convert to new format
                // Meta data (permanent)
                const metaData = {
                    version: 4,
                    timestamp: data.timestamp || Date.now(),
                    loop: null, // No loop data in old saves
                    heroine: data.heroine || {},
                    gacha: data.gacha || {},
                    fragments: data.fragments || { fragments: {} },
                    cgAlbum: data.cgAlbum || {},
                    collection: data.collection || { discovered: [], gachaCollected: [] },
                    achievements: data.achievements || { completed: [], stats: {} },
                    diamonds: data.currency ? data.currency.diamonds : 0
                };

                // Run data (current loop)
                const runData = {
                    version: 4,
                    timestamp: data.timestamp || Date.now(),
                    currency: { gold: data.currency ? data.currency.gold : 0 },
                    energy: data.energy || {},
                    boss: data.boss || {},
                    board: data.board || {},
                    inventory: data.inventory || {},
                    buffs: data.buffs || {},
                    dailyOrders: { activeOrders: [] }
                };

                localStorage.setItem(this.SAVE_KEY_META, JSON.stringify(metaData));
                localStorage.setItem(this.SAVE_KEY_RUN, JSON.stringify(runData));
                // Remove legacy save
                localStorage.removeItem('heartbeat_merge_save');
                console.log('Legacy save migrated to v4 format.');
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Legacy migration failed:', e);
            return false;
        }
    }
}
