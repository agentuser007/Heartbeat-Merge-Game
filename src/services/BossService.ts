// ============================================================
// BossService.ts — Boss calculation (Service layer)
// ============================================================
// Wraps BossLogic class calls and returns ResolveResult.
// timedOrdersUp logic extracted from bossStore.
// No Vue dependency. All external values via deps.
// ============================================================

import type { ResolveResult, ServiceResult } from './ServiceResultTypes';
import { emptyResult, okResult, mergeResolveResult } from './ServiceResultTypes';
import { BossLogic } from '../logic/BossLogic';
import type { LevelData, OrderData, ItemData, BossProgressionDeps } from '../logic/BossLogic';
import type { TimedOrdersUpConfig } from '@/types/game';

function applyTimedOrdersUp(
    order: OrderData,
    hasTimedOrdersUp: boolean,
    config: TimedOrdersUpConfig,
): { order: OrderData; timerRemaining: number } {
    if (!hasTimedOrdersUp) {
        return { order, timerRemaining: order.isTimed ? order.timeLimit || 0 : 0 };
    }
    const modified = { ...order };
    if (!modified.isTimed) {
        modified.isTimed = true;
        modified.timeLimit = config.defaultTimeLimit;
    }
    modified.timeLimit = Math.floor((modified.timeLimit || config.defaultTimeLimit) * config.timeMultiplier);
    return { order: modified, timerRemaining: modified.timeLimit };
}

// --- resolveLoadLevel ---

export interface LoadLevelDeps {
    logic: BossLogic;
    levels: LevelData[];
    bossProgression: BossProgressionDeps;
    items?: { [key: string]: ItemData };
    hasTimedOrdersUp: boolean;
    timedOrdersUpConfig: TimedOrdersUpConfig;
    loopIndex: number;
    hpMultiplier: number;
}

export function resolveLoadLevel(levelIdx: number, deps: LoadLevelDeps): ResolveResult {
    const { level, events } = deps.logic.loadLevel(levelIdx, deps.levels, deps.bossProgression, deps.hpMultiplier);
    if (!level) {
        return {
            applyTo: {},
            events: events.map(e => ({ name: e.type, data: e.payload })),
        };
    }

    const result: ResolveResult = {
        applyTo: {
            boss: {
                setCurrentLevelIdx: deps.logic.currentLevelIdx,
                setCurrentHp: deps.logic.currentHp,
                setTotalHp: deps.logic.totalHp,
                setBossName: level.bossName,
                setBossAvatar: level.bossAvatar,
                setFsmState: deps.logic.fsm.getState(),
            },
        },
        events: events
            .filter(e => e.type !== 'boss:orderLoaded')
            .map(e => ({ name: e.type, data: e.payload })),
    };

    const orderEvent = events.find(e => e.type === 'boss:orderLoaded');
    if (orderEvent && orderEvent.payload) {
        const p = orderEvent.payload as { orderIdx: number; order: OrderData; isTimed: boolean; timeLimit: number };
        const { order, timerRemaining } = applyTimedOrdersUp(p.order, deps.hasTimedOrdersUp, deps.timedOrdersUpConfig);
        deps.logic.timerRemaining = timerRemaining;

        result.applyTo.boss!.setOrders = [order];
        result.applyTo.boss!.setCurrentOrderIdx = deps.logic.currentOrderIdx;
        result.applyTo.boss!.setTimerRemaining = timerRemaining;
    }

    return result;
}

// --- resolveLoadOrder ---

export interface LoadOrderDeps {
    logic: BossLogic;
    levels: LevelData[];
    bossProgression: BossProgressionDeps;
    items?: { [key: string]: ItemData };
    hasTimedOrdersUp: boolean;
    timedOrdersUpConfig: TimedOrdersUpConfig;
    loopIndex: number;
    hpMultiplier: number;
}

export function resolveLoadOrder(orderIdx: number, deps: LoadOrderDeps): ResolveResult {
    const level = deps.logic.getCurrentLevel(deps.levels);
    if (!level || !level.orders || orderIdx >= level.orders.length) {
        return emptyResult();
    }

    const { order, events } = deps.logic.loadOrder(orderIdx, deps.levels, deps.bossProgression, deps.items, deps.loopIndex, deps.hpMultiplier);
    if (!order) {
        return {
            applyTo: {},
            events: events.map(e => ({ name: e.type, data: e.payload })),
        };
    }

    const { order: finalOrder, timerRemaining } = applyTimedOrdersUp(order, deps.hasTimedOrdersUp, deps.timedOrdersUpConfig);
    deps.logic.timerRemaining = timerRemaining;

    return {
        applyTo: {
            boss: {
                setOrders: [finalOrder],
                setCurrentOrderIdx: deps.logic.currentOrderIdx,
                setTimerRemaining: timerRemaining,
            },
        },
        events: events.map(e => ({ name: e.type, data: e.payload })),
    };
}

