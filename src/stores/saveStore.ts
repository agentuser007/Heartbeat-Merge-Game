// ============================================================
// saveStore.ts — Save Game State Store (v4 — Meta/Run Split)
// ============================================================
// Two-layer persistence:
//   SAVE_KEY_META = 'heartbeat_merge_meta' — permanent progression
//   SAVE_KEY_RUN  = 'heartbeat_merge_run'  — current loop run state
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useLoopStore } from './loopStore';
import { useHeroineStore } from './heroineStore';
import { useGachaStore } from './gachaStore';
import { useFragmentStore } from './fragmentStore';
import { useCGAlbumStore } from './cgAlbumStore';
import { useCollectionStore } from './collectionStore';
import { useAchievementStore } from './achievementStore';
import { useCurrencyStore } from './currencyStore';
import { useAdStore } from './adStore';
import { useDailyBuffStore } from './dailyBuffStore';
import { useBoardStore } from './boardStore';
import { useBossStore } from './bossStore';
import { useEnergyStore } from './energyStore';
import { useInventoryStore } from './inventoryStore';
import { useDailyOrderStore } from './dailyOrderStore';

const SAVE_KEY_META = 'heartbeat_merge_meta';
const SAVE_KEY_RUN = 'heartbeat_merge_run';
const SAVE_KEY_LEGACY = 'heartbeat_merge_save';
const CURRENT_VERSION = 4;

