// ============================================================
// boardStore.ts — Board Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { BoardLogic, ItemData as BoardItemData } from '../logic/BoardLogic';
import { useConfigStore } from './configStore';
import type { GameItem } from '../types/game';
import type { BoardSerializedData } from '../types/serialize';
import { useEnergyStore } from './energyStore';
import { useDailyBuffStore } from './dailyBuffStore';
import { useLoopStore } from './loopStore';
import { useBossStore } from './bossStore';
import { useDailyOrderStore, type DailyOrderState } from './dailyOrderStore';
import { BoardService } from '../services/BoardService';
import type { ResolveResult } from '../services/ServiceResultTypes';


import { OfflineProductionManager } from '../features/OfflineProductionManager';
import type { BoardSnapshot, MapNode, LoopStatus } from '../types/game';
export type { BoardSnapshot, MapNode, LoopStatus };


// Helper function to convert config item data to board logic item data
function convertItemData(configItems: Record<string, GameItem>): Record<string, BoardItemData> {
    const boardItems: Record<string, BoardItemData> = {};
    for (const [id, item] of Object.entries(configItems)) {
        boardItems[id] = {
            id: item.id,
            name: item.name,
            level: item.level,
            chain: item.chain,
            nextId: item.nextId || null,
            sellPrice: item.sellPrice ?? 0,
            emoji: item.emoji,
            color: item.color || '#ffffff',
            type: item.type,
            sellable: item.sellable
        };
    }
    return boardItems;
}

const convertCache = new Map<string, Record<string, BoardItemData>>();
function getCachedConvertedItems(items: Record<string, GameItem>): Record<string, BoardItemData> {
    const cacheKey = Object.keys(items).join(',');
    if (convertCache.has(cacheKey)) return convertCache.get(cacheKey)!;
    const converted = convertItemData(items);
    convertCache.set(cacheKey, converted);
    return converted;
}
function invalidateConvertCache() {
    convertCache.clear();
}

