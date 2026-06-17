// ============================================================
// BoardService.ts — Pure board business logic (Service layer)
// ============================================================
// No Vue dependency (no ref/computed/reactive).
// All functions are pure — deps injected as plain objects.
// Store calls these and applies mutations + emits events.
import type { ItemData as BoardItemData } from '../logic/BoardLogic';
import type { GameItem, BoardSnapshot, GeneratorConfig, LoopStatus, DailyOrderState } from '../types/game';
import type { ResolveResult } from './ServiceResultTypes';
import type { OrderData } from '../logic/BossLogic';
import type { MergeResult } from '../logic/BoardLogic';

// --- 1a: Pure query function deps ---

export interface FindEmptyCellDeps {
    cells: (string | null)[];
    locked: Set<number>;
    cols: number;
    rows: number;
}

export interface FindItemDeps {
    cells: (string | null)[];
    itemId: string;
}

export interface FindAllItemsDeps {
    cells: (string | null)[];
    itemId: string;
}

export interface GetCellDeps {
    cells: (string | null)[];
    index: number;
}

export interface IsLockedDeps {
    locked: Set<number>;
    index: number;
}

export interface GetRecycleEnergyDeps {
    itemId: string;
    items: Record<string, BoardItemData>;
    recycleEnergyTable: Record<string, number>;
}

export interface GetUnlockCostDeps {
    cellUnlockCosts: number[];
    cellsUnlocked: number;
}

export interface CanMoveToBackpackDeps {
    item: { type?: string };
}

export interface IsArchivedDeps {
    boardRegistry: Map<number, BoardSnapshot>;
    loopIndex: number;
}

export interface HasActiveGeneratorDeps {
    cells: (string | null)[];
    items: Record<string, BoardItemData>;
}

export interface FindRandomNonGeneratorItemsDeps {
    cells: (string | null)[];
    items: Record<string, BoardItemData>;
    count: number;
    random: () => number;
}

export interface FindAllItemsByLevelDeps {
    cells: (string | null)[];
    items: Record<string, BoardItemData>;
    level: number;
}

// --- 1b: Orchestrator function deps ---

export interface IsNeededByActiveOrderDeps {
    itemId: string;
    cells: (string | null)[];
    bossOrders: OrderData[];
    dailyActiveOrders: DailyOrderState[];
}

export interface CanMergeDeps {
    cells: (string | null)[];
    locked: Set<number>;
    items: Record<string, BoardItemData>;
    sourceIndex: number;
    targetIndex: number;
    bossOrders: OrderData[];
    dailyActiveOrders: DailyOrderState[];
}

export interface CanSellItemDeps {
    cells: (string | null)[];
    items: Record<string, BoardItemData>;
    index: number;
    bossOrders: OrderData[];
    dailyActiveOrders: DailyOrderState[];
}

// --- 1d: GameView extraction deps ---

export interface CalculateSellPriceDeps {
    item: { sellPrice?: number } | null;
    sellPriceUpActive: boolean;
    sellPriceBoost: number;
}

export interface GetMergeChainDeps {
    item: { chain?: string; type?: string } | null;
    items: Record<string, GameItem>;
}

export interface GetGeneratorInfoDeps {
    item: { chain?: string; type?: string; level?: number } | null;
    items: Record<string, GameItem>;
    generators: Record<string, GeneratorConfig>;
}

export interface ExecuteSellDeps {
    cellIndex: number;
    cells: (string | null)[];
    items: Record<string, BoardItemData>;
    recycleEnergyTable: Record<string, number>;
    sellPriceUpActive: boolean;
    sellPriceBoost: number;
    recycleBonus: number;
    bossOrders: OrderData[];
    dailyActiveOrders: DailyOrderState[];
}

export interface ResolvePlaceItemDeps {
    index: number;
    itemId: string;
}

export interface ResolveClearCellDeps {
    index: number;
    itemId: string | null;
}

