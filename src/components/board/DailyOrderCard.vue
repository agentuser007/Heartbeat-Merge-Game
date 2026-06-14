<template>
  <div class="daily-order-card quest-card" :class="{ ready: canFulfill }" @click="openOrderDetails">
    <!-- Reward bubble floating above -->
    <div class="order-reward-bubble">
      <template v-if="order.reward">
        <div v-if="order.reward.gold" class="reward-row">
          <span class="reward-icon">💰</span>
          <span class="reward-amount">+{{ order.reward.gold }}</span>
        </div>
        <div v-if="order.reward.diamonds" class="reward-row">
          <span class="reward-icon">💎</span>
          <span class="reward-amount">+{{ order.reward.diamonds }}</span>
        </div>
        <div v-if="order.reward.energy" class="reward-row">
          <span class="reward-icon">⚡</span>
          <span class="reward-amount">+{{ order.reward.energy }}</span>
        </div>
      </template>
      <div v-else class="reward-row">
        <span class="reward-icon">💰</span>
        <span class="reward-amount">+{{ order.goldReward || 10 }}</span>
      </div>
    </div>

    <!-- NPC Avatar Silhouette -->
    <div class="daily-npc-avatar daily-npc-silhouette" :style="avatarStyle" />

    <!-- Card Body -->
    <div class="order-body">
      <div class="order-body-portrait"></div>
      <div class="order-header">
        <div class="daily-npc-tag-pill">
          <span class="daily-npc-tag-text">Daily</span>
        </div>
        <div class="hp-bar-mini">
          <div class="hp-bar-mini-fill" :style="progressStyle" />
        </div>
      </div>
      
      <div class="order-required-items">
        <div 
          v-for="(slot, idx) in expandedRequiredSlots" 
          :key="idx" 
          class="order-item-slot"
          :class="{ fulfilled: slot.fulfilled }"
        >
          <span class="slot-emoji">{{ slot.emoji }}</span>
        </div>
      </div>
      
      <button class="fulfill-order-btn" :disabled="!canFulfill" @click.stop="onFulfill">提交</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '../../stores/configStore';
import { useDailyOrderStore } from '../../stores/dailyOrderStore';
import { useBoardStore } from '../../stores/boardStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSaveStore } from '../../stores/saveStore';

import { useSheet } from '../../composables/useSheet';
import type { DailyOrderState } from '../../stores/dailyOrderStore';
import type { OrderRequirement } from '../../types/game';

interface OrderSlot {
  itemId: string;
  emoji: string;
  fulfilled: boolean;
}

interface Props {
  order: DailyOrderState;
}

const props = defineProps<Props>();

const configStore = useConfigStore();
const dailyOrderStore = useDailyOrderStore();
const boardStore = useBoardStore();
const inventoryStore = useInventoryStore();
const saveStore = useSaveStore();
const dailyOrderSheet = useSheet('daily-sheet');

const avatarStyle = computed(() => {
  if (!props.order?.npcAvatar) return {};
  return {
    backgroundImage: `url('${props.order.npcAvatar}')`,
    backgroundSize: 'contain',
    backgroundPosition: 'bottom center',
    backgroundRepeat: 'no-repeat'
  };
});

const progressStyle = computed(() => {
  if (!props.order?.required) return { width: '0%' };
  const total = props.order.required.length;
  const fulfilled = props.order.required.filter((req: OrderRequirement) => isItemFulfilled(req)).length;
  return { width: `${(fulfilled / total) * 100}%` };
});

const getItemEmoji = (itemId: string) => {
  const item = configStore.items[itemId];
  return item?.emoji || '❓';
};

const isItemFulfilled = (req: OrderRequirement) => {
  const boardCount = boardStore.findAllItems(req.itemId).length;
  const backpackCount = inventoryStore.slots[req.itemId] || 0;
  return boardCount + backpackCount >= req.count;
};

const expandedRequiredSlots = computed(() => {
  if (!props.order?.required) return [];
  const slots: OrderSlot[] = [];
  props.order.required.forEach((req: OrderRequirement) => {
    const ownedCells = boardStore.findAllItems(req.itemId);
    const backpackCount = inventoryStore.slots[req.itemId] || 0;
    const totalOwned = ownedCells.length + backpackCount;
    for (let i = 0; i < req.count; i++) {
      slots.push({
        itemId: req.itemId,
        emoji: getItemEmoji(req.itemId),
        fulfilled: i < totalOwned
      });
    }
  });
  return slots;
});

const canFulfill = computed(() => {
  if (!props.order?.required) return false;
  for (const req of props.order.required) {
    const boardCount = boardStore.findAllItems(req.itemId).length;
    const backpackCount = inventoryStore.slots[req.itemId] || 0;
    if (boardCount + backpackCount < req.count) return false;
  }
  return true;
});

const onFulfill = () => {
  if (!canFulfill.value) return;

  for (const req of props.order.required) {
    let remaining = req.count;
    const cellIndices = boardStore.findAllItems(req.itemId);
    const boardConsume = Math.min(remaining, cellIndices.length);
    for (let i = 0; i < boardConsume; i++) {
      boardStore.clearCell(cellIndices[i]);
    }
    remaining -= boardConsume;
    if (remaining > 0) {
      inventoryStore.removeItem(req.itemId, remaining);
    }
  }

  const idx = dailyOrderStore.activeOrders.findIndex(o => o === props.order);
  if (idx >= 0) dailyOrderStore.fulfillOrder(idx);
  saveStore.saveAll();
};

