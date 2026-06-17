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
    <StatusBar @open-map="showMap = true" />

    <!-- Board grid (includes BossHeader inside) -->
    <BoardGrid />

    <!-- Bottom action bar -->
    <BottomActionBar
      :hasSelectedItem="hasSelectedItem"
      :selectedItemName="selectedItemName"
      :selectedItemLevel="selectedItemLevel"
      :selectedItemSellPrice="selectedItemSellPrice"
      :selectedItemIsGenerator="selectedItemIsGenerator"
      :selectedGeneratorInfo="selectedGeneratorInfo"
      :selectedItemId="selectedItem?.id ?? null"
      :hint="hint"
      :mergeChain="mergeChain"
      :canSell="canSellSelected"
      :sellLabel="i18nStore.t('itemInfo.sell') || '卖出'"
      @sell="onSell"
      @nav-click="handleNavClick"
    />

    <!-- Overlays -->
    <DialogueOverlay />
    <LoopSummaryOverlay
      :visible="showLoopSummary"
      :targetLoopIndex="pendingBoardLoop ?? undefined"
      @close="onCloseLoopSummary"
      @next-loop="onNextLoopFromSummary"
    />
    <MapOverlay
      :visible="showMap"
      @close="showMap = false"
      @switch-board="onSwitchBoard"
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
    <TouchOverlay />

    <!-- Bottom Sheets -->
    <InventorySheet />
    <HeroineSheet />
    <GachaSheet />
    <CollectionSheet />
    <DailyOrderSheet :onEndLoop="finishSettlingAndShowSummary" />
    <AchievementSheet />
    <CGAlbumSheet />
    <ShopSheet />
    <AffectionPanel />
    <CharacterDetailSheet />
    <AffectionShopSheet />

    <!-- Particle & Toast layers -->
    <ParticleLayer />
    <ToastRoot />
    <AffectionToast />

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onMounted, onUnmounted } from 'vue'
import { useGameInit } from '@/composables/useGameInit'
import { useGameLoop } from '@/composables/useGameLoop'
import { useAutoSave } from '@/composables/useAutoSave'
 import { useSheet } from '@/composables/useSheet'
 import { useEventBus } from '@/composables/useEventBus'
 import { useI18nStore } from '@/stores/i18nStore'
 import { useBoardStore } from '@/stores/boardStore'
 import { useConfigStore } from '@/stores/configStore'
 import { useDailyBuffStore } from '@/stores/dailyBuffStore'
 import { useHeroineStore } from '@/stores/heroineStore'
import { useLoopStore } from '@/stores/loopStore'
import { useAudio } from '@/composables/useAudio'
import { useEffects } from '@/composables/useEffects'
import { BoardService } from '@/services/BoardService'
import { useApplyDeps } from '@/composables/useApplyDeps'
import { applyResolveResult } from '@/composables/useGameLoop'

// Board components
import BoardGrid from '@/components/board/BoardGrid.vue'
import StatusBar from '@/components/board/StatusBar.vue'
import BottomActionBar from '@/components/board/BottomActionBar.vue'

// Overlay components
import DialogueOverlay from '@/components/overlays/DialogueOverlay.vue'
import LoopSummaryOverlay from '@/components/overlays/LoopSummaryOverlay.vue'
import MapOverlay from '@/components/overlays/MapOverlay.vue'
import ParadeOverlay from '@/components/overlays/ParadeOverlay.vue'
import GameCompleteOverlay from '@/components/overlays/GameCompleteOverlay.vue'
import VNReaderOverlay from '@/components/overlays/VNReaderOverlay.vue'
import TouchOverlay from '@/components/overlays/TouchOverlay.vue'

// Sheet components
import InventorySheet from '@/components/sheets/InventorySheet.vue'
import HeroineSheet from '@/components/sheets/HeroineSheet.vue'
import GachaSheet from '@/components/sheets/GachaSheet.vue'
import CollectionSheet from '@/components/sheets/CollectionSheet.vue'
import DailyOrderSheet from '@/components/sheets/DailyOrderSheet.vue'
import AchievementSheet from '@/components/sheets/AchievementSheet.vue'
import CGAlbumSheet from '@/components/sheets/CGAlbumSheet.vue'
import ShopSheet from '@/components/sheets/ShopSheet.vue'
import AffectionPanel from '@/components/sheets/AffectionPanel.vue'
import CharacterDetailSheet from '@/components/sheets/CharacterDetailSheet.vue'
import AffectionShopSheet from '@/components/sheets/AffectionShopSheet.vue'

// Common components
import ParticleLayer from '@/components/common/ParticleLayer.vue'
import ToastRoot from '@/components/common/ToastRoot.vue'
import AffectionToast from '@/components/common/AffectionToast.vue'

// --- Stores ---
const i18nStore = useI18nStore()
const boardStore = useBoardStore()
const configStore = useConfigStore()
const dailyBuffStore = useDailyBuffStore()
const heroineStore = useHeroineStore()
const effects = useEffects()
const loopStore = useLoopStore()
const applyDeps = useApplyDeps()
const showMap = ref(false)

// --- Info bar logic (wired to board selection) ---
const hint = computed(() => {
  return i18nStore.t('board.canMerge') || '还可以合成哦'
})

