<template>
  <div id="boss-header">
    <div class="quest-row">
      <div id="quest-carousel">
        <!-- Floating Backpack Button -->
        <div class="floating-backpack-container">
          <button id="floating-backpack-btn" @click="openInventory">
            <span class="backpack-emoji">🍩</span>
            <span class="backpack-badge" v-if="inventoryCount > 0">{{ inventoryCount }}</span>
          </button>
        </div>
        <!-- Main Quest Card -->
        <MainQuestCard />
        <!-- Daily Order Cards -->
        <DailyOrderCard
          v-for="order in dailyOrderStore.pendingOrders"
          :key="order.id"
          :order="order"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDailyOrderStore } from '../../stores/dailyOrderStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSheet } from '../../composables/useSheet';
import MainQuestCard from './MainQuestCard.vue';
import DailyOrderCard from './DailyOrderCard.vue';

const dailyOrderStore = useDailyOrderStore();
const inventoryStore = useInventoryStore();
const inventorySheet = useSheet('inventory-sheet');

const inventoryCount = computed(() => inventoryStore.totalItems);

const openInventory = () => {
  inventorySheet.open();
};
</script>

<style scoped>
#boss-header {
  position: relative;
  width: 100cqw;
  height: auto;
  padding: 0 0cqw 0cqw 1cqw;
  display: block;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
  z-index: 55;
  box-sizing: border-box;
}

#boss-header::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  background: linear-gradient(
    to bottom,
    rgba(221, 170, 139, 0) 0%,
    rgba(255, 234, 195, 0.51) 50%,
    #DDAA8B 100%
  ) !important;
  z-index: -1 !important;
  pointer-events: none !important;
  border-radius: 0 0 5px 5px !important;
}

.quest-row {
  display: flex;
  align-items: stretch;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
  position: relative;
  overflow: visible !important;
}

#quest-carousel {
  position: relative;
  width: 100%;
  height: auto;
  display: flex;
  gap: 2cqw;
  align-items: flex-end;
  padding: 1cqw 0 0 0;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  max-height: none !important;
  flex: 1 1 auto;
  min-width: 0;
  z-index: 1;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
#quest-carousel::-webkit-scrollbar {
  display: none;
}

.floating-backpack-container {
  position: relative;
  align-self: flex-end;
}

#floating-backpack-btn {
  background: #FFDFC8;
  border: 4px solid var(--peach-light);
  border-radius: 10px;
  width: 52px;
  height: 52px;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0px 1px 3.7px #60190F;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 6px 8px 4px;
  gap: 2px;
  transition: transform 0.1s ease;
  position: relative;
}
#floating-backpack-btn:active {
  transform: scale(0.95);
}

.backpack-emoji {
  font-size: 28px;
  line-height: 1;
}

.backpack-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #F35683;
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 99px;
  border: 1.5px solid #fff;
  box-shadow: 0 2px 4px rgba(243, 86, 131, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  line-height: 1;
  box-sizing: border-box;
}

.warehouse-tag {
  background: #D9D9D9;
  border-radius: 2px;
  color: #000;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  text-align: center;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  line-height: 1.2;
  white-space: nowrap;
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
}

.chain-tooltip {
  position: absolute;
  z-index: 300;
  pointer-events: auto;
  transform: translateX(-50%);
  background: rgb(255, 255, 255);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  animation: chain-tooltip-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  white-space: nowrap;
  max-width: 90vw;
  overflow-x: auto;
}

.damage-popup {
  position: fixed;
  z-index: 650;
  pointer-events: none;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.62);
  border-radius: 6px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  animation: damage-popup-anim 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@media (max-height: 760px) {
  #boss-header { padding: 4px 10px; gap: 8px; }
  #quest-carousel { padding: 4px 8px; gap: 6px; max-height: 95px; }
}
</style>
