// ============================================================
// loopStore.ts — Loop Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import type { MetaUpgrade, LoopStatus, LoopConfig, LoopSummary } from '../types/game';
import type { LoopSerializeData } from '../types/serialize';
import type { ServiceResult } from '../services/ServiceResultTypes';
import { LoopService } from '../services/LoopService';
import * as LoopLogic from '../logic/LoopLogic';

export type { MetaUpgrade, LoopStatus };

export const useLoopStore = defineStore('loop', () => {
    const configStore = useConfigStore();

    // --- State ---
    const loopIndex = ref(1);
    const loopTokens = ref(0);
    const loopStatus = ref<LoopStatus>('active');
    const metaUpgrades = ref<MetaUpgrade>({
        startingGold: 0,
        startingDiamonds: 0,
        startingEnergy: 0,
        dailyBonus: 0
    });
    const currentLoopConfig = ref<any>(null);
    const unlockedNarrativeFlags = ref<string[]>([]);
    const controlLevel = ref(0);

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

    // --- Helper: build deps from configStore ---
    function _hpDeps() {
        const m = configStore.loopMultipliers.hpMultiplier;
        return { table: m.table, overflowBase: m.overflowBase!, overflowGrowth: m.overflowGrowth! };
    }

    function _rewardDeps() {
        const m = configStore.loopMultipliers.rewardMultiplier;
        return { table: m.table, overflowBase: m.overflowBase!, overflowGrowth: m.overflowGrowth!, cap: m.cap! };
    }

    function _timeDeps() {
        const m = configStore.loopMultipliers.timeMultiplier;
        return { table: m.table, overflowValue: m.overflowValue! };
    }

    function _tokenDeps() {
        const m = configStore.loopMultipliers.tokenReward;
        return { table: m.table, overflowBase: m.overflowBase!, overflowGrowth: m.overflowGrowth! };
    }

    function _metaDeps() {
        return { metaUpgradeConfigs: configStore.loopMultipliers.metaUpgrades };
    }

    // --- Actions ---
    function buildLoopConfig(loopIndexParam: number) {
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

    function applyLoopConfig(config: LoopConfig) {
        currentLoopConfig.value = config;
        loopIndex.value = config.loopIndex;
    }

    function getHpMultiplier(loopIndexParam: number): number {
        return LoopLogic.getHpMultiplier(loopIndexParam, _hpDeps());
    }

    function getRewardMultiplier(loopIndexParam: number): number {
        return LoopLogic.getRewardMultiplier(loopIndexParam, _rewardDeps());
    }

    function getTimeMultiplier(loopIndexParam: number): number {
        return LoopLogic.getTimeMultiplier(loopIndexParam, _timeDeps());
    }

    function getLoopTokenReward(loopIndexParam: number): number {
        return LoopLogic.getLoopTokenReward(loopIndexParam, _tokenDeps());
    }

    function getLoopTitle(loopIndexParam: number): string {
        return LoopLogic.getLoopTitle(loopIndexParam, { loopRules: configStore.loopRules });
    }

    function getSpecialRules(loopIndexParam: number) {
        return LoopLogic.getSpecialRules(loopIndexParam, { loopRules: configStore.loopRules });
    }

    function getNarrativePackId(loopIndexParam: number): string {
        return `loop_${loopIndexParam}`;
    }

    function calculateLoopRewards(loopIndexParam: number, summary: LoopSummary) {
        return LoopLogic.calculateLoopRewards(loopIndexParam, summary, {
            tokenRewardConfig: _tokenDeps(),
            achievementTokenBonus: configStore.boardEconomy.achievementTokenBonus,
        });
    }

    function getMetaUpgradeCost(upgradeId: keyof MetaUpgrade, currentLevel: number): number {
        return LoopLogic.getMetaUpgradeCost(upgradeId, currentLevel, _metaDeps());
    }

    function getMetaUpgradeEffect(upgradeId: keyof MetaUpgrade, level: number): number {
        return LoopLogic.getMetaUpgradeEffect(upgradeId, level, _metaDeps());
    }

    function getMetaUpgradeMaxLevel(upgradeId: keyof MetaUpgrade): number {
        return LoopLogic.getMetaUpgradeMaxLevel(upgradeId, _metaDeps());
    }

    function purchaseMetaUpgrade(upgradeId: keyof MetaUpgrade): ServiceResult {
        return LoopService.resolvePurchaseMetaUpgrade(upgradeId, {
            currentLevel: metaUpgrades.value[upgradeId] || 0,
            loopTokens: loopTokens.value,
            metaUpgradeConfigs: configStore.loopMultipliers.metaUpgrades,
        });
    }

    function getStartingGold(): number {
        return LoopLogic.getStartingGold(
            currentLoopConfig.value ? currentLoopConfig.value.rewardMultiplier : 1.0,
            metaUpgrades.value.startingGold || 0,
            { startingGoldBase: configStore.loopMultipliers.startingGoldBase, metaUpgradeConfigs: configStore.loopMultipliers.metaUpgrades },
        );
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
            globalBus.emit('loop:narrativeFlagUnlocked', { flag });
        }
    }

    function hasNarrativeFlag(flag: string): boolean {
        return unlockedNarrativeFlags.value.includes(flag);
    }

    function addNarrativeFlag(flag: string): void {
        unlockNarrativeFlag(flag);
    }

    function setControlLevel(level: number): void {
        controlLevel.value = Math.min(100, Math.max(0, level));
    }

    function addControlLevel(delta: number): void {
        setControlLevel(controlLevel.value + delta);
    }

    function hasRule(rule: string): boolean {
        return currentLoopConfig.value?.specialRules?.includes(rule) ?? false;
    }

    function transitionToSettling(): void {
        if (loopStatus.value !== 'active') return;
        loopStatus.value = 'settling';
        globalBus.emit('loop:settling', { loopIndex: loopIndex.value });
    }

    function transitionToCompleted(): void {
        if (loopStatus.value !== 'settling') return;
        loopStatus.value = 'completed';
    }

    function syncLoopStatus(status: LoopStatus): void {
        loopStatus.value = status;
    }

    // --- Serialization ---
    function serialize() {
        return {
            loopIndex: loopIndex.value,
            loopTokens: loopTokens.value,
            loopStatus: loopStatus.value,
            metaUpgrades: { ...metaUpgrades.value },
            currentLoopConfig: currentLoopConfig.value ? { ...currentLoopConfig.value } : null,
            unlockedNarrativeFlags: [...unlockedNarrativeFlags.value],
            controlLevel: controlLevel.value,
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as LoopSerializeData;
        
        loopIndex.value = d.loopIndex ?? 1;
        loopTokens.value = d.loopTokens ?? 0;
        loopStatus.value = d.loopStatus || 'active';
        metaUpgrades.value = d.metaUpgrades || {
            startingGold: 0,
            startingDiamonds: 0,
            startingEnergy: 0,
            dailyBonus: 0
        };
        currentLoopConfig.value = d.currentLoopConfig || null;
        unlockedNarrativeFlags.value = d.unlockedNarrativeFlags || [];
        controlLevel.value = (d as any).controlLevel ?? 0;
    }

    return {
        loopIndex,
        loopTokens,
        loopStatus,
        metaUpgrades,
        currentLoopConfig,
        unlockedNarrativeFlags,
        controlLevel,
        
        hasLoopTokens,
        totalMetaUpgrades,
        hasUnlockedNarratives,
        
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
        addNarrativeFlag,
        hasNarrativeFlag,
        setControlLevel,
        addControlLevel,
        hasRule,
        transitionToSettling,
        transitionToCompleted,
        syncLoopStatus,
        
        serialize,
        deserialize
    };
});
