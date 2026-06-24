// ============================================================
// ServiceResultTypes.ts — Shared return types for Service layer
// ============================================================
// Every resolve function returns a ResolveResult with applyTo,
// events, and optional ui instructions. No Vue dependency.
// ============================================================

import type { InventoryItemMeta, Rarity, LoopStatus, DailyOrderState, VNChoice } from '../types/game';
import type { GachaItem } from '../logic/GachaLogic';

export type ToastType = 'info' | 'sr' | 'ssr' | 'error';

export interface ResolveResult {
    applyTo: {
        currency?: { addGold?: number; addDiamonds?: number; spendDiamonds?: number };
        energy?: { add?: number; spend?: number; setMax?: number; setRegenInterval?: number };
        board?: {
            placeItems?: Array<{ cellIndex: number; itemId: string; initGenerator?: boolean }>;
            clearCells?: number[];
            scissorActive?: boolean;
            activateDoubleGenTurns?: number;
            resetGenerators?: boolean;
            upgradeActive?: boolean;
            incrementGeneratorClicks?: { index: number };
            decrementDoubleGenTurns?: number;
        };
        inventory?: { addItems?: Array<{ itemId: string; count: number; meta?: InventoryItemMeta }> };
        fragment?: { addFragments?: Array<{ fragmentId: string; count: number }>; removeFragment?: { fragmentId: string; count: number } };
        cgAlbum?: { unlockCGs?: Array<{ cgId: string; storyIndex: number }>; unlockNextStory?: { cgId: string }; spendMemoryFragments?: { cgId: string; amount: number } };
        achievement?: {
            incrementStats?: Array<{ key: string; amount: number }>;
            checkAll?: boolean;
            resetLoopAchievements?: boolean;
            unlockAchievements?: string[];
        };
        affection?: {
            addAffections?: Array<{ characterId: string; amount: number; source: string }>;
            addCoins?: number;
            spendCoins?: number;
            levelUpBonuses?: Array<{ characterId: string; newLevel: number; oldLevel: number; bonus: number }>;
            updateShopPurchase?: { itemId: string; date: string };
            updateGiftHistory?: { characterId: string; giftId: string };
            recordTouch?: { characterId: string; zoneId: string };
            addDarkness?: Array<{ characterId: string; amount: number }>;
        };
        heroine?: {
            setUpgradeLevels?: Array<{ upgradeId: string; level: number }>;
        };
        gacha?: {
            singlePull?: { rarity: Rarity };
            setResults?: GachaItem[];
            markSsrOwned?: string[];
            decrementFreePulls?: boolean;
            setLastFreePullDate?: string;
        };
        loop?: {
            syncLoopStatus?: LoopStatus;
            incrementLoopIndex?: { addLoopTokens?: number };
            spendLoopTokens?: number;
            setMetaUpgradeLevel?: { upgradeId: string; level: number };
            setControlLevel?: number;
            addNarrativeFlags?: string[];
        };
        collection?: { resetLoopDiscoveries?: boolean; markChainCompleted?: string };
        dailyOrders?: {
            rollNewOrders?: boolean;
            setFrozenOrders?: DailyOrderState[] | null;
            setActiveOrders?: DailyOrderState[];
            setCompletedCount?: number;
            setLastRollDate?: string;
        };
        save?: { saveAll?: boolean; saveMeta?: boolean };
        ad?: {
            incrementCount?: string;
            setLastWatchTime?: { adType: string; time: number };
            resetCounts?: boolean;
            setResetDate?: string;
        };
        dailyBuff?: {
            setActiveBuffs?: Array<{ id: string; icon: string; nameKey: string; descKey: string; activatedAt?: number }>;
            setBuffFlags?: Record<string, boolean>;
            setPendingBuff?: { id: string; icon: string; nameKey: string; descKey: string; activatedAt?: number } | null;
            setLastRollDate?: string;
        };
        // @phase4-transitional — shape may change during Phase 4 (BossService decomposition)
        boss?: {
            setCurrentLevelIdx?: number;
            setCurrentHp?: number;
            setTotalHp?: number;
            setBossName?: string;
            setBossAvatar?: string;
            setFsmState?: string;
            setOrders?: Array<{
                required: Array<{ itemId: string; count: number }>;
                damage: number;
                isTimed?: boolean;
                timeLimit?: number;
                diamondReward?: number;
                affectionReward?: number;
            }>;
            setCurrentOrderIdx?: number;
            setTimerRemaining?: number;
        };
        touch?: {
            setTouchCooldown?: { characterId: string; zoneId: string; timestamp: number };
            incrementDailyTouchCount?: string;
        };
        narrative?: {
            setCurrentSceneId?: string;
            setMode?: 'cg' | 'scene';
            setPendingChoice?: VNChoice | null;
        };
    };
    events?: Array<{ name: string; data: unknown }>;
    ui?: {
        toasts?: Array<{
            messageKey: string;
            messageParams?: Record<string, unknown>;
            fallback: string;
            type: ToastType;
        }>;
        closeSheets?: string[];
    };
}

