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
    <div v-if="dailyOrderStore.isSettling" class="settling-notice">
      ⏸️ {{ i18nStore.t('dailyOrder.frozen') || '日常订单已冻结' }}
    </div>
    <div id="daily-order-list" class="daily-order-list">
      <div
        v-for="(order, idx) in displayOrders"
        :key="order.id || idx"
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
        <div class="order-reward">
          <template v-if="order.reward">
            <span v-if="order.reward.gold">💰 {{ order.reward.gold }}</span>
            <span v-if="order.reward.diamonds">💎 {{ order.reward.diamonds }}</span>
            <span v-if="order.reward.energy">⚡ {{ order.reward.energy }}</span>
          </template>
          <span v-else>💰 {{ order.goldReward }}</span>
        </div>
        <button
          class="order-fulfill-btn"
          :class="{ ready: canFulfill(order) }"
          :disabled="!canFulfill(order)"
          @click="fulfillOrder(order, idx)"
        >
          {{ order.fulfilled ? '✅' : i18nStore.t('dailyOrder.fulfill') }}
        </button>
      </div>

      <!-- Settling: "End this loop" button -->
      <div v-if="dailyOrderStore.isSettling" class="settling-actions">
        <button class="end-loop-btn" @click="onEndLoop">
          {{ i18nStore.t('dailyOrder.endLoop') || '结束这一轮' }}
        </button>
      </div>

      <!-- Manual Refresh section when all orders are completed (active only) -->
      <div v-if="!dailyOrderStore.isSettling && dailyOrderStore.canRefresh" class="daily-refresh-box">
        <span class="refresh-desc">✨ 所有委托已完成！ ✨</span>
        <button class="daily-refresh-btn" @click="refreshOrders">
          🔄 立即刷新
        </button>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import BaseBottomSheet from './BaseBottomSheet.vue'
import { computed } from 'vue'
import { useSheet } from '../../composables/useSheet'
import { useDailyOrderStore } from '../../stores/dailyOrderStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useBoardStore } from '../../stores/boardStore'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'
import type { DailyOrderState } from '../../stores/dailyOrderStore'

const props = defineProps<{
  onEndLoop?: () => void
}>()

const { isOpen } = useSheet('daily-sheet')
const dailyOrderStore = useDailyOrderStore()
const inventoryStore = useInventoryStore()
const boardStore = useBoardStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()

const displayOrders = computed(() => dailyOrderStore.displayOrders)

function getItemEmoji(itemId: string): string {
  return configStore.items[itemId]?.emoji || '❓'
}

function canFulfill(order: DailyOrderState): boolean {
  if (order.fulfilled) return false
  return order.required.every((req) => {
    const backpackCount = inventoryStore.slots[req.itemId] || 0
    const boardCount = boardStore.findAllItems(req.itemId).length
    return (backpackCount + boardCount) >= req.count
  })
}

function fulfillOrder(order: DailyOrderState, idx: number) {
  if (!canFulfill(order)) return

  for (const req of order.required) {
    let remaining = req.count
    
    const backpackCount = inventoryStore.slots[req.itemId] || 0
    if (backpackCount > 0) {
      const toRemove = Math.min(remaining, backpackCount)
      inventoryStore.removeItem(req.itemId, toRemove)
      remaining -= toRemove
    }
    
    if (remaining > 0) {
      const cellIndices = boardStore.findAllItems(req.itemId)
      for (let i = 0; i < remaining && i < cellIndices.length; i++) {
        boardStore.clearCell(cellIndices[i])
      }
    }
  }

  if (dailyOrderStore.isSettling) {
    dailyOrderStore.fulfillFrozenOrder(idx)
    return
  }

  const index = dailyOrderStore.activeOrders.findIndex(o => o === order)
  if (index < 0) return
  
  dailyOrderStore.fulfillOrder(index)
}

function refreshOrders() {
  dailyOrderStore.rollNewOrders(true)
}

function onEndLoop() {
  if (props.onEndLoop) {
    props.onEndLoop()
  }
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
  transition: var(--interactive-transition);
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
  transition: var(--interactive-transition);
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

/* ---- Refresh Box ---- */
.daily-refresh-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.4);
  border: 2px dashed var(--warm-border, #CDA080);
  border-radius: 12px;
  margin-top: 8px;
  text-align: center;
}

.refresh-desc {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-heading);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.daily-refresh-btn {
  background: linear-gradient(135deg, #FFD54F, #FFB300);
  border: 2px solid var(--off-white);
  border-radius: 99px;
  padding: 8px 24px;
  color: var(--text-heading);
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(255, 179, 0, 0.3);
  transition: transform 0.15s ease;
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.daily-refresh-btn:hover {
  filter: brightness(1.05);
}

.daily-refresh-btn:active {
  transform: scale(0.95);
}

.settling-notice {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--warm-brown-icon);
  padding: 8px 12px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px dashed rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  margin-bottom: 8px;
}

.settling-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.end-loop-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  color: white;
  background: linear-gradient(135deg, #6c5ce7, #e17055);
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(108, 92, 231, 0.4);
  transition: var(--interactive-transition);
  font-family: 'Jiangcheng Yuanti', inherit;
}

.end-loop-btn:hover {
  filter: brightness(1.1);
}

.end-loop-btn:active {
  transform: scale(0.97);
}
</style>
