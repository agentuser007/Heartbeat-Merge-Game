// ============================================================
// AdService.ts — Ad reward resolution (Service layer)
// ============================================================
// Combines ad state tracking with reward application into a
// single ResolveResult. Replaces the fractured
// adStore.grantReward → bus → useGameLoop → RewardService flow.
// ============================================================

import type { ResolveResult, ServiceResult } from './ServiceResultTypes';
import { okResult, failResult } from './ServiceResultTypes';
import type { AdConfig, Rarity } from '../types/game';
import * as AdLogic from '../logic/AdLogic';

export interface ResolveWatchAdDeps {
    adConfig: AdConfig;
    dailyAdCounts: Record<string, number>;
    lastWatchTime: Record<string, number>;
    freePullMaxRarity: Rarity;
    now: number;
}

export function resolveWatchAd(
    adType: string,
    deps: ResolveWatchAdDeps,
): ServiceResult {
    if (!AdLogic.canWatch(adType, {
        config: deps.adConfig,
        dailyAdCounts: deps.dailyAdCounts,
        lastWatchTime: deps.lastWatchTime,
        now: deps.now,
    })) {
        return failResult('Cannot watch ad: limit reached or cooldown active');
    }

    const config = deps.adConfig[adType as keyof AdConfig];
    const result: ResolveResult = {
        applyTo: {
            ad: {
                incrementCount: adType,
                setLastWatchTime: { adType, time: deps.now },
            },
            save: { saveAll: true },
        },
        events: [{ name: 'ad:rewardGranted', data: { adType, reward: 'reward' in config ? config.reward : 0 } }],
    };

    switch (adType) {
        case 'energy':
            if ('reward' in config && config.reward > 0) result.applyTo.energy = { add: config.reward };
            break;
        case 'gold':
            if ('reward' in config && config.reward > 0) result.applyTo.currency = { addGold: config.reward };
            break;
        case 'diamonds':
            if ('reward' in config && config.reward > 0) result.applyTo.currency = { addDiamonds: config.reward };
            break;
        case 'freePull':
            result.applyTo.gacha = { singlePull: { rarity: deps.freePullMaxRarity } };
            break;
    }

    return okResult(result);
}

export interface ResolveDailyResetDeps {
    now: number;
}

export function resolveDailyReset(deps: ResolveDailyResetDeps): ResolveResult {
    return {
        applyTo: {
            ad: {
                resetCounts: true,
                setResetDate: AdLogic.getCurrentDateStr(deps.now),
            },
        },
        events: [{ name: 'ad:dailyReset', data: undefined }],
    };
}

export const AdService = {
    resolveWatchAd,
    resolveDailyReset,
};
