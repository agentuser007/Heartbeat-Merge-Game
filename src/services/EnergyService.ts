import { okResult, type ServiceResult } from './ServiceResultTypes';

export interface ResetToBaseDeps {
    maxEnergy: number;
    regenCap: number;
    regenInterval: number;
    hasRule: (rule: string) => boolean;
    energyRegenDownMultiplier: number;
}

export function resolveResetToBase(deps: ResetToBaseDeps): ServiceResult {
    if (!deps.maxEnergy) throw new Error('[EnergyService] maxEnergy is required');
    if (!deps.regenInterval) throw new Error('[EnergyService] regenInterval is required');

    let interval = deps.regenInterval;
    if (deps.hasRule('energyRegenDown')) {
        interval = Math.floor(interval * deps.energyRegenDownMultiplier);
    }

    return okResult({
        applyTo: {
            energy: {
                setMax: deps.maxEnergy,
                setRegenInterval: interval,
            },
        },
    });
}
