<template>
  <div class="item" :class="itemClasses" :data-level="itemData?.level" :data-chain="itemData?.chain">
    <span class="item-emoji">{{ itemData?.emoji }}</span>
    <span v-if="itemData?.type === 'GENERATOR'" class="gen-timer">{{ timerText }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useConfigStore } from '../../stores/configStore';
import { useBoardStore } from '../../stores/boardStore';
// ItemData type is used via configStore.items — type inferred at usage

// Props
interface Props {
  itemId: string;
  cellIndex: number;
}

const props = defineProps<Props>();

// Import stores
const configStore = useConfigStore();
const boardStore = useBoardStore();

// Get item data from config store
const itemData = computed(() => {
  return configStore.items[props.itemId] || null;
});



// Computed classes based on item type
const itemClasses = computed(() => {
  const classes: string[] = [];
  
  if (!itemData.value) return classes;
  
  // Add type-specific classes
  if (itemData.value.type === 'GENERATOR') {
    classes.push('generator');
  }
  if (itemData.value.type === 'JOKER') {
    classes.push('joker-item');
  }
  if (itemData.value.type === 'SCISSOR') {
    classes.push('scissor-item');
  }
  if (itemData.value.type === 'ENERGY_POTION') {
    classes.push('energy-potion-item');
  }
  
  return classes;
});

const now = ref(Date.now());
let intervalId: number | null = null;

const generatorState = computed(() => boardStore.generatorStates[props.cellIndex] || null);
const cooldownUntil = computed(() => generatorState.value?.cooldownUntil || 0);

watch(cooldownUntil, (newVal) => {
  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  if (newVal > Date.now()) {
    now.value = Date.now();
    intervalId = window.setInterval(() => {
      now.value = Date.now();
      if (now.value >= newVal) {
        window.clearInterval(intervalId!);
        intervalId = null;
      }
    }, 1000);
  }
}, { immediate: true });

onUnmounted(() => {
  if (intervalId) {
    window.clearInterval(intervalId);
  }
});

// Generator timer text
const timerText = computed(() => {
  if (!itemData.value || itemData.value.type !== 'GENERATOR') {
    return '';
  }
  
  if (cooldownUntil.value <= now.value) {
    return '';
  }
  
  const remaining = Math.max(0, Math.ceil((cooldownUntil.value - now.value) / 1000));
  return `${remaining}s`;
});
</script>

<style scoped>
/* ===== Item inside cell ===== */
.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
}

.item-emoji {
  font-size: 7.96cqw;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: transform var(--transition-fast);
  line-height: 1;
}

.item:active .item-emoji {
  transform: scale(0.94);
}

/* ===== Generator visual (glowing border) ===== */
.item.generator {
  border: 2px solid rgba(255, 215, 0, 0.5);
  border-radius: 10px;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.25);
  animation: generator-breathe 2.5s ease-in-out infinite;
}
.item.generator .item-emoji {
  font-size: 6.2cqw;
  filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.4));
}

/* ===== Joker item ===== */
.item.joker-item {
  animation: joker-glow 1.5s ease-in-out infinite;
  border: 2px solid var(--rarity-ssr);
  border-radius: 8px;
}

/* ===== Scissor item ===== */
.item.scissor-item {
  border: 2px solid var(--scissor-color);
  border-radius: 8px;
}

/* ===== Energy potion item ===== */
.item.energy-potion-item {
  border: 2px solid var(--color-success);
  border-radius: 8px;
  animation: energy-potion-pulse 1.5s ease-in-out infinite;
  cursor: pointer;
}

/* ===== Generator timer ===== */
.gen-timer {
  font-size: 8px;
  color: var(--text-light);
  background: rgba(0,0,0,0.1);
  padding: 1px 3px;
  border-radius: 3px;
}

/* ===== Drag ghost ===== */
.drag-ghost {
  position: fixed;
  font-size: 36px;
  pointer-events: none;
  z-index: 500;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
  transition: none;
}
</style>
