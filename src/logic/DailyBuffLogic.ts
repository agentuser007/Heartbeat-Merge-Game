// ============================================================
// DailyBuffLogic.ts — Pure Daily Buff Business Logic
// ============================================================
// Computation and predicate functions for daily buff system.
// Zero Vue dependency — all external values via deps.
// ============================================================

import type { DailyBuffTypeConfig } from '../types/game';

export interface DailyBuffEntry {
    id: string;
    icon: string;
    nameKey: string;
    descKey: string;
    activatedAt?: number;
}

export interface GetBuffRemainingMsDeps {
    buffDurationMs: number;
    now: number;
}

export interface IsBuffExpiredDeps {
    buffDurationMs: number;
    now: number;
}

export interface HasBuffDeps {
    buffDurationMs: number;
    now: number;
}

export interface NeedsDailyResetDeps {
    lastRollDate: string;
    now: number;
}

export function getBuffRemainingMs(buff: DailyBuffEntry, deps: GetBuffRemainingMsDeps): number {
    if (!buff.activatedAt) return 0;
    const elapsed = deps.now - buff.activatedAt;
    return Math.max(0, deps.buffDurationMs - elapsed);
}

export function isBuffExpired(buff: DailyBuffEntry, deps: IsBuffExpiredDeps): boolean {
    return getBuffRemainingMs(buff, deps) <= 0;
}

export function hasBuff(buffId: string, activeBuffs: DailyBuffEntry[], deps: HasBuffDeps): boolean {
    return activeBuffs.some(buff => buff.id === buffId && !isBuffExpired(buff, deps));
}

export function needsDailyReset(deps: NeedsDailyResetDeps): boolean {
    return deps.lastRollDate !== getCurrentDateStr(deps.now);
}

export function getCurrentDateStr(now: number): string {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function selectRandomBuff(buffTypes: DailyBuffTypeConfig[], random: () => number): DailyBuffEntry {
    if (buffTypes.length === 0) throw new Error('selectRandomBuff: buffTypes must not be empty');
    const idx = Math.floor(random() * buffTypes.length);
    const bt = buffTypes[idx];
    return { id: bt.id, icon: bt.icon, nameKey: bt.nameKey, descKey: bt.descKey };
}
