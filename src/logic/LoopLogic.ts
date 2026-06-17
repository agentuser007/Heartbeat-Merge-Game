// ============================================================
// LoopLogic.ts — Pure Loop Business Logic
// ============================================================
// All multiplier tables, meta upgrade formulas, and loop config
// queries. Zero Vue dependency — all external values via deps.
// ============================================================

import type { MetaUpgradeConfig, LoopSummary, LoopRule, LoopSpecialRule } from '../types/game';

// --- Deps types ---

export interface HpMultiplierDeps {
    table: number[];
    overflowBase: number;
    overflowGrowth: number;
}

export interface RewardMultiplierDeps {
    table: number[];
    overflowBase: number;
    overflowGrowth: number;
    cap: number;
}

export interface TimeMultiplierDeps {
    table: number[];
    overflowValue: number;
}export interface TokenRewardDeps {
    table: number[];
    overflowBase: number;
    overflowGrowth: number;
}

export interface MetaUpgradeDeps {
    metaUpgradeConfigs: Record<string, MetaUpgradeConfig>;
}

export interface LoopRewardsDeps {
    tokenRewardConfig: TokenRewardDeps;
    achievementTokenBonus: number;
}

export interface StartingGoldDeps {
    startingGoldBase: number;
    metaUpgradeConfigs: Record<string, MetaUpgradeConfig>;
}

export interface LoopConfigQueryDeps {
    loopRules: Record<string, LoopRule>;
}

// --- Multiplier functions ---

export function getHpMultiplier(loopIndex: number, deps: HpMultiplierDeps): number {
    if (loopIndex <= 0) return 1.0;
    if (loopIndex <= deps.table.length) return deps.table[loopIndex - 1];
    return deps.overflowBase * (1 + deps.overflowGrowth * (loopIndex - deps.table.length));
}

export function getRewardMultiplier(loopIndex: number, deps: RewardMultiplierDeps): number {
    if (loopIndex <= 0) return 1.0;
    if (loopIndex <= deps.table.length) return deps.table[loopIndex - 1];
    return Math.min(deps.cap, deps.overflowBase + deps.overflowGrowth * (loopIndex - deps.table.length));
}

export function getTimeMultiplier(loopIndex: number, deps: TimeMultiplierDeps): number {
    if (loopIndex <= 0) return 1.0;
    if (loopIndex <= deps.table.length) return deps.table[loopIndex - 1];
    return deps.overflowValue;
}

export function getLoopTokenReward(loopIndex: number, deps: TokenRewardDeps): number {
    if (loopIndex <= 0) return 0;
    if (loopIndex <= deps.table.length) return deps.table[loopIndex - 1];
    return deps.overflowBase + deps.overflowGrowth * (loopIndex - deps.table.length);
}

// --- Reward calculation ---

export function calculateLoopRewards(
    loopIndex: number,
    summary: LoopSummary,
    deps: LoopRewardsDeps,
): { loopTokens: number; baseTokens: number; bonusTokens: number } {
    const baseReward = getLoopTokenReward(loopIndex, deps.tokenRewardConfig);
    let bonusTokens = 0;
    if (summary.newDiscoveries) bonusTokens += summary.newDiscoveries;
    if (summary.achievementsUnlocked) bonusTokens += summary.achievementsUnlocked * deps.achievementTokenBonus;
    return {
        loopTokens: baseReward + bonusTokens,
        baseTokens: baseReward,
        bonusTokens,
    };
}

// --- Meta upgrade functions ---

export function getMetaUpgradeCost(upgradeId: string, currentLevel: number, deps: MetaUpgradeDeps): number {
    const config = deps.metaUpgradeConfigs[upgradeId];
    if (!config) return 0;
    const base = config.baseCost;
    return base + currentLevel * Math.ceil(base * config.costScale);
}

export function getMetaUpgradeEffect(upgradeId: string, level: number, deps: MetaUpgradeDeps): number {
    const config = deps.metaUpgradeConfigs[upgradeId];
    if (!config) return 0;
    return level * config.effectPerLevel;
}

export function getMetaUpgradeMaxLevel(upgradeId: string, deps: MetaUpgradeDeps): number {
    const config = deps.metaUpgradeConfigs[upgradeId];
    if (!config) return 0;
    return config.maxLevel;
}

// --- Starting resources ---

export function getStartingGold(rewardMultiplier: number, startingGoldLevel: number, deps: StartingGoldDeps): number {
    return rewardMultiplier * deps.startingGoldBase + getMetaUpgradeEffect('startingGold', startingGoldLevel, { metaUpgradeConfigs: deps.metaUpgradeConfigs });
}

// --- Loop config queries ---

export function getLoopTitle(loopIndex: number, deps: LoopConfigQueryDeps): string {
    const rule = deps.loopRules[String(loopIndex)];
    return rule?.title || `学园轮回 ${loopIndex}`;
}

export function getSpecialRules(loopIndex: number, deps: LoopConfigQueryDeps): LoopSpecialRule[] {
    const rule = deps.loopRules[String(loopIndex)];
    return rule?.specialRules || [];
}
