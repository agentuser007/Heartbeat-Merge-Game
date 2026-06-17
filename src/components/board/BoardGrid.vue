<template>
  <div class="grid-container">
    <BossHeader />
    <div class="board-frame">
      <div class="board-frame-inner">
        <div id="game-grid" :style="gridStyle" :class="{ 'scissor-active': scissorActive, 'upgrade-active': upgradeActive }">
          <GridCell
            v-for="(cell, index) in boardStore.cells"
            :key="index"
            :index="index"
            :item-id="cell"
            :locked="boardStore.isLocked(index)"
            :selected="boardStore.selectedCell === index"
            :anim-state="animMap[index] || ''"
            @animation-end="onAnimationEnd"
            @pointerdown="onPointerDown(index, $event)"
            @pointermove="onPointerMove(index, $event)"
            @pointerup="onPointerUp"
          />
        </div>
      </div>
    </div>
    <ConfirmDialog
      :visible="unlockDialogVisible"
      :message="unlockDialogMessage"
      ok-text="解锁"
      cancel-text="取消"
      @confirm="onUnlockConfirm"
      @cancel="unlockDialogVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue';
import { useBoardStore } from '../../stores/boardStore';
import { useConfigStore } from '../../stores/configStore';
import { useCurrencyStore } from '../../stores/currencyStore';
import { useAudio } from '../../composables/useAudio';
import { useEffects } from '../../composables/useEffects';
import { globalBus } from '../../core/EventBus';
import BossHeader from './BossHeader.vue';
import GridCell from './GridCell.vue';
import ConfirmDialog from '../common/ConfirmDialog.vue';
import { useDrag } from '../../composables/useDrag';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSaveStore } from '../../stores/saveStore';
import { useI18nStore } from '../../stores/i18nStore';
import type { MergeResult } from '../../types/game';

const boardStore = useBoardStore();
const configStore = useConfigStore();
const currencyStore = useCurrencyStore();
const inventoryStore = useInventoryStore();
const saveStore = useSaveStore();
const i18nStore = useI18nStore();
const audio = useAudio();
const effects = useEffects();

const animMap: Record<number, string> = reactive({});

const unlockDialogVisible = ref(false);
const unlockDialogMessage = ref('');
const pendingUnlockIndex = ref<number | null>(null);

const scissorActive = computed(() => {
  return boardStore.scissorActive;
});

const upgradeActive = computed(() => {
  return boardStore.upgradeActive;
});

const gridStyle = computed(() => {
  return {
    gridTemplateColumns: `repeat(${configStore.gameConfig.BOARD_COLS || 7}, 1fr)`,
    gridTemplateRows: `repeat(${configStore.gameConfig.BOARD_ROWS || 9}, 1fr)`
  };
});

function getCellEl(index: number): HTMLElement | null {
  return document.querySelector(`.grid-cell[data-index="${index}"]`);
}

function onAnimationEnd(index: number) {
  delete animMap[index];
}

function onBoardMerged(data: { sourceIndex: number; targetIndex: number; result: MergeResult }) {
  if (!data) return;
  const { targetIndex } = data;
  animMap[targetIndex] = 'merge-pop';
  const cellEl = getCellEl(targetIndex);
  if (cellEl) effects.mergePopAt(cellEl);
  audio.playSound('merge');
}

function onBoardProduced(data: { generatorIndex: number; targetIndex: number; producedItemId: string }) {
  if (!data) return;
  const { generatorIndex, targetIndex } = data;
  animMap[targetIndex] = 'spawn-pop';
  animMap[generatorIndex] = 'gen-produce';
  const cellEl = getCellEl(targetIndex);
  if (cellEl) effects.spawnParticles(cellEl, 6, '✨');
  audio.playSound('pop');
}

function onBoardCellsUnlocked(data: { indices: number[] }) {
  if (!data || !data.indices) return;
  for (const idx of data.indices) {
    animMap[idx] = 'unlock-anim';
  }
}

function onBoardItemConsumed(data: { index: number; itemId: string }) {
  if (!data) return;
  const { index } = data;
  animMap[index] = 'merge-pop';
  const cellEl = getCellEl(index);
  if (cellEl) effects.mergePopAt(cellEl);
  audio.playSound('merge');
}

