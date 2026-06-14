// ============================================================
// useGameLoop.ts — Cross-Store Communication for Game Loop
// ============================================================
// Wires reactive watchers and event bus listeners for cross-store
// communication. Delegates complex logic to Service layer functions
// and applies results via applyResolveResult helper.
// ============================================================

import { watch } from 'vue';
import { useBossStore } from '@/stores/bossStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { useEnergyStore } from '@/stores/energyStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useAchievementStore } from '@/stores/achievementStore';
import { useSaveStore } from '@/stores/saveStore';
import { useConfigStore } from '@/stores/configStore';
import type { GameItem } from '@/types/game';
import type { DailyOrderState, InventoryItemMeta, LoopStatus } from '@/types/game';
import type { GachaPullResult } from '@/stores/gachaStore';
import { useBoardStore } from '@/stores/boardStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useGachaStore } from '@/stores/gachaStore';
import { useLoopStore } from '@/stores/loopStore';
import { useDailyOrderStore } from '@/stores/dailyOrderStore';
import { useFragmentStore } from '@/stores/fragmentStore';
import { useCGAlbumStore } from '@/stores/cgAlbumStore';
import { useAffectionStore } from '@/stores/affectionStore';
import { useEventBus } from './useEventBus';
import { useSheet } from './useSheet';
import { useEffects } from './useEffects';
import { useI18nStore } from '@/stores/i18nStore';
import { ItemEffectLogic } from '@/logic/ItemEffectLogic';
import { RewardService, type DailyOrderFulfilledData } from '@/services/RewardService';
import { ShopService, type ShopItemPurchasedData } from '@/services/ShopService';
import { InventoryService } from '@/services/InventoryService';
import { AffectionService } from '@/services/AffectionService';
import type { ConsumableEffectDeps } from '@/services/ItemEffectService';
import type { ResolveResult } from '@/services/ServiceResultTypes';
import { useApplyDeps } from '@/composables/useApplyDeps';

// ============================================================
// applyResolveResult — applies a Service resolve result to stores
// ============================================================

export interface ApplyResolveResultDeps {
    currencyStore: { addGold: (n: number) => void; addDiamonds: (n: number) => void; spendDiamonds: (n: number) => void };
    energyStore: { add: (n: number) => void; spend: (n: number) => void; setMax: (n: number) => void; setRegenInterval: (n: number) => void };
    boardStore: { placeItem: (idx: number, itemId: string) => void; clearCell: (idx: number) => void; scissorActive: boolean; activateDoubleGen: (n: number) => void; resetAllGenerators: () => void; upgradeActive: boolean };
    inventoryStore: { addItem: (itemId: string, count?: number, meta?: InventoryItemMeta) => void };
    achievementStore: { incrementStat: (key: string, amount: number) => void; checkAll: () => void; resetLoopAchievements: () => void };
    affectionStore: { addAffection: (characterId: string, amount: number, source: string) => void; recordTouch: (characterId: string, zoneId: string) => void };
    gachaStore: { singlePull: (rarity?: 'R' | 'SR' | 'SSR') => GachaPullResult };
    loopStore: { syncLoopStatus: (s: LoopStatus) => void; loopTokens: number; loopIndex: number };
    collectionStore: { resetLoopDiscoveries: () => void };
    dailyOrderStore: { rollNewOrders: (b: boolean) => void; frozenOrders: DailyOrderState[] | null };
    saveStore: { saveAll: () => void; saveMeta: () => void };
    fragmentStore: { addFragment: (fragmentId: string, count: number) => void };
    cgAlbumStore: { unlockCG: (cgId: string, storyIndex: number) => void };
    effects: { showToast: (message: string, type: 'info' | 'sr' | 'ssr' | 'error') => void };
    i18nStore: { t: (key: string, params?: Record<string, unknown>) => string };
    bus: { emit: (event: string, data?: unknown) => void };
}

