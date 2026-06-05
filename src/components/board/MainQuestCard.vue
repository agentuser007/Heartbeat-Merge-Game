<template>
  <div id="main-quest-card" class="quest-card" :class="{ ready: canSubmit }">
    <div id="boss-portrait" :style="portraitStyle">
      <div id="boss-blush"></div>
    </div>
    <div class="quest-card-body">
      <div class="quest-card-header-row">
        <div id="boss-header-name">
          <span id="boss-name">{{ bossStore.bossName }}</span>
        </div>
        <div class="hp-bar-container">
          <div id="hp-bar-fill" :style="hpBarStyle"></div>
        </div>
      </div>
      <div class="quest-card-items-row">
        <div class="quest-card-items" id="order-items">
          <div v-for="req in currentOrderRequired" :key="req.itemId" class="order-item-tag">
            {{ req.emoji }} ×{{ req.count }}
          </div>
        </div>
      </div>
      <button class="submit-order-btn" :disabled="!canSubmit" @click.stop="onSubmit">提交</button>
    </div>
    <div class="order-reward-bubble">
      <span class="reward-diamond">💎</span>
      <span class="reward-amount">+{{ bossReward }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBossStore } from '../../stores/bossStore';
import { useBoardStore } from '../../stores/boardStore';
import { useConfigStore } from '../../stores/configStore';
import { useCurrencyStore } from '../../stores/currencyStore';

const bossStore = useBossStore();
const boardStore = useBoardStore();
const configStore = useConfigStore();
const currencyStore = useCurrencyStore();

const portraitStyle = computed(() => {
  return {
    backgroundImage: `url('${bossStore.bossAvatar}')`,
    backgroundSize: 'contain',
    backgroundPosition: 'center bottom',
    backgroundRepeat: 'no-repeat'
  };
});

const hpBarStyle = computed(() => {
  return {
    width: `${bossStore.hpPercentage}%`
  };
});

const currentOrderRequired = computed(() => {
  if (bossStore.orders.length === 0) return [];
  
  const currentOrder = bossStore.orders[0];
  if (!currentOrder || !currentOrder.required) return [];
  
  return currentOrder.required.map(req => {
    const item = configStore.items[req.itemId];
    return {
      ...req,
      emoji: item?.emoji || '❓'
    };
  });
});

const canSubmit = computed(() => {
  if (bossStore.orders.length === 0) return false;
  const order = bossStore.orders[0];
  if (!order?.required) return false;
  for (const req of order.required) {
    const found = boardStore.findAllItems(req.itemId);
    if (found.length < req.count) return false;
  }
  return true;
});

const bossReward = computed(() => {
  if (bossStore.orders.length === 0) return 0;
  const order = bossStore.orders[0];
  return order?.diamondReward || order?.damage || 10;
});

const onSubmit = () => {
  if (!canSubmit.value) return;
  const order = bossStore.orders[0];
  if (!order?.required) return;

  for (const req of order.required) {
    const cellIndices = boardStore.findAllItems(req.itemId);
    for (let i = 0; i < req.count && i < cellIndices.length; i++) {
      boardStore.clearCell(cellIndices[i]);
    }
  }

  const reward = bossReward.value;
  if (reward > 0) {
    currencyStore.addDiamonds(reward);
  }

  bossStore.submitOrder(order.damage || 10);
};
</script>

<style scoped>
#main-quest-card {
  width: 45cqw !important;
  min-height: 0 !important;
  padding-left: 0 !important;
  position: relative !important;
  overflow: visible !important;
  margin-top: 18cqw !important;
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

#boss-portrait {
  position: absolute !important;
  left: 50% !important;
  bottom: 11cqw !important;
  transform: translateX(-50%) scale(1.55) !important;
  width: 32cqw !important;
  height: 40cqw !important;
  z-index: 60 !important;
  border: none !important;
  border-radius: 0 !important;
  background-color: transparent !important;
  box-shadow: none !important;
  background-size: contain !important;
  background-position: bottom center !important;
  background-repeat: no-repeat !important;
  overflow: visible !important;
  transition: transform 0.3s ease;
  pointer-events: none !important;
  flex-shrink: 0;
}

#boss-portrait.boss-shake {
  animation: boss-shake 0.5s ease;
}

#boss-blush {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle, rgba(255, 100, 100, 0.5) 0%, transparent 80%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.quest-card-body {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: center !important;
  gap: 0.5cqw !important;
  width: 100% !important;
  margin-top: 0.5cqw !important;
  margin-left: 0 !important;
  flex: 0 1 auto !important;
  background: rgba(0, 0, 0, 0.41) !important;
  backdrop-filter: blur(7.3px) !important;
  -webkit-backdrop-filter: blur(7.3px) !important;
  border: 1px solid var(--reward-bubble-border) !important;
  border-radius: 6px !important;
  padding: 0.5cqw 0.5cqw 0.5cqw 1cqw !important;
  box-sizing: border-box !important;
  height: auto !important;
  min-height: 5cqw !important;
  transition: background 0.2s ease, box-shadow 0.2s ease;
  position: relative !important;
  z-index: 61 !important;
  box-shadow: 0px 3px 3.7px rgba(0, 0, 0, 0.6);
}

#main-quest-card.ready .quest-card-body {
  background: rgba(255, 255, 255, 0.4) !important;
  border-color: #ff6584 !important;
  box-shadow: 0 0 10px rgba(255, 101, 132, 0.4) !important;
}

.quest-card-header-row {
  display: flex;
  align-items: center;
  gap: 1cqw;
  width: 100%;
}

#boss-header-name {
  background: var(--name-tag-bg) !important;
  border-radius: 7px !important;
  padding: 3px 8px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

#boss-name {
  font-size: 11px !important;
  font-weight: 500;
  color: var(--name-tag-text) !important;
  white-space: nowrap;
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.hp-bar-container {
  flex: 1;
  height: 10px !important;
  background: var(--progress-track) !important;
  border-radius: 13px !important;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.15);
}

#hp-bar-fill {
  height: 100%;
  width: 0%;
  background: var(--progress-fill) !important;
  border-radius: 13px;
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 0 6px rgba(243, 86, 131, 0.4);
}

.quest-card-items-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1cqw;
  width: 100%;
}

.quest-card-items {
  display: flex !important;
  gap: 1cqw !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 1 auto !important;
  min-width: 0 !important;
  margin: 0.5cqw !important;
}

.order-item-tag {
  width: 5.5cqw !important;
  height: 5.5cqw !important;
  border-radius: 5px !important;
  background: #FFA1C9 !important;
  border: 1px solid var(--surface-muted) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  position: relative !important;
  box-shadow: none !important;
  font-size: 2.5cqw;
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

.order-item-tag.fulfilled {
  background: var(--highlight-pink) !important;
  border-color: var(--surface-muted) !important;
  box-shadow: none !important;
  overflow: visible !important;
}

.order-item-tag.fulfilled::after {
  content: '✓';
  position: absolute;
  bottom: -0.6cqw;
  right: -0.6cqw;
  background: var(--color-success) !important;
  color: white !important;
  font-size: 1.6cqw !important;
  font-weight: 900 !important;
  width: 2.2cqw !important;
  height: 2.2cqw !important;
  border-radius: 50% !important;
  border: 1px solid #F5F5FA !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
  pointer-events: none;
  z-index: 10 !important;
}

.submit-order-btn {
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

.submit-order-btn:active {
  transform: scale(0.92);
}

.submit-order-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quest-card.timer-warning {
  animation: timer-flash 0.5s infinite;
}
</style>
