// ============================================================
// DailyBuffService.ts — Daily Buff resolution (Service layer)
// ============================================================
// Orchestrates DailyBuffLogic into ResolveResult declarations.
// Replaces BoardService.resolveDailyBuff and inline store logic.
// Zero Vue dependency.
// ============================================================

import type { ResolveResult } from './ServiceResultTypes';
import type { DailyBuffTypeConfig } from '../types/game';
import * as DailyBuffLogic from '../logic/DailyBuffLogic';
import type { DailyBuffEntry } from '../logic/DailyBuffLogic';

export interface ResolveBuffExpiryDeps {
    buffDurationMs: number;
    now: number;
}

export function resolveBuffExpiry(
    activeBuffs: DailyBuffEntry[],
    buffFlags: Record<string, boolean>,
    deps: ResolveBuffExpiryDeps,
): ResolveResult {
    const expiredBuffs: DailyBuffEntry[] = [];
    const survivingBuffs: DailyBuffEntry[] = [];
    const clearedFlags: Record<string, boolean> = {};

    for (const buff of activeBuffs) {
        if (DailyBuffLogic.isBuffExpired(buff, { buffDurationMs: deps.buffDurationMs, now: deps.now })) {
            expiredBuffs.push(buff);
            if (buffFlags[buff.id]) clearedFlags[buff.id] = false;
        } else {
            survivingBuffs.push(buff);
        }
    }

    if (expiredBuffs.length === 0) return { applyTo: {} };

    const newFlags = { ...buffFlags };
    for (const key of Object.keys(clearedFlags)) {
        delete newFlags[key];
    }

    const events: ResolveResult['events'] = expiredBuffs.map(buff => ({
        name: 'dailyBuff:expired' as const,
        data: { buff: { id: buff.id, icon: buff.icon, nameKey: buff.nameKey, descKey: buff.descKey } },
    }));

    return {
        applyTo: {
            dailyBuff: {
                setActiveBuffs: survivingBuffs,
                setBuffFlags: newFlags,
            },
        },
        events,
    };
}

export interface ResolveDailyBuffRollDeps {
    buffDurationMs: number;
    buffTypes: DailyBuffTypeConfig[];
    now: number;
    random: () => number;
}

export function resolveDailyBuffRoll(
    lastRollDate: string,
    activeBuffs: DailyBuffEntry[],
    pendingBuff: DailyBuffEntry | null,
    deps: ResolveDailyBuffRollDeps,
): ResolveResult | null {
    const today = DailyBuffLogic.getCurrentDateStr(deps.now);
    if (lastRollDate === today && (activeBuffs.length > 0 || pendingBuff)) return null;

    const buff = DailyBuffLogic.selectRandomBuff(deps.buffTypes, deps.random);

    return {
        applyTo: {
            dailyBuff: {
                setActiveBuffs: [],
                setBuffFlags: {},
                setPendingBuff: buff,
                setLastRollDate: today,
            },
        },
        events: [{ name: 'dailyBuff:rolled', data: { buff: { id: buff.id, icon: buff.icon, nameKey: buff.nameKey, descKey: buff.descKey } } }],
    };
}

export interface ResolveActivateBuffDeps {
    now: number;
}

export function resolveActivateBuff(
    pendingBuff: DailyBuffEntry | null,
    deps: ResolveActivateBuffDeps,
): ResolveResult | null {
    if (!pendingBuff) return null;

    const activatedBuff: DailyBuffEntry = { ...pendingBuff, activatedAt: deps.now };

    return {
        applyTo: {
            dailyBuff: {
                setActiveBuffs: [activatedBuff],
                setBuffFlags: { [activatedBuff.id]: true },
                setPendingBuff: null,
            },
        },
        events: [{ name: 'dailyBuff:activated', data: { buff: { id: activatedBuff.id, icon: activatedBuff.icon, nameKey: activatedBuff.nameKey, descKey: activatedBuff.descKey } } }],
    };
}

export const DailyBuffService = {
    resolveBuffExpiry,
    resolveDailyBuffRoll,
    resolveActivateBuff,
};