// --- resolveSubmitOrder ---

export interface SubmitOrderDeps {
    logic: BossLogic;
    levels: LevelData[];
    bossProgression: BossProgressionDeps;
    loopIndex: number;
    hpMultiplier: number;
    items?: { [key: string]: ItemData };
    hasTimedOrdersUp: boolean;
    timedOrdersUpConfig: TimedOrdersUpConfig;
}

export function resolveSubmitOrder(damage: number, deps: SubmitOrderDeps): ServiceResult {
    const result = deps.logic.commitSubmit(damage, deps.levels);

    const rr: ResolveResult = {
        applyTo: {
            boss: {
                setCurrentHp: deps.logic.currentHp,
                setTotalHp: deps.logic.totalHp,
                setCurrentOrderIdx: deps.logic.currentOrderIdx,
                setFsmState: deps.logic.fsm.getState(),
            },
        },
        events: result.events.map(e => ({ name: e.type, data: e.payload })),
    };

    if (result.isDefeated) {
        const level = deps.logic.getCurrentLevel(deps.levels);
        rr.events = [...(rr.events ?? []), {
            name: 'boss:defeated',
            data: { levelIdx: deps.logic.currentLevelIdx, bossId: level?.bossName ?? '', loopIndex: deps.loopIndex },
        }];
    } else {
        const orderResult = resolveLoadOrder(deps.logic.currentOrderIdx, deps);
        if (orderResult.applyTo.boss) {
            rr.applyTo.boss = { ...rr.applyTo.boss, ...orderResult.applyTo.boss };
        }
        if (orderResult.events) {
            rr.events = [...(rr.events ?? []), ...orderResult.events];
        }
    }

    return okResult(rr);
}

// --- resolveDamageBoss ---

export interface DamageBossDeps {
    logic: BossLogic;
}

export function resolveDamageBoss(damage: number, deps: DamageBossDeps): ResolveResult {
    const result = deps.logic.applyDamage(damage);
    return {
        applyTo: {
            boss: {
                setCurrentHp: Math.max(0, deps.logic.currentHp),
                setTotalHp: deps.logic.totalHp,
            },
        },
        events: result.events.map(e => ({ name: e.type, data: e.payload })),
    };
}

// --- resolveDefeatTransition ---

export interface DefeatTransitionDeps {
    currentLevelIdx: number;
    levels: LevelData[];
    logic: BossLogic;
    bossProgression: BossProgressionDeps;
    items?: { [key: string]: ItemData };
    hasTimedOrdersUp: boolean;
    timedOrdersUpConfig: TimedOrdersUpConfig;
    loopIndex: number;
    hpMultiplier: number;
}

export function resolveDefeatTransition(deps: DefeatTransitionDeps): ResolveResult {
    const result: ResolveResult = {
        applyTo: {
            dailyOrders: { rollNewOrders: true },
        },
    };

    const maxLevelIdx = deps.levels ? deps.levels.length - 1 : 3;

    if (deps.currentLevelIdx >= maxLevelIdx) {
        result.events = [{ name: 'loop:shouldComplete', data: {} }];
    } else {
        const nextLevelIdx = deps.currentLevelIdx + 1;
        const nextResult = resolveLoadLevel(nextLevelIdx, deps);
        mergeResolveResult(result, nextResult);
    }

    return result;
}

// --- resolveReset ---

export function resolveReset(): ResolveResult {
    return {
        applyTo: {
            boss: {
                setCurrentLevelIdx: -1,
                setCurrentHp: 0,
                setTotalHp: 0,
                setBossName: '',
                setBossAvatar: '',
                setFsmState: 'IDLE',
                setOrders: [],
                setCurrentOrderIdx: 0,
                setTimerRemaining: 0,
            },
        },
    };
}

export const BossService = {
    resolveLoadLevel,
    resolveLoadOrder,
    resolveSubmitOrder,
    resolveDamageBoss,
    resolveDefeatTransition,
    resolveReset,
};