const selectedItem = computed(() => {
  if (boardStore.selectedCell !== null) {
    const itemId = boardStore.getCell(boardStore.selectedCell)
    if (!itemId) return null
    return configStore.items[itemId] || null
  }
  if (boardStore.selectedInfoItemId !== null) {
    return configStore.items[boardStore.selectedInfoItemId] || null
  }
  return null
})

const hasSelectedItem = computed(() => selectedItem.value !== null)

const canSellSelected = computed(() => {
  if (boardStore.selectedInfoItemId !== null) return false
  if (boardStore.selectedCell === null) return false
  return boardStore.canSellItem(boardStore.selectedCell)
})

const selectedItemName = computed(() => selectedItem.value?.name || '')

const selectedItemLevel = computed(() => selectedItem.value?.level || 0)

const selectedItemSellPrice = computed(() => {
  return BoardService.calculateSellPrice({
    item: selectedItem.value,
    sellPriceUpActive: dailyBuffStore.hasBuff('sell_price_up'),
    sellPriceBoost: configStore.boardEconomy.sellPriceBoost,
  })
})

const mergeChain = computed(() => {
  return BoardService.getMergeChain({
    item: selectedItem.value,
    items: configStore.items,
  })
})

const selectedItemIsGenerator = computed(() => selectedItem.value?.type === 'GENERATOR')

const selectedGeneratorInfo = computed(() => {
  return BoardService.getGeneratorInfo({
    item: selectedItem.value,
    items: configStore.items,
    generators: configStore.generators,
  })
})

const onSell = () => {
  const cellIndex = boardStore.selectedCell
  if (cellIndex === null) return
  const sellPriceUpActive = dailyBuffStore.hasBuff('sell_price_up')
  const recycleBonus = heroineStore.getEffectValue('recycle_bonus')
  const result = boardStore.executeSell(cellIndex, sellPriceUpActive, recycleBonus || 0)
  if (!result) return
  const energyAmount = result.applyTo.energy?.add ?? 0
  applyResolveResult(result, applyDeps)
  if (energyAmount > 0) {
    effects.showToast(i18nStore.t('energy.recycleGained', { count: energyAmount }) || `+${energyAmount} 体力`, 'info')
  }
  boardStore.selectCell(null)
}

const pendingBoardLoop = ref<number | null>(null)

function onSwitchBoard(loopIndex: number) {
  if (loopIndex === boardStore.activeBoardLoop) {
    showMap.value = false
    return
  }

  const targetSnapshot = boardStore.boardRegistry.get(loopIndex)
  if (targetSnapshot?.status === 'completed') {
    pendingBoardLoop.value = loopIndex
    showMap.value = false
    showLoopSummary.value = true
    return
  }

  const { resolveResult: rr1 } = boardStore.restoreBoard(loopIndex)
  applyResolveResult(rr1, applyDeps)
  showMap.value = false
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
  completeCurrentLoop,
  finishSettlingAndShowSummary
} = useGameInit()

// --- Game Loop composable (cross-store communication) ---
useGameLoop()

// --- Auto-save (periodic + visibility + beforeunload) ---
useAutoSave(configStore.uiAnimation.autoSaveInterval)

// --- Event bus for loop completion ---
const bus = useEventBus()

// --- Sheet management ---
const inventorySheet = useSheet('inventory-sheet')
const heroineSheet = useSheet('heroine-sheet')
const gachaSheet = useSheet('gacha-sheet')
const collectionSheet = useSheet('collection-sheet')
const dailyOrderSheet = useSheet('daily-sheet')
const achievementSheet = useSheet('achievement-sheet')
const cgAlbumSheet = useSheet('cg-album-sheet')
const shopSheet = useSheet('shop-sheet')
const affectionSheet = useSheet('affection-panel')

const sheetMap: Record<string, { open: () => void }> = {
  inventory: inventorySheet,
  heroine: heroineSheet,
  gacha: gachaSheet,
  collection: collectionSheet,
  dailyOrder: dailyOrderSheet,
  achievement: achievementSheet,
  'cg-album': cgAlbumSheet,
  shop: shopSheet,
  affection: affectionSheet
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
  affectionSheet.isOpen.value = false
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

function onAllDailyOrdersCompleted() {
  if (loopStore.loopStatus === 'settling') {
    finishSettlingAndShowSummary()
  }
}

function onCloseLoopSummary() {
  closeLoopSummary()
  pendingBoardLoop.value = null
}

function onNextLoopFromSummary() {
  if (pendingBoardLoop.value !== null) {
    const { resolveResult: rr2 } = boardStore.restoreBoard(pendingBoardLoop.value)
    applyResolveResult(rr2, applyDeps)
    pendingBoardLoop.value = null
    closeLoopSummary()
    return
  }
  onNextLoop()
}

// --- Lifecycle ---
onMounted(async () => {
  clickSoundHandler = setupClickSound()
  bus.on('loop:shouldComplete', onLoopShouldComplete)
  bus.on('dailyOrders:allCompleted', onAllDailyOrdersCompleted)
  init().catch((e) => {
    console.error('[GameView] Init failed', e)
  })
})

onUnmounted(() => {
  if (clickSoundHandler) {
    document.removeEventListener('click', clickSoundHandler)
  }
  bus.off('loop:shouldComplete', onLoopShouldComplete)
  bus.off('dailyOrders:allCompleted', onAllDailyOrdersCompleted)
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
  color: var(--text-dark);
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
  transition: var(--interactive-transition);
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
  color: var(--text-muted-alt);
}


</style>
