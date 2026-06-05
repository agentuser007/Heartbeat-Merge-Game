<template>
  <div class="grid-container">
    <BossHeader />
    <div class="board-frame">
      <div class="board-frame-inner">
        <div id="game-grid" :style="gridStyle" :class="{ 'scissor-active': scissorActive }">
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

const boardStore = useBoardStore();
const configStore = useConfigStore();
const currencyStore = useCurrencyStore();
const audio = useAudio();
const effects = useEffects();

const animMap: Record<number, string> = reactive({});

const unlockDialogVisible = ref(false);
const unlockDialogMessage = ref('');
const pendingUnlockIndex = ref<number | null>(null);

const scissorActive = computed(() => {
  return false;
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

function onBoardMerged(data: any) {
  if (!data) return;
  const { targetIndex } = data;
  animMap[targetIndex] = 'merge-pop';
  const cellEl = getCellEl(targetIndex);
  if (cellEl) effects.mergePopAt(cellEl);
  audio.playSound('merge');
}

function onBoardProduced(data: any) {
  if (!data) return;
  const { generatorIndex, targetIndex } = data;
  animMap[targetIndex] = 'spawn-pop';
  animMap[generatorIndex] = 'gen-produce';
  const cellEl = getCellEl(targetIndex);
  if (cellEl) effects.spawnParticles(cellEl, 6, '✨');
  audio.playSound('pop');
}

function onBoardCellsUnlocked(data: any) {
  if (!data || !data.indices) return;
  for (const idx of data.indices) {
    animMap[idx] = 'unlock-anim';
  }
}

function onBoardItemConsumed(data: any) {
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
  } else {
    console.log('Not enough gold to unlock');
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
  onDragStart: (index, _event) => {
    console.log('Drag started from cell:', index);
  },
  onDragMove: (deltaX, deltaY, _event) => {
    console.log('Dragging with delta:', deltaX, deltaY);
  },
  onDragEnd: (fromIndex, toIndex) => {
    if (boardStore.isLocked(toIndex)) return;
    boardStore.merge(fromIndex, toIndex);
  },
  onTap: (index, _event) => {
    if (boardStore.isLocked(index)) {
      showUnlockDialog(index);
      return;
    }

    if (isItemGenerator(index)) {
      boardStore.produceFromGenerator(index);
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
    }
  }
});
</script>

<style scoped>
.grid-container {
  position: relative;
  flex: 1;
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
}

.board-frame {
  position: relative;
  width: 100cqw;
  height: auto;
  max-width: none;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0 0 20px 20px;
  background: var(--grid-area-bg);
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.41);
  overflow: hidden;
  display: block;
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
  margin: 2cqw 1.2cqw;
  border-radius: 12px;
  background: var(--board-frame-bg);
  border: 2px solid var(--board-frame-border);
  box-sizing: border-box;
  padding: 2cqw 3.7cqw;
  z-index: 1;
}

#game-grid {
  width: 100%;
  height: auto;
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
}

#game-grid.scissor-active {
  outline: 3px solid var(--scissor-color);
  outline-offset: -3px;
}
#game-grid.scissor-active :deep(.grid-cell:not(.locked):hover) {
  background: rgba(156, 39, 176, 0.15);
  cursor: crosshair;
}

@media (max-height: 760px) {
  .grid-container { padding: 0 2px; }
}
</style>
