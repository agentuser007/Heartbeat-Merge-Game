<template>
  <div
    class="grid-cell"
    :class="cellClasses"
    :data-index="index"
    @animationend="onAnimationEnd"
  >
    <BoardItem v-if="itemId && !locked" :item-id="itemId" :cell-index="index" />
    <div v-if="locked" class="cell-lock">🔒</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BoardItem from './BoardItem.vue';
import { useConfigStore } from '../../stores/configStore';

interface Props {
  index: number;
  itemId: string | null;
  locked: boolean;
  selected: boolean;
  animState?: string;
}

const props = withDefaults(defineProps<Props>(), {
  animState: ''
});

const emit = defineEmits<{
  animationEnd: [index: number];
}>();

const configStore = useConfigStore();

const gridCols = computed(() => configStore.gameConfig.BOARD_COLS || 7);

const cellClasses = computed(() => {
  const classes = [];
  
  const row = Math.floor(props.index / gridCols.value);
  const col = props.index % gridCols.value;
  if ((row + col) % 2 === 1) {
    classes.push('cell-alt');
  }
  
  if (props.locked) {
    classes.push('locked');
  }

  if (props.selected) {
    classes.push('selected');
  }

  if (props.animState) {
    classes.push(props.animState);
  }
  
  return classes;
});

function onAnimationEnd() {
  if (props.animState) {
    emit('animationEnd', props.index);
  }
}
</script>

<style scoped>
.grid-cell {
  aspect-ratio: 1;
  width: auto;
  min-width: 0;
  min-height: 0;
  border: none;
  border-radius: 4px;
  background: var(--cell-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: transform var(--transition-fast), background var(--transition-fast);
  box-sizing: border-box;
  overflow: hidden;
}

.grid-cell.cell-alt {
  background: var(--cell-bg-alt);
}

.grid-cell.selected {
  border: 2px solid var(--accent-pink) !important;
}

.grid-cell.cell-highlight {
  background: var(--cell-highlight) !important;
  border-color: #5BC3D0 !important;
}

.grid-cell.order-match {
  background: var(--cell-highlight) !important;
  border-color: #5BC3D0 !important;
}

.grid-cell .merge-badge {
  position: absolute;
  top: -0.5cqw;
  right: -0.5cqw;
  width: 5.22cqw;
  height: 5.22cqw;
  border-radius: 50%;
  background: var(--color-success);
  color: var(--text-inverse);
  font-size: 3.23cqw;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  z-index: 5;
  border: 1px solid var(--surface-muted);
}

.grid-cell .item-count {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--caramel);
  color: var(--text-inverse);
  font-size: 8px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 8px;
  white-space: nowrap;
  z-index: 5;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.grid-cell:active {
  transform: scale(0.92);
}

.grid-cell.locked {
  background: var(--locked-bg);
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
}
.grid-cell.locked.cell-alt {
  background: rgba(0, 0, 0, 0.2);
}
.grid-cell.locked .cell-lock {
  font-size: 14px;
  opacity: 0.6;
  filter: grayscale(0.5);
}
.grid-cell.locked:hover .cell-lock,
.grid-cell.locked:active .cell-lock {
  opacity: 0.9;
  filter: grayscale(0);
}
.grid-cell.locked:hover {
  border-color: var(--accent-pink);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3), 0 0 8px rgba(243, 86, 131, 0.3);
}

.grid-cell.dragging {
  opacity: 0.4;
  transform: scale(0.85);
}
.grid-cell.drop-target {
  border-color: var(--accent-pink);
  background: rgba(243, 86, 131, 0.15);
  box-shadow: 0 0 12px rgba(243, 86, 131, 0.3);
}

.grid-cell.merge-pop {
  animation: merge-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.grid-cell.spawn-pop {
  animation: spawn-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.grid-cell.unlock-anim {
  animation: unlock-glow 0.6s ease;
}
.grid-cell.gen-produce {
  animation: gen-produce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