onMounted(() => {
  globalBus.on('board:merged', onBoardMerged);
  globalBus.on('board:produced', onBoardProduced);
  globalBus.on('board:cellsUnlocked', onBoardCellsUnlocked);
  globalBus.on('board:itemConsumed', onBoardItemConsumed);
});

onUnmounted(() => {
  globalBus.off('board:merged', onBoardMerged);
  globalBus.off('board:produced', onBoardProduced);
  globalBus.off('board:cellsUnlocked', onBoardCellsUnlocked);
  globalBus.off('board:itemConsumed', onBoardItemConsumed);
});

function showUnlockDialog(index: number) {
  const cost = boardStore.getUnlockCost();
  pendingUnlockIndex.value = index;
  unlockDialogMessage.value = `花费 ${cost} 💰 解锁此格子？`;
  unlockDialogVisible.value = true;
}

function onUnlockConfirm() {
  unlockDialogVisible.value = false;
  if (pendingUnlockIndex.value === null) return;

  const cost = boardStore.getUnlockCost();
  if (currencyStore.canAffordGold(cost)) {
    currencyStore.spendGold(cost);
    boardStore.unlockCells([pendingUnlockIndex.value]);
  }
  pendingUnlockIndex.value = null;
}

function isItemGenerator(index: number): boolean {
  const itemId = boardStore.getCell(index);
  if (!itemId) return false;
  const itemData = configStore.items[itemId];
  return itemData?.type === 'GENERATOR';
}

const { isDragging: _isDragging, dragSourceIndex: _dragSourceIndex, onPointerDown, onPointerMove, onPointerUp } = useDrag({
  threshold: 8,
  onDragStart: (_index, _event) => {
  },
  onDragMove: (_deltaX, _deltaY, _event) => {
  },
  onDragEnd: (fromIndex, toIndex) => {
    if (boardStore.isLocked(toIndex)) return;
    boardStore.merge(fromIndex, toIndex);
  },
  onDropOnBackpack: (fromIndex) => {
    const itemId = boardStore.getCell(fromIndex);
    if (!itemId) return;

    const itemData = configStore.items[itemId];
    if (!boardStore.canMoveToBackpack(itemData || {})) {
      effects.showToast(i18nStore.t('board.cannotMoveToBackpack') || '生成器不能移入背包', 'error');
      return;
    }

    inventoryStore.addItem(itemId, 1);
    boardStore.clearCell(fromIndex);
    boardStore.selectCell(null);
    saveStore.saveAll();

    const name = configStore.items[itemId]?.name || itemId;
    effects.showToast(i18nStore.t('inventory.gotItem', { name }) || `物品已存入背包`, 'info');
    audio.playSound('pop');
  },
  onTap: (index, _event) => {
    if (boardStore.isLocked(index)) {
      showUnlockDialog(index);
      return;
    }

    // Scissor splitting mode
    if (boardStore.scissorActive) {
      const result = boardStore.useScissorOnItem(index);
      if (result.success) {
        boardStore.scissorActive = false;
        inventoryStore.removeItem(configStore.itemEffects.toolItems.scissor, 1);
        if (result.secondItemToInventory) {
          inventoryStore.addItem(result.secondItemToInventory, 1);
          effects.showToast(i18nStore.t('inventory.scissorSplitToInventory') || '拆分成功，第二个物品已存入背包', 'info');
        } else {
          const itemId = boardStore.getCell(index);
          const name = configStore.items[itemId || '']?.name || '';
          effects.showToast(i18nStore.t('inventory.scissorSuccess', { name }) || `成功拆分物品`, 'info');
        }
        saveStore.saveAll();
        audio.playSound('merge');
      } else {
        effects.showToast(i18nStore.t('inventory.scissorFailNoSpace') || i18nStore.t('inventory.scissorFail' + result.reason) || `拆分失败`, 'error');
      }
      return;
    }

    // Upgrade card mode
    if (boardStore.upgradeActive) {
      const itemId = boardStore.getCell(index);
      if (!itemId) return;
      const itemData = configStore.items[itemId];
      if (itemData && itemData.nextId) {
        boardStore.placeItem(index, itemData.nextId);
        boardStore.upgradeActive = false;
        inventoryStore.removeItem('sr_upgrade_1', 1);
        saveStore.saveAll();
        
        const nextName = configStore.items[itemData.nextId]?.name || itemData.nextId;
        effects.showToast(i18nStore.t('inventory.upgradeSuccess', { oldName: itemData.name, newName: nextName }) || `升级成功`, 'info');
        audio.playSound('merge');
      } else {
        effects.showToast(i18nStore.t('inventory.itemNotUpgradable') || '该物品无法升级！', 'error');
      }
      return;
    }

    if (isItemGenerator(index)) {
      boardStore.selectCell(index);
      const result = boardStore.produceFromGenerator(index);
      if (!result.success) {
        if (result.reason === 'board_full') {
          effects.showToast(i18nStore.t('board.boardFull') || '棋盘已满，请先合成或回收物品！', 'error');
        } else if (result.reason === 'no_energy') {
          effects.showToast(i18nStore.t('board.noEnergy') || '体力不足', 'error');
        } else if (result.reason === 'cooldown') {
          effects.showToast(i18nStore.t('board.cooldown') || '生成器冷却中', 'error');
        }
      } else {
        saveStore.debouncedSave();
      }
      return;
    }
    
    const itemId = boardStore.getCell(index);
    const currentSelected = boardStore.selectedCell;
    if (currentSelected === null) {
      if (!itemId) return;
      boardStore.selectCell(index);
    } else if (currentSelected === index) {
      boardStore.selectCell(null);
    } else {
      boardStore.merge(currentSelected, index);
      boardStore.selectCell(null);
      saveStore.debouncedSave();
    }
  }
});
</script>

