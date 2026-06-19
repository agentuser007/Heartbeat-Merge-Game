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
import { useAffectionStore } from './affectionStore';
import { useTouchInteractionStore } from './touchInteractionStore';
import { useVNReaderStore } from './vnReaderStore';
import { useAudio } from '../composables/useAudio';
import { globalBus } from '../core/EventBus';
import { SaveService, CURRENT_VERSION } from '../services/SaveService';

const ARCHIVE_THRESHOLD = 8;

const SAVE_KEY_META = 'heartbeat_merge_meta';
const SAVE_KEY_RUN = 'heartbeat_merge_run';
const SAVE_KEY_LEGACY = 'heartbeat_merge_save';

const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
    3: (data: Record<string, unknown>) => {
        const dailyOrders = data.dailyOrders as Record<string, unknown> | undefined;
        if (dailyOrders) {
            if (dailyOrders.orders && !dailyOrders.activeOrders) {
                dailyOrders.activeOrders = dailyOrders.orders;
                delete dailyOrders.orders;
            }
            if (dailyOrders.completedCount === undefined) {
                dailyOrders.completedCount = 0;
            }
        }
        data.version = 4;
        return data;
    },
    4: (data: Record<string, unknown>) => {
        if (!data.audio) {
            data.audio = {
                masterVolume: 1.0,
                bgmVolume: 0.3,
                sfxVolume: 0.8,
                muted: false
            };
        }
        data.version = 5;
        return data;
    }
};

function migrateData(data: Record<string, unknown>, targetVersion: number): Record<string, unknown> {
    let current = data;
    let v = (current.version as number) || 0;
    while (v < targetVersion && migrations[v]) {
        current = migrations[v](current);
        v = (current.version as number) || v + 1;
    }
    current.version = targetVersion;
    return current;
}

