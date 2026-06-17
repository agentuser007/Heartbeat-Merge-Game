// ============================================================
// economyHandlers.ts
// Currency, Shop, Inventory, Daily Orders, Achievement handlers
// ============================================================

import { registerEventHandler } from '../handlerRegistry';
import type { HandlerContext } from '../handlerRegistry';
import type { GameEvents } from '@/types/game';
import { RewardService, type DailyOrderFulfilledData } from '@/services/RewardService';
import { ShopService, type ShopItemPurchasedData } from '@/services/ShopService';
import { InventoryService } from '@/services/InventoryService';
import { ItemEffectLogic } from '@/logic/ItemEffectLogic';
import type { ConsumableEffectDeps } from '@/services/ItemEffectService';
import { applyResolveResult } from '../applyResolveResult';

registerEventHandler<Pick<GameEvents, 'currency:changed'>['currency:changed']>(
    'currency-changed-check-achievements',
    (_data, ctx) => {
        ctx.deps.achievementStore.checkAll();
    },
);

registerEventHandler<Pick<GameEvents, 'currency:goldEarned'>['currency:goldEarned']>(
    'currency-gold-earned-stat',
    (data, ctx) => {
        if (data && data.amount && data.amount > 0) {
            ctx.deps.achievementStore.incrementStat('totalGoldEarned', data.amount);
        }
    },
);

registerEventHandler<Pick<GameEvents, 'dailyOrders:fulfilled'>['dailyOrders:fulfilled']>(
    'daily-orders-fulfilled-reward',
    (data, ctx) => {
        const result = RewardService.resolveDailyOrderFulfilled(
            data as unknown as DailyOrderFulfilledData,
            { hasRule: (rule: string) => ctx.deps.loopStore.hasRule(rule), dailyGoldBoost: ctx.deps.configStore.boardEconomy.dailyGoldBoost },
            { affectionConfig: ctx.deps.configStore.affectionConfig },
        );
        applyResolveResult(result, ctx.deps);
    },
);

registerEventHandler<Pick<GameEvents, 'shop:itemPurchased'>['shop:itemPurchased']>(
    'shop-item-purchased',
    (data, ctx) => {
        const result = ShopService.resolveShopItemPurchased(data as unknown as ShopItemPurchasedData, {
            items: ctx.deps.configStore.items as Record<string, any> | null,
            findEmptyCell: () => ctx.deps.boardStore.findEmptyCell(),
            cells: ctx.deps.boardStore.cells as unknown[],
            getCell: (i: number) => ctx.deps.boardStore.getCell(i),
        });
        applyResolveResult(result, ctx.deps);
    },
);

registerEventHandler<Pick<GameEvents, 'inventory:itemUsed'>['inventory:itemUsed']>(
    'inventory-item-used',
    (data, ctx) => {
        const result = InventoryService.resolveItemUsed(data, {
            items: ctx.deps.configStore.items as Record<string, any>,
            findEmptyCell: () => ctx.deps.boardStore.findEmptyCell(),
            getEffectCategory: (effect: string) => ItemEffectLogic.getEffectCategory(effect),
            effectDeps: buildConsumableEffectDeps(ctx),
            energyItem: ctx.deps.configStore.itemEffects.energyItem,
        });
        applyResolveResult(result, ctx.deps);
    },
);

registerEventHandler<Pick<GameEvents, 'achievement:claimed'>['achievement:claimed']>(
    'achievement-claimed-reward',
    (data, ctx) => {
        const result = RewardService.resolveAchievementClaimed(data);
        applyResolveResult(result, ctx.deps);
    },
);

function buildConsumableEffectDeps(ctx: HandlerContext): ConsumableEffectDeps {
    return {
        findEmptyCell: () => ctx.deps.boardStore.findEmptyCell(),
        findAllItemsByLevel: (level: number) => ctx.deps.boardStore.findAllItemsByLevel(level),
        getCell: (index: number) => ctx.deps.boardStore.getCell(index),
        rerollItems: (count: number, items: Record<string, any>) => ctx.deps.boardStore.rerollItems(count, items),
        items: ctx.deps.configStore.items as Record<string, any>,
        energyItem: ctx.deps.configStore.itemEffects.energyItem,
        doubleGen: ctx.deps.configStore.itemEffects.doubleGen,
        luckyCoin: { ...ctx.deps.configStore.itemEffects.luckyCoin, random: Math.random },
        clearLv1: ctx.deps.configStore.itemEffects.clearLv1,
        spaceClean: ctx.deps.configStore.itemEffects.spaceClean,
        reroll: ctx.deps.configStore.itemEffects.reroll,
    };
}