<style scoped>
.grid-container {
  position: relative;
  flex: 1;
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: visible;
  box-sizing: border-box;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  min-height: 0;

  /* Custom responsive cell size calculation */
  --avail-width: calc(100cqw - 12cqw);
  --avail-height: calc(100cqh - 135px - 180px - 110px - 8cqw);
  --cell-w: calc(var(--avail-width) / 7);
  --cell-h: calc((var(--avail-height) - 10px) / 9);
  --cell-size: clamp(36px, min(var(--cell-w), var(--cell-h)), 56px);
}

.board-frame {
  position: relative;
  width: 100cqw;
  flex: 1;
  flex-shrink: 0;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0 0 20px 20px;
  background: var(--grid-area-bg);
  box-shadow: var(--shadow-board-outer);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.board-frame::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(
    0deg,
    #E0B15A,
    rgba(255, 234, 195, 0.51) 49.04%,
    rgba(244, 186, 80, 0) 100%
  );
  pointer-events: none;
  z-index: 0;
}

.board-frame-inner {
  position: relative;
  width: calc(7 * var(--cell-size) + 1.5cqw + 7.4cqw + 8px);
  border-radius: 12px;
  background: var(--board-frame-bg);
  border: 2px solid var(--board-frame-border);
  box-sizing: border-box;
  padding: 2cqw 3.7cqw;
  z-index: 1;
  flex: 1;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

#game-grid {
  width: calc(7 * var(--cell-size) + 1.5cqw + 4px);
  height: calc(9 * var(--cell-size) + 2cqw + 4px);
  margin: auto;
  padding: 0;
  gap: 0.25cqw;
  border: 2px solid var(--board-border);
  border-radius: 6px;
  background: var(--board-bg);
  overflow: hidden;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: grid;
  aspect-ratio: auto;
  flex-shrink: 0;
}

#game-grid.scissor-active {
  outline: 3px solid var(--scissor-color);
  outline-offset: -3px;
}
@media (hover: hover) {
  #game-grid.scissor-active :deep(.grid-cell:not(.locked):hover) {
    background: rgba(156, 39, 176, 0.15);
    cursor: crosshair;
  }
}

#game-grid.upgrade-active {
  outline: 3px solid var(--color-reward);
  outline-offset: -3px;
}
@media (hover: hover) {
  #game-grid.upgrade-active :deep(.grid-cell:not(.locked):hover) {
    background: rgba(255, 152, 0, 0.15);
    cursor: pointer;
  }
}

@media (max-height: 760px) {
  .grid-container {
    padding: 0 0px;
    --avail-height: calc(100cqh - 85px - 115px - 74px - 8cqw);
  }
}
</style>
