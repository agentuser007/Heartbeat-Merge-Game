<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="affection-shop"
    :title="i18nStore.t('affection.shopTitle')"
    icon="💝"
  >
    <div class="shop-header">
      <span class="shop-coin-balance">
        {{ i18nStore.t('affection.shopCoinBalance', { n: affectionStore.affectionCoins }) }}
      </span>
    </div>

    <div class="shop-tabs">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="shop-tab"
        :class="{ active: activeTab === cat.id }"
        @click="activeTab = cat.id"
      >
        {{ cat.icon }} {{ cat.name }}
      </button>
    </div>

    <div class="shop-list">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="shop-item"
        :class="{ locked: !isUnlocked(item) }"
      >
        <span class="shop-item-icon">{{ item.icon }}</span>
        <div class="shop-item-info">
          <span class="shop-item-name">{{ item.name }}</span>
          <span class="shop-item-effect">{{ getEffectDesc(item) }}</span>
          <span v-if="item.dailyLimit" class="shop-item-limit">
            {{ i18nStore.t('affection.shopDailyLeft', { n: affectionStore.getDailyPurchasesLeft(item.id, item.dailyLimit) }) }}
          </span>
        </div>
        <button
          v-if="isUnlocked(item)"
          class="shop-buy-btn"
          :class="{ affordable: affectionStore.canAffordCoins(item.price) }"
          :disabled="!canBuy(item)"
          @click="onBuy(item)"
        >
          💰{{ item.price }}
        </button>
        <button v-else class="shop-buy-btn locked-btn" disabled>
          🔒
        </button>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useAffectionStore } from '../../stores/affectionStore'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'
import { globalBus } from '../../core/EventBus'
import { useApplyDeps } from '../../composables/useApplyDeps'
import { applyResolveResult } from '../../composables/useGameLoop'
import type { AffectionShopItem } from '../../types/game'

const { isOpen } = useSheet('affection-shop')
const affectionStore = useAffectionStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()
const applyDeps = useApplyDeps()

const activeTab = ref('energy')

const categories = computed(() => {
  return configStore.affectionShop?.categories || []
})

const filteredItems = computed(() => {
  const items = configStore.affectionShop?.items || []
  return items.filter((i: AffectionShopItem) => i.categoryId === activeTab.value)
})

function isUnlocked(item: AffectionShopItem): boolean {
  return item.unlockLevel <= affectionStore.getMaxLevel()
}

function canBuy(item: AffectionShopItem): boolean {
  if (!isUnlocked(item)) return false
  if (!affectionStore.canAffordCoins(item.price)) return false
  if (item.dailyLimit) {
    return affectionStore.getDailyPurchasesLeft(item.id, item.dailyLimit) > 0
  }
  return true
}

function getEffectDesc(item: AffectionShopItem): string {
  const effect = item.effect as Record<string, unknown> | undefined
  if (!effect) return ''
  const effectType = effect.type as string | undefined
  switch (effectType) {
    case 'energy': return `⚡ +${effect.value}`
    case 'energy_full': return '⚡ 全满'
    case 'affection': return `💕 +${effect.value}`
    case 'merge_double': return '⚡ 双倍合并'
    case 'gacha_ssr_boost': return `🍀 SSR+${effect.value}%`
    case 'boss_damage_shield': return '🛡️ 护盾'
    case 'fragment_double': return '💎 双倍碎片'
    case 'daily_order_refresh': return '🔮 刷新订单'
    default: return ''
  }
}

function onBuy(item: AffectionShopItem) {
  const result = affectionStore.purchaseShopItem(item.id)
  if (result.ok) {
    applyResolveResult(result.resolveResult, applyDeps)
    globalBus.emit('toast:show', {
      message: i18nStore.t('affection.shopPurchased'),
      type: 'info'
    })
  } else if (!affectionStore.canAffordCoins(item.price)) {
    globalBus.emit('toast:show', {
      message: i18nStore.t('affection.shopNotEnoughCoins'),
      type: 'error'
    })
  } else {
    globalBus.emit('toast:show', {
      message: i18nStore.t('affection.shopDailyLimitReached'),
      type: 'info'
    })
  }
}
</script>

<style scoped>
.shop-header {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.shop-coin-balance {
  padding: 4px 14px;
  background: rgba(255,215,0,0.15);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #B8860B;
}

.shop-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.shop-tab {
  flex: 1;
  padding: 6px 0;
  border: 1.5px solid rgba(0,0,0,0.06);
  border-radius: 10px;
  background: rgba(255,255,255,0.5);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--interactive-transition);
  color: rgba(0,0,0,0.5);
}
.shop-tab.active {
  background: rgba(255,105,180,0.12);
  border-color: #FF69B4;
  color: #FF1493;
}

.shop-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shop-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  transition: var(--interactive-transition);
}
.shop-item.locked {
  opacity: 0.5;
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

.shop-item-effect {
  font-size: 10px;
  color: rgba(0,0,0,0.45);
}

.shop-item-limit {
  font-size: 9px;
  color: #FF69B4;
}

.shop-buy-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(0,0,0,0.08);
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
.locked-btn {
  background: rgba(0,0,0,0.04);
}
</style>