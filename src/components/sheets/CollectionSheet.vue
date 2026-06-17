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

    <!-- ==================== Items Tab ==================== -->
    <div v-if="activeTab === 'items'" class="items-tab-content">
      <div
        v-for="chainId in orderedChains"
        :key="chainId"
        class="chain-accordion"
        :class="{ expanded: expandedChain === chainId }"
      >
        <div
          class="chain-accordion-header"
          :class="getChainColorClass(chainId)"
          @click="toggleChain(chainId)"
        >
          <span class="chain-header-icon">{{ getChainIcon(chainId) }}</span>
          <span class="chain-header-name">{{ getChainName(chainId) }}</span>
          <span class="chain-header-pct">{{ getChainProgress(chainId) }}</span>
          <span v-if="isChainComplete(chainId)" class="chain-complete-badge">✅</span>
          <span class="chain-expand-icon">{{ expandedChain === chainId ? '▾' : '▸' }}</span>
        </div>

        <Transition name="accordion">
          <div v-if="expandedChain === chainId" class="chain-accordion-body">
            <div class="evolution-tree">
              <template v-for="(item, idx) in getChainItems(chainId)" :key="item.id">
                <div
                  class="evo-node"
                  :class="{ discovered: item.discovered }"
                >
                  <span class="evo-emoji">{{ item.discovered ? item.emoji : '❓' }}</span>
                  <span class="evo-level">Lv.{{ item.level }}</span>
                </div>
                <span v-if="idx < getChainItems(chainId).length - 1" class="evo-arrow">→</span>
              </template>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- ==================== Gacha Tab ==================== -->
    <div v-if="activeTab === 'gacha'" class="gacha-tab-content">
      <div class="gacha-filter-bar">
        <button
          v-for="f in gachaFilters"
          :key="f.id"
          class="gacha-filter-btn"
          :class="{ active: gachaFilter === f.id }"
          @click="gachaFilter = f.id"
        >
          {{ f.label }}
        </button>
      </div>

      <div class="gacha-stats-row">
        <span class="gacha-stat ssr-stat">👑 {{ collectionStore.gachaSSRCount }}/{{ ssrTotal }}</span>
        <span class="gacha-stat sr-stat">💜 {{ collectionStore.gachaSRCount }}/{{ srTotal }}</span>
        <span class="gacha-stat r-stat">💙 {{ collectionStore.gachaRCount }}/{{ rTotal }}</span>
      </div>

      <!-- SSR Section -->
      <div v-if="showGachaSection('SSR')" class="gacha-section">
        <div class="gacha-section-title ssr-title">👑 SSR 传说</div>
        <div class="gacha-ssr-grid">
          <div
            v-for="card in filteredSSR"
            :key="card.id"
            class="gacha-ssr-card"
            :class="{ collected: card.collected }"
          >
            <span class="ssr-card-badge">SSR</span>
            <span class="ssr-card-emoji">{{ card.collected ? card.icon : '❓' }}</span>
            <div class="ssr-card-info">
              <span class="ssr-card-name">{{ card.collected ? card.name : '???' }}</span>
              <span class="ssr-card-lead">{{ getSSRLeadName(card) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SR Section -->
      <div v-if="showGachaSection('SR')" class="gacha-section">
        <div class="gacha-section-title sr-title">💜 SR 稀有</div>
        <div class="gacha-sr-grid">
          <div
            v-for="card in filteredSR"
            :key="card.id"
            class="gacha-sr-cell"
            :class="{ collected: card.collected }"
          >
            <span class="sr-cell-emoji">{{ card.collected ? card.icon : '❓' }}</span>
            <span class="sr-cell-name">{{ card.collected ? card.name : '???' }}</span>
          </div>
        </div>
      </div>

      <!-- R Section -->
      <div v-if="showGachaSection('R')" class="gacha-section">
        <div class="gacha-section-title r-title">💙 R 普通</div>
        <div class="gacha-r-grid">
          <div
            v-for="card in filteredR"
            :key="card.id"
            class="gacha-r-cell"
            :class="{ collected: card.collected }"
          >
            <span class="r-cell-emoji">{{ card.collected ? card.icon : '❓' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== Fragments Tab ==================== -->
    <div v-if="activeTab === 'fragments'" class="fragments-tab-content">
      <div v-if="fragmentList.length === 0" class="fragment-empty">
        🧩 {{ i18nStore.t('collection.noMemoryData') }}
      </div>

      <div
        v-for="leadInfo in groupedByLead"
        :key="leadInfo.leadName"
        class="lead-section"
      >
        <div class="lead-section-header" :class="getLeadColorClass(leadInfo.leadName)">
          <span class="lead-avatar">{{ getLeadAvatarEmoji(leadInfo.leadName) }}</span>
          <div class="lead-header-info">
            <span class="lead-title">{{ getLeadTitle(leadInfo.leadName) }}</span>
            <span class="lead-progress">{{ leadInfo.totalUnlocked }}/{{ leadInfo.totalStories }} 章节</span>
          </div>
        </div>

        <div class="lead-cg-grid">
          <div
            v-for="frag in leadInfo.fragments"
            :key="frag.id"
            class="memory-card"
            :class="{ active: frag.hasAnyProgress, 'can-unlock': frag.canUnlockNext }"
            @click="openCGDetail(frag)"
          >
            <div class="memory-card-header">
              <span class="memory-card-title">{{ frag.title }}</span>
            </div>

            <div class="memory-chapters">
              <span
                v-for="i in 4"
                :key="i"
                class="chapter-dot"
                :class="getChapterStatus(frag, i - 1)"
              />
            </div>

            <div class="memory-progress">
              <div class="memory-progress-label">
                <span>🧩 {{ frag.fragmentCount }}/{{ fragmentCost }}</span>
              </div>
              <div class="memory-progress-bar">
                <div
                  class="memory-progress-fill"
                  :style="{ width: Math.min(100, (frag.fragmentCount / fragmentCost) * 100) + '%' }"
                />
              </div>
            </div>

            <div v-if="frag.canUnlockNext" class="memory-unlock-hint">
              ✨ 可解锁
            </div>
            <div v-else-if="frag.unlockedStories > 0" class="memory-unlocked-count">
              📖 {{ frag.unlockedStories }}/4
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseBottomSheet>

  <CGStoryDetailOverlay
    :visible="showCGDetail"
    :ssr-id="selectedCGSsrId"
    @close="showCGDetail = false"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useCollectionStore } from '../../stores/collectionStore'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'
import { useCGAlbumStore } from '../../stores/cgAlbumStore'
import CGStoryDetailOverlay from '../overlays/CGStoryDetailOverlay.vue'
import type { GachaPoolItem } from '../../types/game'

interface FragmentListItem {
  id: string
  title: string
  maleLeadId: string
  fragmentCount: number
  unlockedStories: number
  hasAnyProgress: boolean
  canUnlockNext: boolean
}

const { isOpen } = useSheet('collection-sheet')
const collectionStore = useCollectionStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()
const cgAlbumStore = useCGAlbumStore()

const activeTab = ref<'items' | 'gacha' | 'fragments'>('items')
const expandedChain = ref<string | null>(null)
const gachaFilter = ref<'all' | 'SSR' | 'SR' | 'R'>('all')
const showCGDetail = ref(false)
const selectedCGSsrId = ref('')

const tabs = computed(() => [
  { id: 'items' as const, icon: '📦', label: i18nStore.t('collection.tabItems') },
  { id: 'gacha' as const, icon: '🎁', label: i18nStore.t('collection.tabGacha') },
  { id: 'fragments' as const, icon: '🧩', label: i18nStore.t('collection.tabFragments') }
])

const gachaFilters = computed(() => [
  { id: 'all' as const, label: '全部' },
  { id: 'SSR' as const, label: '👑 SSR' },
  { id: 'SR' as const, label: '💜 SR' },
  { id: 'R' as const, label: '💙 R' }
])

const completionPct = computed(() => {
  const discovered = collectionStore.discoveredItemsCount
  const total = Object.keys(configStore.items).length
  const pct = total > 0 ? Math.round((discovered / total) * 100) : 0
  return `${discovered}/${total} (${pct}%)`
})

const orderedChains = computed(() => configStore.chains || [])

const fragmentCost = computed(() => configStore.fragmentToStory || 60)

// ---- Items Tab ----
function getChainName(chainId: string): string {
  return configStore.chainNames[chainId] || chainId
}

function getChainIcon(chainId: string): string {
  return configStore.chainIcons[chainId] || '📦'
}

function getChainColorClass(chainId: string): string {
  switch (chainId) {
    case 'lips': return 'chain-lips'
    case 'perfume': return 'chain-perfume'
    case 'study': return 'chain-study'
    case 'food': return 'chain-food'
    default: return ''
  }
}

function getChainItems(chainId: string) {
  const groups = collectionStore.chainGroups
  return groups[chainId] || []
}

function getChainProgress(chainId: string): string {
  const items = getChainItems(chainId)
  const discovered = items.filter(i => i.discovered).length
  return `${discovered}/${items.length}`
}

function isChainComplete(chainId: string): boolean {
  return collectionStore.isInChainCompleted(chainId)
}

function toggleChain(chainId: string) {
  expandedChain.value = expandedChain.value === chainId ? null : chainId
}

// ---- Gacha Tab ----
const ssrTotal = computed(() => collectionStore.gachaByRarity.SSR?.length || 0)
const srTotal = computed(() => collectionStore.gachaByRarity.SR?.length || 0)
const rTotal = computed(() => collectionStore.gachaByRarity.R?.length || 0)

const filteredSSR = computed(() => collectionStore.gachaByRarity.SSR || [])
const filteredSR = computed(() => collectionStore.gachaByRarity.SR || [])
const filteredR = computed(() => collectionStore.gachaByRarity.R || [])

function showGachaSection(rarity: string): boolean {
  return gachaFilter.value === 'all' || gachaFilter.value === rarity
}

function getSSRLeadName(card: GachaPoolItem): string {
  const cgId = card.value?.cgId
  if (!cgId) return ''
  const storyConfig = configStore.cgStories[card.id]
  return storyConfig?.maleLeadId || ''
}

// ---- Fragments Tab ----
const fragmentList = computed(() =>
  cgAlbumStore.getCGList().map(({ id, data }) => ({
    id,
    title: data.title || id,
    maleLeadId: data.maleLeadId || '???',
    fragmentCount: data.memoryFragments,
    unlockedStories: data.unlocked.length,
    hasAnyProgress: data.memoryFragments > 0 || data.unlocked.length > 0,
    canUnlockNext: cgAlbumStore.canUnlockNext(id)
  }))
)

const groupedByLead = computed(() => {
  const groups: Record<string, FragmentListItem[]> = {}
  fragmentList.value.forEach(frag => {
    const lead = frag.maleLeadId
    if (!groups[lead]) groups[lead] = []
    groups[lead].push(frag)
  })

  const leadOrder = ['林墨白', 'Daniel', '司徒渊', '陆之昂']
  return leadOrder
    .filter(name => groups[name])
    .map(leadName => ({
      leadName,
      fragments: groups[leadName] || [],
      totalUnlocked: (groups[leadName] || []).reduce((sum, f) => sum + f.unlockedStories, 0),
      totalStories: (groups[leadName] || []).reduce((sum, _f) => sum + 4, 0)
    }))
})

function getLeadAvatarEmoji(lead: string): string {
  switch (lead) {
    case '林墨白': return '💄'
    case 'Daniel': return '🧪'
    case '司徒渊': return '📝'
    case '陆之昂': return '🍬'
    default: return '👤'
  }
}

function getLeadTitle(lead: string): string {
  switch (lead) {
    case '林墨白': return '魅惑口红 · 林墨白'
    case 'Daniel': return '优雅香氛 · Daniel'
    case '司徒渊': return '学霸才子 · 司徒渊'
    case '陆之昂': return '暖心美食 · 陆之昂'
    default: return lead
  }
}

function getLeadColorClass(lead: string): string {
  switch (lead) {
    case '林墨白': return 'lead-morven'
    case 'Daniel': return 'lead-daniel'
    case '司徒渊': return 'lead-yuan'
    case '陆之昂': return 'lead-lu'
    default: return ''
  }
}

function getChapterStatus(frag: FragmentListItem, idx: number): string {
  if (frag.unlockedStories > idx) return 'unlocked'
  if (frag.canUnlockNext && idx === frag.unlockedStories) return 'next'
  return 'locked'
}

function openCGDetail(frag: FragmentListItem) {
  selectedCGSsrId.value = frag.id
  showCGDetail.value = true
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
  transition: var(--interactive-transition);
  border-bottom: 3px solid transparent;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto;
  position: relative;
  z-index: 10;
}

.collection-tab:first-child { border-radius: 10px 0 0 0; }
.collection-tab:last-child { border-radius: 0 10px 0 0; }

.collection-tab.active {
  background: #fff;
  border-bottom-color: var(--vn-pink);
  color: var(--vn-pink);
}

.collection-tab:not(.active) {
  color: var(--text-light);
}

/* ==================== Items Tab ==================== */
.items-tab-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chain-accordion {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(181, 147, 116, 0.15);
  background: #fff;
}

.chain-accordion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.chain-accordion-header.chain-lips {
  background: #FFF0F3;
  border-left: 4px solid #F35683;
}

.chain-accordion-header.chain-perfume {
  background: #F3ECF6;
  border-left: 4px solid var(--rarity-sr);
}

.chain-accordion-header.chain-study {
  background: #EAF2F9;
  border-left: 4px solid #5D4E37;
}

.chain-accordion-header.chain-food {
  background: #FFF3E0;
  border-left: 4px solid #e67e22;
}

.chain-header-icon {
  font-size: 18px;
}

.chain-header-name {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-heading);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.chain-header-pct {
  font-size: 11px;
  font-weight: 700;
  color: #8A6D55;
  margin-left: auto;
}

.chain-complete-badge {
  font-size: 12px;
}

.chain-expand-icon {
  font-size: 12px;
  color: #B28265;
}

.chain-accordion-body {
  padding: 10px 12px 14px;
  background: rgba(255, 245, 238, 0.4);
}

.evolution-tree {
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.evo-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 42px;
  padding: 6px 2px;
  border-radius: 8px;
  background: #f5f5f5;
  border: 1px solid #eee;
  opacity: 0.5;
  filter: grayscale(1);
  transition: var(--interactive-transition);
}

.evo-node.discovered {
  opacity: 1;
  filter: grayscale(0);
  background: #fff;
  border-color: var(--warm-border);
  box-shadow: 0 2px 4px rgba(181, 147, 116, 0.15);
}

.evo-emoji {
  font-size: 20px;
  line-height: 1;
}

.evo-level {
  font-size: 8px;
  font-weight: 700;
  color: #B28265;
}

.evo-arrow {
  color: var(--warm-border);
  font-size: 12px;
  flex-shrink: 0;
  margin: 0 1px;
}

.accordion-enter-active,
.accordion-leave-active {
  transition: max-height 0.3s ease, opacity 0.2s ease;
  max-height: 200px;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ==================== Gacha Tab ==================== */
.gacha-tab-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gacha-filter-bar {
  display: flex;
  gap: 4px;
}

.gacha-filter-btn {
  flex: 1;
  padding: 6px 0;
  border: 2px solid #eee;
  border-radius: 8px;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  cursor: pointer;
  transition: var(--interactive-transition);
  color: var(--text-light);
}

.gacha-filter-btn.active {
  border-color: var(--vn-pink);
  color: var(--vn-pink);
  background: #FFF0F3;
}

.gacha-stats-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.gacha-stat {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}

.ssr-stat { background: #FFF8E0; color: #C9A020; }
.sr-stat { background: #F3ECF6; color: #9B6DB5; }
.r-stat { background: #EAF2F9; color: var(--rarity-r); }

.gacha-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gacha-section-title {
  font-size: 12px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.ssr-title { background: #FFF8E0; color: #C9A020; }
.sr-title { background: #F3ECF6; color: #9B6DB5; }
.r-title { background: #EAF2F9; color: var(--rarity-r); }

.gacha-ssr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.gacha-ssr-card {
  background: #f5f5f5;
  border: 2px solid #eee;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.45;
  filter: grayscale(0.7);
  transition: var(--interactive-transition);
  position: relative;
}

.gacha-ssr-card.collected {
  opacity: 1;
  filter: grayscale(0);
  background: linear-gradient(135deg, #FFF8E0, #fff);
  border-color: var(--rarity-ssr);
  box-shadow: 0 2px 8px rgba(241, 196, 15, 0.15);
}

.ssr-card-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 8px;
  font-weight: 800;
  background: var(--rarity-ssr);
  color: #fff;
  padding: 1px 5px;
  border-radius: 4px;
}

.ssr-card-emoji {
  font-size: 28px;
  line-height: 1;
}

.ssr-card-info {
  text-align: center;
  width: 100%;
}

.ssr-card-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-heading);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ssr-card-lead {
  font-size: 9px;
  color: #B28265;
  font-weight: 500;
}

.gacha-sr-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}

.gacha-sr-cell {
  background: #f5f5f5;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  opacity: 0.45;
  filter: grayscale(0.7);
}

.gacha-sr-cell.collected {
  opacity: 1;
  filter: grayscale(0);
  background: linear-gradient(135deg, #F3ECF6, #fff);
  border-color: rgba(155, 89, 182, 0.3);
}

.sr-cell-emoji {
  font-size: 20px;
  line-height: 1;
}

.sr-cell-name {
  font-size: 9px;
  font-weight: 600;
  color: var(--text-heading);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.gacha-r-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.gacha-r-cell {
  background: #f5f5f5;
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;
  filter: grayscale(0.7);
}

.gacha-r-cell.collected {
  opacity: 1;
  filter: grayscale(0);
  background: linear-gradient(135deg, #EAF2F9, #fff);
  border-color: rgba(74, 144, 217, 0.2);
}

.r-cell-emoji {
  font-size: 18px;
  line-height: 1;
}

/* ==================== Fragments Tab ==================== */
.fragments-tab-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lead-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(255, 245, 238, 0.4);
  border-radius: 14px;
  padding: 8px;
  border: 1px solid rgba(181, 147, 116, 0.12);
}

.lead-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.lead-section-header.lead-morven {
  background: #FFF0F3;
  border-left: 4px solid #F35683;
}

.lead-section-header.lead-daniel {
  background: #F3ECF6;
  border-left: 4px solid var(--rarity-sr);
}

.lead-section-header.lead-yuan {
  background: #EAF2F9;
  border-left: 4px solid #5D4E37;
}

.lead-section-header.lead-lu {
  background: #FFF3E0;
  border-left: 4px solid #e67e22;
}

.lead-avatar {
  font-size: 22px;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
}

.lead-header-info {
  flex: 1;
  min-width: 0;
}

.lead-title {
  font-size: 13px;
  font-weight: 800;
  display: block;
}

.lead-morven .lead-title { color: #F35683; }
.lead-daniel .lead-title { color: var(--rarity-sr); }
.lead-yuan .lead-title { color: #5D4E37; }
.lead-lu .lead-title { color: #e67e22; }

.lead-progress {
  font-size: 10px;
  font-weight: 600;
  color: #8A6D55;
}

.lead-cg-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.memory-card {
  background: #fff;
  border: 2px solid #FEDAB2;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  opacity: 0.5;
  filter: grayscale(0.4);
  cursor: pointer;
  transition: var(--interactive-transition);
  -webkit-tap-highlight-color: transparent;
}

.memory-card.active {
  opacity: 1;
  filter: grayscale(0);
  border-color: var(--warm-border);
  box-shadow: 0 2px 6px rgba(181, 147, 116, 0.15);
}

.memory-card.can-unlock {
  border-color: #E6A23C;
  box-shadow: 0 0 8px rgba(230, 162, 60, 0.2);
}

.memory-card:active {
  transform: scale(0.97);
}

.memory-card-header {
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.memory-card-title {
  font-size: 11px;
  font-weight: 800;
  color: #5A3E2B;
}

.memory-chapters {
  display: flex;
  gap: 4px;
}

.chapter-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #eee;
  background: #f5f5f5;
}

.chapter-dot.unlocked {
  background: #5BAD7D;
  border-color: #5BAD7D;
}

.chapter-dot.next {
  background: #FFF3E0;
  border-color: #E6A23C;
  box-shadow: 0 0 4px rgba(230, 162, 60, 0.3);
}

.chapter-dot.locked {
  background: #f5f5f5;
  border-color: #ddd;
}

.memory-progress {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.memory-progress-label {
  font-size: 9px;
  font-weight: 700;
  color: #8A6D55;
}

.memory-progress-bar {
  height: 5px;
  background: #EAE5C9;
  border-radius: 3px;
  overflow: hidden;
}

.memory-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #E6A23C, #F56C6C);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.memory-unlock-hint {
  font-size: 9px;
  font-weight: 700;
  color: #E6A23C;
  text-align: center;
}

.memory-unlocked-count {
  font-size: 9px;
  font-weight: 600;
  color: #A08060;
  text-align: center;
}

.fragment-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--text-light);
  font-size: 14px;
}
</style>
