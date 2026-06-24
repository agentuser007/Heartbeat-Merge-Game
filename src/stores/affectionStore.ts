// ============================================================
// affectionStore.ts — Affection & Affection Coins Store
// ============================================================
// Manages relationship levels, affection coins, and shop purchases.
// Belongs to META save (permanent across loops).
// Iron rule #5: Store only does apply + emit.
// All business logic in AffectionLogic / AffectionService.
// ============================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useConfigStore } from './configStore';
import { useEnergyStore } from './energyStore';
import { AffectionService } from '../services/AffectionService';
import {
    getLevelFromPoints as _getLevelFromPoints,
    getLevelName as _getLevelName,
    getLevelProgress as _getLevelProgress,
    getUnlockedZones as _getUnlockedZones,
    getMaxLevel as _getMaxLevel,
    getUnlockedShopItems as _getUnlockedShopItems,
    canAffordCoins as _canAffordCoins,
    getDailyPurchasesLeft as _getDailyPurchasesLeft,
    resetDailyIfNeeded as _resetDailyIfNeeded,
    getTodayStr as _getTodayStr,
} from '../logic/AffectionLogic';
import type { ServiceResult, ResolveResult } from '../services/ServiceResultTypes';
import { mergeResolveResult } from '../services/ServiceResultTypes';
import type { AffectionLevelDef, AffectionShopItem } from '@/types/game';
import type { ShopPurchaseRecord } from '../logic/AffectionLogic';

export type { ShopPurchaseRecord };

