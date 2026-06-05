<template>
  <!-- Loading / Language Select (shown before game is ready) -->
  <div v-if="!gameReady" id="loading-screen">
    <!-- Language selection overlay -->
    <div v-if="showLangSelect" id="lang-select-overlay">
      <div class="lang-select-card">
        <h2>选择语言 / Select Language</h2>
        <div class="lang-buttons">
          <button class="lang-btn" @click="onLangSelect('zh-CN')">🇨🇳 中文</button>
          <button class="lang-btn" @click="onLangSelect('en')">🇬🇧 English</button>
        </div>
      </div>
    </div>
    <!-- Loading spinner (when language is set but game is loading) -->
    <div v-else id="loading-overlay">
      <div class="loading-spinner" />
      <div class="loading-text">{{ i18nStore.loaded ? i18nStore.t('loading') : '加载中...' }}</div>
    </div>
  </div>

  <!-- Main Game UI (shown after init completes) -->
  <div v-else id="game-container">
    <!-- Top status bar: time, currency, rank -->
    <StatusBar />

    <!-- Board grid (includes BossHeader inside) -->
    <BoardGrid />

    <!-- Bottom action bar -->
    <div id="bottom-action-bar">
      <div class="action-buttons-left">
        <button class="action-circle-btn" @click="handleNavClick('shop')">
          <span class="action-circle-icon">🏪</span>
        </button>
        <button class="action-circle-btn" @click="handleNavClick('heroine')">
          <span class="action-circle-icon">👩</span>
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
              <button v-if="canSellSelected" class="info-sell-btn" @click="onSell">
                {{ i18nStore.t('itemInfo.sell') || '卖出' }}
              </button>
            </div>
            <div v-if="mergeChain.length > 0" class="merge-chain-row">
              <template v-for="(item, idx) in mergeChain" :key="item.id">
                <span
                  class="merge-chain-item"
                  :class="{ current: item.id === selectedItem?.id }"
                >{{ item.emoji }}</span>
                <span v-if="idx < mergeChain.length - 1" class="merge-chain-arrow">→</span>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div class="action-buttons-right">
        <button class="action-circle-btn" @click="handleNavClick('gacha')">
          <span class="action-circle-icon">🎰</span>
        </button>
        <button class="action-circle-btn" @click="handleNavClick('collection')">
          <span class="action-circle-icon">📖</span>
        </button>
      </div>
    </div>

    <!-- Overlays -->
    <DialogueOverlay />
    <LoopSummaryOverlay
      :visible="showLoopSummary"
      @close="closeLoopSummary"
      @next-loop="onNextLoop"
    />
    <ParadeOverlay
      :visible="showParade"
      @close="closeParade"
    />
    <GameCompleteOverlay
      :visible="showGameComplete"
      @close="closeGameComplete"
    />
    <VNReaderOverlay />

    <!-- Bottom Sheets -->
    <InventorySheet />
    <HeroineSheet />
    <GachaSheet />
    <CollectionSheet />
    <DailyOrderSheet />
    <AchievementSheet />
    <CGAlbumSheet />
    <ShopSheet />

    <!-- Particle & Toast layers -->
    <ParticleLayer />
    <ToastRoot />

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onMounted, onUnmounted } from 'vue'
import { useGameInit } from '@/composables/useGameInit'
import { useGameLoop } from '@/composables/useGameLoop'
import { useAutoSave } from '@/composables/useAutoSave'
import { useSheet } from '@/composables/useSheet'
import { useEventBus } from '@/composables/useEventBus'
import { useI18nStore } from '@/stores/i18nStore'
import { useBoardStore } from '@/stores/boardStore'
import { useConfigStore } from '@/stores/configStore'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useDailyBuffStore } from '@/stores/dailyBuffStore'
import { useAudio } from '@/composables/useAudio'

// Board components
import BoardGrid from '@/components/board/BoardGrid.vue'
import StatusBar from '@/components/board/StatusBar.vue'

// Overlay components
import DialogueOverlay from '@/components/overlays/DialogueOverlay.vue'
import LoopSummaryOverlay from '@/components/overlays/LoopSummaryOverlay.vue'
import ParadeOverlay from '@/components/overlays/ParadeOverlay.vue'
import GameCompleteOverlay from '@/components/overlays/GameCompleteOverlay.vue'
import VNReaderOverlay from '@/components/overlays/VNReaderOverlay.vue'

// Sheet components
import InventorySheet from '@/components/sheets/InventorySheet.vue'
import HeroineSheet from '@/components/sheets/HeroineSheet.vue'
import GachaSheet from '@/components/sheets/GachaSheet.vue'
import CollectionSheet from '@/components/sheets/CollectionSheet.vue'
import DailyOrderSheet from '@/components/sheets/DailyOrderSheet.vue'
import AchievementSheet from '@/components/sheets/AchievementSheet.vue'
import CGAlbumSheet from '@/components/sheets/CGAlbumSheet.vue'
import ShopSheet from '@/components/sheets/ShopSheet.vue'

// Common components
import ParticleLayer from '@/components/common/ParticleLayer.vue'
import ToastRoot from '@/components/common/ToastRoot.vue'

// --- Stores ---
const i18nStore = useI18nStore()
const boardStore = useBoardStore()
const configStore = useConfigStore()
const currencyStore = useCurrencyStore()
const dailyBuffStore = useDailyBuffStore()

// --- Info bar logic (wired to board selection) ---
const hint = computed(() => {
  return i18nStore.t('board.canMerge') || '还可以合成哦'
})

const selectedItem = computed(() => {
  if (boardStore.selectedCell === null) return null
  const itemId = boardStore.getCell(boardStore.selectedCell)
  if (!itemId) return null
  return configStore.items[itemId] || null
})

