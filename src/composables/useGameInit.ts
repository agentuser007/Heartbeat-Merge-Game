// ============================================================
// useGameInit.ts — Game Initialization & Lifecycle Composable
// ============================================================
// Replaces the Game class from js/main.js (835 lines) with
// Vue 3 composable patterns. Handles the full init sequence,
// loop lifecycle, and cross-system wiring.
// ============================================================

import { ref, watch, onUnmounted } from 'vue';
import { useI18nStore } from '@/stores/i18nStore';
import { useConfigStore } from '@/stores/configStore';
import { useBoardStore } from '@/stores/boardStore';
import { useBossStore } from '@/stores/bossStore';
import { useEnergyStore } from '@/stores/energyStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useDailyOrderStore } from '@/stores/dailyOrderStore';
import { useHeroineStore } from '@/stores/heroineStore';
import { useAchievementStore } from '@/stores/achievementStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useLoopStore } from '@/stores/loopStore';
import { useDailyBuffStore } from '@/stores/dailyBuffStore';
import { useSaveStore } from '@/stores/saveStore';
import { useAudio } from './useAudio';
import { useEventBus } from './useEventBus';

export function useGameInit() {
    const i18nStore = useI18nStore();
    const configStore = useConfigStore();
    const boardStore = useBoardStore();
    const bossStore = useBossStore();
    const energyStore = useEnergyStore();
    const currencyStore = useCurrencyStore();
    const dialogueStore = useDialogueStore();
    const dailyOrderStore = useDailyOrderStore();
    const heroineStore = useHeroineStore();
    const achievementStore = useAchievementStore();
    const inventoryStore = useInventoryStore();
    const loopStore = useLoopStore();
    const dailyBuffStore = useDailyBuffStore();
    const saveStore = useSaveStore();
    const bus = useEventBus();

    // --- Shared reactive state ---
    const gameReady = ref(false);
    const showLangSelect = ref(false);
    const showLoopSummary = ref(false);
    const showParade = ref(false);
    const showGameComplete = ref(false);
    const loopSummaryNextIndex = ref(1);

    // ============================================================
    // MAIN INIT SEQUENCE (from Game.init())
    // ============================================================

    async function init() {
        // 1. Setup resume BGM on user gesture (before anything else)
        const audio = useAudio();
        const resumeBGM = () => {
            audio.tryResumeBGM();
            document.removeEventListener('click', resumeBGM);
            document.removeEventListener('touchstart', resumeBGM);
        };
        document.addEventListener('click', resumeBGM);
        document.addEventListener('touchstart', resumeBGM);

        // 2. Check for saved locale — if none, show language selector
        const savedLocale = localStorage.getItem('i18n_locale');
        if (!savedLocale) {
            showLangSelect.value = true;
            return; // Wait for user to pick a language
        }

        await proceedWithLocale(savedLocale);
    }

    async function proceedWithLocale(locale?: string) {
        // 3. Init I18n
        try {
            await i18nStore.init(locale);
        } catch (e) {
            console.warn('[useGameInit] I18n init failed, using defaults', e);
        }

        // 4. Load game data (items, levels, generators, etc.)
        try {
            await configStore.loadGameData(locale || i18nStore.locale?.toString());
        } catch (e) {
            console.error('[useGameInit] Failed to load game data', e);
        }

        // 5. Init audio — preload all SFX
        try {
            const audio = useAudio();
            audio.preloadAll();
        } catch (e) {
            console.warn('[useGameInit] Audio preload failed', e);
        }

        // 6. Start energy regen (before save load, per C-05 fix)
        try {
            energyStore.startRegen();
        } catch (e) {
            console.warn('[useGameInit] Energy regen start failed', e);
        }

        // 7. Try loading save
        try {
            if (saveStore.hasSave) {
                // Try legacy migration first
                saveStore.migrateLegacySave();

                const loaded = saveStore.loadAll();
                if (loaded) {
                    // If we have a loop config, apply it
                    if (loopStore.currentLoopConfig) {
                        loopStore.applyLoopConfig(loopStore.currentLoopConfig);
                    } else {
                        // No loop config in save — build for current loopIndex
                        const config = loopStore.buildLoopConfig(loopStore.loopIndex);
                        loopStore.applyLoopConfig(config);
                    }

                    // Check loop-reached achievements on save load
                    achievementStore.checkAll();

                    // Safety net: ensure daily orders are populated after save load
                    if (
                        !dailyOrderStore.activeOrders ||
                        dailyOrderStore.activeOrders.length === 0 ||
                        dailyOrderStore.activeOrders.every(o => o.fulfilled)
                    ) {
                        dailyOrderStore.rollNewOrders();
                    }

                    // FB-6: Roll daily buff (will re-roll if day changed since last save)
                    dailyBuffStore.rollDailyBuff();

                    // Apply heroine permanent effects to energy
                    applyHeroineEffectsToEnergy();

                    gameReady.value = true;

                    // Start game BGM
                    try {
                        const audio = useAudio();
                        audio.playBGM('game_bgm');
                    } catch (e) {
                        console.warn('[useGameInit] BGM play failed', e);
                    }
                    return;
                }
            }
        } catch (e) {
            console.error('[useGameInit] Save load failed, starting fresh', e);
        }

        // 8. Fresh start — new meta game + first run
        try {
            await startNewMetaGame();
        } catch (e) {
            console.error('[useGameInit] startNewMetaGame failed', e);
            // Ensure game is still marked as ready even if intro fails
            gameReady.value = true;
        }
    }

    async function onLangSelect(locale: string) {
        showLangSelect.value = false;
        await proceedWithLocale(locale);
    }

    // ============================================================
    // LOOP MODE LIFECYCLE (from Game class)
    // ============================================================

    /**
     * Start a brand new meta game (first time or after full reset).
     * Matches Game.startNewMetaGame() from js/main.js lines 192-219
     */
    async function startNewMetaGame() {
        // Build and apply loop config for loop 1
        const config = loopStore.buildLoopConfig(1);
        loopStore.applyLoopConfig(config);

        // Check loop-reached achievements
        achievementStore.checkAll();

        // Reset all run state to fresh
        resetRunState();

        // FB-6: Roll daily buff for new game
        dailyBuffStore.rollDailyBuff();

        // Place initial generators and load first boss
        boardStore.renderAll();
        boardStore.placeInitialGenerators();
        bossStore.loadLevel(0);

        // Mark game as ready BEFORE showing intro dialogue,
        // so the DialogueOverlay is mounted and user can interact with it
        gameReady.value = true;

        // Show generic intro, then Loop 1 narrative (non-blocking)
        await showIntro();
        await showLoopIntro();

        // Update loop UI badge
        updateLoopUI();

        // Save
        saveStore.saveAll();

        // Start game BGM
        try {
            const audio = useAudio();
            audio.playBGM('game_bgm');
        } catch (e) {
            console.warn('[useGameInit] BGM play failed', e);
        }
    }

    /**
     * Start a new run for the given loop index.
     * Matches Game.startNewRun() from js/main.js lines 224-248
     */
    function startNewRun(loopIndex: number) {
        // Build and apply new loop config
        const config = loopStore.buildLoopConfig(loopIndex);
        loopStore.applyLoopConfig(config);

        // Check loop-reached achievements
        achievementStore.checkAll();

        // Reset run state
        resetRunState();

        // Place initial generators and load first boss
        boardStore.renderAll();
        boardStore.placeInitialGenerators();
        bossStore.loadLevel(0);

        // Show loop intro narrative
        showLoopIntro();

        // Update loop UI badge
        updateLoopUI();

        // Save both meta and run
        saveStore.saveAll();
    }

    /**
     * Complete the current loop and transition to the next.
     * Matches Game.completeCurrentLoop() from js/main.js lines 254-275
     */
    function completeCurrentLoop() {
        const nextLoopIndex = loopStore.loopIndex + 1;

        // completeLoop() now calculates and awards loop tokens internally
        loopStore.completeLoop();

        // Save meta immediately (so progress isn't lost even if user closes browser)
        saveStore.saveMeta();
        // Clear old run data
        saveStore.clearRun();

        // Show loop summary overlay
        loopSummaryNextIndex.value = nextLoopIndex;
        showLoopSummary.value = true;

        // Emit event for cross-store communication
        bus.emit('loop:completed', { loopIndex: nextLoopIndex });
    }

    /**
     * Reset all run-level state for a new loop.
     * Keeps meta state intact (loop, heroine upgrades, diamonds, collection, etc.)
     * Matches Game.resetRunState() from js/main.js lines 281-342
     */
    function resetRunState() {
        // Gold: reset to starting value + meta bonuses
        const startingGold = loopStore.getStartingGold();
        currencyStore.setGold(startingGold);

        // Diamonds: NOT reset (meta currency), but add meta bonus
        const startingDiamonds = loopStore.getStartingDiamonds();
        currencyStore.addDiamonds(startingDiamonds);

        // Energy: reset to base, then apply permanent upgrades + meta bonus
        energyStore.stopRegen();
        energyStore.resetToBase();

        // Apply heroine permanent upgrades to energy
        applyHeroineEffectsToEnergy();

        // Set current energy to max + meta bonus
        const energyBonus = loopStore.getStartingEnergyBonus();
        energyStore.add(energyBonus);

        // Restart energy regen timer with reset values (C-04 fix)
        energyStore.startRegen();

        // Board: full reset
        boardStore.initGrid();

        // Boss: reset
        bossStore.reset();

        // Inventory: clear all items
        inventoryStore.clear();

        // Daily orders: update loop index and re-roll
        dailyOrderStore.setLoopIndex(loopStore.loopIndex);
        dailyOrderStore.rollNewOrders();
    }

    // ============================================================
    // HEROINE EFFECTS (from Game.applyHeroineEffectsToEnergy())
    // ============================================================

    /**
     * Apply permanent heroine upgrades to energy system.
     * Matches Game.applyHeroineEffectsToEnergy() from js/main.js lines 347-355
     */
    function applyHeroineEffectsToEnergy() {
        if (!heroineStore) return;
        const bonus = heroineStore.getEffectValue('energy_cap');
        if (bonus && typeof bonus === 'number' && bonus > 0) {
            energyStore.setMax(energyStore.max + bonus);
        }
    }

    // ============================================================
    // DIALOGUE / INTRO (from Game.showIntro() & Game.showLoopIntro())
    // ============================================================

    /**
     * Show generic intro dialogue.
     * Matches Game.showIntro() from js/main.js lines 549-556
     */
    async function showIntro() {
        const introConfig = configStore.uiText?.intro;
        if (introConfig) {
            dialogueStore.show(
                introConfig.npc || '...',
                introConfig.emoji || '🌟',
                introConfig.text || '',
                introConfig.player || ''
            );
        } else {
            dialogueStore.show('...', '🌟', '', '');
        }
        // Wait for dialogue to close (simple approach: wait for isOpen to become false)
        await waitForDialogueClose();
    }

    /**
     * Show loop intro narrative.
     * Matches Game.showLoopIntro() from js/main.js lines 423-435
     */
    async function showLoopIntro() {
        const loopIdx = String(loopStore.loopIndex);
        const narratives = configStore.loopNarratives;
        const narrative = narratives?.[loopIdx];
        if (narrative && narrative.loopIntro) {
            dialogueStore.show(
                '🏫',
                '',
                narrative.loopIntro,
                i18nStore.t('loop.newStart'),
                { skipBGM: true }
            );
            await waitForDialogueClose();
        }
    }

    /**
     * Helper: wait for the dialogue overlay to close
     */
    function waitForDialogueClose(): Promise<void> {
        return new Promise((resolve) => {
            if (!dialogueStore.isOpen) {
                resolve();
                return;
            }
            const unwatch = watch(
                () => dialogueStore.isOpen,
                (open) => {
                    if (!open) {
                        unwatch();
                        resolve();
                    }
                }
            );
        });
    }

    // ============================================================
    // LOOP UI (from Game.updateLoopUI())
    // ============================================================

    /**
     * Update loop-related UI state.
     * Matches Game.updateLoopUI() from js/main.js lines 361-383
     * In Vue, most of this is reactive via computed properties,
     * but we emit events for any external consumers.
     */
    function updateLoopUI() {
        bus.emit('loop:uiUpdated', {
            loopIndex: loopStore.loopIndex,
            config: loopStore.currentLoopConfig
        });
    }

    // ============================================================
    // LOOP SUMMARY ACTIONS
    // ============================================================

    /**
     * Called when the loop summary overlay's "Next Loop" button is clicked
     */
    function onNextLoop() {
        showLoopSummary.value = false;
        startNewRun(loopSummaryNextIndex.value);
    }

    /**
     * Close the loop summary overlay without starting next loop
     */
    function closeLoopSummary() {
        showLoopSummary.value = false;
    }

    /**
     * Close the parade overlay
     */
    function closeParade() {
        showParade.value = false;
    }

    /**
     * Close the game complete overlay
     */
    function closeGameComplete() {
        showGameComplete.value = false;
    }

    onUnmounted(() => {
        energyStore.destroyLogic();
    });

    return {
        // State
        gameReady,
        showLangSelect,
        showLoopSummary,
        showParade,
        showGameComplete,
        loopSummaryNextIndex,

        // Init
        init,
        onLangSelect,
        proceedWithLocale,

        // Lifecycle
        startNewMetaGame,
        startNewRun,
        completeCurrentLoop,
        resetRunState,

        // Dialogue
        showIntro,
        showLoopIntro,

        // UI
        updateLoopUI,

        // Overlay actions
        onNextLoop,
        closeLoopSummary,
        closeParade,
        closeGameComplete
    };
}