export function emptyResult(): ResolveResult {
    return { applyTo: {} };
}

// ============================================================
// ServiceResult — discriminated union for success/fail outcomes
// ============================================================
// Every resolve function that can fail returns ServiceResult instead of
// a bare ResolveResult. Callers窄化 via `result.ok`:
//   if (result.ok) { applyResolveResult(result.resolveResult, deps); }
//   else { handleError(result.reason); }
// ============================================================

export type ServiceResult =
    | { ok: true; resolveResult: ResolveResult }
    | { ok: false; reason: string };

export function okResult(resolveResult: ResolveResult): ServiceResult {
    return { ok: true, resolveResult };
}

export function failResult(reason: string): ServiceResult {
    return { ok: false, reason };
}

// ============================================================
// ServiceResultWithData<T> — discriminated union with domain data
// ============================================================
// For services that return domain data the caller needs for UI
// (e.g., gacha pull results for animation, touch result for dialogue).
// data is read-only — components MUST NOT write back to data.
// Service layer shallow-copies reference types in data before returning
// to prevent components from accidentally mutating applyTo values
// through shared references.
// ============================================================

export type ServiceResultWithData<T> =
    | { ok: true; data: T; resolveResult: ResolveResult }
    | { ok: false; reason: string };

export function okResultWithData<T>(data: T, resolveResult: ResolveResult): ServiceResultWithData<T> {
    return { ok: true, data, resolveResult };
}

export function failResultWithData<T>(reason: string): ServiceResultWithData<T> {
    return { ok: false, reason };
}

// ============================================================
// mergeResolveResult — merges source into target ResolveResult
// ============================================================
// Explicit per-field merge (not generic deep merge).
// - Numeric additive fields (addGold, addDiamonds, etc.): sum, || undefined when 0
// - energy.spend: 0 has semantic meaning, use explicit presence check
// - setMax / setRegenInterval: last-writer-wins (source overrides target)
// - Array fields: concat
// - Boolean fields: OR
// - events / ui.toasts / ui.closeSheets: concat
// ============================================================

function sumOrUndef(a: number | undefined, b: number | undefined): number | undefined {
    const s = (a ?? 0) + (b ?? 0);
    return s || undefined;
}

function sumPreserveZero(a: number | undefined, b: number | undefined): number | undefined {
    if (a === undefined && b === undefined) return undefined;
    return (a ?? 0) + (b ?? 0);
}

function mergeArr<T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined {
    const merged = [...(a ?? []), ...(b ?? [])];
    return merged.length ? merged : undefined;
}