// --- 1c-ii: Hybrid split — produceFromGenerator ---

export interface ResolveProductionDeps {
    generatorIndex: number;
    generatorItemId: string;
    isFreeProduction: boolean;
    energyCost: number;
    currentEnergy: number;
    energyDiscountActive: boolean;
    energyDiscountFreeChance: number;
    genSpeedUpActive: boolean;
    perfumeBoostActive: boolean;
    perfumeBoostChains: string[];
    doubleGenTurns: number;
    items: Record<string, BoardItemData>;
    rollDrop: (genItemId: string) => string | null;
    findTargetCell: (genIndex: number, excludeIndex?: number) => number;
    random: () => number;
}

export interface ResolveProductionOutput {
    result: ResolveResult;
    ui: { success: boolean; reason?: string };
}

// --- 1c-iii: Hybrid split — merge ---

export interface ResolveMergeDeps {
    sourceIndex: number;
    targetIndex: number;
    sourceId: string | null;
    targetId: string | null;
    items: Record<string, BoardItemData>;
    luckyMergeActive: boolean;
    luckyMergeChance: number;
    mergeBonusActive: boolean;
    mergeResult: MergeResult | 'move' | 'swap' | null;
    findEmptyCell: () => number;
    random: () => number;
}

export interface ResolveRerollDeps {
    cells: (string | null)[];
    items: Record<string, BoardItemData>;
    count: number;
    chainItemPrefix: Record<string, string>;
    random: () => number;
}

export interface ResolveRerollOutput {
    result: ResolveResult;
    ui: { rerolledCount: number };
}

export interface ResolveMergeOutput {
    result: ResolveResult;
    ui: { mergeResult: MergeResult | 'move' | 'swap' | null };
}

import { fisherYatesShuffle } from '../utils/shuffle';

// ============================================================
// BoardService — namespace object with pure functions
// ============================================================