export const useSaveStore = defineStore('save', () => {
    // --- State ---
    const hasSave = ref(false);
    const saveVersion = ref(CURRENT_VERSION);
    const lastSaveTimestamp = ref(0);

    // --- Computed ---
    const saving = ref(false);
    const canSave = computed(() => !saving.value);

    // ============================================================
    // META SAVE — Permanent progression (survives loop resets)
    // ============================================================

    function saveMeta(): void {
        if (saving.value) return;
        saving.value = true;
        try {
            const loopStore = useLoopStore();
            const heroineStore = useHeroineStore();
            const gachaStore = useGachaStore();
            const fragmentStore = useFragmentStore();
            const cgAlbumStore = useCGAlbumStore();
            const collectionStore = useCollectionStore();
            const achievementStore = useAchievementStore();
            const currencyStore = useCurrencyStore();
            const adStore = useAdStore();
            const dailyBuffStore = useDailyBuffStore();

            const data = {
                version: CURRENT_VERSION,
                timestamp: Date.now(),
                loop: loopStore.serialize(),
                heroine: heroineStore.serialize(),
                gacha: gachaStore.serialize(),
                fragments: fragmentStore.serialize(),
                cgAlbum: cgAlbumStore.serialize(),
                collection: collectionStore.serialize(),
                achievements: achievementStore.serialize(),
                // Permanent currency — diamonds only (gold is run-scoped)
                diamonds: currencyStore.diamonds,
                ad: adStore.serialize(),
                dailyBuff: dailyBuffStore.serialize()
            };

            localStorage.setItem(SAVE_KEY_META, JSON.stringify(data));
        } catch (e) {
            console.warn('Meta save failed:', e);
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded — meta save dropped');
            }
        } finally {
            saving.value = false;
        }
    }

    function loadMeta(): any | null {
        try {
            const raw = localStorage.getItem(SAVE_KEY_META);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (!data) return null;

            return data;
        } catch (e) {
            console.warn('Meta load failed:', e);
            return null;
        }
    }

    function applyMetaData(data: any): void {
        if (!data) return;

        const loopStore = useLoopStore();
        const heroineStore = useHeroineStore();
        const gachaStore = useGachaStore();
        const fragmentStore = useFragmentStore();
        const cgAlbumStore = useCGAlbumStore();
        const collectionStore = useCollectionStore();
        const achievementStore = useAchievementStore();
        const currencyStore = useCurrencyStore();
        const adStore = useAdStore();
        const dailyBuffStore = useDailyBuffStore();

        // Loop
        if (data.loop) {
            loopStore.deserialize(data.loop);
        }

        // Heroine (permanent upgrades)
        if (data.heroine) {
            heroineStore.deserialize(data.heroine);
        }

        // Gacha
        if (data.gacha) {
            gachaStore.deserialize(data.gacha);
        }

        // Fragments (permanent — meta progression)
        if (data.fragments) {
            fragmentStore.deserialize(data.fragments);

            // Migrate legacy memoryFragments from old saves into cgAlbum
            if ((data.fragments as any).memoryFragments) {
                const memFrags = (data.fragments as any).memoryFragments;
                for (const cgId in memFrags) {
                    const count = memFrags[cgId] || 0;
                    if (count <= 0) continue;
                    // Only migrate if cgAlbum has no data yet
                    if (cgAlbumStore.getMemoryFragments(cgId) === 0) {
                        cgAlbumStore.addMemoryFragments(cgId, count);
                    }
                }
            }
        }

        // CG Album
        if (data.cgAlbum) {
            cgAlbumStore.deserialize(data.cgAlbum);
        }

        // Collection
        if (data.collection) {
            collectionStore.deserialize(data.collection);
        }

        // Achievements
        if (data.achievements) {
            achievementStore.deserialize(data.achievements);
        }

        // Diamonds (permanent currency)
        if (data.diamonds !== undefined) {
            currencyStore.deserialize({ gold: currencyStore.gold, diamonds: data.diamonds });
        }

        // Ad system daily counts
        if (data.ad) {
            adStore.deserialize(data.ad);
        }

        // Daily buff
        if (data.dailyBuff) {
            dailyBuffStore.deserialize(data.dailyBuff);
        }
    }

    // ============================================================
    // RUN SAVE — Current loop run state (reset each loop)
    // ============================================================

    function saveRun(): void {
        if (saving.value) return;
        saving.value = true;
        try {
            const currencyStore = useCurrencyStore();
            const energyStore = useEnergyStore();
            const bossStore = useBossStore();
            const boardStore = useBoardStore();
            const inventoryStore = useInventoryStore();
            const dailyOrderStore = useDailyOrderStore();

            const data = {
                version: CURRENT_VERSION,
                timestamp: Date.now(),
                currency: {
                    gold: currencyStore.gold
                },
                energy: energyStore.serialize(),
                boss: bossStore.serialize(),
                board: boardStore.serialize(),
                inventory: inventoryStore.serialize(),
                dailyOrders: dailyOrderStore.serialize()
            };

            localStorage.setItem(SAVE_KEY_RUN, JSON.stringify(data));
        } catch (e) {
            console.warn('Run save failed:', e);
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded — run save dropped');
            }
        } finally {
            saving.value = false;
        }
    }

    function loadRun(): any | null {
        try {
            const raw = localStorage.getItem(SAVE_KEY_RUN);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (!data) return null;

            return data;
        } catch (e) {
            console.warn('Run load failed:', e);
            return null;
        }
    }

    function applyRunData(data: any): void {
        if (!data) return;

        const currencyStore = useCurrencyStore();
        const energyStore = useEnergyStore();
        const bossStore = useBossStore();
        const boardStore = useBoardStore();
        const inventoryStore = useInventoryStore();
        const dailyOrderStore = useDailyOrderStore();

        // Gold (run currency)
        if (data.currency) {
            currencyStore.deserialize({
                gold: data.currency.gold ?? 0,
                diamonds: currencyStore.diamonds // preserve diamonds from meta
            });
        }

        // Energy
        if (data.energy) {
            energyStore.deserialize(data.energy);
        }

        // Board
        if (data.board) {
            boardStore.deserialize(data.board);
        }

        // Boss
        if (data.boss) {
            bossStore.deserialize(data.boss);
        }

        // Inventory
        if (data.inventory) {
            inventoryStore.deserialize(data.inventory);
        }

        // Daily orders
        if (data.dailyOrders) {
            dailyOrderStore.deserialize(data.dailyOrders);
        }
    }

    // ============================================================
    // COMBINED SAVE ALL
    // ============================================================

    function saveAll(): void {
        saveMeta();
        saveRun();
        hasSave.value = true;
        lastSaveTimestamp.value = Date.now();
    }

    // ============================================================
    // COMBINED LOAD ALL
    // ============================================================

    function loadAll(): boolean {
        const metaData = loadMeta();
        const runData = loadRun();

        if (!metaData && !runData) return false;

        if (metaData && metaData.version !== CURRENT_VERSION) {
            clearAll();
            return false;
        }

        // Apply meta first (permanent state)
        if (metaData) {
            applyMetaData(metaData);
        }

        // Then apply run state (current loop)
        if (runData) {
            applyRunData(runData);
        }

        hasSave.value = true;
        if (metaData) {
            lastSaveTimestamp.value = metaData.timestamp || 0;
            saveVersion.value = metaData.version || CURRENT_VERSION;
        } else if (runData) {
            lastSaveTimestamp.value = runData.timestamp || 0;
            saveVersion.value = runData.version || CURRENT_VERSION;
        }

        console.log('Game loaded from save.');
        return true;
    }

    // ============================================================
    // CHECKS & CLEANUP
    // ============================================================

    function checkHasSave(): boolean {
        return !!localStorage.getItem(SAVE_KEY_META) || !!localStorage.getItem(SAVE_KEY_RUN) || !!localStorage.getItem(SAVE_KEY_LEGACY);
    }

    function checkHasMetaSave(): boolean {
        return !!localStorage.getItem(SAVE_KEY_META);
    }

    function checkHasRunSave(): boolean {
        return !!localStorage.getItem(SAVE_KEY_RUN);
    }

    function clearRun(): void {
        localStorage.removeItem(SAVE_KEY_RUN);
    }

    function clearAll(): void {
        localStorage.removeItem(SAVE_KEY_META);
        localStorage.removeItem(SAVE_KEY_RUN);
        // Also clear legacy key if it exists
        localStorage.removeItem(SAVE_KEY_LEGACY);
        hasSave.value = false;
        lastSaveTimestamp.value = 0;
    }

    // ============================================================
    // LEGACY MIGRATION
    // ============================================================

    function migrateLegacySave(): boolean {
        try {
            const raw = localStorage.getItem(SAVE_KEY_LEGACY);
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (!data) return false;

            // If it is legacy save (version < 4), convert to split meta/run saves
            if (data.version === undefined || data.version < CURRENT_VERSION) {
                const meta = {
                    version: CURRENT_VERSION,
                    timestamp: data.timestamp || Date.now(),
                    loop: {
                        loopIndex: data.loopIndex || 1,
                        loopTokens: data.loopTokens || 0,
                        metaUpgrades: data.metaUpgrades || {
                            startingGold: 0,
                            startingDiamonds: 0,
                            startingEnergy: 0,
                            dailyBonus: 0
                        },
                        currentLoopConfig: data.currentLoopConfig || null,
                        unlockedNarrativeFlags: data.unlockedNarrativeFlags || []
                    },
                    heroine: {
                        upgrades: data.heroineUpgrades || {}
                    },
                    gacha: {
                        ssrOwned: data.ssrOwned || {},
                        pityCount: data.gachaPity || 0,
                        freePullsLeft: data.freePullsLeft || 0,
                        lastFreePullDate: data.lastFreePullDate || ''
                    },
                    fragments: {
                        fragments: data.fragments || {}
                    },
                    cgAlbum: {
                        cgData: data.cgData || {},
                        unlockedCGs: data.unlockedCGs || []
                    },
                    collection: {
                        discovered: data.discovered || [],
                        gachaCollected: data.gachaCollected || [],
                        completedChains: data.completedChains || [],
                        activeTab: 'items'
                    },
                    achievements: {
                        unlocked: data.unlockedAchievements || [],
                        completed: data.completedAchievements || [],
                        stats: data.stats || {
                            merges: 0,
                            bossDefeats: 0,
                            maxLevelItems: 0,
                            totalGoldEarned: 0,
                            recycled: 0,
                            gachaPulls: 0,
                            cellsUnlocked: 0,
                            dailyCompleted: 0
                        }
                    },
                    diamonds: data.diamonds || 0,
                    ad: {
                        adCounts: data.adCounts || {}
                    },
                    dailyBuff: {
                        currentBuffId: data.currentBuffId || null,
                        lastBuffRolledDate: data.lastBuffRolledDate || ''
                    }
                };

                const run = {
                    version: CURRENT_VERSION,
                    timestamp: data.timestamp || Date.now(),
                    currency: {
                        gold: data.gold || 0
                    },
                    energy: {
                        current: data.energy ?? 100,
                        max: data.maxEnergy ?? 100,
                        lastRegenTime: data.lastRegenTime || Date.now()
                    },
                    boss: {
                        levelIdx: data.currentLevelIdx || 0,
                        orderIdx: data.currentOrderIdx || 0,
                        hp: data.bossHp ?? 0,
                        totalHp: data.bossTotalHp ?? 0,
                        state: data.bossState || 'BATTLE',
                        timerRemaining: data.bossTimerRemaining || 0,
                        bossName: data.bossName || '',
                        bossAvatar: data.bossAvatar || ''
                    },
                    board: {
                        cells: data.cells || new Array(35).fill(null),
                        locked: data.locked || [],
                        generatorStates: data.generatorStates || {},
                        cellsUnlocked: data.cellsUnlocked || 0
                    },
                    inventory: {
                        items: data.inventory || []
                    },
                    dailyOrders: {
                        orders: data.dailyOrders || [],
                        loopIndex: data.loopIndex || 1,
                        lastRollDate: data.lastRollDate || ''
                    }
                };

                localStorage.setItem(SAVE_KEY_META, JSON.stringify(meta));
                localStorage.setItem(SAVE_KEY_RUN, JSON.stringify(run));
                localStorage.removeItem(SAVE_KEY_LEGACY);
                hasSave.value = true;
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Legacy migration failed:', e);
            localStorage.removeItem(SAVE_KEY_LEGACY);
            return false;
        }
    }

    // --- Initialization: check for existing saves ---
    hasSave.value = checkHasSave();

    return {
        // State
        hasSave,
        saveVersion,
        lastSaveTimestamp,
        saving,

        // Computed
        canSave,

        // Actions — Save
        saveAll,
        saveMeta,
        saveRun,

        // Actions — Load
        loadAll,
        loadMeta,
        loadRun,

        // Actions — Apply
        applyMetaData,
        applyRunData,

        // Actions — Checks
        checkHasSave,
        checkHasMetaSave,
        checkHasRunSave,

        // Actions — Cleanup
        clearRun,
        clearAll,

        // Actions — Migration
        migrateLegacySave
    };
});
