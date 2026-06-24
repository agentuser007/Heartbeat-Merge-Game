// ============================================================
// applyResolveResult.ts — ResolveResult application + type definitions
// ============================================================
// Applies a Service resolve result to stores. Extracted from
// useGameLoop.ts so handler files can import it without circular deps.
// ============================================================

import type { GachaItem } from '@/logic/GachaLogic';
import type { DailyOrderState, InventoryItemMeta, LoopStatus, VNChoice } from '@/types/game';
import type { SinglePullData } from '@/services/GachaService';
import type { ResolveResult, ServiceResultWithData } from '@/services/ServiceResultTypes';
import { useCurrencyStore } from '@/stores/currencyStore';
import { useEnergyStore } from '@/stores/energyStore';
import { useBoardStore } from '@/stores/boardStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useAchievementStore } from '@/stores/achievementStore';
import { useAffectionStore } from '@/stores/affectionStore';
import { useGachaStore } from '@/stores/gachaStore';
import { useLoopStore } from '@/stores/loopStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useDailyOrderStore } from '@/stores/dailyOrderStore';
import { useSaveStore } from '@/stores/saveStore';
import { useAdStore } from '@/stores/adStore';
import { useDailyBuffStore } from '@/stores/dailyBuffStore';
import { useTouchInteractionStore } from '@/stores/touchInteractionStore';
import { useFragmentStore } from '@/stores/fragmentStore';
import { useCGAlbumStore } from '@/stores/cgAlbumStore';
import { useBossStore } from '@/stores/bossStore';
import { useHeroineStore } from '@/stores/heroineStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useVNReaderStore } from '@/stores/vnReaderStore';
import { useEffects } from '@/composables/useEffects';
import { useI18nStore } from '@/stores/i18nStore';
import { useEventBus } from '@/composables/useEventBus';
import { useConfigStore } from '@/stores/configStore';
import { useSheet } from '@/composables/useSheet';

// ============================================================
// Deps types
// ============================================================

