// ============================================================
// RewardService.ts — Pure reward distribution logic (Service layer)
// ============================================================
// Handles: dailyOrders:fulfilled, achievement:claimed
// (ad reward now handled by AdService.resolveWatchAd)
// No Vue dependency. All functions are pure — deps injected as plain objects.
// ============================================================

import type { ResolveResult } from './ServiceResultTypes';
import { emptyResult } from './ServiceResultTypes';
import type { Rarity } from '../types/game';

// --- Deps types ---

export interface RewardLoopDeps {
    hasRule: (rule: string) => boolean;
    dailyGoldBoost: number;
}

export interface RewardAffectionDeps {
    affectionConfig: {
        sources: {
            dailyOrderBonus: number;
        };
        [key: string]: unknown;
    };
}

// --- resolveDailyOrderFulfilled ---

export interface DailyOrderFulfilledData {
    order?: {
        characterId?: string;
        [key: string]: unknown;
    };
    reward?: {
        gold?: number;
        diamonds?: number;
        energy?: number;
    };
    goldReward?: number;
    [key: string]: unknown;
}

export function resolveDailyOrderFulfilled(
    data: DailyOrderFulfilledData | null | undefined,
    loopDeps: RewardLoopDeps,
    affectionDeps: RewardAffectionDeps,
): ResolveResult {
    const result: ResolveResult = {
        applyTo: {
            achievement: { incrementStats: [{ key: 'dailyCompleted', amount: 1 }], checkAll: true },
            save: { saveAll: true },
        },
    };

    if (!data) return result;

    const reward = data.reward || (data.goldReward ? { gold: data.goldReward } : null);
    const goldUp = loopDeps.hasRule('dailyGoldUp');
    const goldBoost = loopDeps.dailyGoldBoost;

    if (reward) {
        if (reward.gold) {
            const gold = goldUp ? Math.floor(reward.gold * goldBoost) : reward.gold;
            result.applyTo.currency = { addGold: gold };
        }
        if (reward.diamonds) {
            result.applyTo.currency = {
                ...result.applyTo.currency,
                addDiamonds: reward.diamonds,
            };
        }
        if (reward.energy) {
            result.applyTo.energy = { add: reward.energy };
        }
    } else if (data.goldReward) {
        let rewardAmt = data.goldReward;
        if (goldUp) {
            rewardAmt = Math.floor(rewardAmt * goldBoost);
        }
        result.applyTo.currency = { addGold: rewardAmt };
    }

    const dailyBonus = affectionDeps.affectionConfig.sources.dailyOrderBonus;
    const order = data.order;
    if (order && order.characterId) {
        result.applyTo.affection = {
            addAffections: [{ characterId: order.characterId, amount: dailyBonus, source: 'dailyOrder' }],
        };
    }

    return result;
}

// --- resolveAchievementClaimed ---

export interface AchievementClaimedData {
    reward?: {
        gold?: number;
        diamonds?: number;
        energy?: number;
    };
    [key: string]: unknown;
}

export function resolveAchievementClaimed(
    data: AchievementClaimedData | null | undefined,
): ResolveResult {
    if (!data || !data.reward) return emptyResult();

    const result: ResolveResult = { applyTo: { save: { saveAll: true } } };

    if (data.reward.gold) {
        result.applyTo.currency = { addGold: data.reward.gold };
    }
    if (data.reward.diamonds) {
        result.applyTo.currency = {
            ...result.applyTo.currency,
            addDiamonds: data.reward.diamonds,
        };
    }
    if (data.reward.energy) {
        result.applyTo.energy = { add: data.reward.energy };
    }

    return result;
}

export interface AdRewardDeps {
    freePullMaxRarity: Rarity;
}

// --- resolveAdReward ---

export interface AdRewardData {
    adType?: string;
    reward?: number;
    [key: string]: unknown;
}

export function resolveAdReward(
    data: AdRewardData | null | undefined,
    deps: AdRewardDeps,
): ResolveResult {
    if (!data) return emptyResult();

    const result: ResolveResult = { applyTo: { save: { saveAll: true } } };
    const { adType, reward } = data;
    const freePullMaxRarity = deps.freePullMaxRarity;

    switch (adType) {
        case 'energy':
            if (reward) result.applyTo.energy = { add: reward };
            break;
        case 'gold':
            if (reward) result.applyTo.currency = { addGold: reward };
            break;
        case 'diamonds':
            if (reward) result.applyTo.currency = { addDiamonds: reward };
            break;
        case 'freePull':
            result.applyTo.gacha = { singlePull: { rarity: freePullMaxRarity } };
            break;
    }

    return result;
}

export const RewardService = {
    resolveDailyOrderFulfilled,
    resolveAchievementClaimed,
    resolveAdReward,
};
