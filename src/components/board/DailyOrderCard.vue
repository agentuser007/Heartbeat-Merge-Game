<template>
  <div class="daily-order-card quest-card" :class="{ ready: canFulfill }" @click="openOrderDetails">
    <div class="daily-npc-avatar" :style="avatarStyle" />
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
          v-for="req in order.required" 
          :key="req.itemId" 
          class="order-required-item"
          :class="{ fulfilled: isItemFulfilled(req) }"
        >
          <span class="item-emoji">{{ getItemEmoji(req.itemId) }}</span>
        </div>
      </div>
      <div class="order-reward-bubble">
        <span class="reward-diamond">💎</span>
        <span class="reward-amount">+{{ order.goldReward || 10 }}</span>
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

interface Props {
  order: any;
}

const props = defineProps<Props>();

const configStore = useConfigStore();
const dailyOrderStore = useDailyOrderStore();
const boardStore = useBoardStore();

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
  const fulfilled = props.order.required.filter((req: any) => isItemFulfilled(req)).length;
  return { width: `${(fulfilled / total) * 100}%` };
});

const getItemEmoji = (itemId: string) => {
  const item = configStore.items[itemId];
  return item?.emoji || '❓';
};

const isItemFulfilled = (req: any) => {
  const found = boardStore.findAllItems(req.itemId);
  return found.length >= req.count;
};

const canFulfill = computed(() => {
  if (!props.order?.required) return false;
  for (const req of props.order.required) {
    const found = boardStore.findAllItems(req.itemId);
    if (found.length < req.count) return false;
  }
  return true;
});

const onFulfill = () => {
  if (!canFulfill.value) return;

  for (const req of props.order.required) {
    const cellIndices = boardStore.findAllItems(req.itemId);
    for (let i = 0; i < req.count && i < cellIndices.length; i++) {
      boardStore.clearCell(cellIndices[i]);
    }
  }

  const idx = dailyOrderStore.activeOrders.findIndex(o => o === props.order);
  if (idx >= 0) dailyOrderStore.fulfillOrder(idx);
};

const openOrderDetails = () => {
  console.log('Open order details clicked');
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
  border-color: #ff6584 !important;
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
  filter: brightness(0.12) contrast(1.1) grayscale(1) !important;
}

.daily-npc-tag-pill {
  background: var(--name-tag-bg) !important;
  border-radius: 7px !important;
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
  font-weight: 500;
  color: var(--name-tag-text) !important;
  white-space: nowrap;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.order-body {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: center !important;
  gap: 0.5cqw !important;
  width: auto !important;
  margin-top: 0.5cqw !important;
  margin-left: 0 !important;
  flex: 0 1 auto !important;
  background: rgba(0, 0, 0, 0.41) !important;
  backdrop-filter: blur(7.3px) !important;
  -webkit-backdrop-filter: blur(7.3px) !important;
  border: 1px solid var(--reward-bubble-border) !important;
  border-radius: 6px !important;
  padding: 0.5cqw 0.75cqw !important;
  box-sizing: border-box !important;
  height: auto !important;
  min-height: 5cqw !important;
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
  background-image: url('/assets/avatar/boss_bg.webp');
  background-size: contain;
  background-position: bottom center;
  background-repeat: no-repeat;
  z-index: -1;
  pointer-events: none;
}

.order-header {
  display: flex;
  align-items: center;
  gap: 1cqw;
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
  gap: 1cqw;
  width: 100%;
}

.order-required-item {
  display: flex !important;
  gap: 0.5cqw !important;
  align-items: center !important;
  justify-content: center !important;
  width: 5.5cqw !important;
  height: 5.5cqw !important;
  border-radius: 5px !important;
  background: #FFA1C9 !important;
  border: 1px solid var(--surface-muted) !important;
  flex-shrink: 0 !important;
  position: relative !important;
  box-shadow: none !important;
}

.order-required-item.fulfilled {
  background: var(--highlight-pink) !important;
  border-color: var(--surface-muted) !important;
  box-shadow: none !important;
  overflow: visible !important;
}

.item-emoji {
  font-size: 3.5cqw !important;
}

.order-reward-bubble {
  position: absolute;
  top: 37%;
  right: -14cqw;
  background: var(--reward-bubble-bg);
  border-radius: 6px;
  padding: 2px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  box-shadow: 0px 4px 5.1px rgba(0, 0, 0, 0.81);
  z-index: 62;
}

.reward-diamond {
  font-size: 8px;
  line-height: 1;
}

.reward-amount {
  font-size: 8px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.fulfill-order-btn {
  background: linear-gradient(135deg, #F35683, #ff6584);
  border: none;
  border-radius: 6px;
  padding: 1cqw 2cqw;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
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

.daily-order-card.timer-warning {
  animation: timer-flash 0.5s infinite;
}
</style>