export const BoardService = {
    // ---- 1a: Pure query functions ----

    findEmptyCell(deps: FindEmptyCellDeps): number {
        const { cells, locked, cols, rows } = deps;
        const c = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
        const idx: number[] = [];
        for (let i = 0; i < cells.length; i++) idx.push(i);
        idx.sort((a, b) => Math.abs(a - c) - Math.abs(b - c));
        for (const i of idx) {
            if (!locked.has(i) && cells[i] === null) return i;
        }
        return -1;
    },

    findItem(deps: FindItemDeps): number {
        const { cells, itemId } = deps;
        for (let i = 0; i < cells.length; i++) {
            if (cells[i] === itemId) return i;
        }
        return -1;
    },

    findAllItems(deps: FindAllItemsDeps): number[] {
        const { cells, itemId } = deps;
        const r: number[] = [];
        for (let i = 0; i < cells.length; i++) {
            if (cells[i] === itemId) r.push(i);
        }
        return r;
    },

    getCell(deps: GetCellDeps): string | null {
        const { cells, index } = deps;
        if (index < 0 || index >= cells.length) return null;
        return cells[index] ?? null;
    },

    isLocked(deps: IsLockedDeps): boolean {
        return deps.locked.has(deps.index);
    },

    getRecycleEnergy(deps: GetRecycleEnergyDeps): number {
        const { itemId, items, recycleEnergyTable } = deps;
        const itemData = items[itemId];
        if (!itemData) return 0;
        const level = itemData.level;
        if (recycleEnergyTable && typeof recycleEnergyTable === 'object') {
            const table = recycleEnergyTable as Record<string, number>;
            if (table[level] !== undefined) return table[level];
        }
        return 0;
    },

    getUnlockCost(deps: GetUnlockCostDeps): number {
        const { cellUnlockCosts, cellsUnlocked } = deps;
        if (!cellUnlockCosts || cellUnlockCosts.length === 0) return 0;
        const idx = Math.min(cellsUnlocked, cellUnlockCosts.length - 1);
        return cellUnlockCosts[idx];
    },

    canMoveToBackpack(deps: CanMoveToBackpackDeps): boolean {
        return deps.item.type !== 'GENERATOR';
    },

    isArchived(deps: IsArchivedDeps): boolean {
        const snapshot = deps.boardRegistry.get(deps.loopIndex);
        return snapshot?.cells === null;
    },

    hasActiveGenerator(deps: HasActiveGeneratorDeps): boolean {
        const { cells, items } = deps;
        for (let i = 0; i < cells.length; i++) {
            const cellId = cells[i];
            if (cellId && items[cellId] && items[cellId].type === 'GENERATOR') {
                return true;
            }
        }
        return false;
    },

    findRandomNonGeneratorItems(deps: FindRandomNonGeneratorItemsDeps): number[] {
        const { cells, items, count, random } = deps;
        const nonGenIndices: number[] = [];
        for (let i = 0; i < cells.length; i++) {
            const cellId = cells[i];
            if (cellId && items[cellId] && items[cellId].type !== 'GENERATOR') {
                nonGenIndices.push(i);
            }
        }
        const shuffled = fisherYatesShuffle(nonGenIndices, random);
        return shuffled.slice(0, count);
    },

    findAllItemsByLevel(deps: FindAllItemsByLevelDeps): number[] {
        const { cells, items, level } = deps;
        const result: number[] = [];
        for (let i = 0; i < cells.length; i++) {
            const cellId = cells[i];
            if (cellId && items[cellId] && items[cellId].level === level) {
                result.push(i);
            }
        }
        return result;
    },

    // ---- 1b: Orchestrator functions ----

    isNeededByActiveOrder(deps: IsNeededByActiveOrderDeps): boolean {
        const { itemId, cells, bossOrders, dailyActiveOrders } = deps;
        const boardCount = BoardService.findAllItems({ cells, itemId });
        let requiredTotal = 0;
        if (bossOrders.length > 0 && bossOrders[0]?.required) {
            for (const req of bossOrders[0].required) {
                if (req.itemId === itemId) requiredTotal += req.count;
            }
        }
        for (const order of dailyActiveOrders) {
            if (order.fulfilled) continue;
            for (const req of order.required) {
                if (req.itemId === itemId) requiredTotal += req.count;
            }
        }
        return requiredTotal > 0 && boardCount.length <= requiredTotal;
    },

    canMerge(deps: CanMergeDeps): boolean {
        const { cells, locked, items, sourceIndex, targetIndex, bossOrders, dailyActiveOrders } = deps;
        const sId = cells[sourceIndex];
        const tId = cells[targetIndex];
        if (!sId || !tId) return false;
        if (sId !== tId) return false;
        if (locked.has(sourceIndex) || locked.has(targetIndex)) return false;
        const itemData = items[sId];
        if (!itemData) return false;
        if (BoardService.isNeededByActiveOrder({ itemId: sId, cells, bossOrders, dailyActiveOrders })) return false;
        if (BoardService.isNeededByActiveOrder({ itemId: tId, cells, bossOrders, dailyActiveOrders })) return false;
        return true;
    },

    canSellItem(deps: CanSellItemDeps): boolean {
        const { cells, items, index, bossOrders, dailyActiveOrders } = deps;
        const itemId = cells[index];
        if (!itemId) return false;
        const itemData = items[itemId];
        if (!itemData) return false;
        if (itemData.sellable === false) return false;
        if (itemData.type === 'GENERATOR') return false;
        if (BoardService.isNeededByActiveOrder({ itemId, cells, bossOrders, dailyActiveOrders })) return false;
        return true;
    },

    // ---- 1d: GameView extractions ----

    calculateSellPrice(deps: CalculateSellPriceDeps): number {
        const { item, sellPriceUpActive, sellPriceBoost } = deps;
        if (!item) return 0;
        let sellPrice = item.sellPrice ?? 0;
        if (sellPriceUpActive && sellPrice > 0) {
            sellPrice = Math.ceil(sellPrice * sellPriceBoost);
        }
        return sellPrice;
    },

    getMergeChain(deps: GetMergeChainDeps): GameItem[] {
        const { item, items } = deps;
        if (!item || !item.chain) return [];
        const chain = item.chain;
        const isGen = item.type === 'GENERATOR';
        return Object.values(items)
            .filter((i: GameItem) => i.chain === chain && (isGen ? i.type === 'GENERATOR' : !i.type))
            .sort((a: GameItem, b: GameItem) => a.level - b.level);
    },

    getGeneratorInfo(deps: GetGeneratorInfoDeps): { chainEmojis: string[]; freeProductionChance: number; capacity: number } | null {
        const { item, items, generators } = deps;
        if (!item || item.type !== 'GENERATOR' || !item.chain) return null;
        const chain = item.chain;
        const genData = generators[chain];
        if (!genData) return null;
        const level = String(item.level);
        const levelData = genData.levels?.[level];
        const chainEmojis = (genData.chains || []).map((c: string) => {
            const firstItem = Object.values(items).find(
                (i: GameItem) => i.chain === c && !i.type && i.level === 1
            );
            return firstItem?.emoji || '❓';
        });
        return {
            chainEmojis,
            freeProductionChance: levelData?.free_production_chance || 0,
            capacity: levelData?.capacity || 0,
        };
    },

    executeSell(deps: ExecuteSellDeps): ResolveResult | null {
        const { cellIndex, cells, items, recycleEnergyTable, sellPriceUpActive, sellPriceBoost, recycleBonus, bossOrders, dailyActiveOrders } = deps;

        if (!BoardService.canSellItem({ cells, items, index: cellIndex, bossOrders, dailyActiveOrders })) {
            return null;
        }

        const itemId = cells[cellIndex];
        if (!itemId) return null;

        const itemData = items[itemId];
        if (!itemData) return null;

        const gold = BoardService.calculateSellPrice({ item: itemData, sellPriceUpActive, sellPriceBoost });
        const baseRecycleEnergy = BoardService.getRecycleEnergy({ itemId, items, recycleEnergyTable });
        const energy = baseRecycleEnergy + recycleBonus;

        return {
            applyTo: {
                currency: { addGold: gold },
                energy: { add: energy },
                board: { clearCells: [cellIndex] },
            },
            events: [{
                name: 'board:sold',
                data: { cellIndex, itemId, gold, energy }
            }],
        };
    },

    // ---- 1c-i: Hybrid split — placeItem / clearCell ----

    resolvePlaceItem(deps: ResolvePlaceItemDeps): ResolveResult {
        const { index, itemId } = deps;
        return {
            applyTo: {
                board: {
                    placeItems: [{ cellIndex: index, itemId, initGenerator: true }],
                },
            },
            events: [{ name: 'board:itemPlaced', data: { index, itemId } }],
        };
    },

    resolveClearCell(deps: ResolveClearCellDeps): ResolveResult | null {
        const { index, itemId } = deps;
        if (!itemId) return null;
        return {
            applyTo: {
                board: {
                    clearCells: [index],
                },
            },
            events: [{ name: 'board:itemConsumed', data: { index, itemId } }],
        };
    },

    // ---- 1c-ii: Hybrid split — produceFromGenerator ----

    resolveProduction(deps: ResolveProductionDeps): ResolveProductionOutput {
        const {
            generatorIndex, generatorItemId, isFreeProduction, energyCost,
            currentEnergy, energyDiscountActive, genSpeedUpActive, perfumeBoostActive,
            perfumeBoostChains, doubleGenTurns, items, rollDrop, findTargetCell,
        } = deps;

        const fail = (reason: string): ResolveProductionOutput => ({
            result: { applyTo: {} },
            ui: { success: false, reason },
        });

        const targetIndex = findTargetCell(generatorIndex);
        if (targetIndex === -1) return fail('board_full');

        let energySpend = 0;
        if (!isFreeProduction) {
            let discountFree = false;
            if (energyDiscountActive) {
                discountFree = deps.random() < deps.energyDiscountFreeChance;
            }
            if (!discountFree) {
                if (currentEnergy < energyCost) return fail('no_energy');
                energySpend = energyCost;
            }
        }

        let producedId = rollDrop(generatorItemId);
        if (!producedId) return fail('drop_failed');

        if (perfumeBoostActive) {
            const producedData = items[producedId];
            if (producedData && perfumeBoostChains.includes(producedData.chain) && producedData.nextId) {
                producedId = producedData.nextId;
            }
        }

        const placeItems: Array<{ cellIndex: number; itemId: string; initGenerator?: boolean }> = [{ cellIndex: targetIndex, itemId: producedId, initGenerator: true }];
        const events: Array<{ name: string; data: unknown }> = [];
        let decrementDoubleGenTurns: number | undefined;

        if (genSpeedUpActive) {
            const secondId = rollDrop(generatorItemId);
            if (secondId) {
                let finalSecondId = secondId;
                if (perfumeBoostActive) {
                    const secondData = items[secondId];
                    if (secondData && perfumeBoostChains.includes(secondData.chain) && secondData.nextId) {
                        finalSecondId = secondData.nextId;
                    }
                }
                const secondTarget = findTargetCell(generatorIndex, targetIndex);
                if (secondTarget !== -1) {
                    placeItems.push({ cellIndex: secondTarget, itemId: finalSecondId, initGenerator: true });
                } else {
                    events.push({ name: 'toast:show', data: { message: '棋盘已满，额外产物未生成', type: 'error' } });
                }
            }
        }

        if (doubleGenTurns > 0) {
            const extraId = rollDrop(generatorItemId);
            if (extraId) {
                let finalExtraId = extraId;
                if (perfumeBoostActive) {
                    const extraData = items[extraId];
                    if (extraData && perfumeBoostChains.includes(extraData.chain) && extraData.nextId) {
                        finalExtraId = extraData.nextId;
                    }
                }
                const extraTarget = findTargetCell(generatorIndex, targetIndex);
                if (extraTarget !== -1) {
                    placeItems.push({ cellIndex: extraTarget, itemId: finalExtraId, initGenerator: true });
                } else {
                    events.push({ name: 'toast:show', data: { message: '棋盘已满，双倍产出未生成', type: 'error' } });
                }
            }
            decrementDoubleGenTurns = 1;
        }

        events.push({ name: 'board:produced', data: { generatorIndex, targetIndex, producedItemId: producedId } });

        return {
            result: {
                applyTo: {
                    energy: energySpend > 0 ? { spend: energySpend } : undefined,
                    board: {
                        placeItems,
                        incrementGeneratorClicks: { index: generatorIndex },
                        ...(decrementDoubleGenTurns ? { decrementDoubleGenTurns } : {}),
                    },
                },
                events,
            },
            ui: { success: true },
        };
    },

    // ---- 1c-iii: Hybrid split — merge ----

    resolveMerge(deps: ResolveMergeDeps): ResolveMergeOutput {
        const {
            sourceIndex, targetIndex, sourceId, targetId,
            items, luckyMergeActive, mergeBonusActive, mergeResult, findEmptyCell,
        } = deps;

        const placeItems: Array<{ cellIndex: number; itemId: string; initGenerator?: boolean }> = [];
        const events: Array<{ name: string; data: unknown }> = [];

        if (sourceId && targetId && sourceId === targetId && items[sourceId] && !items[sourceId].nextId) {
            events.push({ name: 'toast:show', data: { message: '已满级，无法合成', type: 'info' } });
        }

        if (mergeResult && typeof mergeResult === 'object' && (mergeResult.action === 'merge' || mergeResult.action === 'joker')) {
            let nextId = mergeResult.nextId;

            // Lucky merge: upgrade one further tier. setCells overwrites target cell
            // with the lucky-upgraded ID. tryMergeOrSwap already set target to nextId,
            // so applyResolveResult's _setCell will overwrite with the lucky ID — expected.
            if (nextId && luckyMergeActive && deps.random() < deps.luckyMergeChance) {
                const nextData = items[nextId];
                if (nextData && nextData.nextId) {
                    nextId = nextData.nextId;
                    placeItems.push({ cellIndex: targetIndex, itemId: nextId, initGenerator: true });
                }
            }

            if (mergeBonusActive && nextId) {
                const emptyIdx = findEmptyCell();
                if (emptyIdx !== -1) {
                    placeItems.push({ cellIndex: emptyIdx, itemId: nextId, initGenerator: true });
                } else {
                    events.push({ name: 'toast:show', data: { message: '棋盘已满，额外产物未生成', type: 'error' } });
                }
            }

            const mergedResult = { ...mergeResult };
            if (nextId !== mergeResult.nextId) mergedResult.nextId = nextId;
            events.push({ name: 'board:merged', data: { sourceIndex, targetIndex, result: mergedResult } });
        }

        return {
            result: {
                applyTo: placeItems.length > 0 ? { board: { placeItems } } : {},
                events,
            },
            ui: { mergeResult },
        };
    },

    // --- resolveRestoreBoard ---
    // Returns cross-store mutations for board restore (loopStatus, frozenOrders)

    resolveRestoreBoard(snapshot: { frozenDailyOrders?: DailyOrderState[] | null; status?: LoopStatus } | undefined, loopIdx: number): ResolveResult {
        if (!snapshot) return { applyTo: {} };

        const result: ResolveResult = { applyTo: {} };

        if (snapshot.status) {
            result.applyTo.loop = { syncLoopStatus: snapshot.status };
        }

        if (snapshot.frozenDailyOrders !== undefined) {
            result.applyTo.dailyOrders = { setFrozenOrders: snapshot.frozenDailyOrders };
        } else {
            result.applyTo.dailyOrders = { setFrozenOrders: null };
        }

        result.events = [{ name: 'board:switched', data: { loopIndex: loopIdx, status: snapshot.status } }];

        return result;
    },

    // --- resolveOfflineProduction ---
    // Returns inventory items produced offline

    resolveReroll(deps: ResolveRerollDeps): ResolveRerollOutput {
        const { cells, items, count, chainItemPrefix, random } = deps;
        const nonGenIndices: number[] = [];
        for (let i = 0; i < cells.length; i++) {
            const cellId = cells[i];
            if (cellId && items[cellId] && items[cellId].type !== 'GENERATOR') {
                nonGenIndices.push(i);
            }
        }
        const shuffled = fisherYatesShuffle(nonGenIndices, random);
        const toReroll = shuffled.slice(0, count);
        const placeItems: Array<{ cellIndex: number; itemId: string }> = [];
        const chains = Object.keys(chainItemPrefix);

        for (const idx of toReroll) {
            const oldItemId = cells[idx];
            if (!oldItemId || !items[oldItemId]) continue;
            const oldLevel = items[oldItemId].level;
            if (chains.length > 0) {
                const randomChain = chains[Math.floor(random() * chains.length)];
                const prefix = chainItemPrefix[randomChain];
                if (prefix) {
                    const newId = `${prefix}_${oldLevel}`;
                    if (items[newId]) {
                        placeItems.push({ cellIndex: idx, itemId: newId });
                    }
                }
            }
        }

        return {
            result: {
                applyTo: placeItems.length > 0 ? { board: { placeItems } } : {},
            },
            ui: { rerolledCount: toReroll.length },
        };
    },

    // === Daily Systems ===

    resolveOfflineProduction(producedItems: Array<{ itemId: string; count: number }>): ResolveResult {
        if (!producedItems || producedItems.length === 0) return { applyTo: {} };
        return {
            applyTo: {
                inventory: { addItems: producedItems },
            },
        };
    },
};
