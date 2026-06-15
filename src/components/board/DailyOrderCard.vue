<template>
  <div class="daily-order-card quest-card" :class="{ ready: canFulfill }">
    <!-- Reward bubble floating above -->
    <div class="order-reward-bubble">
      <template v-if="order.reward">
        <div v-if="order.reward.gold" class="reward-row">
          <img class="reward-icon-img" src="/assets/items/coin_icon.png" alt="coin" />
          <span class="reward-amount">+{{ order.reward.gold }}</span>
        </div>
        <div v-if="order.reward.diamonds" class="reward-row">
          <img class="reward-icon-img" src="/assets/items/diamond.svg" alt="diamond" />
          <span class="reward-amount">+{{ order.reward.diamonds }}</span>
        </div>
        <div v-if="order.reward.energy" class="reward-row">
          <img class="reward-icon-img" src="/assets/items/lightning-02.svg" alt="stamina" />
          <span class="reward-amount">+{{ order.reward.energy }}</span>
        </div>
      </template>
      <div v-else class="reward-row">
        <img class="reward-icon-img" src="/assets/items/coin_icon.png" alt="coin" />
        <span class="reward-amount">+{{ order.goldReward || 10 }}</span>
      </div>
    </div>

    <!-- NPC Avatar Silhouette -->
    <div class="daily-npc-avatar daily-npc-silhouette" :style="avatarStyle" />

    <!-- Card Body -->
    <div class="order-body">
      <div class="order-body-portrait"></div>
      <div class="order-header">
        <div class="daily-npc-tag-pill" @click.stop="openOrderDetails">
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
          @click.stop="onSlotClick(slot.itemId)"
        >
          <span class="slot-emoji">{{ slot.emoji }}</span>
        </div>
        <button class="fulfill-order-btn" :disabled="!canFulfill" @click.stop="onFulfill">提交</button>
      </div>
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

const onSlotClick = (itemId: string) => {
  boardStore.selectInfoItem(itemId);
};
</script>

<style scoped>
.daily-order-card {
  width: 92px !important;
  min-height: 0 !important;
  position: relative !important;
  margin-top: 52px !important;
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
  gap: 4px !important;
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
  bottom: 38px;
  transform: translateX(-50%) !important;
  width: 85px !important;
  height: 121px !important;
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
  padding: 1px 4px !important;
  height: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  align-self: flex-start;
}

.daily-npc-tag-text {
  font-size: 8px !important;
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
  gap: 4px !important;
  width: 92px !important;
  min-height: 44px !important;
  margin-top: 0 !important;
  margin-left: 0 !important;
  flex: 0 0 auto !important;
  background: rgba(0, 0, 0, 0.41) !important;
  backdrop-filter: blur(7.3px) !important;
  -webkit-backdrop-filter: blur(7.3px) !important;
  border: 1px solid #fcefff !important;
  border-radius: 6px !important;
  padding: 4px !important;
  box-sizing: border-box !important;
  height: auto !important;
  transition: background 0.2s ease, box-shadow 0.2s ease;
  position: relative !important;
  overflow: visible !important;
  z-index: 61 !important;
  box-shadow: 0px 3px 3.7px rgba(0, 0, 0, 0.6);
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
  gap: 4px;
}

.hp-bar-mini {
  flex: 1;
  height: 6px;
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
  justify-content: flex-start;
  gap: 3px;
  width: 100%;
  flex-wrap: nowrap !important;
}

.order-item-slot {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px !important;
  min-height: 20px !important;
  border-radius: 3px !important;
  background: var(--order-slot-bg) !important;
  border: 1px solid var(--highlight-pink) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  position: relative !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2) !important;
}

.slot-emoji {
  font-size: 11px !important;
  line-height: 1;
}

.order-item-slot.fulfilled {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: var(--color-success) !important;
}

.order-item-slot.fulfilled::after {
  content: '✓';
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: var(--color-success) !important;
  color: white !important;
  font-size: 6px !important;
  font-weight: 900 !important;
  width: 9px !important;
  height: 9px !important;
  border-radius: 50% !important;
  border: 1px solid var(--text-primary) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 1px 1px rgba(0,0,0,0.2) !important;
  pointer-events: none;
  z-index: 10 !important;
  line-height: 1;
}

.order-reward-bubble {
  position: absolute;
  bottom: 40px;
  left: 55px;
  background: rgba(0, 0, 0, 0.41);
  border: 1px solid #fcefff;
  border-radius: 6px;
  padding: 2px 4px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  box-shadow: 0px 3px 3.7px rgba(0, 0, 0, 0.6);
  z-index: 62;
  white-space: nowrap;
}

.reward-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.reward-icon-img {
  width: 10px;
  height: 10px;
  object-fit: contain;
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
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  box-shadow: 0px 2px 4px rgba(243, 86, 131, 0.4);
  transition: transform 0.1s ease;
  flex-shrink: 0;
  height: 20px;
  line-height: 1;
  margin-left: auto;
}

.fulfill-order-btn:active {
  transform: scale(0.92);
}

.fulfill-order-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-height: 760px) {
  .daily-order-card {
    margin-top: 28px !important;
  }
  .daily-npc-avatar {
    width: 56px !important;
    height: 80px !important;
    bottom: 30px;
  }
  .order-body {
    width: 82px !important;
    min-height: 38px !important;
    padding: 3px !important;
    gap: 2px !important;
  }
  .order-reward-bubble {
    bottom: 32px;
    left: 48px;
  }
  .order-item-slot {
    width: 16px !important;
    height: 16px !important;
    min-width: 16px !important;
    min-height: 16px !important;
    border-radius: 2px !important;
  }
  .slot-emoji {
    font-size: 9px !important;
  }
  .order-item-slot.fulfilled::after {
    font-size: 5px !important;
    width: 7px !important;
    height: 7px !important;
    bottom: -2px;
    right: -2px;
  }
  .fulfill-order-btn {
    font-size: 8px;
    padding: 1px 3px;
    height: 16px;
  }
  .daily-npc-tag-pill {
    padding: 0 3px;
    height: 10px;
  }
  .daily-npc-tag-text {
    font-size: 7px !important;
  }
  .hp-bar-mini {
    height: 5px;
  }
}
</style>