export interface ApplyDeps extends ApplyResolveResultDeps {
    currencyStore: ReturnType<typeof useCurrencyStore>;
    energyStore: ReturnType<typeof useEnergyStore>;
    boardStore: ReturnType<typeof useBoardStore>;
    inventoryStore: ReturnType<typeof useInventoryStore>;
    achievementStore: ReturnType<typeof useAchievementStore>;
    affectionStore: ReturnType<typeof useAffectionStore>;
    gachaStore: ReturnType<typeof useGachaStore>;
    loopStore: ReturnType<typeof useLoopStore>;
    collectionStore: ReturnType<typeof useCollectionStore>;
    dailyOrderStore: ReturnType<typeof useDailyOrderStore>;
    saveStore: ReturnType<typeof useSaveStore>;
    fragmentStore: ReturnType<typeof useFragmentStore>;
    cgAlbumStore: ReturnType<typeof useCGAlbumStore>;
    effects: ReturnType<typeof useEffects>;
    i18nStore: ReturnType<typeof useI18nStore>;
    bus: ReturnType<typeof useEventBus>;
}

export function applyResolveResult(result: ResolveResult, deps: ApplyResolveResultDeps): void {
    const { applyTo, events, ui } = result;

    if (applyTo.currency?.addGold) deps.currencyStore.addGold(applyTo.currency.addGold);
    if (applyTo.currency?.addDiamonds) deps.currencyStore.addDiamonds(applyTo.currency.addDiamonds);
    if (applyTo.currency?.spendDiamonds) deps.currencyStore.spendDiamonds(applyTo.currency.spendDiamonds);

    if (applyTo.energy?.add) deps.energyStore.add(applyTo.energy.add);
    if (applyTo.energy?.spend) deps.energyStore.spend(applyTo.energy.spend);
    if (applyTo.energy?.setMax) deps.energyStore.setMax(applyTo.energy.setMax);
    if (applyTo.energy?.setRegenInterval) deps.energyStore.setRegenInterval(applyTo.energy.setRegenInterval);

    if (applyTo.board?.placeItems) {
        for (const p of applyTo.board.placeItems) {
            deps.boardStore.placeItem(p.cellIndex, p.itemId);
        }
    }
    if (applyTo.board?.clearCells) {
        for (const idx of applyTo.board.clearCells) {
            deps.boardStore.clearCell(idx);
        }
    }
    if (applyTo.board?.scissorActive !== undefined) {
        deps.boardStore.scissorActive = applyTo.board.scissorActive;
    }
    if (applyTo.board?.activateDoubleGenTurns) {
        deps.boardStore.activateDoubleGen(applyTo.board.activateDoubleGenTurns);
    }
    if (applyTo.board?.resetGenerators) {
        deps.boardStore.resetAllGenerators();
    }
    if (applyTo.board?.upgradeActive !== undefined) {
        deps.boardStore.upgradeActive = applyTo.board.upgradeActive;
    }

    if (applyTo.inventory?.addItems) {
        for (const item of applyTo.inventory.addItems) {
            deps.inventoryStore.addItem(item.itemId, item.count, item.meta);
        }
    }

    if (applyTo.fragment?.addFragments) {
        for (const frag of applyTo.fragment.addFragments) {
            deps.fragmentStore.addFragment(frag.fragmentId, frag.count);
        }
    }

    if (applyTo.cgAlbum?.unlockCGs) {
        for (const cg of applyTo.cgAlbum.unlockCGs) {
            deps.cgAlbumStore.unlockCG(cg.cgId, cg.storyIndex);
        }
    }

    if (applyTo.achievement?.incrementStats) {
        for (const stat of applyTo.achievement.incrementStats) {
            deps.achievementStore.incrementStat(stat.key, stat.amount);
        }
    }
    if (applyTo.achievement?.checkAll) {
        deps.achievementStore.checkAll();
    }
    if (applyTo.achievement?.resetLoopAchievements) {
        deps.achievementStore.resetLoopAchievements();
    }

    if (applyTo.affection?.addAffections) {
        for (const aff of applyTo.affection.addAffections) {
            deps.affectionStore.addAffection(aff.characterId, aff.amount, aff.source);
        }
    }
    if (applyTo.affection?.recordTouch) {
        const rt = applyTo.affection.recordTouch;
        deps.affectionStore.recordTouch(rt.characterId, rt.zoneId);
    }

    if (applyTo.gacha?.singlePull) {
        const { resolveResult: gachaResult } = deps.gachaStore.singlePull(applyTo.gacha.singlePull.rarity);
        applyResolveResult(gachaResult, deps);
    }

    if (applyTo.loop?.syncLoopStatus) {
        deps.loopStore.syncLoopStatus(applyTo.loop.syncLoopStatus);
    }
    if (applyTo.loop?.incrementLoopIndex) {
        const inc = applyTo.loop.incrementLoopIndex;
        if (inc.addLoopTokens) deps.loopStore.loopTokens += inc.addLoopTokens;
        deps.loopStore.loopIndex++;
    }

    if (applyTo.collection?.resetLoopDiscoveries) {
        deps.collectionStore.resetLoopDiscoveries();
    }

    if (applyTo.dailyOrders?.rollNewOrders) {
        deps.dailyOrderStore.rollNewOrders(applyTo.dailyOrders.rollNewOrders);
    }
    if (applyTo.dailyOrders?.setFrozenOrders !== undefined) {
        deps.dailyOrderStore.frozenOrders = applyTo.dailyOrders.setFrozenOrders;
    }

    if (applyTo.save?.saveAll) {
        deps.saveStore.saveAll();
    }
    if (applyTo.save?.saveMeta) {
        deps.saveStore.saveMeta();
    }

    if (events) {
        for (const e of events) {
            deps.bus.emit(e.name, e.data);
        }
    }

    if (ui?.toasts) {
        for (const t of ui.toasts) {
            const msg = t.messageKey
                ? (deps.i18nStore.t(t.messageKey, t.messageParams) || t.fallback)
                : t.fallback;
            deps.effects.showToast(msg, t.type);
        }
    }

    if (ui?.closeSheets) {
        for (const sheetName of ui.closeSheets) {
            const sheet = useSheet(sheetName);
            sheet.isOpen.value = false;
        }
    }
}