export interface ApplyResolveResultDeps {
    currencyStore: { addGold: (n: number) => void; addDiamonds: (n: number) => void; spendDiamonds: (n: number) => void };
    energyStore: { add: (n: number) => void; spend: (n: number) => void; setMax: (n: number) => void; setRegenInterval: (n: number) => void };
    boardStore: { placeItem: (idx: number, itemId: string) => void; clearCell: (idx: number) => void; scissorActive: boolean; activateDoubleGen: (n: number) => void; resetAllGenerators: () => void; upgradeActive: boolean; findEmptyCell: () => number | null; cells: unknown[]; getCell: (i: number) => unknown; findAllItemsByLevel: (level: number) => unknown[]; rerollItems: (count: number, items: Record<string, any>) => void; _setCell: (index: number, id: string) => void; _initGeneratorState: (index: number, itemId: string) => void; _incrementGeneratorClicks: (index: number) => void; decrementDoubleGenTurns: () => void };
    inventoryStore: { addItem: (itemId: string, count?: number, meta?: InventoryItemMeta) => void };
    achievementStore: { incrementStat: (key: string, amount: number) => void; checkAll: () => void; resetLoopAchievements: () => void; unlockField: (id: string) => void };
    affectionStore: { getPoints: (characterId: string) => number; resolveAddAffection: (characterId: string, amount: number, source: string) => ResolveResult; addPoints: (characterId: string, amount: number) => void; addCoins: (amount: number) => void; deductCoins: (amount: number) => void; updateShopPurchase: (itemId: string, date: string) => void; updateGiftHistory: (characterId: string, giftId: string) => void; recordTouch: (characterId: string, zoneId: string) => void; addDarkness: (characterId: string, amount: number) => void };
    gachaStore: { singlePull: (rarity?: 'R' | 'SR' | 'SSR') => ServiceResultWithData<SinglePullData>; setResultsField: (items: GachaItem[]) => void; markSsrOwnedField: (ids: string[]) => void; decrementFreePullsField: () => void; setLastFreePullDateField: (date: string) => void };
    loopStore: { syncLoopStatus: (s: LoopStatus) => void; loopTokens: number; loopIndex: number; metaUpgrades: Record<string, number>; hasRule: (rule: string) => boolean; setControlLevel: (level: number) => void; addNarrativeFlag: (flag: string) => void };
    heroineStore: { setUpgradeLevel: (upgradeId: string, level: number) => void };
    collectionStore: { resetLoopDiscoveries: () => void; discover: (itemId: string) => void; collectGacha: (cardId: string) => void; markChainCompletedField: (chainId: string) => void };
    dailyOrderStore: { rollNewOrders: (b: boolean) => void; frozenOrders: DailyOrderState[] | null; _setActiveOrders: (orders: DailyOrderState[]) => void; _setCompletedCount: (n: number) => void; _setLastRollDate: (d: string) => void };
    saveStore: { saveAll: () => void; saveMeta: () => void };
    adStore: { dailyAdCounts: Record<string, number>; lastWatchTime: Record<string, number>; lastResetDate: string; resetAllCounts: () => void };
    dailyBuffStore: { activeBuffs: Array<{ id: string; icon: string; nameKey: string; descKey: string; activatedAt?: number }>; buffFlags: Record<string, boolean>; pendingBuff: { id: string; icon: string; nameKey: string; descKey: string; activatedAt?: number } | null; lastRollDate: string };
    fragmentStore: { addFragment: (fragmentId: string, count: number) => void; removeFragmentField: (fragmentId: string, count: number) => void };
    cgAlbumStore: { unlockCG: (cgId: string, storyIndex: number) => void; unlockNextStoryField: (cgId: string) => void; spendMemoryFragmentsField: (cgId: string, amount: number) => void };
    bossStore: { setLevelIdx: (idx: number) => void; setHp: (hp: number) => void; setTotalHp: (hp: number) => void; setBossNameField: (name: string) => void; setBossAvatarField: (avatar: string) => void; setFsmStateField: (state: string) => void; setOrdersField: (orders: Array<{ required: Array<{ itemId: string; count: number }>; damage: number; isTimed?: boolean; timeLimit?: number; diamondReward?: number; affectionReward?: number }>) => void; setCurrentOrderIdxField: (idx: number) => void; setTimerRemainingField: (remaining: number) => void; currentLevelIdx: number; resolveDefeatTransition: () => ResolveResult };
    touchInteractionStore: { setTouchCooldownField: (characterId: string, zoneId: string, timestamp: number) => void; incrementDailyTouchCountField: (characterId: string) => void };
    vnReaderStore: { currentSceneId: string | null; mode: 'cg' | 'scene'; pendingChoice: unknown; setCurrentSceneId: (id: string) => void; setMode: (m: 'cg' | 'scene') => void; setPendingChoice: (c: VNChoice | null) => void };
    effects: { showToast: (message: string, type: 'info' | 'sr' | 'ssr' | 'error') => void };
    i18nStore: { t: (key: string, params?: Record<string, unknown>) => string };
    bus: { emit: (event: string, data?: unknown) => void };
    configStore: ReturnType<typeof useConfigStore>;
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
    adStore: ReturnType<typeof useAdStore>;
    dailyBuffStore: ReturnType<typeof useDailyBuffStore>;
    touchInteractionStore: ReturnType<typeof useTouchInteractionStore>;
    fragmentStore: ReturnType<typeof useFragmentStore>;
    cgAlbumStore: ReturnType<typeof useCGAlbumStore>;
    bossStore: ReturnType<typeof useBossStore>;
    heroineStore: ReturnType<typeof useHeroineStore>;
    dialogueStore: ReturnType<typeof useDialogueStore>;
    vnReaderStore: ReturnType<typeof useVNReaderStore>;
    effects: ReturnType<typeof useEffects>;
    i18nStore: ReturnType<typeof useI18nStore>;
    bus: ReturnType<typeof useEventBus>;
    configStore: ReturnType<typeof useConfigStore>;
}

