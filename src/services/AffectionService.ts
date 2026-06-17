// ============================================================
// AffectionService.ts — Affection calculation (Service layer)
// ============================================================
// Handles: addAffection, earnCoins, spendCoins, boss defeat,
// VN completed, gift item, shop purchase, shop item effect.
// No Vue dependency. All functions are pure — deps injected as plain objects.
// ============================================================

import type { ResolveResult, ServiceResult } from './ServiceResultTypes';
import { emptyResult, okResult, failResult, mergeResolveResult } from './ServiceResultTypes';
import type { AffectionShopItem, AffectionLevelDef } from '@/types/game';
import { getLevelFromPoints } from '../logic/AffectionLogic';

// --- resolveAddAffection ---

export interface AddAffectionDeps {
    currentPoints: number;
    levels: AffectionLevelDef[];
    earnRate: number;
    levelUpBonuses: Record<string, number>;
}

export function resolveAddAffection(
    characterId: string,
    amount: number,
    source: string,
    deps: AddAffectionDeps,
): ResolveResult {
    const oldPoints = deps.currentPoints;
    const newPoints = oldPoints + amount;
    const oldLevel = getLevelFromPoints(oldPoints, deps.levels);
    const newLevel = getLevelFromPoints(newPoints, deps.levels);

    const result: ResolveResult = {
        applyTo: {
            affection: {
                addAffections: [{ characterId, amount, source }],
                addCoins: amount * deps.earnRate,
            },
        },
        events: [{ name: 'affection:changed', data: { characterId, delta: amount, source } }],
    };

    if (newLevel > oldLevel) {
        const bonus = deps.levelUpBonuses[String(newLevel)] || 0;
        const bonusResult: ResolveResult = {
            applyTo: {
                affection: {
                    levelUpBonuses: [{ characterId, newLevel, oldLevel, bonus }],
                    addCoins: bonus,
                },
            },
            events: [{ name: 'affection:levelUp', data: { characterId, newLevel, oldLevel } }],
        };
        mergeResolveResult(result, bonusResult);
    }

    return result;
}

// --- resolveEarnCoins ---

export function resolveEarnCoins(amount: number, source: string): ResolveResult {
    return {
        applyTo: { affection: { addCoins: amount } },
        events: [{ name: 'affection:coinsEarned', data: { amount, source } }],
    };
}

// --- resolveSpendCoins ---

export interface SpendCoinsDeps {
    currentCoins: number;
}

export function resolveSpendCoins(amount: number, deps: SpendCoinsDeps): ResolveResult | null {
    if (deps.currentCoins < amount) return null;
    return {
        applyTo: { affection: { spendCoins: amount } },
    };
}

// --- resolveBossDefeat ---

export interface BossDefeatDeps {
    bossToCharacter: Record<string, string>;
    bossDefeat: { base: number; perLoop: number };
    bossLevelIdx: number;
    loopIndex: number;
    getAddAffectionDeps: (characterId: string) => AddAffectionDeps;
}

export function resolveBossDefeat(deps: BossDefeatDeps): ResolveResult {
    const characterId = deps.bossToCharacter[String(deps.bossLevelIdx)];
    if (!characterId) {
        return {
            applyTo: {
                achievement: {
                    incrementStats: [{ key: 'bossDefeats', amount: 1 }],
                    checkAll: true,
                },
            },
        };
    }

    const amount = deps.bossDefeat.base + deps.bossDefeat.perLoop * (deps.loopIndex - 1);

    const fullResult = resolveAddAffection(characterId, amount, 'bossDefeat', deps.getAddAffectionDeps(characterId));

    const result: ResolveResult = {
        applyTo: {
            achievement: {
                incrementStats: [{ key: 'bossDefeats', amount: 1 }],
                checkAll: true,
            },
        },
    };
    mergeResolveResult(result, fullResult);

    return result;
}

// --- resolveVnCompleted ---

export interface VnCompletedData {
    maleLeadId?: string;
    isSSR?: boolean;
    [key: string]: unknown;
}

export interface VnCompletedDeps {
    vnStorySSR: number;
    vnStorySR: number;
    getAddAffectionDeps: (characterId: string) => AddAffectionDeps;
}