// ============================================================
// useGameLoop — main composable
// ============================================================

export function useGameLoop() {
    const bossStore = useBossStore();
    const energyStore = useEnergyStore();
    const collectionStore = useCollectionStore();
    const achievementStore = useAchievementStore();
    const saveStore = useSaveStore();
    const configStore = useConfigStore();
    const boardStore = useBoardStore();
    const loopStore = useLoopStore();
    const bus = useEventBus();
    const effects = useEffects();

    const applyDeps = useApplyDeps();

    function buildConsumableEffectDeps(): ConsumableEffectDeps {
        return {
            findEmptyCell: () => boardStore.findEmptyCell(),
            findAllItemsByLevel: (level: number) => boardStore.findAllItemsByLevel(level),
            getCell: (index: number) => boardStore.getCell(index),
            rerollItems: (count: number, items: Record<string, any>) => boardStore.rerollItems(count, items),
            items: configStore.items as Record<string, any>,
            energyItem: configStore.itemEffects.energyItem,
            doubleGen: configStore.itemEffects.doubleGen,
            luckyCoin: { ...configStore.itemEffects.luckyCoin, random: Math.random },
            clearLv1: configStore.itemEffects.clearLv1,
            spaceClean: configStore.itemEffects.spaceClean,
            reroll: configStore.itemEffects.reroll,
        };
    }

    // ============================================================
    // BOSS FSM → LOOP COMPLETION CHECK
    // ============================================================

    watch(
        () => bossStore.fsmState,
        (newState, oldState) => {
            if (newState === 'DEFEATED' && oldState !== 'DEFEATED') {
                const dailyOrderStore = useDailyOrderStore();
                dailyOrderStore.rollNewOrders(true);

                const levels = configStore.levels;
                const maxLevelIdx = levels ? levels.length - 1 : 3;

                if (bossStore.currentLevelIdx >= maxLevelIdx) {
                    bus.emit('loop:shouldComplete', {});
                } else {
                    bossStore.nextLevel();
                }
            }
        }
    );

    // ============================================================
    // SIMPLE LISTENERS (1-3 lines, no Service extraction needed)
    // ============================================================

    bus.on('collection:itemDiscovered', () => {
        achievementStore.checkAll();
    });

    bus.on('board:produced', (data) => {
        if (data && data.producedItemId) {
            collectionStore.discover(data.producedItemId);
        }
    });

    bus.on('board:merged', (data) => {
        if (data && data.result && data.result.nextId) {
            collectionStore.discover(data.result.nextId);
        }
    });

    bus.on('board:itemPlaced', (data) => {
        if (data && data.itemId) {
            collectionStore.discover(data.itemId);
        }
    });

    bus.on('currency:changed', () => {
        achievementStore.checkAll();
    });

    bus.on('currency:goldEarned', (data) => {
        if (data && data.amount && data.amount > 0) {
            achievementStore.incrementStat('totalGoldEarned', data.amount);
        }
    });

    // ============================================================
    // BOSS DEFEATED → ACHIEVEMENT + AFFECTION
    // ============================================================

    bus.on('bossfsm:stateChanged', (data) => {
        if (data && data.to === 'DEFEATED') {
            achievementStore.incrementStat('bossDefeats');
            achievementStore.checkAll();

            const affectionResult = AffectionService.resolveBossDefeat({
                affectionConfig: configStore.affectionConfig,
                bossLevelIdx: bossStore.currentLevelIdx,
                loopIndex: loopStore.loopIndex,
            });
            applyResolveResult(affectionResult, applyDeps);
        }
    });

    // ============================================================
    // BOARD CELL UNLOCK → ACHIEVEMENT CHECK
    // ============================================================

    bus.on('board:cellsUnlocked', (data) => {
        if (data && data.indices) {
            achievementStore.incrementStat('cellsUnlocked', data.indices.length);
        }
        achievementStore.checkAll();
    });

    // ============================================================
    // BOARD MERGE → ACHIEVEMENT STATS
    // ============================================================

    bus.on('board:merged', (data) => {
        achievementStore.incrementStat('merges');
        if (data && data.result && data.result.nextId) {
            const items = configStore.items as Record<string, GameItem>;
            const nextItem = items[data.result.nextId];
            if (nextItem && !nextItem.nextId) {
                achievementStore.incrementStat('maxLevelItems');
            }
        }
        achievementStore.checkAll();
    });

    bus.on('board:itemConsumed', () => {
        achievementStore.incrementStat('recycled');
        achievementStore.checkAll();
    });

    bus.on('gacha:pulled', (data) => {
        if (data && data.results) {
            achievementStore.incrementStat('gachaPulls', data.results.length);
            for (const card of data.results) {
                if (card.id) {
                    collectionStore.collectGacha(card.id);
                }
            }
        }
        achievementStore.checkAll();
    });

    bus.on('fragment:added', (data) => {
        if (data && data.fragmentId) {
            collectionStore.discover(data.fragmentId);
        }
    });

    // ============================================================
    // DAILY ORDER FULFILLED → REWARD (RewardService)
    // ============================================================

    bus.on('dailyOrders:fulfilled', (data) => {
        const result = RewardService.resolveDailyOrderFulfilled(
            data as unknown as DailyOrderFulfilledData,
            { hasRule: (rule: string) => loopStore.hasRule(rule), dailyGoldBoost: configStore.boardEconomy.dailyGoldBoost },
            { affectionConfig: configStore.affectionConfig },
        );
        applyResolveResult(result, applyDeps);
    });

    // ============================================================
    // LOOP / HEROINE / META (kept inline — simple logic)
    // ============================================================

    bus.on('loop:shouldComplete', () => {
        // Handled in GameView.vue → completeCurrentLoop()
    });

    bus.on('heroine:upgradePurchased', (data) => {
        if (data && data.upgradeId === 'energy_cap') {
            const baseMax = configStore.gameConfig.MAX_ENERGY || 100;
            energyStore.setMax(baseMax + (data.value ?? 0));
        }
        if (data && data.upgradeId === 'regen_speed') {
            const newInterval = data.value;
            if (typeof newInterval === 'number' && newInterval > 0) {
                energyStore.setRegenInterval(newInterval);
            }
        }
        saveStore.saveAll();
    });

    bus.on('loop:metaUpgradePurchased', () => {
        saveStore.saveMeta();
    });

    bus.on('locale:changed', () => {
        // Handled reactively via i18nStore.t() in templates
    });

    // ============================================================
    // SHOP ITEM PURCHASED (ShopService)
    // ============================================================

    bus.on('shop:itemPurchased', (data) => {
        const result = ShopService.resolveShopItemPurchased(data as unknown as ShopItemPurchasedData, {
            items: configStore.items as Record<string, any> | null,
            findEmptyCell: () => boardStore.findEmptyCell(),
            cells: boardStore.cells as unknown[],
            getCell: (i: number) => boardStore.getCell(i),
        });
        applyResolveResult(result, applyDeps);
    });

    // ============================================================
    // AD REWARD GRANTED (RewardService)
    // ============================================================

    bus.on('ad:rewardGranted', (data) => {
        const result = RewardService.resolveAdReward(data, { freePullMaxRarity: configStore.gachaConfig.freePullMaxRarity });
        applyResolveResult(result, applyDeps);
    });

    // ============================================================
    // TOAST:SHOW → BRIDGE BUS EVENT TO useEffects
    // ============================================================

    bus.on('toast:show', (data) => {
        if (!data || !data.message) return;
        effects.showToast(data.message, data.type || 'info');
    });

    // ============================================================
    // INVENTORY ITEM USED (InventoryService)
    // ============================================================

    bus.on('inventory:itemUsed', (data) => {
        const result = InventoryService.resolveItemUsed(data, {
            items: configStore.items as Record<string, any>,
            findEmptyCell: () => boardStore.findEmptyCell(),
            getEffectCategory: (effect: string) => ItemEffectLogic.getEffectCategory(effect),
            effectDeps: buildConsumableEffectDeps(),
            energyItem: configStore.itemEffects.energyItem,
        });
        applyResolveResult(result, applyDeps);
    });

    // ============================================================
    // VN / AFFECTION (AffectionService + inline)
    // ============================================================

    bus.on('vn:closed', () => {
        // VN affection is handled via 'affection:vnCompleted' event
    });

    bus.on('affection:vnCompleted', (data) => {
        const result = AffectionService.resolveVnCompleted(data, {
            affectionConfig: configStore.affectionConfig,
        });
        applyResolveResult(result, applyDeps);
    });

    bus.on('affection:shopEffect', (data) => {
        if (!data || !data.effect) return;
        const effect = data.effect;
        switch (effect.type) {
            case 'merge_double':
                effects.showToast('⚡ 合并加速已激活！', 'info');
                break;
            case 'gacha_ssr_boost':
                effects.showToast(`🍀 SSR概率+${effect.value}%！`, 'info');
                break;
            case 'boss_damage_shield':
                effects.showToast('🛡️ 护盾已激活！', 'info');
                break;
            case 'fragment_double':
                effects.showToast('💎 碎片双倍已激活！', 'info');
                break;
        }
    });

    // ============================================================
    // ACHIEVEMENT CLAIMED (RewardService)
    // ============================================================

    bus.on('achievement:claimed', (data) => {
        const result = RewardService.resolveAchievementClaimed(data);
        applyResolveResult(result, applyDeps);
    });
}
