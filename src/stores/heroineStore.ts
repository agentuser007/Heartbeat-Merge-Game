// ============================================================
// heroineStore.ts — Heroine Upgrade Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { useCurrencyStore } from './currencyStore';
import { HeroineService } from '../services/HeroineService';
import type { ServiceResult } from '../services/ServiceResultTypes';
import type { HeroineUpgrade } from '../types/game';

export const useHeroineStore = defineStore('heroine', () => {
    // --- State ---
    const upgrades = ref<Record<string, number>>({}); // upgrade_id -> current_level (0-based, -1 = not purchased)
    const upgradeList = ref<HeroineUpgrade[]>([]);

    // NOTE: useConfigStore() is called at the top level of this defineStore setup.
    // This creates an init order dependency — Pinia must be installed before this store is first accessed.
    // In practice this is safe because stores are first accessed after app.mount(), but restructuring
    // to use a lazy getter would remove this dependency if needed.
    const configStore = useConfigStore();

    // Initialize upgrade levels to -1 (none purchased)
    upgradeList.value = configStore.heroineUpgrades;
    for (const upg of configStore.heroineUpgrades) {
        upgrades.value[upg.id] = -1;
    }

    // --- Computed ---
    const purchasedUpgrades = computed(() => {
        return Object.entries(upgrades.value)
            .filter(([_, level]) => level >= 0)
            .map(([id, level]) => ({ id, level }));
    });

    const totalSpent = computed(() => {
        let sum = 0;
        for (const [id, level] of Object.entries(upgrades.value)) {
            if (level >= 0) {
                const upgrade = upgradeList.value.find(u => u.id === id);
                if (upgrade) {
                    for (let i = 0; i <= level; i++) {
                        if (i < upgrade.levels.length) {
                            sum += upgrade.levels[i].cost;
                        }
                    }
                }
            }
        }
        return sum;
    });

    const maxedUpgrades = computed(() => {
        return Object.entries(upgrades.value)
            .filter(([id, level]) => {
                const upgrade = upgradeList.value.find(u => u.id === id);
                return upgrade && level >= upgrade.levels.length - 1;
            })
            .map(([id, _]) => id);
    });

    // --- Actions ---
    function setUpgradeLevel(upgradeId: string, level: number): void {
        upgrades.value[upgradeId] = level;
    }

    function purchaseUpgrade(upgradeId: string): ServiceResult {
        const currencyStore = useCurrencyStore();
        return HeroineService.resolvePurchaseUpgrade(upgradeId, {
            upgradeList: upgradeList.value,
            currentLevel: (id) => upgrades.value[id],
            canAffordDiamonds: (cost) => currencyStore.canAffordDiamonds(cost),
            maxEnergyBase: configStore.gameConfig.MAX_ENERGY,
        });
    }

    function getEffectValue(upgradeId: string): number | null {
        const level = upgrades.value[upgradeId];
        if (level < 0) return null;
        
        const upg = upgradeList.value.find(u => u.id === upgradeId);
        if (!upg || level >= upg.levels.length) return null;
        
        return upg.levels[level].value;
    }

    function applyPermanentEffects() {
        // Apply all purchased upgrade effects
        for (const [upgradeId, level] of Object.entries(upgrades.value)) {
            if (level >= 0) {
                const value = getEffectValue(upgradeId);
                if (value !== null) {
                    // In a real implementation, this would apply the effect to the game systems
                    globalBus.emit('heroine:effectApplied', {
                        upgradeId,
                        level,
                        value
                    });
                }
            }
        }
    }

    function getMaxLevel(upgradeId: string): number {
        const upg = upgradeList.value.find(u => u.id === upgradeId);
        return upg ? upg.levels.length - 1 : -1;
    }

    function getCurrentLevel(upgradeId: string): number {
        return upgrades.value[upgradeId] ?? -1;
    }

    function isMaxed(upgradeId: string): boolean {
        const current = getCurrentLevel(upgradeId);
        const max = getMaxLevel(upgradeId);
        return current >= 0 && current >= max;
    }

    function getNextCost(upgradeId: string): number {
        const upg = upgradeList.value.find(u => u.id === upgradeId);
        if (!upg) return 0;

        const currentLevel = upgrades.value[upgradeId];
        if (currentLevel >= upg.levels.length - 1) return 0; // maxed

        return upg.levels[currentLevel + 1].cost;
    }

    // --- Serialization ---
    function serialize() {
        return {
            upgrades: { ...upgrades.value }
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { upgrades?: Record<string, number> };
        
        upgrades.value = d.upgrades || {};
        
        // Ensure all upgrades exist in the state
        for (const upg of upgradeList.value) {
            if (upgrades.value[upg.id] === undefined) {
                upgrades.value[upg.id] = -1;
            }
        }
    }

    return {
        // State
        upgrades,
        upgradeList,
        
        // Computed
        purchasedUpgrades,
        totalSpent,
        maxedUpgrades,
        
        // Actions
        purchaseUpgrade,
        setUpgradeLevel,
        getEffectValue,
        applyPermanentEffects,
        getMaxLevel,
        getCurrentLevel,
        isMaxed,
        getNextCost,
        
        // Serialization
        serialize,
        deserialize
    };
});