export function mergeResolveResult(target: ResolveResult, source: ResolveResult): void {
    const sa = source.applyTo;
    const ta = target.applyTo;

    if (sa.currency) {
        ta.currency = {
            addGold: sumOrUndef(ta.currency?.addGold, sa.currency.addGold),
            addDiamonds: sumOrUndef(ta.currency?.addDiamonds, sa.currency.addDiamonds),
            spendDiamonds: sumOrUndef(ta.currency?.spendDiamonds, sa.currency.spendDiamonds),
        };
    }

    if (sa.energy) {
        ta.energy = {
            add: sumOrUndef(ta.energy?.add, sa.energy.add),
            spend: sumPreserveZero(ta.energy?.spend, sa.energy.spend),
            setMax: sa.energy.setMax ?? ta.energy?.setMax,
            setRegenInterval: sa.energy.setRegenInterval ?? ta.energy?.setRegenInterval,
        };
    }

    if (sa.board) {
        ta.board = {
            placeItems: mergeArr(ta.board?.placeItems, sa.board.placeItems),
            clearCells: mergeArr(ta.board?.clearCells, sa.board.clearCells),
            scissorActive: ta.board?.scissorActive || sa.board.scissorActive || undefined,
            activateDoubleGenTurns: sumOrUndef(ta.board?.activateDoubleGenTurns, sa.board.activateDoubleGenTurns),
            resetGenerators: ta.board?.resetGenerators || sa.board.resetGenerators || undefined,
            upgradeActive: ta.board?.upgradeActive || sa.board.upgradeActive || undefined,
            incrementGeneratorClicks: sa.board.incrementGeneratorClicks ?? ta.board?.incrementGeneratorClicks,
            decrementDoubleGenTurns: sumOrUndef(ta.board?.decrementDoubleGenTurns, sa.board.decrementDoubleGenTurns),
        };
    }

    if (sa.inventory?.addItems) {
        ta.inventory = { addItems: [...(ta.inventory?.addItems ?? []), ...sa.inventory.addItems] };
    }

    if (sa.fragment) {
        const addFrags = mergeArr(ta.fragment?.addFragments, sa.fragment.addFragments);
        ta.fragment = {
            addFragments: addFrags,
            removeFragment: sa.fragment.removeFragment ?? ta.fragment?.removeFragment,
        };
    }

    if (sa.cgAlbum) {
        ta.cgAlbum = {
            unlockCGs: mergeArr(ta.cgAlbum?.unlockCGs, sa.cgAlbum.unlockCGs),
            unlockNextStory: sa.cgAlbum.unlockNextStory ?? ta.cgAlbum?.unlockNextStory,
            spendMemoryFragments: sa.cgAlbum.spendMemoryFragments ?? ta.cgAlbum?.spendMemoryFragments,
        };
    }

    if (sa.achievement) {
        ta.achievement = {
            incrementStats: mergeArr(ta.achievement?.incrementStats, sa.achievement.incrementStats),
            checkAll: ta.achievement?.checkAll || sa.achievement.checkAll || undefined,
            resetLoopAchievements: ta.achievement?.resetLoopAchievements || sa.achievement.resetLoopAchievements || undefined,
            unlockAchievements: mergeArr(ta.achievement?.unlockAchievements, sa.achievement.unlockAchievements),
        };
    }

    if (sa.affection) {
        ta.affection = {
            addAffections: mergeArr(ta.affection?.addAffections, sa.affection.addAffections),
            addCoins: sumOrUndef(ta.affection?.addCoins, sa.affection.addCoins),
            spendCoins: sumOrUndef(ta.affection?.spendCoins, sa.affection.spendCoins),
            levelUpBonuses: mergeArr(ta.affection?.levelUpBonuses, sa.affection.levelUpBonuses),
            updateShopPurchase: sa.affection.updateShopPurchase ?? ta.affection?.updateShopPurchase,
            updateGiftHistory: sa.affection.updateGiftHistory ?? ta.affection?.updateGiftHistory,
            recordTouch: sa.affection.recordTouch ?? ta.affection?.recordTouch,
            addDarkness: mergeArr(ta.affection?.addDarkness, sa.affection.addDarkness),
        };
    }

    if (sa.heroine) {
        ta.heroine = {
            setUpgradeLevels: mergeArr(ta.heroine?.setUpgradeLevels, sa.heroine.setUpgradeLevels),
        };
    }

    if (sa.gacha) {
        ta.gacha = {
            singlePull: sa.gacha.singlePull ?? ta.gacha?.singlePull,
            setResults: sa.gacha.setResults ?? ta.gacha?.setResults,
            markSsrOwned: mergeArr(ta.gacha?.markSsrOwned, sa.gacha.markSsrOwned),
            decrementFreePulls: ta.gacha?.decrementFreePulls || sa.gacha.decrementFreePulls || undefined,
            setLastFreePullDate: sa.gacha.setLastFreePullDate ?? ta.gacha?.setLastFreePullDate,
        };
    }

    if (sa.loop) {
        ta.loop = {
            syncLoopStatus: sa.loop.syncLoopStatus ?? ta.loop?.syncLoopStatus,
            incrementLoopIndex: sa.loop.incrementLoopIndex ?? ta.loop?.incrementLoopIndex,
            spendLoopTokens: sumOrUndef(ta.loop?.spendLoopTokens, sa.loop.spendLoopTokens),
            setMetaUpgradeLevel: sa.loop.setMetaUpgradeLevel ?? ta.loop?.setMetaUpgradeLevel,
            setControlLevel: sa.loop.setControlLevel ?? ta.loop?.setControlLevel,
            addNarrativeFlags: mergeArr(ta.loop?.addNarrativeFlags, sa.loop.addNarrativeFlags),
        };
    }

    if (sa.collection) {
        ta.collection = {
            resetLoopDiscoveries: ta.collection?.resetLoopDiscoveries || sa.collection.resetLoopDiscoveries || undefined,
            markChainCompleted: sa.collection.markChainCompleted ?? ta.collection?.markChainCompleted,
        };
    }

    if (sa.dailyOrders) {
        ta.dailyOrders = {
            rollNewOrders: ta.dailyOrders?.rollNewOrders || sa.dailyOrders.rollNewOrders || undefined,
            setFrozenOrders: sa.dailyOrders.setFrozenOrders ?? ta.dailyOrders?.setFrozenOrders,
            setActiveOrders: sa.dailyOrders.setActiveOrders ?? ta.dailyOrders?.setActiveOrders,
            setCompletedCount: sa.dailyOrders.setCompletedCount ?? ta.dailyOrders?.setCompletedCount,
            setLastRollDate: sa.dailyOrders.setLastRollDate ?? ta.dailyOrders?.setLastRollDate,
        };
    }

    if (sa.save) {
        ta.save = {
            saveAll: ta.save?.saveAll || sa.save.saveAll || undefined,
            saveMeta: ta.save?.saveMeta || sa.save.saveMeta || undefined,
        };
    }

    if (sa.ad) {
        ta.ad = {
            incrementCount: sa.ad.incrementCount ?? ta.ad?.incrementCount,
            setLastWatchTime: sa.ad.setLastWatchTime ?? ta.ad?.setLastWatchTime,
            resetCounts: ta.ad?.resetCounts || sa.ad.resetCounts || undefined,
            setResetDate: sa.ad.setResetDate ?? ta.ad?.setResetDate,
        };
    }

    if (sa.dailyBuff) {
        ta.dailyBuff = {
            setActiveBuffs: sa.dailyBuff.setActiveBuffs ?? ta.dailyBuff?.setActiveBuffs,
            setBuffFlags: sa.dailyBuff.setBuffFlags ?? ta.dailyBuff?.setBuffFlags,
            setPendingBuff: sa.dailyBuff.setPendingBuff !== undefined ? sa.dailyBuff.setPendingBuff : ta.dailyBuff?.setPendingBuff,
            setLastRollDate: sa.dailyBuff.setLastRollDate ?? ta.dailyBuff?.setLastRollDate,
        };
    }

    if (sa.boss) {
        ta.boss = {
            setCurrentLevelIdx: sa.boss.setCurrentLevelIdx ?? ta.boss?.setCurrentLevelIdx,
            setCurrentHp: sa.boss.setCurrentHp ?? ta.boss?.setCurrentHp,
            setTotalHp: sa.boss.setTotalHp ?? ta.boss?.setTotalHp,
            setBossName: sa.boss.setBossName ?? ta.boss?.setBossName,
            setBossAvatar: sa.boss.setBossAvatar ?? ta.boss?.setBossAvatar,
            setFsmState: sa.boss.setFsmState ?? ta.boss?.setFsmState,
            setOrders: sa.boss.setOrders ?? ta.boss?.setOrders,
            setCurrentOrderIdx: sa.boss.setCurrentOrderIdx ?? ta.boss?.setCurrentOrderIdx,
            setTimerRemaining: sa.boss.setTimerRemaining ?? ta.boss?.setTimerRemaining,
        };
    }

    if (sa.touch) {
        ta.touch = {
            setTouchCooldown: sa.touch.setTouchCooldown ?? ta.touch?.setTouchCooldown,
            incrementDailyTouchCount: sa.touch.incrementDailyTouchCount ?? ta.touch?.incrementDailyTouchCount,
        };
    }

    if (sa.narrative) {
        ta.narrative = {
            setCurrentSceneId: sa.narrative.setCurrentSceneId ?? ta.narrative?.setCurrentSceneId,
            setMode: sa.narrative.setMode ?? ta.narrative?.setMode,
            setPendingChoice: sa.narrative.setPendingChoice !== undefined ? sa.narrative.setPendingChoice : ta.narrative?.setPendingChoice,
        };
    }

    if (source.events) {
        target.events = [...(target.events ?? []), ...source.events];
    }

    if (source.ui?.toasts) {
        target.ui = { ...target.ui, toasts: [...(target.ui?.toasts ?? []), ...source.ui.toasts] };
    }

    if (source.ui?.closeSheets) {
        target.ui = { ...target.ui, closeSheets: [...(target.ui?.closeSheets ?? []), ...source.ui.closeSheets] };
    }
}
