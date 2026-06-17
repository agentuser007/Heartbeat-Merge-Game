import type { ResolveResult } from './ServiceResultTypes';

export interface AchievementConditionDeps {
    achievementList: Array<{
        id: string;
        condition: string;
        target: number;
    }>;
    unlocked: Set<string>;
    completed: Set<string>;
    stats: Record<string, number>;
    collectionPct: number;
    loopIndex: number;
}

export function resolveCheckAll(deps: AchievementConditionDeps): ResolveResult {
    if (deps.achievementList.length === 0) {
        return { applyTo: {} };
    }

    const newlyUnlocked: string[] = [];
    const events: Array<{ name: string; data: unknown }> = [];

    for (const ach of deps.achievementList) {
        if (deps.unlocked.has(ach.id) || deps.completed.has(ach.id)) continue;

        let currentValue = 0;
        if (ach.condition === 'collectionPct') {
            currentValue = deps.collectionPct;
        } else if (ach.condition === 'loopReached') {
            currentValue = deps.loopIndex;
        } else {
            currentValue = deps.stats[ach.condition] || 0;
        }

        if (currentValue >= ach.target) {
            newlyUnlocked.push(ach.id);
            events.push({
                name: 'achievement:unlocked',
                data: { achievementId: ach.id },
            });
        }
    }

    if (newlyUnlocked.length === 0) {
        return { applyTo: {} };
    }

    return {
        applyTo: {
            achievement: {
                unlockAchievements: newlyUnlocked,
            },
        },
        events,
    };
}
