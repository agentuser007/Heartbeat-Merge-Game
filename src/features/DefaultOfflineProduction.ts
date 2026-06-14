// ============================================================
// DefaultOfflineProduction.ts — Original Offline Production Logic
// ============================================================
// Implementation of IOfflineProduction with the original
// offline production and energy recovery logic extracted
// from boardStore and energyStore.
// ============================================================

import { IOfflineProduction, OfflineProductionResult, OfflineEnergyResult, OfflineProductionContext, OfflineEnergyContext } from './IOfflineProduction';
import { BoardLogic } from '../logic/BoardLogic';

/** Maximum offline items per generator (global hard cap) */
const MAX_OFFLINE_PRODUCES_PER_GENERATOR = 20;

/**
 * Default implementation of offline production.
 * Contains the original logic from boardStore.calculateOfflineProduction()
 * and energyStore.deserialize() offline recovery.
 */
export class DefaultOfflineProduction implements IOfflineProduction {
    /**
     * Calculate and apply offline generator production.
     * Iterates all generators on the board, calculates how many ticks
     * elapsed during offline time, and adds produced items to inventory.
     */
    calculateProduction(savedTimestamp: number, context: OfflineProductionContext): OfflineProductionResult {
        const now = Date.now();
        const elapsedMs = now - savedTimestamp;
        if (elapsedMs <= 0) return { itemCount: 0 };

        const { generatorStates, cells, cols, rows, items, generators, addItem } = context;
        let totalItems = 0;

        // Create a temporary BoardLogic instance for rollGeneratorDrop
        const logic = new BoardLogic(cols, rows);
        logic.cells = [...cells];
        logic.generatorStates = { ...generatorStates };

        for (const idxStr of Object.keys(generatorStates)) {
            const idx = parseInt(idxStr);
            const itemId = cells[idx];
            if (!itemId) continue;
            const itemData = items[itemId];
            if (!itemData || itemData.type !== 'GENERATOR') continue;

            const genConfig = logic.getGeneratorConfig(itemId, items, generators);
            if (!genConfig) continue;

            const cooldown = genConfig.levelConfig.cooldown || 120000;
            const capacity = genConfig.levelConfig.capacity || MAX_OFFLINE_PRODUCES_PER_GENERATOR;
            const offlineTicks = Math.floor(elapsedMs / cooldown);
            const produceCount = Math.min(offlineTicks, capacity, MAX_OFFLINE_PRODUCES_PER_GENERATOR);

            for (let i = 0; i < produceCount; i++) {
                const dropId = logic.rollGeneratorDrop(itemId, items, generators, { random: Math.random });
                if (dropId) {
                    addItem(dropId, 1);
                    totalItems++;
                }
            }
        }

        return { itemCount: totalItems };
    }

    /**
     * Calculate offline energy recovery.
     * Pure calculation — does not mutate any state.
     */
    calculateEnergyRecovery(savedTimestamp: number, context: OfflineEnergyContext): OfflineEnergyResult {
        const { current, regenCap, regenInterval, regenAmount } = context;

        if (current >= regenCap || regenInterval <= 0) {
            return { energyRecovered: 0, newCurrent: current };
        }

        const elapsed = Date.now() - savedTimestamp;
        if (elapsed <= 0) {
            return { energyRecovered: 0, newCurrent: current };
        }

        const ticks = Math.floor(elapsed / regenInterval);
        if (ticks <= 0) {
            return { energyRecovered: 0, newCurrent: current };
        }

        const amount = ticks * (regenAmount || 1);
        const newCurrent = Math.min(regenCap, current + amount);
        const energyRecovered = newCurrent - current;

        return { energyRecovered, newCurrent };
    }
}
