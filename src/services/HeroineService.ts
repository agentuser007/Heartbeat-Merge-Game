import type { ServiceResult } from './ServiceResultTypes';
import { okResult, failResult } from './ServiceResultTypes';

export interface HeroineServiceDeps {
    upgradeList: Array<{
        id: string;
        levels: Array<{ cost: number; value: number }>;
    }>;
    currentLevel: (upgradeId: string) => number;
    canAffordDiamonds: (cost: number) => boolean;
    maxEnergyBase: number;
}

export const HeroineService = {
    resolvePurchaseUpgrade(upgradeId: string, deps: HeroineServiceDeps): ServiceResult {
        const upg = deps.upgradeList.find(u => u.id === upgradeId);
        if (!upg) return failResult('Unknown upgrade: ' + upgradeId);

        const currentLevel = deps.currentLevel(upgradeId);
        if (currentLevel >= upg.levels.length - 1) return failResult('Upgrade already maxed: ' + upgradeId);

        const nextLevel = upg.levels[currentLevel + 1];
        if (!deps.canAffordDiamonds(nextLevel.cost)) return failResult('Not enough diamonds');

        const newLevel = currentLevel + 1;
        const applyTo: Record<string, unknown> = {
            currency: { spendDiamonds: nextLevel.cost },
            heroine: { setUpgradeLevels: [{ upgradeId, level: newLevel }] },
            save: { saveAll: true },
        };

        if (upgradeId === 'energy_cap') {
            applyTo.energy = { setMax: deps.maxEnergyBase + nextLevel.value };
        }
        if (upgradeId === 'regen_speed') {
            applyTo.energy = { setRegenInterval: nextLevel.value };
        }

        return okResult({
            applyTo,
            events: [{
                name: 'heroine:upgradePurchased',
                data: { upgradeId, level: newLevel, value: nextLevel.value },
            }],
        });
    },
};
