<!-- ============================================================
     CollectionSheet.vue — Collection bottom sheet
     ============================================================
     Replaces #collection-sheet from index.html lines 546-585.
     Has tabs for items, gacha cards, and fragments.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="collection-sheet"
    :title="i18nStore.t('collection.panelTitle')"
    icon="📖"
  >
    <div class="collection-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="collection-tab"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>
    <div class="sheet-sub">{{ completionPct }}</div>

    <!-- Items tab -->
    <div v-if="activeTab === 'items'" id="collection-list" class="collection-grid">
      <div
        v-for="(items, chainId) in collectionStore.chainGroups"
        :key="chainId"
        class="collection-chain"
      >
        <div class="chain-label">{{ getChainName(chainId) }}</div>
        <div class="chain-items">
          <div
            v-for="item in items"
            :key="item.id"
            class="collection-cell"
            :class="{ discovered: item.discovered }"
          >
            <span class="cell-emoji">{{ item.discovered ? item.emoji : '❓' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Gacha tab -->
    <div v-if="activeTab === 'gacha'" id="gacha-collection-list" class="collection-grid">
      <div
        v-for="card in gachaPoolItems"
        :key="card.id"
        class="collection-cell"
        :class="{ discovered: collectionStore.gachaCollected.has(card.id), [card.rarity]: true }"
      >
        <span class="cell-emoji">{{ collectionStore.gachaCollected.has(card.id) ? card.emoji : '❓' }}</span>
      </div>
    </div>

    <!-- Fragments tab -->
    <div v-if="activeTab === 'fragments'" id="fragment-collection-list" class="collection-grid fragment-grid">
      <div v-if="fragmentList.length === 0" class="fragment-empty">
        🧩 {{ i18nStore.t('collection.tabFragments') }}
      </div>
      <div
        v-for="frag in fragmentList"
        :key="frag.id"
        class="fragment-card"
        :class="{ active: frag.hasFragments }"
      >
        <div class="fragment-lead">{{ frag.maleLead }}</div>
        <div class="fragment-title">{{ frag.title }}</div>
        <div class="fragment-count">🧩 ×{{ frag.fragmentCount }}</div>
        <div class="fragment-progress">📖 {{ frag.unlockedStories }}</div>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useCollectionStore } from '../../stores/collectionStore'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'
import { useCGAlbumStore } from '../../stores/cgAlbumStore'

const { isOpen } = useSheet('collection-sheet')
const collectionStore = useCollectionStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()
const cgAlbumStore = useCGAlbumStore()

const activeTab = ref<'items' | 'gacha' | 'fragments'>('items')

const tabs = computed(() => [
  { id: 'items' as const, icon: '📦', label: i18nStore.t('collection.tabItems') },
  { id: 'gacha' as const, icon: '🎁', label: i18nStore.t('collection.tabGacha') },
  { id: 'fragments' as const, icon: '🧩', label: i18nStore.t('collection.tabFragments') }
])

const completionPct = computed(() => {
  const discovered = collectionStore.discoveredItemsCount
  const total = Object.keys(configStore.items).length
  const pct = total > 0 ? Math.round((discovered / total) * 100) : 0
  return `${discovered}/${total} (${pct}%)`
})

const gachaPoolItems = computed(() => configStore.gachaPool)

const fragmentList = computed(() =>
  cgAlbumStore.getCGList().map(({ id, data }) => ({
    id,
    title: data.title || id,
    maleLead: data.maleLead || '???',
    fragmentCount: data.memoryFragments,
    unlockedStories: data.unlocked.length,
    hasFragments: data.memoryFragments > 0
  }))
)

function getChainName(chainId: string): string {
  return configStore.chainNames[chainId] || chainId
}

function switchTab(tab: 'items' | 'gacha' | 'fragments') {
  activeTab.value = tab
  collectionStore.switchTab(tab)
}
</script>

<style scoped>
/* ---- Collection Tabs ---- */
.collection-tabs {
  display: flex;
  gap: 0;
  padding: 0 12px;
  margin-top: 4px;
  flex-shrink: 0;
}

.collection-tab {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto;
  position: relative;
  z-index: 10;
}

.collection-tab:first-child {
  border-radius: 10px 0 0 0;
}

.collection-tab:last-child {
  border-radius: 0 10px 0 0;
}

.collection-tab.active {
  background: #fff;
  border-bottom-color: var(--vn-pink);
  color: var(--vn-pink);
}

.collection-tab:not(.active) {
  color: var(--text-light);
}

/* ---- Collection Grid ---- */
.collection-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  max-width: 100%;
  overflow: visible;
}

/* ---- Collection Chain ---- */
.collection-chain {
  background: white;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  max-width: 100%;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chain-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-medium);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
}

.chain-items {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* ---- Collection Cell ---- */
.collection-cell {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  opacity: 0.6;
  filter: grayscale(1);
  min-width: 0;
  min-height: 0;
  padding: 4px 2px;
  width: 40px;
  height: 40px;
  font-size: 20px;
}

.collection-cell.discovered {
  opacity: 1;
  filter: grayscale(0);
  background: #fff;
  border-width: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.collection-cell.SSR {
  border: 1px solid rgba(255, 215, 0, 0.4);
}

.collection-cell.SR {
  border: 1px solid rgba(200, 100, 255, 0.3);
}

/* ---- Gacha Collection Section ---- */
.gacha-collection-section {
  margin-bottom: 8px;
}

.gacha-collection-header {
  margin-bottom: 6px;
}

.gacha-collection-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  max-width: 100%;
  overflow: visible;
}

.gacha-collection-card {
  background: #f5f5f5;
  border: 2px solid #ddd;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  opacity: 0.5;
  filter: grayscale(0.8);
  transition: all 0.2s;
  min-width: 0;
  min-height: 0;
}

.gacha-collection-card.collected {
  opacity: 1;
  filter: grayscale(0);
  background: #fff;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.gacha-collection-card.collected:active {
  transform: scale(0.95);
  transition: transform 0.1s ease;
}

.gacha-collection-card.collected.rarity-ssr {
  background: linear-gradient(135deg, #fff9e6, #fff);
  border-color: var(--rarity-ssr);
}

.gacha-collection-card.collected.rarity-sr {
  background: linear-gradient(135deg, #f8f0ff, #fff);
  border-color: var(--rarity-sr);
}

.gacha-collection-card.collected.rarity-r {
  background: linear-gradient(135deg, #f0f5ff, #fff);
  border-color: var(--rarity-r);
}

.gacha-collection-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--text-light);
  font-size: 14px;
}

/* ---- Fragment Grid ---- */
.fragment-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.fragment-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  opacity: 0.45;
  filter: grayscale(0.6);
  transition: all 0.2s;
}

.fragment-card.active {
  opacity: 1;
  filter: grayscale(0);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(233, 30, 140, 0.15);
  box-shadow: 0 2px 8px rgba(233, 30, 140, 0.06);
}

.fragment-lead {
  font-size: 12px;
  font-weight: 700;
  color: var(--vn-pink, #e91e8c);
}

.fragment-title {
  font-size: 11px;
  color: var(--text-medium);
  text-align: center;
  line-height: 1.3;
}

.fragment-count {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dark);
}

.fragment-progress {
  font-size: 11px;
  color: var(--text-light);
}

.fragment-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 0;
  color: var(--text-light);
  font-size: 14px;
}
</style>