export const useBoardStore = defineStore('board', () => {
    // --- State ---
    const cells = ref<(string | null)[]>([]);
    const locked = ref<Set<number>>(new Set());
    const generatorStates = ref<Record<number, any>>({});
    const selectedCell = ref<number | null>(null);
    const selectedInfoItemId = ref<string | null>(null);
    const cols = ref(0);
    const rows = ref(0);
    const cellsUnlocked = ref(0);
    const scissorActive = ref(false);
    const upgradeActive = ref(false);
    const doubleGenTurns = ref(0);

    // --- Multi-board state ---
    const boardRegistry = ref<Map<number, BoardSnapshot>>(new Map());
    const activeBoardLoop = ref(1);

    // --- Logic instance ---
    const logic = new BoardLogic(0, 0);

    // NOTE: useConfigStore() is called at the top level of this defineStore setup.
    // This creates an init order dependency — Pinia must be installed before this store is first accessed.
    // In practice this is safe because stores are first accessed after app.mount(), but restructuring
    // to use a lazy getter would remove this dependency if needed.
    const configStore = useConfigStore();
    cols.value = configStore.gameConfig.BOARD_COLS || 7;
    rows.value = configStore.gameConfig.BOARD_ROWS || 9;
    
    // Reinitialize logic with proper dimensions
    // BoardLogic has no reset() method, so Object.assign is used to reinitialize
    Object.assign(logic, new BoardLogic(cols.value, rows.value, configStore.lockedCellsInitial));

    // Sync initial state
    cells.value = [...logic.cells];
    locked.value = new Set(logic.locked);
    generatorStates.value = { ...logic.generatorStates };
    cellsUnlocked.value = logic.cellsUnlocked;

    // --- Computed ---
    const totalCells = computed(() => cols.value * rows.value);
    const hasEmptySpace = computed(() => cells.value.some((c, i) => (c === null || c === undefined) && !locked.value.has(i)));

    // --- Actions ---
    function initGrid() {
        invalidateConvertCache();
        // Initialize grid with proper dimensions
        logic.cols = cols.value;
        logic.rows = rows.value;
        
        // Reinitialize cells array
        logic.cells = new Array(logic.cols * logic.rows).fill(null);
        cells.value = [...logic.cells];
        
        // Reset locked cells based on config
        logic.locked = new Set(configStore.lockedCellsInitial);
        locked.value = new Set(logic.locked);
        
        // Reset other state
        logic.generatorStates = {};
        generatorStates.value = { ...logic.generatorStates };
        logic.cellsUnlocked = 0;
        cellsUnlocked.value = 0;
    }

    function placeItem(index: number, itemId: string) {
        const result = BoardService.resolvePlaceItem({ index, itemId });
        _setCell(index, itemId);
        if (result.applyTo.board?.placeItems?.some(p => p.initGenerator)) {
            _initGeneratorState(index, itemId);
        }
        if (result.events) {
            for (const e of result.events) globalBus.emit(e.name, e.data);
        }
    }

    function merge(sourceIndex: number, targetIndex: number) {
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators;

        const sId = logic.getCell(sourceIndex);
        const tId = logic.getCell(targetIndex);

        const mergeLogicResult = logic.tryMergeOrSwap(sourceIndex, targetIndex, items, generators);

        cells.value[sourceIndex] = logic.getCell(sourceIndex);
        cells.value[targetIndex] = logic.getCell(targetIndex);
        generatorStates.value = { ...logic.generatorStates };

        const dailyBuffStore = useDailyBuffStore();
        const output = BoardService.resolveMerge({
            sourceIndex, targetIndex,
            sourceId: sId, targetId: tId,
            items,
            luckyMergeActive: dailyBuffStore.hasBuff('lucky_merge'),
            luckyMergeChance: configStore.boardEconomy.luckyMergeChance,
            mergeBonusActive: dailyBuffStore.hasBuff('merge_bonus'),
            mergeResult: mergeLogicResult,
            findEmptyCell: () => logic.findEmptyCell(),
            random: Math.random,
        });

        if (output.result.applyTo.board?.placeItems) {
            for (const p of output.result.applyTo.board.placeItems) {
                _setCell(p.cellIndex, p.itemId);
            }
            for (const p of output.result.applyTo.board.placeItems) {
                if (p.initGenerator) {
                    _initGeneratorState(p.cellIndex, p.itemId);
                }
            }
        }

        if (output.result.events) {
            for (const e of output.result.events) globalBus.emit(e.name, e.data);
        }

        return mergeLogicResult;
    }

    function renderAll() {
        // In the store, we just ensure reactivity is maintained
        cells.value = [...logic.cells];
        generatorStates.value = { ...logic.generatorStates };
    }

    function placeInitialGenerators() {
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators;
        logic.placeInitialGenerators(items, generators);
        
        // Sync state
        cells.value = [...logic.cells];
        generatorStates.value = { ...logic.generatorStates };

        // Discover initial generators in collection
        for (let i = 0; i < logic.cells.length; i++) {
            const cellId = logic.cells[i];
            if (cellId) {
                globalBus.emit('board:itemPlaced', { index: i, itemId: cellId });
            }
        }
    }

    function selectCell(index: number | null) {
        selectedCell.value = index;
        if (index !== null) selectedInfoItemId.value = null;
    }

    function selectInfoItem(itemId: string | null) {
        selectedInfoItemId.value = itemId;
        if (itemId !== null) selectedCell.value = null;
    }

    function unlockCells(indices: number[]) {
        const events = logic.unlockCells(indices);
        
        locked.value = new Set(logic.locked);
        cellsUnlocked.value = logic.cellsUnlocked;

        for (const event of events) {
            globalBus.emit(event.type, event.payload);
        }
    }

    function findEmptyCell(): number {
        return BoardService.findEmptyCell({ cells: cells.value, locked: locked.value, cols: cols.value, rows: rows.value });
    }

    function findItem(itemId: string): number {
        return BoardService.findItem({ cells: cells.value, itemId });
    }

    function findAllItems(itemId: string): number[] {
        return BoardService.findAllItems({ cells: cells.value, itemId });
    }

    function clearCell(index: number) {
        const itemId = logic.getCell(index);
        const result = BoardService.resolveClearCell({ index, itemId });
        logic.clearCell(index);
        cells.value = [...logic.cells];
        if (result?.events) {
            for (const e of result.events) globalBus.emit(e.name, e.data);
        }
    }

    function getCell(index: number): string | null {
        return BoardService.getCell({ cells: cells.value, index });
    }

    function isLocked(index: number): boolean {
        return BoardService.isLocked({ locked: locked.value, index });
    }

    function canMerge(sourceIndex: number, targetIndex: number): boolean {
        const items = getCachedConvertedItems(configStore.items);
        const bossStore = useBossStore();
        const dailyOrderStore = useDailyOrderStore();
        return BoardService.canMerge({
            cells: cells.value,
            locked: locked.value,
            items,
            sourceIndex,
            targetIndex,
            bossOrders: bossStore.orders,
            dailyActiveOrders: dailyOrderStore.activeOrders,
        });
    }

    function useScissorOnItem(index: number) {
        const items = getCachedConvertedItems(configStore.items);
        const result = logic.useScissorOnItem(index, items);
        
        // Sync state if successful
        if (result.success) {
            cells.value = [...logic.cells];
            generatorStates.value = { ...logic.generatorStates };
        }
        
        return result;
    }

    function getRecycleEnergy(index: number): number {
        const items = getCachedConvertedItems(configStore.items);
        const itemId = logic.getCell(index);
        if (!itemId) return 0;
        return BoardService.getRecycleEnergy({ itemId, items, recycleEnergyTable: configStore.recycleEnergyTable });
    }

    function canSellItem(index: number): boolean {
        const items = getCachedConvertedItems(configStore.items);
        const bossStore = useBossStore();
        const dailyOrderStore = useDailyOrderStore();
        return BoardService.canSellItem({
            cells: cells.value,
            items,
            index,
            bossOrders: bossStore.orders,
            dailyActiveOrders: dailyOrderStore.activeOrders,
        });
    }

    function executeSell(cellIndex: number, sellPriceUpActive: boolean, recycleBonus: number): ResolveResult | null {
        const items = getCachedConvertedItems(configStore.items);
        const bossStore = useBossStore();
        const dailyOrderStore = useDailyOrderStore();
        return BoardService.executeSell({
            cellIndex,
            cells: cells.value,
            items,
            recycleEnergyTable: configStore.recycleEnergyTable,
            sellPriceUpActive,
            sellPriceBoost: configStore.boardEconomy.sellPriceBoost,
            recycleBonus,
            bossOrders: bossStore.orders,
            dailyActiveOrders: dailyOrderStore.activeOrders,
        });
    }

    function produceFromGenerator(index: number): { success: boolean; reason?: string } {
        const itemId = logic.getCell(index);
        if (!itemId) return { success: false, reason: 'empty' };

        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators;
        const itemData = items[itemId];
        if (!itemData || itemData.type !== 'GENERATOR') return { success: false, reason: 'not_generator' };

        if (logic.isGeneratorCoolingDown(index)) return { success: false, reason: 'cooldown' };

        const genState = logic.generatorStates[index];
        if (genState && genState.maxClicks > 0 && genState.currentClicks >= genState.maxClicks) {
            return { success: false, reason: 'cooldown' };
        }

        const isFree = logic.isFreeProduction(itemId, items, generators, { random: Math.random });
        const energyCost = configStore.gameConfig.ENERGY_COST_PER_SPAWN;
        const energyStore = useEnergyStore();
        const dailyBuffStore = useDailyBuffStore();
        const loopStore = useLoopStore();

        const output = BoardService.resolveProduction({
            generatorIndex: index,
            generatorItemId: itemId,
            isFreeProduction: isFree,
            energyCost,
            currentEnergy: energyStore.current,
            energyDiscountActive: dailyBuffStore.hasBuff('energy_discount'),
            energyDiscountFreeChance: configStore.boardEconomy.energyDiscountFreeChance,
            genSpeedUpActive: dailyBuffStore.hasBuff('gen_speed_up'),
            perfumeBoostActive: loopStore.hasRule('perfumeBoost'),
            perfumeBoostChains: configStore.boardEconomy.perfumeBoostChains,
            doubleGenTurns: doubleGenTurns.value,
            items,
            rollDrop: (genId: string) => logic.rollGeneratorDrop(genId, items, generators, { random: Math.random }),
            findTargetCell: (genIdx: number, excludeIdx?: number) => {
                const adj = logic.findAdjacentEmptyCells(genIdx);
                if (adj.length > 0) {
                    if (excludeIdx !== undefined) {
                        const found = adj.find((e: number) => e !== excludeIdx && logic.getCell(e) === null);
                        if (found !== undefined) return found;
                    } else {
                        return adj[0];
                    }
                }
                return logic.findEmptyCell();
            },
            random: Math.random,
        });

        if (!output.ui.success) return { success: false, reason: output.ui.reason };

        const rr = output.result;
        if (rr.applyTo.energy?.spend) energyStore.spend(rr.applyTo.energy.spend);
        if (rr.applyTo.board?.placeItems) {
            for (const p of rr.applyTo.board.placeItems) _setCell(p.cellIndex, p.itemId);
            for (const p of rr.applyTo.board.placeItems) {
                if (p.initGenerator) _initGeneratorState(p.cellIndex, p.itemId);
            }
        }
        if (rr.applyTo.board?.incrementGeneratorClicks) {
            _incrementGeneratorClicks(rr.applyTo.board.incrementGeneratorClicks.index);
        }
        if (rr.applyTo.board?.decrementDoubleGenTurns) {
            for (let i = 0; i < rr.applyTo.board.decrementDoubleGenTurns; i++) decrementDoubleGenTurns();
        }
        if (rr.events) {
            for (const e of rr.events) globalBus.emit(e.name, e.data);
        }

        return { success: true };
    }

    function getUnlockCost(): number {
        return BoardService.getUnlockCost({ cellUnlockCosts: configStore.cellUnlockCosts, cellsUnlocked: cellsUnlocked.value });
    }

    function resetAllGenerators() {
        for (const key of Object.keys(generatorStates.value)) {
            const idx = parseInt(key);
            logic.resetGeneratorAfterCooldown(idx);
            if (logic.generatorStates[idx]) {
                logic.generatorStates[idx].currentClicks = 0;
            }
        }
        generatorStates.value = { ...logic.generatorStates };
    }

    // --- Item effect helper methods ---

    /**
     * Activate double generator output for a given number of turns.
     */
    function activateDoubleGen(turns: number): void {
        doubleGenTurns.value = turns;
    }

    /**
     * Decrement double gen turns counter. Called after each generator production.
     */
    function decrementDoubleGenTurns(): void {
        if (doubleGenTurns.value > 0) {
            doubleGenTurns.value--;
        }
    }

    function _setCell(index: number, id: string): void {
        logic.setCell(index, id);
        cells.value = [...logic.cells];
    }

    function _initGeneratorState(index: number, itemId: string): void {
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators;
        logic.initGeneratorState(index, itemId, items, generators);
        generatorStates.value = { ...logic.generatorStates };
    }

    function _incrementGeneratorClicks(index: number): void {
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators;
        logic.incrementGeneratorClicks(index, items, generators);
        generatorStates.value = { ...logic.generatorStates };
    }

    /**
     * Find indices of `count` random non-generator items on the board.
     * Used by the `reroll` effect.
     */
    function findRandomNonGeneratorItems(count: number): number[] {
        const items = getCachedConvertedItems(configStore.items);
        return BoardService.findRandomNonGeneratorItems({ cells: cells.value, items, count, random: Math.random });
    }

    /**
     * Find indices of all items with the given level on the board.
     * Used by `clear_lv1` and `space_clean` effects.
     */
    function findAllItemsByLevel(level: number): number[] {
        const items = getCachedConvertedItems(configStore.items);
        return BoardService.findAllItemsByLevel({ cells: cells.value, items, level });
    }

    /**
     * Check if any generator exists on the board.
     * Used by `double_gen` effect to verify applicability.
     */
    function hasActiveGenerator(): boolean {
        const items = getCachedConvertedItems(configStore.items);
        return BoardService.hasActiveGenerator({ cells: cells.value, items });
    }

    /**
     * Reroll N random non-generator board items — replace each with
     * a random item of the same level from a random chain.
     * Returns the actual number of items rerolled.
     */
    function rerollItems(count: number, itemsData: Record<string, any>): number {
        const output = BoardService.resolveReroll({
            cells: cells.value,
            items: itemsData,
            count,
            chainItemPrefix: configStore.chainItemPrefix || {},
            random: Math.random,
        });
        if (output.result.applyTo.board?.placeItems) {
            for (const p of output.result.applyTo.board.placeItems) {
                _setCell(p.cellIndex, p.itemId);
            }
        }
        return output.ui.rerolledCount;
    }

    // --- Multi-board methods ---

    function snapshotCurrentBoard(
        loopIdx: number,
        status: LoopStatus,
        rankTitle: string,
        characterId: string,
        frozenDailyOrders?: DailyOrderState[] | null
    ): void {
        const snapshot: BoardSnapshot = {
            loopIndex: loopIdx,
            status,
            cells: [...cells.value],
            locked: Array.from(locked.value),
            generatorStates: { ...generatorStates.value },
            cellsUnlocked: cellsUnlocked.value,
            frozenDailyOrders: frozenDailyOrders ?? null,
            rankTitle,
            characterId,
            completedAt: status === 'completed' ? Date.now() : undefined
        };
        boardRegistry.value.set(loopIdx, snapshot);
    }

    function restoreBoard(loopIdx: number): { success: boolean; resolveResult: ResolveResult } {
        const snapshot = boardRegistry.value.get(loopIdx);
        if (!snapshot) return { success: false, resolveResult: { applyTo: {} } };
        if (snapshot.cells === null) return { success: false, resolveResult: { applyTo: {} } };

        const expectedLen = cols.value * rows.value;

        const loopStore = useLoopStore();
        const dailyOrderStore = useDailyOrderStore();

        // Save current board to registry before switching (use live state, not stale snapshot)
        const currentSnapshot = boardRegistry.value.get(activeBoardLoop.value);
        if (currentSnapshot && currentSnapshot.cells !== null) {
            snapshotCurrentBoard(
                activeBoardLoop.value,
                loopStore.loopStatus,
                loopStore.getLoopTitle(loopStore.loopIndex),
                currentSnapshot.characterId,
                dailyOrderStore.frozenOrders
            );
        }

        // Restore snapshot to workspace
        let cellsData = snapshot.cells;
        if (cellsData.length !== expectedLen) {
            if (cellsData.length > expectedLen) {
                cellsData = cellsData.slice(0, expectedLen);
            } else {
                cellsData = [...cellsData, ...new Array(expectedLen - cellsData.length).fill(null)];
            }
        }
        const items = getCachedConvertedItems(configStore.items);
        cellsData = cellsData.map((c: string | null) => {
            if (c === null || c === undefined) return null;
            return items[c] !== undefined ? c : null;
        });

        cells.value = cellsData;
        locked.value = new Set(snapshot.locked || []);
        generatorStates.value = snapshot.generatorStates ? { ...snapshot.generatorStates } : {};
        cellsUnlocked.value = snapshot.cellsUnlocked || 0;

        // Sync to logic
        logic.cells = [...cells.value];
        logic.locked = new Set(locked.value);
        logic.generatorStates = { ...generatorStates.value };
        logic.cellsUnlocked = cellsUnlocked.value;

        activeBoardLoop.value = loopIdx;

        const restoreResult = BoardService.resolveRestoreBoard(snapshot, loopIdx);

        return { success: true, resolveResult: restoreResult };
    }

    function getMapNodes(): MapNode[] {
        const nodes: MapNode[] = [];
        const loopStore = useLoopStore();
        const latestLoop = loopStore.loopIndex;

        for (let i = 1; i <= latestLoop; i++) {
            const snap = boardRegistry.value.get(i);
            if (snap) {
                nodes.push({
                    loopIndex: snap.loopIndex,
                    status: snap.status,
                    rankTitle: snap.rankTitle,
                    characterId: snap.characterId,
                    completedAt: snap.completedAt
                });
            }
        }
        return nodes.sort((a, b) => a.loopIndex - b.loopIndex);
    }

    function canMoveToBackpack(item: { type?: string }): boolean {
        return BoardService.canMoveToBackpack({ item });
    }

    function isArchived(loopIdx: number): boolean {
        return BoardService.isArchived({ boardRegistry: boardRegistry.value, loopIndex: loopIdx });
    }

    // --- Serialization ---
    function serialize() {
        return {
            cells: [...cells.value],
            locked: Array.from(locked.value),
            generatorStates: { ...generatorStates.value },
            cellsUnlocked: cellsUnlocked.value,
            doubleGenTurns: doubleGenTurns.value,
            boardRegistry: Array.from(boardRegistry.value.entries()),
            activeBoardLoop: activeBoardLoop.value
        };
    }

    function calculateOfflineProduction(savedTimestamp: number): { itemCount: number; resolveResult: ResolveResult } {
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators;

        const producedItems: Array<{ itemId: string; count: number }> = [];
        const result = OfflineProductionManager.calculateProduction(savedTimestamp, {
            generatorStates: generatorStates.value,
            cells: cells.value,
            cols: cols.value,
            rows: rows.value,
            items,
            generators,
            addItem: (itemId: string, count: number) => {
                producedItems.push({ itemId, count });
            },
        });

        const offlineResult = BoardService.resolveOfflineProduction(producedItems);
        return { ...result, resolveResult: offlineResult };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as BoardSerializedData;
        
        const expectedLen = cols.value * rows.value;
        let cellsData = d.cells || new Array(expectedLen).fill(null);
        if (cellsData.length !== expectedLen) {
            if (cellsData.length > expectedLen) {
                cellsData = cellsData.slice(0, expectedLen);
            } else {
                cellsData = [...cellsData, ...new Array(expectedLen - cellsData.length).fill(null)];
            }
        }
        const items = getCachedConvertedItems(configStore.items);
        cellsData = cellsData.map((c: string | null) => {
            if (c === null || c === undefined) return null;
            return items[c] !== undefined ? c : null;
        });
        
        cells.value = cellsData;
        locked.value = new Set(d.locked || []);
        generatorStates.value = d.generatorStates || {};
        cellsUnlocked.value = d.cellsUnlocked || 0;
        doubleGenTurns.value = d.doubleGenTurns || 0;

        // Multi-board data
        if (d.boardRegistry) {
            boardRegistry.value = new Map(d.boardRegistry);
        }
        if (d.activeBoardLoop !== undefined) {
            activeBoardLoop.value = d.activeBoardLoop;
        }
        
        // Sync to logic
        logic.cells = [...cells.value];
        logic.locked = new Set(locked.value);
        logic.generatorStates = { ...generatorStates.value };
        logic.cellsUnlocked = cellsUnlocked.value;

        // Process offline cooldowns and fix missing maxClicks
        const generators = configStore.generators;
        logic.processOfflineCooldown(items, generators);
        generatorStates.value = { ...logic.generatorStates };
    }

    return {
        // State
        cells,
        locked,
        generatorStates,
        selectedCell,
        selectedInfoItemId,
        cols,
        rows,
        cellsUnlocked,
        scissorActive,
        upgradeActive,
        doubleGenTurns,
        boardRegistry,
        activeBoardLoop,
        
        // Computed
        totalCells,
        hasEmptySpace,
        
        // Actions
        initGrid,
        placeItem,
        merge,
        renderAll,
        placeInitialGenerators,
        selectCell,
        selectInfoItem,
        unlockCells,
        findEmptyCell,
        findItem,
        findAllItems,
        clearCell,
        getCell,
        isLocked,
        canMerge,
        useScissorOnItem,
        getRecycleEnergy,
        canSellItem,
        executeSell,
        produceFromGenerator,
        getUnlockCost,
        resetAllGenerators,
        activateDoubleGen,
        decrementDoubleGenTurns,
        _setCell,
        _initGeneratorState,
        _incrementGeneratorClicks,
        findRandomNonGeneratorItems,
        findAllItemsByLevel,
        hasActiveGenerator,
        rerollItems,
        snapshotCurrentBoard,
        restoreBoard,
        getMapNodes,
        canMoveToBackpack,
        isArchived,
        
        // Serialization
        serialize,
        deserialize,
        calculateOfflineProduction
    };
});