// ============================================================
// loopStore.ts — Loop Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { useCollectionStore } from './collectionStore';
import { useAchievementStore } from './achievementStore';
import type { MetaUpgrade } from '../types/game';

export type { MetaUpgrade };

export const useLoopStore = defineStore('loop', () => {
    // --- State ---
    const loopIndex = ref(1);           // Current loop number (1-based)
    const loopTokens = ref(0);          // Permanent currency: 学园声望
    const metaUpgrades = ref<MetaUpgrade>({
        startingGold: 0,
        startingDiamonds: 0,
        startingEnergy: 0,
        dailyBonus: 0
    });
    const currentLoopConfig = ref<any>(null); // Current loop's configuration snapshot
    const unlockedNarrativeFlags = ref<string[]>([]); // Narrative flags unlocked across loops

    // --- Computed ---
    const hasLoopTokens = computed(() => {
        return loopTokens.value > 0;
    });
    
    const totalMetaUpgrades = computed(() => {
        return metaUpgrades.value.startingGold + 
               metaUpgrades.value.startingDiamonds + 
               metaUpgrades.value.startingEnergy + 
               metaUpgrades.value.dailyBonus;
    });
    
    const hasUnlockedNarratives = computed(() => {
        return unlockedNarrativeFlags.value.length > 0;
    });

    // --- Actions ---
    function buildLoopConfig(loopIndexParam: number) {
        // Simplified loop config builder
        return {
            loopIndex: loopIndexParam,
            title: getLoopTitle(loopIndexParam),
            hpMultiplier: getHpMultiplier(loopIndexParam),
            rewardMultiplier: getRewardMultiplier(loopIndexParam),
            timeMultiplier: getTimeMultiplier(loopIndexParam),
            specialRules: getSpecialRules(loopIndexParam),
            narrativePackId: getNarrativePackId(loopIndexParam),
            loopTokenReward: getLoopTokenReward(loopIndexParam)
        };
    }

    function applyLoopConfig(config: any) {
        currentLoopConfig.value = config;
        loopIndex.value = config.loopIndex;
    }

    function getHpMultiplier(loopIndexParam: number): number {
        if (loopIndexParam <= 0) return 1.0;
        if (loopIndexParam <= 8) {
            const table = [0, 1.00, 1.20, 1.40, 1.65, 1.95, 2.30, 2.70, 3.15];
            return table[loopIndexParam];
        }
        return 3.15 * (1 + 0.16 * (loopIndexParam - 8));
    }

    function getRewardMultiplier(loopIndexParam: number): number {
        if (loopIndexParam <= 0) return 1.0;
        if (loopIndexParam <= 8) {
            const table = [0, 1.00, 1.10, 1.20, 1.30, 1.40, 1.55, 1.70, 1.85];
            return table[loopIndexParam];
        }
        return Math.min(3.0, 1.85 + 0.12 * (loopIndexParam - 8));
    }

    function getTimeMultiplier(loopIndexParam: number): number {
        if (loopIndexParam <= 0) return 1.0;
        if (loopIndexParam <= 8) {
            const table = [0, 1.00, 0.95, 0.90, 0.88, 0.85, 0.82, 0.80, 0.78];
            return table[loopIndexParam];
        }
        return 0.78;
    }

    function getLoopTokenReward(loopIndexParam: number): number {
        if (loopIndexParam <= 0) return 0;
        if (loopIndexParam <= 8) {
            const table = [0, 10, 15, 20, 25, 30, 36, 42, 50];
            return table[loopIndexParam];
        }
        return 50 + 5 * (loopIndexParam - 8);
    }

    function getLoopTitle(loopIndexParam: number): string {
        const configStore = useConfigStore();
        const rule = configStore.loopRules[String(loopIndexParam)];
        return rule?.title || `学园轮回 ${loopIndexParam}`;
    }

    function getSpecialRules(loopIndexParam: number): any[] {
        const configStore = useConfigStore();
        const rule = configStore.loopRules[String(loopIndexParam)];
        return rule?.specialRules || [];
    }

    function getNarrativePackId(loopIndexParam: number): string {
        return `loop_${loopIndexParam}`;
    }

    function calculateLoopRewards(loopIndexParam: number, summary: any) {
        const baseReward = getLoopTokenReward(loopIndexParam);
        let bonusTokens = 0;

        // Collection incremental bonus: +1 token per new item discovered this loop
        if (summary && summary.newDiscoveries) {
            bonusTokens += summary.newDiscoveries;
        }

        // Achievement bonus
        if (summary && summary.achievementsUnlocked) {
            bonusTokens += summary.achievementsUnlocked * 2;
        }

        return {
            loopTokens: baseReward + bonusTokens,
            baseTokens: baseReward,
            bonusTokens
        };
    }

    function getMetaUpgradeCost(upgradeId: keyof MetaUpgrade, currentLevel: number): number {
        const baseCosts = {
            startingGold: 10,
            startingDiamonds: 20,
            startingEnergy: 15,
            dailyBonus: 25
        };
        const base = baseCosts[upgradeId] || 10;
        return base + currentLevel * Math.ceil(base * 0.8); // Scaling cost
    }

    function getMetaUpgradeEffect(upgradeId: keyof MetaUpgrade, level: number): number {
        switch (upgradeId) {
            case 'startingGold': return level * 50;
            case 'startingDiamonds': return level * 5;
            case 'startingEnergy': return level * 20;
            case 'dailyBonus': return level * 0.05;
            default: return 0;
        }
    }

    function getMetaUpgradeMaxLevel(upgradeId: keyof MetaUpgrade): number {
        const maxLevels = {
            startingGold: 10,
            startingDiamonds: 5,
            startingEnergy: 8,
            dailyBonus: 10
        };
        return maxLevels[upgradeId] || 10;
    }

    function purchaseMetaUpgrade(upgradeId: keyof MetaUpgrade): boolean {
        const currentLevel = metaUpgrades.value[upgradeId] || 0;
        const maxLevel = getMetaUpgradeMaxLevel(upgradeId);
        if (currentLevel >= maxLevel) return false;

        const cost = getMetaUpgradeCost(upgradeId, currentLevel);
        if (loopTokens.value < cost) return false;

        loopTokens.value -= cost;
        metaUpgrades.value[upgradeId] = currentLevel + 1;
        
        // Emit event for UI updates
        globalBus.emit('loop:metaUpgradePurchased', {
            upgradeId,
            level: currentLevel + 1,
            cost
        });

        return true;
    }

    function getStartingGold(): number {
        return (currentLoopConfig.value ? currentLoopConfig.value.rewardMultiplier : 1.0) *
               100 + // Default starting gold
               getMetaUpgradeEffect('startingGold', metaUpgrades.value.startingGold || 0);
    }

    function getStartingDiamonds(): number {
        return getMetaUpgradeEffect('startingDiamonds', metaUpgrades.value.startingDiamonds || 0);
    }

    function getStartingEnergyBonus(): number {
        return getMetaUpgradeEffect('startingEnergy', metaUpgrades.value.startingEnergy || 0);
    }

    function getDailyBonusMultiplier(): number {
        return 1.0 + getMetaUpgradeEffect('dailyBonus', metaUpgrades.value.dailyBonus || 0);
    }

    function unlockNarrativeFlag(flag: string): void {
        if (!unlockedNarrativeFlags.value.includes(flag)) {
            unlockedNarrativeFlags.value.push(flag);
            
            // Emit event for UI updates
            globalBus.emit('loop:narrativeFlagUnlocked', {
                flag
            });
        }
    }

    function hasNarrativeFlag(flag: string): boolean {
        return unlockedNarrativeFlags.value.includes(flag);
    }

    function hasRule(rule: string): boolean {
        return currentLoopConfig.value?.specialRules?.includes(rule) ?? false;
    }

    function completeLoop(): void {
        const collectionStore = useCollectionStore();
        const achievementStore = useAchievementStore();
        const rewards = calculateLoopRewards(loopIndex.value, {
            newDiscoveries: collectionStore.getNewDiscoveriesCountThisLoop(),
            achievementsUnlocked: achievementStore.getUnlockedCountThisLoop()
        });
        loopTokens.value += rewards.loopTokens ?? rewards.baseTokens ?? 0;
        loopIndex.value++;
        collectionStore.resetLoopDiscoveries();
        achievementStore.resetLoopAchievements();
    }

    // --- Serialization ---
    function serialize() {
        return {
            loopIndex: loopIndex.value,
            loopTokens: loopTokens.value,
            metaUpgrades: { ...metaUpgrades.value },
            currentLoopConfig: currentLoopConfig.value ? { ...currentLoopConfig.value } : null,
            unlockedNarrativeFlags: [...unlockedNarrativeFlags.value]
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        loopIndex.value = data.loopIndex ?? 1;
        loopTokens.value = data.loopTokens ?? 0;
        metaUpgrades.value = data.metaUpgrades || {
            startingGold: 0,
            startingDiamonds: 0,
            startingEnergy: 0,
            dailyBonus: 0
        };
        currentLoopConfig.value = data.currentLoopConfig || null;
        unlockedNarrativeFlags.value = data.unlockedNarrativeFlags || [];
    }

    return {
        // State
        loopIndex,
        loopTokens,
        metaUpgrades,
        currentLoopConfig,
        unlockedNarrativeFlags,
        
        // Computed
        hasLoopTokens,
        totalMetaUpgrades,
        hasUnlockedNarratives,
        
        // Actions
        buildLoopConfig,
        applyLoopConfig,
        getHpMultiplier,
        getRewardMultiplier,
        getTimeMultiplier,
        getLoopTokenReward,
        getLoopTitle,
        getSpecialRules,
        getNarrativePackId,
        calculateLoopRewards,
        getMetaUpgradeCost,
        getMetaUpgradeEffect,
        getMetaUpgradeMaxLevel,
        purchaseMetaUpgrade,
        getStartingGold,
        getStartingDiamonds,
        getStartingEnergyBonus,
        getDailyBonusMultiplier,
        unlockNarrativeFlag,
        hasNarrativeFlag,
        hasRule,
        completeLoop,
        
        // Serialization
        serialize,
        deserialize
    };
});