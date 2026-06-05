<template>
  <div id="info-bar">
    <div class="info-bar-left-accent" />
    <div class="info-bar-content">
      <div class="info-hint-row">
        <span class="info-icon">ℹ️</span>
        <span class="info-hint-text">{{ hint }}</span>
      </div>
      <div class="info-detail-row">
        <div class="info-item-group">
          <span class="info-item-name">{{ selectedItemName }}</span>
          <span class="info-item-level">lv.{{ selectedItemLevel }}</span>
        </div>
        <button v-if="hasSelectedItem" class="info-sell-btn" @click="onSell">
          {{ i18nStore.t('itemInfo.sell') || '卖出' }}
        </button>
      </div>
    </div>
    <div class="info-divider" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18nStore } from '../../stores/i18nStore'

const i18nStore = useI18nStore()

const hint = computed(() => {
  return i18nStore.t('board.canMerge') || '还可以合成哦'
})

const selectedItemName = computed(() => {
  return '眉笔'
})

const selectedItemLevel = computed(() => {
  return 2
})

const hasSelectedItem = computed(() => {
  return false
})

const onSell = () => {
  console.log('Sell item clicked')
}
</script>

<style scoped>
#info-bar {
  position: relative;
  width: 100cqw;
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  z-index: 50;
  box-sizing: border-box;
}

.info-bar-left-accent {
  width: 4.2cqw;
  min-width: 17px;
  background: var(--info-bar-highlight);
  border-radius: 10px 0 0 10px;
  flex-shrink: 0;
}

.info-bar-content {
  flex: 1;
  background: var(--info-bar-bg);
  border-radius: 0 10px 10px 0;
  padding: 3cqw 4cqw 3cqw 3cqw;
  display: flex;
  flex-direction: column;
  gap: 2cqw;
  position: relative;
  min-height: 17cqw;
  box-sizing: border-box;
}

.info-hint-row {
  display: flex;
  align-items: center;
  gap: 1cqw;
}

.info-icon {
  font-size: 10px;
  flex-shrink: 0;
}

.info-hint-text {
  font-size: 12px;
  color: var(--hint-text);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.info-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3cqw;
}

.info-item-group {
  display: flex;
  align-items: center;
  gap: 0.5cqw;
}

.info-item-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--off-white);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.info-item-level {
  font-size: 14px;
  color: var(--off-white);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.info-sell-btn {
  background: var(--sell-btn-bg);
  border: 1px solid var(--sell-btn-border);
  border-radius: 13px;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  transition: transform 0.1s ease;
}

.info-sell-btn:active {
  transform: scale(0.95);
}

.info-divider {
  position: absolute;
  top: 50%;
  left: 5cqw;
  right: 5cqw;
  height: 1px;
  background: var(--divider-line);
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 1;
}
</style>
