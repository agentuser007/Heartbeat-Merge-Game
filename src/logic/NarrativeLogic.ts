// ============================================================
// NarrativeLogic.ts — Pure functions for branching VN logic
// ============================================================
// Zero Vue dependency. All external values via deps parameter.
// Iron rule #1: deps fields are required, no ?? fallback.
// Iron rule #3: random via deps if needed.
// ============================================================

import type { VNCondition, VNEnding, NarrativeConfig } from '@/types/game';

// --- checkCondition ---

export interface CheckConditionDeps {
    affection: Record<string, number>;
    darkness: Record<string, number>;
    controlLevel: number;
    flags: string[];
}

export function checkCondition(condition: VNCondition, deps: CheckConditionDeps): boolean {
    if (Object.keys(condition).length === 0) return true;

    if (condition.affectionRange) {
        for (const [characterId, [min, max]] of Object.entries(condition.affectionRange)) {
            const val = deps.affection[characterId] ?? 0;
            if (val < min || val > max) return false;
        }
    }

    if (condition.darknessRange) {
        for (const [characterId, [min, max]] of Object.entries(condition.darknessRange)) {
            const val = deps.darkness[characterId] ?? 0;
            if (val < min || val > max) return false;
        }
    }

    if (condition.controlRange) {
        const [min, max] = condition.controlRange;
        if (deps.controlLevel < min || deps.controlLevel > max) return false;
    }

    if (condition.requiredFlags) {
        for (const flag of condition.requiredFlags) {
            if (!deps.flags.includes(flag)) return false;
        }
    }

    if (condition.excludedFlags) {
        for (const flag of condition.excludedFlags) {
            if (deps.flags.includes(flag)) return false;
        }
    }

    return true;
}

// --- calculateVariableDelta ---
// controlLevelModifier: "取最近档位值" = 向下取整到最近的配置档位键
// 例如 controlLevel=35, 档位键 ["0","20","40","60","80","100"]
// → 最近档位为 "20", modifier = 0.1

export interface CalculateVariableDeltaDeps {
    config: NarrativeConfig;
}

export function calculateVariableDelta(
    baseDelta: number,
    characterId: string | null,
    variableType: 'affection' | 'darkness',
    controlLevel: number,
    deps: CalculateVariableDeltaDeps,
): number {
    const weightCoefficient = characterId
        ? (deps.config.characterWeights[characterId]?.[variableType] ?? 1.0)
        : 1.0;

    const controlModifier = resolveControlModifier(controlLevel, deps.config.controlLevelModifier);

    const result = baseDelta * weightCoefficient * (1 + controlModifier);
    return Math.sign(result) * Math.floor(Math.abs(result));
}

function resolveControlModifier(controlLevel: number, modifierTable: Record<string, number>): number {
    const keys = Object.keys(modifierTable).map(Number).sort((a, b) => a - b);
    let best = keys[0];
    for (const k of keys) {
        if (k <= controlLevel) {
            best = k;
        } else {
            break;
        }
    }
    return modifierTable[String(best)] ?? 0;
}

// --- resolveEnding ---

export function resolveEnding(endings: VNEnding[], deps: CheckConditionDeps): string {
    const sorted = [...endings].sort((a, b) => a.priority - b.priority);
    for (const ending of sorted) {
        if (checkCondition(ending.condition, deps)) {
            return ending.endingId;
        }
    }
    const fallback = sorted.find(e => e.isFallback);
    if (fallback) return fallback.endingId;
    return sorted[0]?.endingId ?? '';
}
