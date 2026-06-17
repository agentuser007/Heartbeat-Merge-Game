// ============================================================
// AdLogic.ts — Pure Ad Business Logic
// ============================================================
// Validation and calculation functions for ad system.
// Zero Vue dependency — all external values via deps.
// ============================================================

import type { AdConfig } from '../types/game';

export interface CanWatchDeps {
    config: AdConfig;
    dailyAdCounts: Record<string, number>;
    lastWatchTime: Record<string, number>;
    now: number;
}

export interface GetRemainingDeps {
    config: AdConfig;
    dailyAdCounts: Record<string, number>;
}

export interface NeedsDailyResetDeps {
    lastResetDate: string;
    now: number;
}

export function canWatch(adType: string, deps: CanWatchDeps): boolean {
    const config = deps.config[adType as keyof AdConfig];
    if (!config) return false;

    const limit = config.dailyLimit;
    if (limit !== null && deps.dailyAdCounts[adType] >= limit) return false;

    if (config.cooldownMs > 0 && deps.lastWatchTime[adType]) {
        if (deps.now - deps.lastWatchTime[adType] < config.cooldownMs) return false;
    }

    return true;
}

export function getRemaining(adType: string, deps: GetRemainingDeps): number | string {
    const config = deps.config[adType as keyof AdConfig];
    if (!config) return 0;

    const limit = config.dailyLimit;
    if (limit === null) return '∞';

    const remaining = limit - (deps.dailyAdCounts[adType] || 0);
    return remaining;
}

export function needsDailyReset(deps: NeedsDailyResetDeps): boolean {
    return deps.lastResetDate !== getCurrentDateStr(deps.now);
}

export function getCurrentDateStr(now: number): string {
    const d = new Date(now);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