export function resolveVnCompleted(
    data: VnCompletedData | null | undefined,
    deps: VnCompletedDeps,
): ResolveResult {
    if (!data || !data.maleLeadId) return emptyResult();

    const characterId = data.maleLeadId;
    const amount = data.isSSR ? deps.vnStorySSR : deps.vnStorySR;

    return resolveAddAffection(characterId, amount, 'vnStory', deps.getAddAffectionDeps(characterId));
}

// --- resolveShopItemEffect ---

export interface ShopItemEffectDeps {
    energyMax: number;
    energyCurrent: number;
}

export function resolveShopItemEffect(item: AffectionShopItem, deps: ShopItemEffectDeps): ResolveResult {
    const effect = item?.effect as Record<string, unknown> | undefined;
    if (!effect) return emptyResult();

    const effectType = effect.type as string | undefined;
    switch (effectType) {
        case 'energy': {
            return { applyTo: { energy: { add: effect.value as number } } };
        }
        case 'energy_full': {
            return { applyTo: { energy: { add: deps.energyMax - deps.energyCurrent } } };
        }
        case 'daily_order_refresh': {
            return { applyTo: { dailyOrders: { rollNewOrders: true } } };
        }
        default: {
            return {
                applyTo: {},
                events: [{ name: 'affection:shopEffect', data: { item, effect } }],
            };
        }
    }
}

// --- resolveGiftItem ---

export interface GiftItemDeps {
    giftPreference: string;
    giftCharacterId: string;
    targetCharacterId: string;
    baseValue: number;
    preferenceMultipliers: { loved: number; liked: number };
    currentCoins: number;
    price: number;
    giftId: string;
}

export function resolveGiftItem(deps: GiftItemDeps): ResolveResult | null {
    if (deps.currentCoins < deps.price) return null;

    let value = deps.baseValue;
    if (deps.giftPreference === 'loved' && deps.giftCharacterId === deps.targetCharacterId) {
        value = Math.floor(value * deps.preferenceMultipliers.loved);
    } else if (deps.giftPreference === 'liked') {
        value = Math.floor(value * deps.preferenceMultipliers.liked);
    }

    return {
        applyTo: {
            affection: {
                spendCoins: deps.price,
                addAffections: [{ characterId: deps.targetCharacterId, amount: value, source: 'gift' }],
                updateGiftHistory: { characterId: deps.targetCharacterId, giftId: deps.giftId },
            },
        },
        events: [{
            name: 'affection:giftGiven',
            data: { characterId: deps.targetCharacterId, giftId: deps.giftCharacterId, affectionGained: value },
        }],
    };
}

// --- resolvePurchaseShopItem ---

export interface PurchaseShopItemDeps {
    maxAffectionLevel: number;
    currentCoins: number;
    dailyPurchaseTotal: number;
    dailyLimit: number | null;
    todayStr: string;
}

export function resolvePurchaseShopItem(
    item: AffectionShopItem,
    deps: PurchaseShopItemDeps,
): ServiceResult {
    if (item.unlockLevel > deps.maxAffectionLevel) {
        return failResult('Shop item locked: affection level too low');
    }

    if (deps.currentCoins < item.price) {
        return failResult('Not enough affection coins');
    }

    if (deps.dailyLimit !== null && deps.dailyLimit !== undefined) {
        if (deps.dailyPurchaseTotal >= deps.dailyLimit) {
            return failResult('Daily purchase limit reached');
        }
    }

    const result: ResolveResult = {
        applyTo: {
            affection: {
                spendCoins: item.price,
                updateShopPurchase: { itemId: item.id, date: deps.todayStr },
            },
        },
    };

    if ((item?.effect?.type as string) === 'affection' && item.characterId) {
        const affectionResult: ResolveResult = {
            applyTo: {
                affection: {
                    addAffections: [{ characterId: item.characterId, amount: item.effect.value as number, source: 'gift' }],
                },
            },
        };
        mergeResolveResult(result, affectionResult);
    }

    return okResult(result);
}

export const AffectionService = {
    resolveAddAffection,
    resolveEarnCoins,
    resolveSpendCoins,
    resolveBossDefeat,
    resolveVnCompleted,
    resolveShopItemEffect,
    resolveGiftItem,
    resolvePurchaseShopItem,
};
