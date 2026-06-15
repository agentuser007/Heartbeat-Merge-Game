<template>
  <div id="boss-header">
    <!-- Warehouse Entry -->
    <div class="inventory-entry">
      <div class="inventory-label">仓库</div>
      <button class="inventory-btn" @click="openInventory">
        <span class="inventory-icon">🍩</span>
        <span v-if="inventoryCount > 0" class="inventory-badge">{{ inventoryCount }}</span>
      </button>
    </div>

    <!-- Quest Cards Carousel -->
    <div class="quest-row">
      <div id="quest-carousel">
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

    <!-- Board Divider -->
    <div class="board-divider" />
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
  height: 180px;
  padding: 0;
  display: block;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
  z-index: 60;
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
  min-height: 180px;
}

#quest-carousel {
  position: relative;
  width: 100%;
  height: auto;
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 4px 16px 10px 66px;
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

.inventory-entry {
  position: absolute;
  top: 56px;
  left: 7px;
  width: 52px;
  height: 110px;
  z-index: 65;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.inventory-label {
  width: 51px;
  height: 44px;
  background: #D9D9D9;
  color: #000;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  text-align: center;
  line-height: 1.2;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.inventory-btn {
  margin-top: 13px;
  background: #FFDFC8;
  border: 4px solid #E9C3A8;
  border-radius: 10px;
  width: 52px;
  height: 52px;
  cursor: pointer;
  box-shadow: 0px 1px 3.7px #60190F;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0;
}
.inventory-btn:active {
  transform: scale(0.95);
}

.inventory-icon {
  font-size: 28px;
  line-height: 1;
}

.inventory-badge {
  position: absolute;
  top: -7px;
  left: 30px;
  background: var(--accent-pink);
  color: white;
  font-size: 10px;
  font-weight: 900;
  width: 24px;
  height: 16px;
  border-radius: 13px;
  border: 1px solid #E9C3A8;
  box-shadow: 0 1px 3px rgba(243, 86, 131, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  line-height: 1;
  box-sizing: border-box;
}

.board-divider {
  position: absolute;
  bottom: 0px;
  left: 13px;
  width: calc(100% - 26px);
  height: 5px;
  border-radius: 12px;
  background: #FFDFC8;
  border: 2px solid #FFF;
  box-shadow: 0 0 5.8px #000;
  z-index: 70;
}

@media (max-height: 760px) {
  #boss-header { height: 115px; }
  .quest-row { min-height: 115px; }
  #quest-carousel { padding-bottom: 6px; }
  .inventory-entry { top: 28px; width: 40px; height: 80px; }
  .inventory-label { width: 40px; height: 30px; font-size: 9px; }
  .inventory-btn { margin-top: 6px; width: 40px; height: 40px; border-radius: 8px; border-width: 3px; }
  .inventory-icon { font-size: 22px; }
  .inventory-badge { top: -5px; left: 22px; width: 20px; height: 14px; font-size: 8px; }
  #quest-carousel { padding-left: 50px; }
}
</style>

