<!-- ============================================================
     ShopSheet.vue — Gold shop bottom sheet
     ============================================================
     Replaces #shop-sheet from index.html lines 436-452.
     Uses configStore.shopItems for shop data and currencyStore for gold.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="shop-sheet"
    :title="i18nStore.t('heroine.goldShop')"
    icon="🏪"
    :subtitle="i18nStore.t('heroine.shopSub')"
  >
    <div id="shop-list" class="shop-list">
      <div
        v-for="item in configStore.shopItems"
        :key="item.id"
        class="shop-item"
      >
        <span class="shop-item-icon">{{ item.icon }}</span>
        <div class="shop-item-info">
          <span class="shop-item-name">{{ i18nStore.t(item.i18nName) }}</span>
          <span class="shop-item-desc">{{ i18nStore.t(item.i18nDesc) }}</span>
        </div>
        <button
          class="shop-buy-btn"
          :class="{ affordable: currencyStore.gold >= item.cost }"
          :disabled="currencyStore.gold < item.cost"
          @click="buyItem(item)"
        >
          {{ item.cost }} 💰
        </button>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useConfigStore } from '../../stores/configStore'
import { useCurrencyStore } from '../../stores/currencyStore'
import { useI18nStore } from '../../stores/i18nStore'
import { globalBus } from '../../core/EventBus'
import type { GachaPoolItemValue } from '../../types/game'

const { isOpen } = useSheet('shop-sheet')
const configStore = useConfigStore()
const currencyStore = useCurrencyStore()
const i18nStore = useI18nStore()

function buyItem(item: { id: string; cost: number; effect: string; value: GachaPoolItemValue }) {
  if (currencyStore.gold < item.cost) return
  if (!currencyStore.spendGold(item.cost)) return
  globalBus.emit('shop:itemPurchased', { item })
}
</script>

<style scoped>
/* ---- Shop List ---- */
.shop-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ---- Shop Card ---- */
.shop-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  margin-bottom: 8px;
  transition: var(--interactive-transition);
}

.shop-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.shop-item-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.shop-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.shop-item-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dark);
}

.shop-item-desc {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
}

/* ---- Shop Buy Button ---- */
.shop-buy-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-muted-alt);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--interactive-transition);
  white-space: nowrap;
  flex-shrink: 0;
}

.shop-buy-btn.affordable {
  background: linear-gradient(135deg, #FFD700, #FFA000);
  color: var(--text-inverse);
}

.shop-buy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.shop-buy-btn.affordable:hover {
  filter: brightness(1.1);
}

.shop-buy-btn.affordable:active {
  transform: scale(0.93);
}

</style>
