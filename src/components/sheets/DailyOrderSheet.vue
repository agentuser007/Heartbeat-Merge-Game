<!-- ============================================================
     DailyOrderSheet.vue — Daily order bottom sheet
     ============================================================
     Replaces #daily-sheet from index.html lines 454-468.
     Uses dailyOrderStore for daily order data.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="daily-sheet"
    :title="i18nStore.t('dailyOrder.panelTitle')"
    icon="📋"
    :subtitle="i18nStore.t('dailyOrder.panelSub')"
  >
    <div id="daily-order-list" class="daily-order-list">
      <div
        v-for="order in dailyOrderStore.activeOrders"
        :key="order.id"
        class="daily-order-item"
        :class="{ 'daily-order-item--fulfilled': order.fulfilled }"
      >
        <div class="order-items">
          <span
            v-for="req in order.required"
            :key="req.itemId"
            class="order-requirement"
          >
            {{ getItemEmoji(req.itemId) }} ×{{ req.count }}
          </span>
        </div>
        <div class="order-reward">💰 {{ order.goldReward }}</div>
        <button
          class="order-fulfill-btn"
          :disabled="!canFulfill(order)"
          @click="fulfillOrder(order)"
        >
          {{ order.fulfilled ? '✅' : i18nStore.t('dailyOrder.fulfill') }}
        </button>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useDailyOrderStore } from '../../stores/dailyOrderStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'
import type { DailyOrder } from '../../stores/dailyOrderStore'

const { isOpen } = useSheet('daily-sheet')
const dailyOrderStore = useDailyOrderStore()
const inventoryStore = useInventoryStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()

function getItemEmoji(itemId: string): string {
  return configStore.items[itemId]?.emoji || '❓'
}

function canFulfill(order: DailyOrder): boolean {
  if (order.fulfilled) return false
  return order.required.every(
    (req) => (inventoryStore.slots[req.itemId] || 0) >= req.count
  )
}

function fulfillOrder(order: DailyOrder) {
  if (!canFulfill(order)) return
  const index = dailyOrderStore.activeOrders.findIndex(o => o === order)
  if (index < 0) return
  for (const req of order.required) {
    inventoryStore.removeItem(req.itemId, req.count)
  }
  dailyOrderStore.fulfillOrder(index)
}
</script>

<style scoped>
/* ---- Daily Order List ---- */
.daily-order-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ---- Daily Order Card ---- */
.daily-order-item {
  background: rgb(255, 225, 204);
  border: 1px solid rgba(221, 170, 139, 0.3);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 10px;
}

.daily-order-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.daily-order-item--fulfilled {
  opacity: 0.6;
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.2);
}

/* ---- Order Items ---- */
.order-items {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.order-requirement {
  font-size: 13px;
  color: var(--text-dark);
}

/* ---- Order Reward ---- */
.order-reward {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-reward);
  flex-shrink: 0;
}

/* ---- Order Fulfill Button ---- */
.order-fulfill-btn {
  width: 100%;
  padding: 7px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.order-fulfill-btn:disabled {
  cursor: not-allowed;
}

.order-fulfill-btn.ready {
  background: linear-gradient(135deg, #FFD54F, #FFB300);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 179, 0, 0.3);
}

.order-fulfill-btn.ready:hover {
  filter: brightness(1.05);
}

.order-fulfill-btn.ready:active {
  transform: scale(0.95);
}

/* ---- Done Label ---- */
.daily-order-done {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-success);
  padding: 4px 0;
}
</style>
