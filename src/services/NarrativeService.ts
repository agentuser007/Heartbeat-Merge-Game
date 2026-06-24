// ============================================================
// NarrativeService.ts — Service layer for branching VN
// ============================================================
// Composes NarrativeLogic, returns ResolveResult.
// Zero Vue dependency. All external values via deps.
// Iron rule #2: does not reference configStore.
// ============================================================

import type { VNChoiceOption, VNEnding, NarrativeConfig } from '@/types/game';
import type { ResolveResult, ServiceResultWithData } from './ServiceResultTypes';
import { okResultWithData } from './ServiceResultTypes';
import * as NarrativeLogic from '../logic/NarrativeLogic';

// --- resolveChoiceEffect ---

export interface ResolveChoiceEffectDeps {
    affection: Record<string, number>;
    darkness: Record<string, number>;
    controlLevel: number;
    narrativeConfig: NarrativeConfig;
}

export function resolveChoiceEffect(
    option: VNChoiceOption,
    deps: ResolveChoiceEffectDeps,
): ResolveResult {
    const result: ResolveResult = { applyTo: {} };

    const addAffections: Array<{ characterId: string; amount: number; source: string }> = [];
    const addDarkness: Array<{ characterId: string; amount: number }> = [];

    if (option.effects.affection) {
        for (const [characterId, baseDelta] of Object.entries(option.effects.affection)) {
            const delta = NarrativeLogic.calculateVariableDelta(
                baseDelta, characterId, 'affection', deps.controlLevel,
                { config: deps.narrativeConfig },
            );
            addAffections.push({ characterId, amount: delta, source: 'narrative_choice' });
        }
    }

    if (option.effects.darkness) {
        for (const [characterId, baseDelta] of Object.entries(option.effects.darkness)) {
            const delta = NarrativeLogic.calculateVariableDelta(
                baseDelta, characterId, 'darkness', deps.controlLevel,
                { config: deps.narrativeConfig },
            );
            addDarkness.push({ characterId, amount: delta });
        }
    }

    if (addAffections.length > 0 || addDarkness.length > 0) {
        result.applyTo.affection = {};
        if (addAffections.length > 0) result.applyTo.affection.addAffections = addAffections;
        if (addDarkness.length > 0) result.applyTo.affection.addDarkness = addDarkness;
    }

    if (option.effects.controlLevel !== undefined) {
        const newLevel = deps.controlLevel + option.effects.controlLevel;
        result.applyTo.loop = { setControlLevel: Math.min(100, Math.max(0, newLevel)) };
    }

    if (option.effects.flags && option.effects.flags.length > 0) {
        result.applyTo.loop = {
            ...result.applyTo.loop,
            addNarrativeFlags: option.effects.flags,
        };
    }

    result.events = [{
        name: 'narrative:choiceSelected',
        data: { optionText: option.text, nextScene: option.nextScene },
    }];

    return result;
}

// --- resolveEndingCheck ---

export interface ResolveEndingCheckDeps {
    affection: Record<string, number>;
    darkness: Record<string, number>;
    controlLevel: number;
    flags: string[];
}

export function resolveEndingCheck(
    endings: VNEnding[],
    deps: ResolveEndingCheckDeps,
): ServiceResultWithData<{ endingId: string }> {
    const endingId = NarrativeLogic.resolveEnding(endings, {
        affection: deps.affection,
        darkness: deps.darkness,
        controlLevel: deps.controlLevel,
        flags: deps.flags,
    });

    const rr: ResolveResult = {
        applyTo: {
            narrative: { setCurrentSceneId: endingId },
        },
        events: [{ name: 'narrative:endingResolved', data: { endingId } }],
    };

    return okResultWithData({ endingId }, rr);
}

// --- checkChoiceCondition ---
// Thin wrapper for UI to test option availability

export function checkChoiceCondition(
    option: VNChoiceOption,
    deps: ResolveEndingCheckDeps,
): boolean {
    if (!option.condition) return true;
    return NarrativeLogic.checkCondition(option.condition, {
        affection: deps.affection,
        darkness: deps.darkness,
        controlLevel: deps.controlLevel,
        flags: deps.flags,
    });
}
