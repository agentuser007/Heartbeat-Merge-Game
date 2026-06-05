// ============================================================
// useGameLoop.ts — Cross-Store Communication for Game Loop
// ============================================================
// Wires reactive watchers and event bus listeners for cross-store
// communication. Replaces the implicit wiring that was done in
// the Game class constructor in js/main.js.
// ============================================================

import { watch } from 'vue';
import { useBossStore } from '@/stores/bossStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { useEnergyStore } from '@/stores/energyStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useAchievementStore } from '@/stores/achievementStore';
import { useSaveStore } from '@/stores/saveStore';
import { useConfigStore } from '@/stores/configStore';
import { useBoardStore } from '@/stores/boardStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useGachaStore } from '@/stores/gachaStore';
import { useLoopStore } from '@/stores/loopStore';
import { useEventBus } from './useEventBus';

export function useGameLoop() {
    const bossStore = useBossStore();
    const currencyStore = useCurrencyStore();
    const energyStore = useEnergyStore();
    const collectionStore = useCollectionStore();
    const achievementStore = useAchievementStore();
    const saveStore = useSaveStore();
    const configStore = useConfigStore();
    const boardStore = useBoardStore();
    const inventoryStore = useInventoryStore();
    const loopStore = useLoopStore();
    const bus = useEventBus();

    // ============================================================
    // BOSS FSM → LOOP COMPLETION CHECK
    // ============================================================
    // When boss is defeated, check if this was the last boss in
    // the loop (level 3 = 4th boss, 0-indexed). If so, the loop
    // is complete. Otherwise, advance to the next boss level.
    // Matches the logic from Game.completeCurrentLoop() in main.js

    watch(
        () => bossStore.fsmState,
        (newState, oldState) => {
            if (newState === 'DEFEATED' && oldState !== 'DEFEATED') {
                // Check if this was the last boss in the loop
                // Levels are 0-indexed; typically 4 bosses per loop (0,1,2,3)
                const levels = configStore.levels;
                const maxLevelIdx = levels ? levels.length - 1 : 3;

                if (bossStore.currentLevelIdx >= maxLevelIdx) {
                    // Loop complete! Emit event for useGameInit to handle
                    bus.emit('loop:shouldComplete', {});
                } else {
                    // Next boss level
                    bossStore.nextLevel();
                }
            }
        }
    );

    // ============================================================
    // ITEM DISCOVERY → COLLECTION UPDATE
    // ============================================================

    bus.on('collection:itemDiscovered', (data: any) => {
        if (data && data.itemId) {
            const isNew = collectionStore.discover(data.itemId);
            if (isNew) {
                // Check achievements after new discovery
                achievementStore.checkAll();
            }
        }
    });

    // ============================================================
    // CURRENCY CHANGES → ACHIEVEMENT CHECK
    // ============================================================

    bus.on('currency:changed', () => {
        achievementStore.checkAll();
    });

    // ============================================================
    // BOSS DEFEATED → ACHIEVEMENT CHECK
    // ============================================================

    bus.on('bossfsm:stateChanged', (data: any) => {
        if (data && data.to === 'DEFEATED') {
            achievementStore.checkAll();
        }
    });

    // ============================================================
    // BOARD CELL UNLOCK → ACHIEVEMENT CHECK
    // ============================================================

    bus.on('board:cellsUnlocked', () => {
        achievementStore.checkAll();
    });

    // ============================================================
    // DAILY ORDER FULFILLED → CURRENCY REWARD
    // ============================================================

    bus.on('dailyOrders:fulfilled', (data: any) => {
        if (data && data.goldReward) {
            let reward = data.goldReward;
            if (loopStore.hasRule('dailyGoldUp')) {
                reward = Math.floor(reward * 1.5);
            }
            currencyStore.addGold(reward);
        }
        achievementStore.checkAll();
    });

    // ============================================================
    // LOOP COMPLETION EVENT (from useGameInit)
    // ============================================================

    bus.on('loop:shouldComplete', () => {
        // This event is emitted by the boss watcher above when
        // the last boss is defeated. The actual loop completion
        // logic is handled in useGameInit.completeCurrentLoop(),
        // which is triggered from GameView.vue when this event fires.
    });

    // ============================================================
    // HEROINE UPGRADE → APPLY EFFECTS
    // ============================================================

    bus.on('heroine:upgradePurchased', (data: any) => {
        if (data && data.upgradeId === 'energy_cap') {
            const baseMax = configStore.gameConfig.MAX_ENERGY || 100;
            energyStore.setMax(baseMax + (data.value ?? 0));
        }
        saveStore.saveAll();
    });

    // ============================================================
    // META UPGRADE PURCHASED → SAVE
    // ============================================================

    bus.on('loop:metaUpgradePurchased', () => {
        saveStore.saveMeta();
    });

    // ============================================================
    // LOCALE CHANGED → REFRESH LOOP UI
    // ============================================================

    bus.on('localeChanged', () => {
        // In the original code, this refreshed the loop badge text
        // In Vue, this is handled reactively via i18nStore.t() in templates
    });

    // ============================================================
    // SHOP ITEM PURCHASED → APPLY EFFECTS (B1 fix)
    // ============================================================

    bus.on('shop:itemPurchased', (data: any) => {
        if (!data || !data.item) return;
        const { effect, value } = data.item;

        switch (effect) {
            case 'add_energy_item':
                if (value?.energy) {
                    energyStore.add(value.energy);
                }
                break;
            case 'add_joker': {
                const emptyIdx = boardStore.findEmptyCell();
                if (emptyIdx !== -1) {
                    const jokerId = configStore.items ? Object.keys(configStore.items).find(id => configStore.items[id]?.type === 'JOKER') : null;
                    if (jokerId) {
                        boardStore.placeItem(emptyIdx, jokerId);
                    }
                }
                break;
            }
            case 'add_scissor':
                inventoryStore.addItem('scissor', 1);
                break;
            case 'clear_lv1': {
                const items = configStore.items;
                if (!items) break;
                let recycledCount = 0;
                for (let i = 0; i < boardStore.cells.length; i++) {
                    const cellId = boardStore.getCell(i);
                    if (cellId && items[cellId] && items[cellId].level === 1 && items[cellId].type !== 'GENERATOR') {
                        boardStore.clearCell(i);
                        recycledCount++;
                    }
                }
                if (recycledCount > 0 && value?.energyPerItem) {
                    energyStore.add(recycledCount * value.energyPerItem);
                }
                break;
            }
        }

        saveStore.saveAll();
    });

    // ============================================================
    // AD REWARD GRANTED → APPLY REWARDS (B3 fix)
    // ============================================================

    bus.on('ad:rewardGranted', (data: any) => {
        if (!data) return;
        const { adType, reward } = data;

        switch (adType) {
            case 'energy':
                if (reward) energyStore.add(reward);
                break;
            case 'gold':
                if (reward) currencyStore.addGold(reward);
                break;
            case 'diamonds':
                if (reward) currencyStore.addDiamonds(reward);
                break;
            case 'freePull': {
                const gachaStore = useGachaStore();
                gachaStore.freePull();
                break;
            }
        }

        saveStore.saveAll();
    });

    // Return nothing — this composable is purely for side effects
    // (watchers and event listeners). It should be called once in
    // GameView.vue's setup() to activate the cross-store wiring.
}