// ============================================================
// applyResolveResult — applies a ResolveResult to stores
// ============================================================

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
            deps.boardStore._setCell(p.cellIndex, p.itemId);
        }
        for (const p of applyTo.board.placeItems) {
            if (p.initGenerator) {
                deps.boardStore._initGeneratorState(p.cellIndex, p.itemId);
            }
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
    if (applyTo.board?.incrementGeneratorClicks) {
        deps.boardStore._incrementGeneratorClicks(applyTo.board.incrementGeneratorClicks.index);
    }
    if (applyTo.board?.decrementDoubleGenTurns) {
        for (let i = 0; i < applyTo.board.decrementDoubleGenTurns; i++) {
            deps.boardStore.decrementDoubleGenTurns();
        }
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
    if (applyTo.fragment?.removeFragment) {
        const rf = applyTo.fragment.removeFragment;
        deps.fragmentStore.removeFragmentField(rf.fragmentId, rf.count);
    }

    if (applyTo.cgAlbum?.unlockCGs) {
        for (const cg of applyTo.cgAlbum.unlockCGs) {
            deps.cgAlbumStore.unlockCG(cg.cgId, cg.storyIndex);
        }
    }
    if (applyTo.cgAlbum?.unlockNextStory) {
        deps.cgAlbumStore.unlockNextStoryField(applyTo.cgAlbum.unlockNextStory.cgId);
    }
    if (applyTo.cgAlbum?.spendMemoryFragments) {
        const smf = applyTo.cgAlbum.spendMemoryFragments;
        deps.cgAlbumStore.spendMemoryFragmentsField(smf.cgId, smf.amount);
    }

    if (applyTo.achievement?.incrementStats) {
        for (const stat of applyTo.achievement.incrementStats) {
            deps.achievementStore.incrementStat(stat.key, stat.amount);
        }
    }
    if (applyTo.achievement?.unlockAchievements) {
        for (const id of applyTo.achievement.unlockAchievements) {
            deps.achievementStore.unlockField(id);
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
            deps.affectionStore.addPoints(aff.characterId, aff.amount);
        }
    }
    if (applyTo.affection?.addCoins) {
        deps.affectionStore.addCoins(applyTo.affection.addCoins);
    }
    if (applyTo.affection?.spendCoins) {
        deps.affectionStore.deductCoins(applyTo.affection.spendCoins);
    }
    if (applyTo.affection?.levelUpBonuses) {
        // bonus coins already included in addCoins via resolveAddAffection merge
    }
    if (applyTo.affection?.updateShopPurchase) {
        const sp = applyTo.affection.updateShopPurchase;
        deps.affectionStore.updateShopPurchase(sp.itemId, sp.date);
    }
    if (applyTo.affection?.updateGiftHistory) {
        const gh = applyTo.affection.updateGiftHistory;
        deps.affectionStore.updateGiftHistory(gh.characterId, gh.giftId);
    }
    if (applyTo.affection?.recordTouch) {
        const rt = applyTo.affection.recordTouch;
        deps.affectionStore.recordTouch(rt.characterId, rt.zoneId);
    }
    if (applyTo.affection?.addDarkness) {
        for (const d of applyTo.affection.addDarkness) {
            deps.affectionStore.addDarkness(d.characterId, d.amount);
        }
    }

    if (applyTo.boss?.setCurrentLevelIdx !== undefined) deps.bossStore.setLevelIdx(applyTo.boss.setCurrentLevelIdx);
    if (applyTo.boss?.setCurrentHp !== undefined) deps.bossStore.setHp(applyTo.boss.setCurrentHp);
    if (applyTo.boss?.setTotalHp !== undefined) deps.bossStore.setTotalHp(applyTo.boss.setTotalHp);
    if (applyTo.boss?.setBossName !== undefined) deps.bossStore.setBossNameField(applyTo.boss.setBossName);
    if (applyTo.boss?.setBossAvatar !== undefined) deps.bossStore.setBossAvatarField(applyTo.boss.setBossAvatar);
    if (applyTo.boss?.setFsmState !== undefined) deps.bossStore.setFsmStateField(applyTo.boss.setFsmState);
    if (applyTo.boss?.setOrders !== undefined) deps.bossStore.setOrdersField(applyTo.boss.setOrders);
    if (applyTo.boss?.setCurrentOrderIdx !== undefined) deps.bossStore.setCurrentOrderIdxField(applyTo.boss.setCurrentOrderIdx);
    if (applyTo.boss?.setTimerRemaining !== undefined) deps.bossStore.setTimerRemainingField(applyTo.boss.setTimerRemaining);

    if (applyTo.gacha) {
        if (applyTo.gacha.setResults) deps.gachaStore.setResultsField(applyTo.gacha.setResults);
        if (applyTo.gacha.markSsrOwned) deps.gachaStore.markSsrOwnedField(applyTo.gacha.markSsrOwned);
        if (applyTo.gacha.decrementFreePulls) deps.gachaStore.decrementFreePullsField();
        if (applyTo.gacha.setLastFreePullDate) deps.gachaStore.setLastFreePullDateField(applyTo.gacha.setLastFreePullDate);
        if (applyTo.gacha.singlePull) {
            const pullResult = deps.gachaStore.singlePull(applyTo.gacha.singlePull.rarity);
            if (pullResult.ok) applyResolveResult(pullResult.resolveResult, deps);
        }
    }

    if (applyTo.loop?.syncLoopStatus) {
        deps.loopStore.syncLoopStatus(applyTo.loop.syncLoopStatus);
    }
    if (applyTo.loop?.incrementLoopIndex) {
        const inc = applyTo.loop.incrementLoopIndex;
        if (inc.addLoopTokens) deps.loopStore.loopTokens += inc.addLoopTokens;
        deps.loopStore.loopIndex++;
    }
    if (applyTo.loop?.spendLoopTokens) {
        deps.loopStore.loopTokens -= applyTo.loop.spendLoopTokens;
    }
    if (applyTo.loop?.setMetaUpgradeLevel) {
        const { upgradeId, level } = applyTo.loop.setMetaUpgradeLevel;
        deps.loopStore.metaUpgrades[upgradeId] = level;
    }
    if (applyTo.loop?.setControlLevel !== undefined) {
        deps.loopStore.setControlLevel(applyTo.loop.setControlLevel);
    }
    if (applyTo.loop?.addNarrativeFlags) {
        for (const flag of applyTo.loop.addNarrativeFlags) {
            deps.loopStore.addNarrativeFlag(flag);
        }
    }

    if (applyTo.heroine?.setUpgradeLevels) {
        for (const { upgradeId, level } of applyTo.heroine.setUpgradeLevels) {
            deps.heroineStore.setUpgradeLevel(upgradeId, level);
        }
    }

    if (applyTo.collection?.resetLoopDiscoveries) {
        deps.collectionStore.resetLoopDiscoveries();
    }
    if (applyTo.collection?.markChainCompleted) {
        deps.collectionStore.markChainCompletedField(applyTo.collection.markChainCompleted);
    }

    if (applyTo.dailyOrders?.rollNewOrders) {
        deps.dailyOrderStore.rollNewOrders(applyTo.dailyOrders.rollNewOrders);
    }
    if (applyTo.dailyOrders?.setFrozenOrders !== undefined) {
        deps.dailyOrderStore.frozenOrders = applyTo.dailyOrders.setFrozenOrders;
    }
    if (applyTo.dailyOrders?.setActiveOrders) {
        deps.dailyOrderStore._setActiveOrders(applyTo.dailyOrders.setActiveOrders);
    }
    if (applyTo.dailyOrders?.setCompletedCount !== undefined) {
        deps.dailyOrderStore._setCompletedCount(applyTo.dailyOrders.setCompletedCount);
    }
    if (applyTo.dailyOrders?.setLastRollDate) {
        deps.dailyOrderStore._setLastRollDate(applyTo.dailyOrders.setLastRollDate);
    }

    if (applyTo.save?.saveAll) {
        deps.saveStore.saveAll();
    }
    if (applyTo.save?.saveMeta) {
        deps.saveStore.saveMeta();
    }

    if (applyTo.ad) {
        if (applyTo.ad.incrementCount) {
            deps.adStore.dailyAdCounts[applyTo.ad.incrementCount]++;
        }
        if (applyTo.ad.setLastWatchTime) {
            const { adType, time } = applyTo.ad.setLastWatchTime;
            deps.adStore.lastWatchTime[adType] = time;
        }
        if (applyTo.ad.resetCounts) {
            deps.adStore.resetAllCounts();
        }
        if (applyTo.ad.setResetDate) {
            deps.adStore.lastResetDate = applyTo.ad.setResetDate;
        }
    }

    if (applyTo.dailyBuff) {
        if (applyTo.dailyBuff.setActiveBuffs !== undefined) {
            deps.dailyBuffStore.activeBuffs = applyTo.dailyBuff.setActiveBuffs;
        }
        if (applyTo.dailyBuff.setBuffFlags !== undefined) {
            deps.dailyBuffStore.buffFlags = applyTo.dailyBuff.setBuffFlags;
        }
        if (applyTo.dailyBuff.setPendingBuff !== undefined) {
            deps.dailyBuffStore.pendingBuff = applyTo.dailyBuff.setPendingBuff;
        }
        if (applyTo.dailyBuff.setLastRollDate !== undefined) {
            deps.dailyBuffStore.lastRollDate = applyTo.dailyBuff.setLastRollDate;
        }
    }

    if (applyTo.touch) {
        if (applyTo.touch.setTouchCooldown) {
            const { characterId, zoneId, timestamp } = applyTo.touch.setTouchCooldown;
            deps.touchInteractionStore.setTouchCooldownField(characterId, zoneId, timestamp);
        }
        if (applyTo.touch.incrementDailyTouchCount) {
            deps.touchInteractionStore.incrementDailyTouchCountField(applyTo.touch.incrementDailyTouchCount);
        }
    }

    if (applyTo.narrative) {
        if (applyTo.narrative.setCurrentSceneId !== undefined) {
            deps.vnReaderStore.setCurrentSceneId(applyTo.narrative.setCurrentSceneId);
        }
        if (applyTo.narrative.setMode !== undefined) {
            deps.vnReaderStore.setMode(applyTo.narrative.setMode);
        }
        if (applyTo.narrative.setPendingChoice !== undefined) {
            deps.vnReaderStore.setPendingChoice(applyTo.narrative.setPendingChoice);
        }
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
