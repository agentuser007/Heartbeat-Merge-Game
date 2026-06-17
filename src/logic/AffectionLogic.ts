// ============================================================
// AffectionLogic.ts — Pure Affection Business Logic
// ============================================================
// Computation and predicate functions for affection system.
// Zero Vue dependency — all external values via deps.
// ============================================================

import type { AffectionLevelDef, TouchZone, AffectionShopItem } from '../types/game';

export interface ShopPurchaseRecord {
    totalPurchased: number;
    lastPurchaseDate: string;
}

export function getTodayStr(now: number): string {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLevelFromPoints(points: number, levels: AffectionLevelDef[]): number {
    for (let i = levels.length - 1; i >= 0; i--) {
        if (points >= levels[i].minPoints) return levels[i].level;
    }
    return 0;
}

export function getLevelName(level: number, levels: AffectionLevelDef[]): string {
    const entry = levels.find(l => l.level === level);
    return entry?.name || `Lv.${level}`;
}

export function getLevelProgress(
    points: number,
    level: number,
    levels: AffectionLevelDef[],
    maxLevel: number,
): number {
    const current = levels.find(l => l.level === level);
    if (!current || current.maxPoints === undefined) return 0;
    if (level === maxLevel) return 1;
    const minP = current.minPoints;
    const maxP = current.maxPoints;
    return Math.min(1, (points - minP) / (maxP - minP + 1));
}

export function getUnlockedZones(level: number, zones: TouchZone[]): string[] {
    return zones.filter(z => z.unlockLevel <= level).map(z => z.id);
}

export function getMaxLevel(affectionMap: Record<string, number>, levels: AffectionLevelDef[]): number {
    let max = 0;
    for (const charId of Object.keys(affectionMap)) {
        const lv = getLevelFromPoints(affectionMap[charId] || 0, levels);
        if (lv > max) max = lv;
    }
    return max;
}

export function getUnlockedShopItems(maxLevel: number, items: AffectionShopItem[]): AffectionShopItem[] {
    return items.filter(item => item.unlockLevel <= maxLevel);
}

export function canAffordCoins(current: number, amount: number): boolean {
    return current >= amount;
}

export function getDailyPurchasesLeft(
    itemId: string,
    dailyLimit: number | null,
    history: Record<string, ShopPurchaseRecord>,
    todayStr: string,
): number {
    if (dailyLimit === null || dailyLimit === undefined) return Infinity;
    const record = history[itemId];
    if (!record) return dailyLimit;
    const reset = resetDailyIfNeeded(record, todayStr);
    return Math.max(0, dailyLimit - reset.totalPurchased);
}

export function resetDailyIfNeeded(record: ShopPurchaseRecord, todayStr: string): ShopPurchaseRecord {
    if (record.lastPurchaseDate !== todayStr) {
        return { totalPurchased: 0, lastPurchaseDate: todayStr };
    }
    return record;
}