export const useAffectionStore = defineStore('affection', () => {
    const affection = ref<Record<string, number>>({});
    const affectionCoins = ref(0);
    const shopPurchaseHistory = ref<Record<string, ShopPurchaseRecord>>({});
    const giftHistory = ref<Record<string, Record<string, number>>>({});
    const lastTouchTime = ref<Record<string, Record<string, number>>>({});
    const darkness = ref<Record<string, number>>({});
    const _selectedCharacterId = ref<string>('morven');

    // ============================================================
    // Readers — delegate to AffectionLogic (pure computation)
    // ============================================================

    function _levels(): AffectionLevelDef[] {
        return useConfigStore().affectionConfig?.levels || [];
    }

    function _maxLevel(): number {
        return _levels().length - 1;
    }

    function getPoints(characterId: string): number {
        return affection.value[characterId] || 0;
    }

    function getLevel(characterId: string): number {
        return _getLevelFromPoints(getPoints(characterId), _levels());
    }

    function getLevelName(characterId: string): string {
        return _getLevelName(getLevel(characterId), _levels());
    }

    function getLevelProgress(characterId: string): number {
        return _getLevelProgress(
            getPoints(characterId),
            getLevel(characterId),
            _levels(),
            _maxLevel(),
        );
    }

    function getUnlockedZones(characterId: string): string[] {
        const zones = useConfigStore().touchInteractions?.zones || [];
        return _getUnlockedZones(getLevel(characterId), zones);
    }

    function getMaxLevel(): number {
        return _getMaxLevel(affection.value, _levels());
    }

    function getUnlockedShopItems(): AffectionShopItem[] {
        const items = useConfigStore().affectionShop?.items || [];
        return _getUnlockedShopItems(getMaxLevel(), items);
    }

    function canAffordCoins(amount: number): boolean {
        return _canAffordCoins(affectionCoins.value, amount);
    }

    function getDailyPurchasesLeft(itemId: string, dailyLimit: number | null): number {
        const todayStr = _getTodayStr(Date.now());
        return _getDailyPurchasesLeft(itemId, dailyLimit, shopPurchaseHistory.value, todayStr);
    }

    // ============================================================
    // Actions — return ResolveResult, caller applies
    // ============================================================

    function resolveAddAffection(characterId: string, amount: number, source: string): ResolveResult {
        const configStore = useConfigStore();
        return AffectionService.resolveAddAffection(characterId, amount, source, {
            currentPoints: affection.value[characterId] || 0,
            levels: _levels(),
            earnRate: configStore.affectionConfig?.affectionCoins?.earnRate ?? 1,
            levelUpBonuses: configStore.affectionConfig?.affectionCoins?.levelUpBonuses || {},
        });
    }

    function resolveGiftItem(characterId: string, giftId: string): ResolveResult | null {
        const configStore = useConfigStore();
        const items = configStore.affectionShop?.items || [];
        const gift = items.find((i: AffectionShopItem) => i.id === giftId);
        if (!gift) return null;

        const effect = gift.effect as Record<string, unknown>;
        if (!effect || effect.type !== 'affection') return null;

        const multipliers = configStore.affectionConfig?.giftPreferenceMultipliers || { loved: 1.5, liked: 1.2 };

        return AffectionService.resolveGiftItem({
            giftPreference: gift.giftPreference || 'normal',
            giftCharacterId: gift.characterId || '',
            targetCharacterId: characterId,
            baseValue: effect.value as number,
            preferenceMultipliers: multipliers,
            currentCoins: affectionCoins.value,
            price: gift.price,
            giftId: gift.id,
        });
    }

    function purchaseShopItem(itemId: string): ServiceResult {
        const configStore = useConfigStore();
        const items = configStore.affectionShop?.items || [];
        const item = items.find((i: AffectionShopItem) => i.id === itemId);
        if (!item) return { ok: false as const, reason: 'Item not found: ' + itemId };

        const todayStr = _getTodayStr(Date.now());
        const record = shopPurchaseHistory.value[itemId];
        const dailyTotal = record
            ? _resetDailyIfNeeded(record, todayStr).totalPurchased
            : 0;

        const result = AffectionService.resolvePurchaseShopItem(item, {
            maxAffectionLevel: getMaxLevel(),
            currentCoins: affectionCoins.value,
            dailyPurchaseTotal: dailyTotal,
            dailyLimit: item.dailyLimit,
            todayStr,
        });

        if (!result.ok) return result;

        const { resolveResult: effectResult } = applyShopItemEffect(item);
        mergeResolveResult(result.resolveResult, effectResult);

        return result;
    }

    function applyShopItemEffect(item: AffectionShopItem): { resolveResult: ResolveResult; affectionSelfCall?: boolean } {
        const energyStore = useEnergyStore();
        const result = AffectionService.resolveShopItemEffect(item, {
            energyMax: energyStore.max,
            energyCurrent: energyStore.current,
        });

        return { resolveResult: result, affectionSelfCall: (item?.effect?.type as string) === 'affection' && !!item.characterId };
    }

    // ============================================================
    // Thin mutations — called by applyResolveResult only
    // ============================================================

    function addPoints(characterId: string, amount: number): void {
        const old = affection.value[characterId] || 0;
        affection.value[characterId] = old + amount;
    }

    function addCoins(amount: number): void {
        affectionCoins.value += amount;
    }

    function deductCoins(amount: number): void {
        affectionCoins.value -= amount;
    }

    function updateShopPurchase(itemId: string, date: string): void {
        if (!shopPurchaseHistory.value[itemId]) {
            shopPurchaseHistory.value[itemId] = { totalPurchased: 0, lastPurchaseDate: date };
        }
        const updated = _resetDailyIfNeeded(shopPurchaseHistory.value[itemId], date);
        updated.totalPurchased += 1;
        updated.lastPurchaseDate = date;
        shopPurchaseHistory.value[itemId] = updated;
    }

    function updateGiftHistory(characterId: string, giftId: string): void {
        if (!giftHistory.value[characterId]) {
            giftHistory.value[characterId] = {};
        }
        giftHistory.value[characterId][giftId] = (giftHistory.value[characterId][giftId] || 0) + 1;
    }

    function recordTouch(characterId: string, zoneId: string): void {
        if (!lastTouchTime.value[characterId]) {
            lastTouchTime.value[characterId] = {};
        }
        lastTouchTime.value[characterId][zoneId] = Date.now();
    }

    function addDarkness(characterId: string, amount: number): void {
        const old = darkness.value[characterId] || 0;
        darkness.value[characterId] = Math.max(0, old + amount);
    }

    function setDarkness(characterId: string, value: number): void {
        darkness.value[characterId] = Math.max(0, value);
    }

    function resetDailyPurchases(): void {
        const todayStr = _getTodayStr(Date.now());
        for (const itemId of Object.keys(shopPurchaseHistory.value)) {
            shopPurchaseHistory.value[itemId] = _resetDailyIfNeeded(
                shopPurchaseHistory.value[itemId],
                todayStr,
            );
            if (shopPurchaseHistory.value[itemId].lastPurchaseDate !== todayStr) {
                shopPurchaseHistory.value[itemId] = { totalPurchased: 0, lastPurchaseDate: todayStr };
            }
        }
    }

    // ============================================================
    // Persistence
    // ============================================================

    function serialize() {
        return {
            affection: { ...affection.value },
            affectionCoins: affectionCoins.value,
            shopPurchaseHistory: { ...shopPurchaseHistory.value },
            giftHistory: { ...giftHistory.value },
            lastTouchTime: { ...lastTouchTime.value },
            darkness: { ...darkness.value },
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { affection?: Record<string, number>; affectionCoins?: number; shopPurchaseHistory?: Record<string, ShopPurchaseRecord>; giftHistory?: Record<string, Record<string, number>>; lastTouchTime?: Record<string, Record<string, number>>; darkness?: Record<string, number> };
        affection.value = d.affection || {};
        affectionCoins.value = d.affectionCoins ?? 0;
        shopPurchaseHistory.value = d.shopPurchaseHistory || {};
        giftHistory.value = d.giftHistory || {};
        lastTouchTime.value = d.lastTouchTime || {};
        darkness.value = d.darkness || {};
    }

    return {
        affection,
        affectionCoins,
        shopPurchaseHistory,
        giftHistory,
        lastTouchTime,
        darkness,
        _selectedCharacterId,

        getPoints,
        getLevel,
        getLevelName,
        getLevelProgress,
        getUnlockedZones,
        getMaxLevel,
        getUnlockedShopItems,
        canAffordCoins,
        getDailyPurchasesLeft,

        resolveAddAffection,
        resolveGiftItem,
        purchaseShopItem,
        applyShopItemEffect,

        addPoints,
        addCoins,
        deductCoins,
        updateShopPurchase,
        updateGiftHistory,
        recordTouch,
        addDarkness,
        setDarkness,
        resetDailyPurchases,

        serialize,
        deserialize
    };
});
