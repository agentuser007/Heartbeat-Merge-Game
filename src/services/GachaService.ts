import { GachaLogic, type GachaItem, type GachaConfig, type GachaRandomDeps } from '../logic/GachaLogic';
import { ItemEffectLogic } from '../logic/ItemEffectLogic';
import { ItemEffectService, type InstantEffectDeps } from './ItemEffectService';
import { mergeResolveResult, okResultWithData, failResultWithData, type ResolveResult, type ServiceResultWithData } from './ServiceResultTypes';
import type { InventoryItemMeta } from '../types/game';

export interface GachaServiceDeps {
    gachaCost: { singleCost: number; tenCost: number };
    gachaRarityConfig: GachaConfig['rarityConfig'];
    gachaSubWeights: GachaConfig['subWeights'];
    gachaPool: GachaItem[];
    canAffordDiamonds: (cost: number) => boolean;
    diamonds: number;
    ssrOwned: Record<string, boolean>;
    logic: GachaLogic;
    effectDeps: InstantEffectDeps;
    tenPullCount: number;
    random: GachaRandomDeps;
}

export interface SinglePullData {
    pullResult: GachaItem | null;
    ssrFirst?: { item: GachaItem; isFirst: boolean };
}

export interface TenPullData {
    pullResults: GachaItem[] | null;
    newSSRs: GachaItem[];
}

export interface FreePullDeps {
    canFreePull: boolean;
    today: string;
}

function buildGachaConfig(deps: GachaServiceDeps): GachaConfig {
    return {
        rarityConfig: deps.gachaRarityConfig,
        gachaCost: { singleCost: deps.gachaCost.singleCost, tenCost: deps.gachaCost.tenCost },
        subWeights: deps.gachaSubWeights,
        gachaPoolV2: deps.gachaPool,
    };
}

export const GachaService = {
    resolveSinglePull(deps: GachaServiceDeps, maxRarity?: 'R' | 'SR' | 'SSR'): ServiceResultWithData<SinglePullData> {
        const result: ResolveResult = { applyTo: {} };

        if (deps.logic.fsm.can('ACK')) deps.logic.acknowledge();

        if (!maxRarity) {
            const cost = deps.gachaCost.singleCost;
            if (!deps.canAffordDiamonds(cost)) {
                return failResultWithData<SinglePullData>('Insufficient diamonds for single pull');
            }
            result.applyTo.currency = { spendDiamonds: cost };
        }

        const gachaConfig = buildGachaConfig(deps);
        const { result: pullResult, events: logicEvents } = deps.logic.pullSingle(gachaConfig, deps.random, maxRarity);

        if (pullResult) {
            const effect = pullResult.effect;
            const value = pullResult.value;

            if (effect && ItemEffectLogic.isInstantEffect(effect)) {
                const effectResult = ItemEffectService.resolveInstantEffect(effect, value, deps.effectDeps);
                mergeResolveResult(result, effectResult);
            } else {
                const itemId = pullResult.itemId || pullResult.id;
                result.applyTo.inventory = { addItems: [{ itemId, count: 1, meta: { effect, value } }] };
            }

            const ssrIds: string[] = [];
            let ssrFirst: SinglePullData['ssrFirst'];
            if (pullResult.rarity === 'SSR') {
                const isFirst = !deps.ssrOwned[pullResult.id];
                ssrFirst = { item: { ...pullResult }, isFirst };
                ssrIds.push(pullResult.id);
                result.events = result.events || [];
                result.events.push({ name: 'gacha:ssrObtained', data: { item: pullResult, isFirst } });
            }

            if (logicEvents.length > 0) {
                result.events = result.events || [];
                for (const e of logicEvents) result.events.push({ name: e.type, data: e.payload });
            }

            result.applyTo.gacha = {
                setResults: [{ ...pullResult }],
                ...(ssrIds.length > 0 ? { markSsrOwned: ssrIds } : {}),
            };

            return okResultWithData({ pullResult: { ...pullResult }, ssrFirst }, result);
        }

        return okResultWithData({ pullResult: null }, result);
    },

    resolveTenPull(deps: GachaServiceDeps): ServiceResultWithData<TenPullData> {
        const result: ResolveResult = { applyTo: {} };

        if (deps.logic.fsm.can('ACK')) deps.logic.acknowledge();

        const cost = deps.gachaCost.tenCost;
        if (!deps.canAffordDiamonds(cost)) {
            return failResultWithData<TenPullData>('Insufficient diamonds for ten pull');
        }
        result.applyTo.currency = { spendDiamonds: cost };

        const gachaConfig = buildGachaConfig(deps);
        const { results: pullResults, events: logicEvents } = deps.logic.pullTen(gachaConfig, deps.tenPullCount, deps.random);

        if (pullResults) {
            const inventoryItems: Array<{ itemId: string; count: number; meta?: InventoryItemMeta }> = [];
            const events: Array<{ name: string; data: unknown }> = [];

            for (const item of pullResults) {
                const effect = item.effect;
                const value = item.value;

                if (effect && ItemEffectLogic.isInstantEffect(effect)) {
                    const effectResult = ItemEffectService.resolveInstantEffect(effect, value, deps.effectDeps);
                    mergeResolveResult(result, effectResult);
                } else {
                    inventoryItems.push({ itemId: item.itemId || item.id, count: 1, meta: { effect: item.effect, value: item.value } });
                }
            }

            if (inventoryItems.length > 0) {
                result.applyTo.inventory = { addItems: inventoryItems };
            }

            const newSSRs: GachaItem[] = [];
            const ssrIds: string[] = [];
            for (const item of pullResults) {
                if (item.rarity === 'SSR') {
                    const isFirst = !deps.ssrOwned[item.id];
                    if (isFirst) {
                        newSSRs.push({ ...item });
                        ssrIds.push(item.id);
                    }
                }
            }

            if (newSSRs.length > 0) {
                events.push({ name: 'gacha:newSSRsObtained', data: { items: newSSRs } });
            }

            for (const e of logicEvents) events.push({ name: e.type, data: e.payload });
            if (events.length > 0) result.events = events;

            result.applyTo.gacha = {
                setResults: pullResults.map(item => ({ ...item })),
                ...(ssrIds.length > 0 ? { markSsrOwned: ssrIds } : {}),
            };

            return okResultWithData({ pullResults: pullResults.map(item => ({ ...item })), newSSRs }, result);
        }

        return okResultWithData({ pullResults: null, newSSRs: [] }, result);
    },

    resolveFreePull(deps: GachaServiceDeps, freePullDeps: FreePullDeps): ServiceResultWithData<SinglePullData> {
        if (!freePullDeps.canFreePull) {
            return failResultWithData<SinglePullData>('No free pulls left');
        }

        const pullResult = GachaService.resolveSinglePull(deps, 'SR');
        if (!pullResult.ok) return pullResult;

        pullResult.resolveResult.applyTo.gacha = {
            ...pullResult.resolveResult.applyTo.gacha,
            decrementFreePulls: true,
            setLastFreePullDate: freePullDeps.today,
        };

        return pullResult;
    },
};
