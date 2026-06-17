import type { ResolveResult, ServiceResult } from './ServiceResultTypes';
import { okResult, failResult } from './ServiceResultTypes';
import type { MetaUpgradeConfig } from '@/types/game';

export interface LoopServiceDeps {
    loopIndex: number;
    getNewDiscoveriesCountThisLoop: () => number;
    getUnlockedCountThisLoop: () => number;
    getLoopTokenReward: (loopIndex: number) => number;
    achievementTokenBonus: number;
}

export interface PurchaseMetaUpgradeDeps {
    currentLevel: number;
    loopTokens: number;
    metaUpgradeConfigs: Record<string, MetaUpgradeConfig>;
}

export const LoopService = {
    resolveCompleteLoop(deps: LoopServiceDeps): ResolveResult {
        const newDiscoveries = deps.getNewDiscoveriesCountThisLoop();
        const achievementsUnlocked = deps.getUnlockedCountThisLoop();
        const addLoopTokens = deps.getLoopTokenReward(deps.loopIndex)
            + newDiscoveries
            + achievementsUnlocked * deps.achievementTokenBonus;

        return {
            applyTo: {
                loop: { incrementLoopIndex: { addLoopTokens } },
                collection: { resetLoopDiscoveries: true },
                achievement: { resetLoopAchievements: true },
            },
        };
    },

    resolvePurchaseMetaUpgrade(
        upgradeId: string,
        deps: PurchaseMetaUpgradeDeps,
    ): ServiceResult {
        const config = deps.metaUpgradeConfigs[upgradeId];
        if (!config) return failResult('Unknown upgrade: ' + upgradeId);

        const maxLevel = config.maxLevel;
        if (deps.currentLevel >= maxLevel) return failResult('Upgrade already maxed: ' + upgradeId);

        const cost = config.baseCost + deps.currentLevel * Math.ceil(config.baseCost * config.costScale);
        if (deps.loopTokens < cost) return failResult('Not enough loop tokens');

        const newLevel = deps.currentLevel + 1;
        return okResult({
            applyTo: {
                loop: {
                    spendLoopTokens: cost,
                    setMetaUpgradeLevel: { upgradeId, level: newLevel },
                },
            },
            events: [{
                name: 'loop:metaUpgradePurchased',
                data: { upgradeId, level: newLevel, cost },
            }],
        });
    },
};