const hasSelectedItem = computed(() => selectedItem.value !== null)

const canSellSelected = computed(() => {
  if (boardStore.selectedCell === null) return false
  return boardStore.canSellItem(boardStore.selectedCell)
})

const selectedItemName = computed(() => selectedItem.value?.name || '')

const selectedItemLevel = computed(() => selectedItem.value?.level || 0)

const mergeChain = computed(() => {
  if (!selectedItem.value) return []
  const chain = selectedItem.value.chain
  return Object.values(configStore.items)
    .filter((item: any) => item.chain === chain && !item.type)
    .sort((a: any, b: any) => a.level - b.level)
})

const onSell = () => {
  const cellIndex = boardStore.selectedCell
  if (cellIndex === null) return
  const item = selectedItem.value
  if (!item) return
  if (!boardStore.canSellItem(cellIndex)) return
  let sellPrice = item.sellPrice || item.value || 0
  if (dailyBuffStore.hasBuff('sell_price_up') && sellPrice > 0) {
    sellPrice = Math.ceil(sellPrice * 1.5)
  }
  if (sellPrice > 0) {
    currencyStore.addGold(sellPrice)
  }
  boardStore.clearCell(cellIndex)
  boardStore.selectCell(null)
}

// --- Game Init composable (lifecycle management) ---
const {
  gameReady,
  showLangSelect,
  showLoopSummary,
  showParade,
  showGameComplete,
  init,
  onLangSelect,
  onNextLoop,
  closeLoopSummary,
  closeParade,
  closeGameComplete,
  completeCurrentLoop
} = useGameInit()

// --- Game Loop composable (cross-store communication) ---
useGameLoop()

// --- Auto-save (periodic + visibility + beforeunload) ---
useAutoSave(30000)

// --- Event bus for loop completion ---
const bus = useEventBus()

// --- Sheet management ---
const inventorySheet = useSheet('inventory-sheet')
const heroineSheet = useSheet('heroine-sheet')
const gachaSheet = useSheet('gacha-sheet')
const collectionSheet = useSheet('collection-sheet')
const dailyOrderSheet = useSheet('daily-order-sheet')
const achievementSheet = useSheet('achievement-sheet')
const cgAlbumSheet = useSheet('cg-album-sheet')
const shopSheet = useSheet('shop-sheet')

const sheetMap: Record<string, { open: () => void }> = {
  inventory: inventorySheet,
  heroine: heroineSheet,
  gacha: gachaSheet,
  collection: collectionSheet,
  achievement: achievementSheet,
  shop: shopSheet
}

function handleNavClick(tab: string) {
  closeAllSheets()

  const sheet = sheetMap[tab]
  if (sheet) {
    sheet.open()
  }
}

function closeAllSheets() {
  inventorySheet.isOpen.value = false
  heroineSheet.isOpen.value = false
  gachaSheet.isOpen.value = false
  collectionSheet.isOpen.value = false
  dailyOrderSheet.isOpen.value = false
  achievementSheet.isOpen.value = false
  cgAlbumSheet.isOpen.value = false
  shopSheet.isOpen.value = false
}

// --- Click sound for interactive elements ---
const audio = useAudio()

function setupClickSound() {
  const handler = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest(
      'button, .nav-item, .sheet-close, .gacha-pull-btn, .ad-btn, .shop-buy-btn, .heroine-upgrade-btn, .daily-submit-btn, .daily-carousel-submit-btn, .achievement-claim-btn, .inventory-use-btn, .unlock-yes, .unlock-no, .recycle-yes, .recycle-no, .cg-btn, .cg-memory-unlock-btn, .fragment-unlock-btn, .action-circle-btn, .info-sell-btn'
    )
    if (target) {
      audio.playSound('btn_click')
    }
  }
  document.addEventListener('click', handler, { passive: true })
  return handler
}

let clickSoundHandler: ((e: MouseEvent) => void) | null = null

// --- Loop completion event listener ---
function onLoopShouldComplete() {
  completeCurrentLoop()
}

// --- Lifecycle ---
onMounted(async () => {
  clickSoundHandler = setupClickSound()
  bus.on('loop:shouldComplete', onLoopShouldComplete)
  init().catch((e) => {
    console.error('[GameView] Init failed', e)
  })
})

onUnmounted(() => {
  if (clickSoundHandler) {
    document.removeEventListener('click', clickSoundHandler)
  }
  bus.off('loop:shouldComplete', onLoopShouldComplete)
})
</script>

<style scoped>
/* ===== Loading Screen ===== */
#loading-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffeef8, #fff0e6);
  z-index: 9999;
}

#lang-select-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.lang-select-card {
  background: white;
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.lang-select-card h2 {
  font-size: 20px;
  margin-bottom: 24px;
  color: #333;
}

.lang-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.lang-btn {
  padding: 12px 32px;
  border: 2px solid #ff6b9d;
  border-radius: 12px;
  background: white;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-btn:hover {
  background: #ff6b9d;
  color: white;
}

#loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #ffe0ec;
  border-top-color: #ff6b9d;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #666;
}

/* ===== Bottom Action Bar (Figma design) ===== */
#bottom-action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2cqw;
  width: 100cqw;
  padding: 2cqw 3cqw 3cqw;
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
  box-shadow: 5px 5px 10px rgba(170, 170, 204, 0.5), -5px -5px 10px #fff;
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

.action-circle-icon {
  font-size: 14px;
  line-height: 1;
}

.action-bar-center {
  flex: 1;
  max-width: 62cqw;
}

.action-bar-inner {
  position: relative;
  display: flex;
  align-items: stretch;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0px 1px 3.7px #60190F;
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
  transition: all 0.2s ease;
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
</style>