const openOrderDetails = () => {
  dailyOrderSheet.open();
};
</script>

<style scoped>
.daily-order-card {
  width: 38cqw !important;
  min-height: 0 !important;
  position: relative !important;
  margin-top: 18cqw !important;
  overflow: visible !important;
  align-self: flex-end !important;
  flex-shrink: 0;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  box-sizing: border-box;
  padding: 0 !important;
  gap: 1cqw !important;
  cursor: pointer;
}

.daily-order-card:hover {
  transform: none;
}

.daily-order-card.ready {
  cursor: pointer !important;
}
.daily-order-card.ready .order-body {
  background: rgba(255, 255, 255, 0.4) !important;
  border-color: var(--accent-pink) !important;
  box-shadow: 0 0 10px rgba(255, 101, 132, 0.4) !important;
}

.daily-npc-avatar {
  position: absolute !important;
  left: 50% !important;
  bottom: 9cqw !important;
  transform: translateX(-50%) scale(1.1) !important;
  width: 26cqw !important;
  height: 32cqw !important;
  z-index: 60 !important;
  border: none !important;
  border-radius: 0 !important;
  background-color: transparent !important;
  box-shadow: none !important;
  background-size: contain !important;
  background-position: bottom center !important;
  background-repeat: no-repeat !important;
  overflow: visible !important;
  pointer-events: none !important;
  flex-shrink: 0;
}

.daily-npc-silhouette {
  filter: brightness(0) contrast(1) grayscale(1) !important;
  opacity: 0.8;
}

.daily-npc-tag-pill {
  background: var(--name-tag-bg) !important;
  border-radius: 12px !important;
  padding: 0 8px !important;
  height: 2.7cqw;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  align-self: flex-start;
}

.daily-npc-tag-text {
  font-size: 10px !important;
  font-weight: 700;
  color: var(--name-tag-text) !important;
  white-space: nowrap;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.order-body {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: center !important;
  gap: 1.5cqw !important;
  width: auto !important;
  margin-top: 0.5cqw !important;
  margin-left: 0 !important;
  flex: 0 1 auto !important;
  background: rgba(0, 0, 0, 0.41) !important;
  backdrop-filter: blur(7.3px) !important;
  -webkit-backdrop-filter: blur(7.3px) !important;
  border: 1px solid var(--reward-bubble-border) !important;
  border-radius: 10px !important;
  padding: 1.5cqw 1.5cqw !important;
  box-sizing: border-box !important;
  height: auto !important;
  min-height: 5cqw !important;
  transition: background 0.2s ease, box-shadow 0.2s ease;
  position: relative !important;
  overflow: visible !important;
  z-index: 61 !important;
  box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.4);
}

.order-body-portrait {
  position: absolute;
  right: -2cqw;
  top: -12cqw;
  width: 16cqw;
  height: 20cqw;
  background-image: var(--avatar-boss-bg);
  background-size: contain;
  background-position: bottom center;
  background-repeat: no-repeat;
  z-index: -1;
  pointer-events: none;
}

.order-header {
  display: flex;
  align-items: center;
  gap: 1.5cqw;
}

.hp-bar-mini {
  flex: 1;
  height: 2.5cqw;
  background: var(--progress-track);
  border-radius: 13px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hp-bar-mini-fill {
  height: 100%;
  background: var(--progress-fill);
  border-radius: 13px;
  transition: width 0.3s ease;
}

.order-required-items {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1.5cqw;
  width: 100%;
  flex-wrap: wrap !important;
}

.order-item-slot {
  width: 9.5cqw !important;
  height: 9.5cqw !important;
  min-width: 32px !important;
  min-height: 32px !important;
  border-radius: 8px !important;
  background: rgba(90, 62, 43, 0.25) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.35) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  position: relative !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2) !important;
}

.slot-emoji {
  font-size: 18px !important;
  line-height: 1;
}

.order-item-slot.fulfilled {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: var(--color-success) !important;
}

.order-item-slot.fulfilled::after {
  content: '✓';
  position: absolute;
  bottom: -3px;
  right: -3px;
  background: var(--color-success) !important;
  color: white !important;
  font-size: 8px !important;
  font-weight: 900 !important;
  width: 14px !important;
  height: 14px !important;
  border-radius: 50% !important;
  border: 1px solid var(--text-primary) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
  pointer-events: none;
  z-index: 10 !important;
  line-height: 1;
}

.order-reward-bubble {
  position: absolute;
  top: -12cqw;
  left: 50%;
  transform: translateX(-50%);
  background: var(--reward-bubble-bg);
  border-radius: 8px;
  padding: 4px 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.4);
  z-index: 62;
  white-space: nowrap;
}

.reward-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.reward-icon {
  font-size: 11px;
  line-height: 1;
}

.reward-amount {
  font-size: 10px;
  font-weight: 900;
  color: var(--text-primary);
  line-height: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.fulfill-order-btn {
  background: linear-gradient(135deg, var(--accent-pink), #ff7f9e);
  border: none;
  border-radius: 8px;
  padding: 1.5cqw 3cqw;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  box-shadow: 0px 2px 4px rgba(243, 86, 131, 0.4);
  transition: transform 0.1s ease;
  align-self: center;
}

.fulfill-order-btn:active {
  transform: scale(0.92);
}

.fulfill-order-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