export const useSaveStore = defineStore('save', () => {
    // --- State ---
    const hasSave = ref(false);
    const saveVersion = ref(CURRENT_VERSION);
    const lastSaveTimestamp = ref(0);
    const saveDirty = ref(false);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // --- Computed ---
    const savingMeta = ref(false);
    const savingRun = ref(false);
    const saving = computed(() => savingMeta.value || savingRun.value);
    const canSave = computed(() => !saving.value);

    // ============================================================
    // META SAVE — Permanent progression (survives loop resets)
    // ============================================================

    function saveMeta(): void {
        if (savingMeta.value) return;
        savingMeta.value = true;
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
            const affectionStore = useAffectionStore();
            const touchInteractionStore = useTouchInteractionStore();
            const audioStore = useAudio();

            const data = SaveService.serializeMeta({
                loop: loopStore,
                heroine: heroineStore,
                gacha: gachaStore,
                fragments: fragmentStore,
                cgAlbum: cgAlbumStore,
                collection: collectionStore,
                achievements: achievementStore,
                diamonds: currencyStore.diamonds,
                ad: adStore,
                dailyBuff: dailyBuffStore,
                affection: affectionStore,
                touchData: touchInteractionStore,
                audio: audioStore,
            });

            localStorage.setItem(SAVE_KEY_META, JSON.stringify(data));
        } catch (e) {
            console.warn('Meta save failed:', e);
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded — meta save dropped');
            }
        } finally {
            savingMeta.value = false;
        }
    }

    function loadMeta(): Record<string, unknown> | null {
        try {
            const raw = localStorage.getItem(SAVE_KEY_META);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (!data) return null;

            return data;
        } catch (e) {
            console.warn('Meta load failed, clearing corrupted data:', e);
            localStorage.removeItem(SAVE_KEY_META);
            return null;
        }
    }

    function applyMetaData(data: Record<string, unknown>): void {
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
        const affectionStore = useAffectionStore();
        const touchInteractionStore = useTouchInteractionStore();
        const audioStore = useAudio();

        const result = SaveService.resolveApplyMetaData(data, {
            currentGold: currencyStore.gold,
            getMemoryFragments: (cgId: string) => cgAlbumStore.getMemoryFragments(cgId),
        });

        SaveService.applyMetaResult(result, {
            loopStore, heroineStore, gachaStore, fragmentStore, cgAlbumStore,
            collectionStore, achievementStore, currencyStore, adStore, dailyBuffStore,
            affectionStore, touchInteractionStore, audioStore,
            energyStore: useEnergyStore(), boardStore: useBoardStore(),
            bossStore: useBossStore(), inventoryStore: useInventoryStore(),
            dailyOrderStore: useDailyOrderStore(), vnReaderStore: useVNReaderStore(),
        });
    }

    // ============================================================
    // RUN SAVE — Current loop run state (reset each loop)
    // ============================================================

    function compressOldSnapshots(): void {
        const loopStore = useLoopStore();
        const boardStore = useBoardStore();
        const currentLoop = loopStore.loopIndex;

        for (const [idx, snapshot] of boardStore.boardRegistry) {
            if (currentLoop - idx > ARCHIVE_THRESHOLD) {
                snapshot.cells = null;
                snapshot.generatorStates = null;
                snapshot.frozenDailyOrders = null;
            }
        }
    }

    function saveRun(): void {
        if (savingRun.value) return;
        savingRun.value = true;
        try {
            const currencyStore = useCurrencyStore();
            const energyStore = useEnergyStore();
            const bossStore = useBossStore();
            const boardStore = useBoardStore();
            const inventoryStore = useInventoryStore();
            const dailyOrderStore = useDailyOrderStore();
            const loopStore = useLoopStore();
            const vnReaderStore = useVNReaderStore();

            const data = SaveService.serializeRun({
                gold: currencyStore.gold,
                energy: energyStore,
                boss: bossStore,
                board: boardStore,
                inventory: inventoryStore,
                dailyOrders: dailyOrderStore,
                boardRegistry: boardStore.boardRegistry,
                activeBoardLoop: boardStore.activeBoardLoop,
                loopStatus: loopStore.loopStatus,
                vnReader: vnReaderStore,
            });

            localStorage.setItem(SAVE_KEY_RUN, JSON.stringify(data));
            compressOldSnapshots();
        } catch (e) {
            console.warn('Run save failed:', e);
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded — run save dropped');
            }
        } finally {
            savingRun.value = false;
        }
    }

    function loadRun(): Record<string, unknown> | null {
        try {
            const raw = localStorage.getItem(SAVE_KEY_RUN);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (!data) return null;

            return data;
        } catch (e) {
            console.warn('Run load failed, clearing corrupted data:', e);
            localStorage.removeItem(SAVE_KEY_RUN);
            return null;
        }
    }

    function applyRunData(data: Record<string, unknown>): void {
        if (!data) return;

        const currencyStore = useCurrencyStore();
        const energyStore = useEnergyStore();
        const bossStore = useBossStore();
        const boardStore = useBoardStore();
        const inventoryStore = useInventoryStore();
        const dailyOrderStore = useDailyOrderStore();
        const loopStore = useLoopStore();
        const vnReaderStore = useVNReaderStore();

        const result = SaveService.resolveApplyRunData(data, {
            currentDiamonds: currencyStore.diamonds,
        });

        SaveService.applyRunResult(result, {
            loopStore, heroineStore: useHeroineStore(), gachaStore: useGachaStore(),
            fragmentStore: useFragmentStore(), cgAlbumStore: useCGAlbumStore(),
            collectionStore: useCollectionStore(), achievementStore: useAchievementStore(),
            currencyStore, adStore: useAdStore(), dailyBuffStore: useDailyBuffStore(),
            affectionStore: useAffectionStore(), touchInteractionStore: useTouchInteractionStore(),
            energyStore, boardStore, bossStore, inventoryStore, dailyOrderStore, vnReaderStore,
            showToast: (msg: string, type: string) => globalBus.emit('toast:show', { message: msg, type }),
        });
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

    function debouncedSave(delayMs: number = 200): void {
        saveDirty.value = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (saveDirty.value) {
                saveAll();
                saveDirty.value = false;
            }
            debounceTimer = null;
        }, delayMs);
    }

    // ============================================================
    // COMBINED LOAD ALL
    // ============================================================

    function loadAll(): boolean {
        const metaData = loadMeta();
        const runData = loadRun();

        if (!metaData && !runData) return false;

        if (metaData && (metaData.version as number) !== CURRENT_VERSION) {
            if ((metaData.version as number) < CURRENT_VERSION) {
                const migrated = migrateData(metaData, CURRENT_VERSION);
                applyMetaData(migrated);
                saveMeta();
            } else {
                clearAll();
                return false;
            }
        } else if (metaData) {
            applyMetaData(metaData);
        }

        if (runData && (runData.version as number) !== CURRENT_VERSION) {
            if ((runData.version as number) < CURRENT_VERSION) {
                const migrated = migrateData(runData, CURRENT_VERSION);
                applyRunData(migrated);
                saveRun();
            } else {
                console.warn(`Run save version ${runData.version as number} is newer than current ${CURRENT_VERSION}, clearing stale run data`);
                clearRun();
            }
        } else if (runData) {
            applyRunData(runData);
        }

        hasSave.value = true;
        if (metaData) {
            lastSaveTimestamp.value = (metaData.timestamp as number) || 0;
            saveVersion.value = (metaData.version as number) || CURRENT_VERSION;
        } else if (runData) {
            lastSaveTimestamp.value = (runData.timestamp as number) || 0;
            saveVersion.value = (runData.version as number) || CURRENT_VERSION;
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

            const data: Record<string, unknown> = JSON.parse(raw);
            if (!data) return false;

            // Legacy save data is untyped — use loose access for migration
            const d = data as Record<string, any>; // TEMP: legacy migration, see TD-005

            if (data.version === undefined || (data.version as number) < CURRENT_VERSION) {
                const meta = {
                    version: CURRENT_VERSION,
                    timestamp: d.timestamp || Date.now(),
                    loop: {
                        loopIndex: d.loopIndex || 1,
                        loopTokens: d.loopTokens || 0,
                        metaUpgrades: d.metaUpgrades || {
                            startingGold: 0,
                            startingDiamonds: 0,
                            startingEnergy: 0,
                            dailyBonus: 0
                        },
                        currentLoopConfig: d.currentLoopConfig || null,
                        unlockedNarrativeFlags: d.unlockedNarrativeFlags || []
                    },
                    heroine: {
                        upgrades: d.heroineUpgrades || {}
                    },
                    gacha: {
                        ssrOwned: d.ssrOwned || {},
                        pityCount: d.gachaPity || 0,
                        freePullsLeft: d.freePullsLeft || 0,
                        lastFreePullDate: d.lastFreePullDate || ''
                    },
                    fragments: {
                        fragments: d.fragments || {}
                    },
                    cgAlbum: {
                        cgData: d.cgData || {},
                        unlockedCGs: d.unlockedCGs || []
                    },
                    collection: {
                        discovered: d.discovered || [],
                        gachaCollected: d.gachaCollected || [],
                        completedChains: d.completedChains || [],
                        activeTab: 'items'
                    },
                    achievements: {
                        unlocked: d.unlockedAchievements || [],
                        completed: d.completedAchievements || [],
                        stats: d.stats || {
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
                    diamonds: d.diamonds || 0,
                    ad: {
                        adCounts: d.adCounts || {}
                    },
                    dailyBuff: {
                        currentBuffId: d.currentBuffId || null,
                        lastBuffRolledDate: d.lastBuffRolledDate || ''
                    }
                };

                const run = {
                    version: CURRENT_VERSION,
                    timestamp: d.timestamp || Date.now(),
                    currency: {
                        gold: d.gold || 0
                    },
                    energy: {
                        current: d.energy ?? 100,
                        max: d.maxEnergy ?? 100,
                        lastRegenTime: d.lastRegenTime || Date.now()
                    },
                    boss: {
                        levelIdx: d.currentLevelIdx || 0,
                        orderIdx: d.currentOrderIdx || 0,
                        hp: d.bossHp ?? 0,
                        totalHp: d.bossTotalHp ?? 0,
                        state: d.bossState || 'BATTLE',
                        timerRemaining: d.bossTimerRemaining || 0,
                        bossName: d.bossName || '',
                        bossAvatar: d.bossAvatar || ''
                    },
                    board: {
                        cells: d.cells || new Array(35).fill(null),
                        locked: d.locked || [],
                        generatorStates: d.generatorStates || {},
                        cellsUnlocked: d.cellsUnlocked || 0
                    },
                    inventory: {
                        items: d.inventory || []
                    },
                    dailyOrders: {
                        activeOrders: d.dailyOrders || [],
                        loopIndex: d.loopIndex || 1,
                        lastRollDate: d.lastRollDate || '',
                        completedCount: d.dailyCompletedCount || 0
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
        debouncedSave,

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
