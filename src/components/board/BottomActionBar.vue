<template>
  <div id="bottom-action-bar">
    <div class="action-buttons-left">
      <button class="action-circle-btn" @click="emit('nav-click', 'gacha')">
        <img class="action-circle-icon-img" src="/assets/items/gacha.svg" alt="gacha" />
      </button>
      <button class="action-circle-btn" @click="emit('nav-click', 'affection')">
        <img class="action-circle-icon-img" src="/assets/items/crown.svg" alt="crown" />
      </button>
    </div>
    <div class="action-bar-center">
      <div class="action-bar-inner">
        <div class="action-bar-left-accent" />
        <div class="action-bar-content">
          <div v-if="hasSelectedItem" class="info-detail-row">
            <div class="info-item-group">
              <span class="info-item-name">{{ selectedItemName }}</span>
              <span class="info-item-level">lv.{{ selectedItemLevel }}</span>
            </div>
            <button v-if="canSell" class="info-sell-btn" @click="emit('sell')">
              {{ sellLabel }}
            </button>
          </div>

          <div v-if="hasSelectedItem" class="info-divider" />

          <div v-if="hasSelectedItem" class="info-footer-row">
            <div class="info-hint-row">
              <template v-if="selectedItemIsGenerator && selectedGeneratorInfo">
                <span class="info-icon">🏭</span>
                <span class="info-hint-text">产出 {{ selectedGeneratorInfo.chainEmojis.join(' ') }} <template v-if="selectedGeneratorInfo.freeProductionChance > 0">· {{ selectedGeneratorInfo.freeProductionChance * 100 }}%免费</template></span>
              </template>
              <template v-else>
                <span class="info-icon">ⓘ</span>
                <span class="info-hint-text">{{ hint }}</span>
              </template>
            </div>
            <div v-if="canSell" class="sell-price-badge">
              <span class="price-val">{{ selectedItemSellPrice }}</span>
            </div>
          </div>
          <div v-else-if="mergeChain.length > 0" class="merge-chain-row">
            <template v-for="(item, idx) in mergeChain" :key="item.id">
              <span
                class="merge-chain-item"
                :class="{ current: item.id === selectedItemId }"
              >{{ item.emoji }}</span>
              <span v-if="idx < mergeChain.length - 1" class="merge-chain-arrow">→</span>
            </template>
          </div>
          <div v-else class="info-empty-state">
            <div class="info-hint-row">
              <span class="info-icon">ⓘ</span>
              <span class="info-hint-text">点击棋盘道具查看信息</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="action-buttons-right">
      <button class="action-circle-btn" @click="emit('nav-click', 'achievement')">
        <img class="action-circle-icon-img" src="/assets/items/Trophy.svg" alt="trophy" />
      </button>
      <button class="action-circle-btn" @click="emit('nav-click', 'collection')">
        <img class="action-circle-icon-img" src="/assets/items/book-03.svg" alt="book" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface GeneratorInfo {
  chainEmojis: string[]
  freeProductionChance: number
  capacity: number
}

export interface MergeChainItem {
  id: string
  emoji: string
  level: number
}

interface Props {
  hasSelectedItem: boolean
  selectedItemName: string
  selectedItemLevel: number
  selectedItemSellPrice: number
  selectedItemIsGenerator: boolean
  selectedGeneratorInfo: GeneratorInfo | null
  selectedItemId: string | null
  hint: string
  mergeChain: MergeChainItem[]
  canSell: boolean
  sellLabel: string
}

defineProps<Props>()

const emit = defineEmits<{
  sell: []
  'nav-click': [tab: string]
}>()
</script>

<style scoped>
#bottom-action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2cqw;
  width: 100cqw;
  padding: 2cqw 3cqw calc(3cqw + env(safe-area-inset-bottom, 0px));
  flex-shrink: 0;
  z-index: 100;
  box-sizing: border-box;
}

.action-buttons-left,
.action-buttons-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2cqw;
}

.action-circle-btn {
  width: 8cqw;
  height: 8cqw;
  border-radius: 32px;
  background: var(--off-white);
  border: none;
  box-shadow: 5px 5px 10px rgba(170,170,204,0.5), -5px -5px 10px white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
  padding: 0;
  min-width: 32px;
  min-height: 32px;
}

.action-circle-btn:active {
  transform: scale(0.92);
}

.action-circle-icon-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.action-bar-center {
  flex: 1;
}

.action-bar-inner {
  position: relative;
  display: flex;
  align-items: stretch;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-red);
  min-height: 17cqw;
}

.action-bar-left-accent {
  width: 4.2cqw;
  min-width: 17px;
  background: var(--info-bar-highlight);
  border-radius: 10px 0 0 10px;
  flex-shrink: 0;
}

.action-bar-content {
  flex: 1;
  background: var(--info-bar-bg);
  border-radius: 0 10px 10px 0;
  padding: 3cqw 4cqw 3cqw 3cqw;
  display: flex;
  flex-direction: column;
  gap: 2cqw;
  box-sizing: border-box;
  min-height: 17cqw;
}

.info-hint-row {
  display: flex;
  align-items: center;
  gap: 1cqw;
}

.info-icon {
  font-size: 10px;
  flex-shrink: 0;
  color: rgba(250, 245, 248, 0.8);
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
  color: var(--text-primary);
  cursor: pointer;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  box-shadow: var(--shadow-status-pill);
  transition: transform 0.1s ease;
}

.info-sell-btn:active {
  transform: scale(0.95);
}

.info-sell-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--off-white);
  opacity: 0.92;
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.info-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sell-price-badge {
  width: 6cqw;
  height: 6cqw;
  min-width: 24px;
  min-height: 24px;
  background: var(--cream);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.price-val {
  font-size: 11px;
  font-weight: 900;
  color: var(--warm-brown-icon);
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1;
}

.merge-chain-row {
  display: flex;
  align-items: center;
  gap: 0.5cqw;
  flex-wrap: nowrap;
}

.merge-chain-item {
  font-size: 14px;
  opacity: 0.35;
  filter: grayscale(1);
  transition: var(--interactive-transition);
}

.merge-chain-item.current {
  opacity: 1;
  filter: none;
  transform: scale(1.3);
}

.merge-chain-arrow {
  font-size: 10px;
  color: rgba(250, 245, 248, 0.4);
}

.info-divider {
  height: 1px;
  background: rgba(250, 245, 248, 0.25);
  width: 100%;
}

.info-empty-state {
  display: flex;
  flex-direction: column;
  gap: 2cqw;
  width: 100%;
}

@media (max-height: 760px) {
  #bottom-action-bar {
    padding: 1cqw 2cqw calc(2cqw + env(safe-area-inset-bottom, 0px));
    gap: 1.5cqw;
  }
  .action-bar-inner {
    min-height: 14cqw;
  }
  .action-bar-content {
    min-height: 14cqw;
    padding: 2cqw 3cqw 2cqw 2cqw;
    gap: 1cqw;
  }
  .action-circle-btn {
    min-width: 28px;
    min-height: 28px;
  }
  .action-circle-icon-img {
    width: 14px;
    height: 14px;
  }
  .info-hint-text {
    font-size: 10px;
  }
  .merge-chain-item {
    font-size: 11px;
  }
}
</style>
