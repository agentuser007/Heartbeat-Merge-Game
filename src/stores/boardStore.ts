// ============================================================
// boardStore.ts — Board Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { BoardLogic, ItemData as BoardItemData, GeneratorConfig } from '../logic/BoardLogic';
import { useConfigStore, ItemData as ConfigItemData } from './configStore';
import { useEnergyStore } from './energyStore';
import { useDailyBuffStore } from './dailyBuffStore';
import { useLoopStore } from './loopStore';

// Helper function to convert config item data to board logic item data
function convertItemData(configItems: Record<string, ConfigItemData>): Record<string, BoardItemData> {
    const boardItems: Record<string, BoardItemData> = {};
    for (const [id, item] of Object.entries(configItems)) {
        boardItems[id] = {
            id: item.id,
            name: item.name,
            level: item.level,
            chain: item.chain,
            nextId: item.nextId || null,
            sellPrice: item.sellPrice || item.value || 0,
            emoji: item.emoji,
            color: item.color || '#ffffff',
            type: item.type
        };
    }
    return boardItems;
}

const convertCache = new Map<string, Record<string, BoardItemData>>();
function getCachedConvertedItems(items: Record<string, ConfigItemData>): Record<string, BoardItemData> {
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
    const cols = ref(0);
    const rows = ref(0);
    const cellsUnlocked = ref(0);

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

    // --- Subscribe to logic events ---
    globalBus.on('board:cellsUnlocked', (data) => {
        if (data && data.indices) {
            cellsUnlocked.value += data.indices.length;
            // Update locked set
            for (const idx of data.indices) {
                locked.value.delete(idx);
            }
        }
    });

    // --- Computed ---
    const totalCells = computed(() => cols.value * rows.value);
    const hasEmptySpace = computed(() => cells.value.some(c => c === null || c === undefined));

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
        logic.setCell(index, itemId);
        cells.value[index] = itemId;
        
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators as unknown as Record<string, GeneratorConfig>;
        logic.initGeneratorState(index, itemId, items, generators);
        generatorStates.value = { ...logic.generatorStates };
    }

    function merge(sourceIndex: number, targetIndex: number) {
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators as unknown as Record<string, GeneratorConfig>;
        const result = logic.tryMergeOrSwap(sourceIndex, targetIndex, items, generators);
        
        // Update reactive state
        cells.value[sourceIndex] = logic.getCell(sourceIndex);
        cells.value[targetIndex] = logic.getCell(targetIndex);
        
        // Update generator states
        generatorStates.value = { ...logic.generatorStates };
        
        if (result && typeof result === 'object' && (result.action === 'merge' || result.action === 'joker')) {
            globalBus.emit('board:merged', { sourceIndex, targetIndex, result });
        }
        
        return result;
    }

    function renderAll() {
        // In the store, we just ensure reactivity is maintained
        cells.value = [...logic.cells];
        generatorStates.value = { ...logic.generatorStates };
    }

    function placeInitialGenerators() {
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators as unknown as Record<string, GeneratorConfig>;
        logic.placeInitialGenerators(items, generators);
        
        // Sync state
        cells.value = [...logic.cells];
        generatorStates.value = { ...logic.generatorStates };
    }

    function selectCell(index: number | null) {
        selectedCell.value = index;
    }

    function unlockCells(indices: number[]) {
        logic.unlockCells(indices);
        
        // Sync state
        locked.value = new Set(logic.locked);
        cellsUnlocked.value = logic.cellsUnlocked;
    }

    function findEmptyCell(): number {
        return logic.findEmptyCell();
    }

    function findItem(itemId: string): number {
        return logic.findItem(itemId);
    }

    function findAllItems(itemId: string): number[] {
        return logic.findAllItems(itemId);
    }

    function clearCell(index: number) {
        const itemId = logic.getCell(index);
        logic.clearCell(index);
        cells.value[index] = null;
        if (itemId) {
            globalBus.emit('board:itemConsumed', { index, itemId });
        }
    }

    function getCell(index: number): string | null {
        return logic.getCell(index);
    }

    function isLocked(index: number): boolean {
        return logic.isLocked(index);
    }

    function canMerge(sourceIndex: number, targetIndex: number): boolean {
        const items = getCachedConvertedItems(configStore.items);
        return logic.canMerge(sourceIndex, targetIndex, items);
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
        const recycleEnergyTable = configStore.recycleEnergyTable;
        return logic.getRecycleEnergy(index, items, recycleEnergyTable);
    }

    function canSellItem(index: number): boolean {
        const items = getCachedConvertedItems(configStore.items);
        return logic.canSellItem(index, items);
    }

    function produceFromGenerator(index: number): { success: boolean; producedItemId?: string; targetIndex?: number; reason?: string } {
        const itemId = logic.getCell(index);
        if (!itemId) return { success: false, reason: 'empty' };

        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators as unknown as Record<string, GeneratorConfig>;
        const itemData = items[itemId];
        if (!itemData || itemData.type !== 'GENERATOR') return { success: false, reason: 'not_generator' };

        if (logic.isGeneratorCoolingDown(index)) return { success: false, reason: 'cooldown' };

        const isFree = logic.isFreeProduction(itemId, items, generators);
        const energyCost = configStore.gameConfig.ENERGY_COST_PER_SPAWN || 1;

        const adjEmpty = logic.findAdjacentEmptyCells(index);
        const targetIndex = adjEmpty.length > 0 ? adjEmpty[0] : logic.findEmptyCell();
        if (targetIndex === -1) return { success: false, reason: 'board_full' };

        if (!isFree) {
            const energyStore = useEnergyStore();
            const dailyBuffStore = useDailyBuffStore();
            let cost = energyCost;
            if (dailyBuffStore.hasBuff('energy_discount')) {
                cost = Math.max(1, Math.ceil(cost * 0.5));
            }
            if (!energyStore.spend(cost)) return { success: false, reason: 'no_energy' };
        }

        let producedId = logic.rollGeneratorDrop(itemId, items, generators);
        if (!producedId) return { success: false, reason: 'drop_failed' };

        const loopStore = useLoopStore();
        if (loopStore.hasRule('perfumeBoost')) {
            const producedData = items[producedId];
            if (producedData && (producedData.chain === 'perfume' || producedData.chain === 'lips') && producedData.nextId) {
                producedId = producedData.nextId;
            }
        }

        logic.setCell(targetIndex, producedId);
        logic.initGeneratorState(targetIndex, producedId, items, generators);
        logic.incrementGeneratorClicks(index, items, generators);

        cells.value = [...logic.cells];
        generatorStates.value = { ...logic.generatorStates };

        globalBus.emit('board:produced', { generatorIndex: index, targetIndex, producedItemId: producedId });

        return { success: true, producedItemId: producedId, targetIndex };
    }

    function getUnlockCost(): number {
        return logic.getUnlockCost(configStore.cellUnlockCosts);
    }

    // --- Serialization ---
    function serialize() {
        return {
            cells: [...cells.value],
            locked: Array.from(locked.value),
            generatorStates: { ...generatorStates.value },
            cellsUnlocked: cellsUnlocked.value
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        cells.value = data.cells || new Array(cols.value * rows.value).fill(null);
        locked.value = new Set(data.locked || []);
        generatorStates.value = data.generatorStates || {};
        cellsUnlocked.value = data.cellsUnlocked || 0;
        
        // Sync to logic
        logic.cells = [...cells.value];
        logic.locked = new Set(locked.value);
        logic.generatorStates = { ...generatorStates.value };
        logic.cellsUnlocked = cellsUnlocked.value;

        // Process offline cooldowns and fix missing maxClicks
        const items = getCachedConvertedItems(configStore.items);
        const generators = configStore.generators as unknown as Record<string, GeneratorConfig>;
        logic.processOfflineCooldown(items, generators);
        generatorStates.value = { ...logic.generatorStates };
    }

    return {
        // State
        cells,
        locked,
        generatorStates,
        selectedCell,
        cols,
        rows,
        cellsUnlocked,
        
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
        produceFromGenerator,
        getUnlockCost,
        
        // Serialization
        serialize,
        deserialize
    };
});