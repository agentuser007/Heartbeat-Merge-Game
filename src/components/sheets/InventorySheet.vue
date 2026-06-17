<!-- ============================================================
     InventorySheet.vue — Inventory bottom sheet
     ============================================================
     Replaces #inventory-sheet from index.html lines 252-257.
     Shows a grid of inventory slots with items.
     Supports click-to-use for consumable items and
     drag-to-board for board tools and normal items.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="inventory-sheet"
    :title="i18nStore.t('inventory.panelTitle')"
    icon="📦"
    layout="bottom"
  >
    <!-- Inventory Grid -->
    <div id="inventory-list" class="inventory-grid">
      <div
        v-for="slot in displaySlots"
        :key="slot.id"
        class="inventory-slot inventory-slot--filled"
        :class="{
          'selected': dragItemId === slot.id,
          'inventory-slot--consumable': slot.effectCategory === 'consumable',
          'inventory-slot--board-tool': slot.effectCategory === 'board_tool',
          'inventory-slot--using': usingItemId === slot.id,
        }"
        :style="slotStyle(slot)"
        @pointerdown="onInventoryPointerDown(slot.id, slot.effectCategory, $event)"
        @pointerenter="onSlotPointerEnter(slot, $event)"
        @pointerleave="onSlotPointerLeave"
      >
        <!-- Type badge -->
        <span v-if="slot.effectCategory === 'consumable'" class="inventory-item-badge consumable-badge">
          {{ i18nStore.t('inventory.consumable') }}
        </span>
        <span v-else-if="slot.effectCategory === 'board_tool'" class="inventory-item-badge board-tool-badge">
          {{ i18nStore.t('inventory.boardTool') }}
        </span>

        <span class="inventory-item-emoji">{{ slot.emoji }}</span>
        <span class="inventory-item-name">{{ slot.name }}</span>
        <span v-if="slot.count > 1" class="inventory-item-count">×{{ slot.count }}</span>

        <!-- Use button for consumable items -->
        <button
          v-if="slot.effectCategory === 'consumable'"
          class="inventory-use-btn"
          @click.stop="useConsumableItem(slot.id)"
          @pointerdown.stop
        >
          {{ i18nStore.t('inventory.use') }}
        </button>
      </div>
    </div>

    <!-- Item Tooltip -->
    <Transition name="tooltip-fade">
      <div
        v-if="tooltipSlot"
        class="inventory-tooltip"
        :style="tooltipStyle"
      >
        <div class="inventory-tooltip-name">{{ tooltipSlot.name }}</div>
        <div v-if="tooltipSlot.effectDescription" class="inventory-tooltip-desc">{{ tooltipSlot.effectDescription }}</div>
        <div v-if="tooltipSlot.effectCategory === 'board_tool'" class="inventory-tooltip-hint">
          💡 {{ i18nStore.t('inventory.dragToBoard') }}
        </div>
      </div>
    </Transition>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'
import { useEffects } from '../../composables/useEffects'
import { useBoardStore } from '../../stores/boardStore'
import { useSaveStore } from '../../stores/saveStore'
import { useAudio } from '../../composables/useAudio'
import { globalBus } from '../../core/EventBus'
import { ItemEffectLogic } from '../../logic/ItemEffectLogic'

const { isOpen } = useSheet('inventory-sheet')
const inventoryStore = useInventoryStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()
const effects = useEffects()
const boardStore = useBoardStore()
const saveStore = useSaveStore()
const audio = useAudio()

// ---- Effect description i18n key mapping ----
const EFFECT_DESC_I18N_KEYS: Record<string, string> = {
  add_energy_item: 'inventory.descAddEnergyItem',
  double_gen: 'inventory.descDoubleGen',
  reroll: 'inventory.descReroll',
  lucky_coin: 'inventory.descLuckyCoin',
  clear_lv1: 'inventory.descClearLv1',
  space_clean: 'inventory.descSpaceClean',
  gen_refresh: 'inventory.descGenRefresh',
  upgrade_item: 'inventory.descUpgradeItem',
  add_joker: 'inventory.descAddJoker',
  add_scissor: 'inventory.descAddScissor',
  spawn_board_item: 'inventory.descSpawnBoardItem',
  place_generator: 'inventory.descPlaceGenerator',
  ssr_generator: 'inventory.descSSRGenerator',
  add_diamond: 'inventory.descAddDiamond',
  add_gold: 'inventory.descAddGold',
  add_fragment: 'inventory.descAddFragment',
}

// ---- Helper: infer effect from item ID (fallback when no metadata) ----
function inferEffectFromItemId(itemId: string): string | undefined {
  if (itemId.startsWith('energy_potion')) return 'add_energy_item'
  if (itemId === 'sr_double_gen') return 'double_gen'
  if (itemId.startsWith('sr_reroll')) return 'reroll'
  if (itemId === 'sr_lucky_7') return 'lucky_coin'
  if (itemId === 'sr_clear_lv1') return 'clear_lv1'
  if (itemId === 'sr_space_clean') return 'space_clean'
  if (itemId === 'sr_gen_refresh') return 'gen_refresh'
  if (itemId.startsWith('sr_upgrade')) return 'upgrade_item'
  if (itemId === 'joker') return 'add_joker'
  if (itemId === configStore.itemEffects.toolItems?.scissor) return 'add_scissor'
  return undefined
}

// ---- Display slot type ----
interface DisplaySlot {
  id: string
  emoji: string
  name: string
  color: string
  count: number
  effectCategory: 'consumable' | 'board_tool' | 'normal'
  effectDescription: string
}

// ---- Display slots computed ----
const displaySlots = computed<DisplaySlot[]>(() => {
  const result: DisplaySlot[] = []
  const itemIds = Object.keys(inventoryStore.slots).filter(id => (inventoryStore.slots[id] || 0) > 0)
  for (const itemId of itemIds) {
    const count = inventoryStore.slots[itemId] || 0
    const itemData = configStore.items[itemId]
    const meta = inventoryStore.getItemMeta(itemId)
    const effect = meta?.effect || inferEffectFromItemId(itemId)

    let effectCategory: DisplaySlot['effectCategory'] = 'normal'
    if (effect) {
      const cat = ItemEffectLogic.getEffectCategory(effect)
      if (cat === 'board_tool') effectCategory = 'board_tool'
      else effectCategory = 'consumable' // both 'consumable' and 'instant' → consumable UI
    }

    // Build effect description
    let effectDescription = ''
    if (effect) {
      const i18nKey = EFFECT_DESC_I18N_KEYS[effect]
      if (i18nKey) {
        if (effect === 'add_energy_item') {
          const energyAmount = meta?.value?.energy
            || itemData?.energyRecover
            || (itemId.startsWith('energy_potion_') ? parseInt(itemId.split('_').pop() || '20') : 20)
          effectDescription = i18nStore.t(i18nKey, { energy: energyAmount })
        } else {
          effectDescription = i18nStore.t(i18nKey)
        }
      } else {
        effectDescription = i18nStore.t('inventory.descDefault')
      }
    }

    result.push({
      id: itemId,
      emoji: itemData?.emoji || '❓',
      name: itemData?.name || itemId,
      color: itemData?.color || '#CDA080',
      count,
      effectCategory,
      effectDescription,
    })
  }
  return result
})

// ---- Slot inline style ----
function slotStyle(slot: DisplaySlot) {
  return {
    borderColor: slot.color,
    boxShadow: `inset 0 0 8px ${slot.color}22, 0 3px 6px rgba(181, 147, 116, 0.25)`,
  }
}

// ---- Consumable item use with visual feedback ----
const usingItemId = ref<string | null>(null)

function useConsumableItem(itemId: string) {
  if (usingItemId.value) return // Prevent double-use
  usingItemId.value = itemId

  // Delay the actual use to allow flash animation to play
  setTimeout(() => {
    inventoryStore.useItem(itemId)
    audio.playSound('pop')
    usingItemId.value = null
  }, configStore.uiTimers.itemUseDelay)
}

// ---- Tooltip ----
const tooltipSlot = ref<DisplaySlot | null>(null)
const tooltipX = ref(0)
const tooltipY = ref(0)

const tooltipStyle = computed(() => ({
  left: `${tooltipX.value}px`,
  top: `${tooltipY.value}px`,
}))

function onSlotPointerEnter(slot: DisplaySlot, event: PointerEvent) {
  tooltipSlot.value = slot
  const rect = (event.currentTarget as HTMLElement)?.getBoundingClientRect()
  if (rect) {
    tooltipX.value = rect.left + rect.width / 2
    tooltipY.value = rect.top - 8
  }
}

function onSlotPointerLeave() {
  tooltipSlot.value = null
}

// --- Drag and Drop from Inventory to Board ---
const isDragging = ref(false)
const dragItemId = ref<string | null>(null)
const startX = ref(0)
const startY = ref(0)
const dragGhost = ref<HTMLElement | null>(null)

function onInventoryPointerDown(itemId: string, effectCategory: string, event: PointerEvent) {
  // Only drag on left click / primary touch
  if (event.button !== 0) return

  // Consumable items use the "使用" button, not drag-to-board
  if (effectCategory === 'consumable') return

  startX.value = event.clientX
  startY.value = event.clientY
  dragItemId.value = itemId

  document.addEventListener('pointermove', onInventoryPointerMove)
  document.addEventListener('pointerup', onInventoryPointerUp)
}

function onInventoryPointerMove(event: PointerEvent) {
  const deltaX = event.clientX - startX.value
  const deltaY = event.clientY - startY.value
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  if (!isDragging.value && distance > 8) {
    isDragging.value = true

    const itemData = configStore.items[dragItemId.value || '']
    dragGhost.value = document.createElement('div')
    dragGhost.value.className = 'inventory-drag-ghost'
    dragGhost.value.textContent = itemData?.emoji || '❓'
    dragGhost.value.style.left = `${event.clientX}px`
    dragGhost.value.style.top = `${event.clientY}px`
    document.body.appendChild(dragGhost.value)

    document.getElementById('game-grid')?.classList.add('inventory-drag-active')
  }

  if (isDragging.value && dragGhost.value) {
    dragGhost.value.style.left = `${event.clientX}px`
    dragGhost.value.style.top = `${event.clientY}px`

    // Highlight drop cell
    document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'))
    const target = document.elementFromPoint(event.clientX, event.clientY)
    if (target) {
      const gc = target.closest('.grid-cell') as HTMLElement | null
      if (gc) {
        gc.classList.add('drop-target')
      }
    }
  }
}

function onInventoryPointerUp(event: PointerEvent) {
  document.removeEventListener('pointermove', onInventoryPointerMove)
  document.removeEventListener('pointerup', onInventoryPointerUp)

  if (isDragging.value) {
    isDragging.value = false
    if (dragGhost.value) {
      dragGhost.value.remove()
      dragGhost.value = null
    }

    document.getElementById('game-grid')?.classList.remove('inventory-drag-active')
    document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'))

    const target = document.elementFromPoint(event.clientX, event.clientY)
    const targetCell = target?.closest('.grid-cell')
    const targetIndex = targetCell ? parseInt(targetCell.getAttribute('data-index') || '-1') : -1

    if (targetIndex !== -1 && dragItemId.value) {
      handleInventoryItemDrop(dragItemId.value, targetIndex)
    }
  } else if (dragItemId.value) {
    // Click without drag — show hint for board tools
    const slot = displaySlots.value.find(s => s.id === dragItemId.value)
    if (slot?.effectCategory === 'board_tool') {
      effects.showToast(i18nStore.t('inventory.dragToBoard') || '拖拽到棋盘使用', 'info')
    } else {
      // Normal items: keep existing click-to-use behavior
      useItem(dragItemId.value)
    }
  }

  dragItemId.value = null
}

function useItem(itemId: string) {
  inventoryStore.useItem(itemId)
}

function handleInventoryItemDrop(itemId: string, targetIndex: number) {
  if (boardStore.isLocked(targetIndex)) {
    effects.showToast(i18nStore.t('inventory.cellOccupied') || '该格子已锁定！', 'error')
    return
  }

  const targetItemId = boardStore.getCell(targetIndex)
  const itemData = configStore.items[itemId]

  // Case 1: Scissor
  if (itemId === configStore.itemEffects.toolItems?.scissor) {
    if (!targetItemId) {
      effects.showToast(i18nStore.t('inventory.scissorFailEmpty') || '该位置为空！', 'error')
      return
    }
    const result = boardStore.useScissorOnItem(targetIndex)
    if (result.success) {
      inventoryStore.removeItem(configStore.itemEffects.toolItems.scissor, 1)
      saveStore.saveAll()
      const name = configStore.items[targetItemId]?.name || ''
      effects.showToast(i18nStore.t('inventory.scissorSuccess', { name }) || `成功拆分物品`, 'info')
      audio.playSound('merge')
    } else {
      effects.showToast(i18nStore.t('inventory.scissorFail' + result.reason) || `拆分失败`, 'error')
    }
    return
  }

  // Case 2: Upgrade card
  if (itemId === 'sr_upgrade_1') {
    if (!targetItemId) {
      effects.showToast(i18nStore.t('inventory.upgradeHint') || '请拖拽到要升级的物品上！', 'error')
      return
    }
    const targetData = configStore.items[targetItemId]
    if (targetData && targetData.nextId) {
      boardStore.placeItem(targetIndex, targetData.nextId)
      inventoryStore.removeItem('sr_upgrade_1', 1)
      saveStore.saveAll()

      const nextName = configStore.items[targetData.nextId]?.name || targetData.nextId
      effects.showToast(i18nStore.t('inventory.upgradeSuccess', { oldName: targetData.name, newName: nextName }) || `升级成功`, 'info')
      audio.playSound('merge')
    } else {
      effects.showToast(i18nStore.t('inventory.itemNotUpgradable') || '该物品无法升级！', 'error')
    }
    return
  }

  // Case 3: Self-use / one-click items (recovers, sweeps, refresh)
  if (itemData && (itemData.type === 'ENERGY_POTION' || itemId.includes('energy') || itemId.includes('clear_lv1') || itemId.includes('space_clean') || itemId.includes('gen_refresh'))) {
    useItem(itemId)
    return
  }

  // Case 4: Normal items placement / merge
  if (!targetItemId) {
    boardStore.placeItem(targetIndex, itemId)
    inventoryStore.removeItem(itemId, 1)
    saveStore.saveAll()
    effects.showToast(i18nStore.t('inventory.usedItem', { name: itemData?.name || itemId }) || `使用了 ${itemData?.name || itemId}`, 'info')
    audio.playSound('pop')
  } else {
    // Try merge!
    const targetData = configStore.items[targetItemId]
    if (targetData && itemData && targetData.chain === itemData.chain && targetData.level === itemData.level && targetData.nextId) {
      boardStore.placeItem(targetIndex, targetData.nextId)
      inventoryStore.removeItem(itemId, 1)
      saveStore.saveAll()
      globalBus.emit('board:merged', { sourceIndex: -1, targetIndex, result: { action: 'merge', nextId: targetData.nextId } })
    } else {
      effects.showToast(i18nStore.t('inventory.cellOccupied') || '该格子已占用！', 'error')
    }
  }
}
</script>

<style scoped>
/* ---- Inventory Grid ---- */
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1.5cqw;
  padding: 1cqw;
  overflow-y: auto;
  max-height: 100%;
  flex: 1 1 auto;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: var(--warm-border) rgba(0, 0, 0, 0.05);
}

/* Custom Scrollbar */
.inventory-grid::-webkit-scrollbar {
  width: 1cqw;
}

.inventory-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.03);
  border-radius: 99px;
}

.inventory-grid::-webkit-scrollbar-thumb {
  background: var(--warm-border);
  border-radius: 99px;
}

/* ---- Inventory Slot (card-style from Consolidated Layout Pass) ---- */
.inventory-slot {
  aspect-ratio: 1 / 1;
  width: 100%;
  height: auto;
  background: #F8ECD8;
  border: 3px solid var(--warm-border);
  border-radius: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(62, 50, 45, 0.1), 0 3px 6px rgba(181, 147, 116, 0.25);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
  user-select: none;
  touch-action: none;
  padding: 2px;
  margin: 0;
  gap: 1px;
  overflow: hidden;
}

.inventory-slot:not(.inventory-slot--filled):active {
  transform: scale(0.92);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Highlight Selected Slot */
.inventory-slot.selected {
  border-color: #ff4a5a;
  box-shadow: 0 0 10px rgba(255, 74, 90, 0.55);
  background: #FFF0EB;
}

/* Filled slot */
.inventory-slot--filled {
  /* inherits base slot styles, filled is the default visual */
}

/* ---- Consumable slot variant ---- */
.inventory-slot--consumable {
  background: linear-gradient(145deg, #F8ECD8 40%, #F3ECF6 100%);
  border-color: #B88AD0;
  box-shadow: inset 0 2px 4px rgba(62, 50, 45, 0.1), 0 3px 6px rgba(186, 104, 200, 0.2);
}

.inventory-slot--consumable:active {
  transform: scale(0.95);
}

/* ---- Board tool slot variant ---- */
.inventory-slot--board-tool {
  background: linear-gradient(145deg, #F8ECD8 40%, #EAF2F9 100%);
  border-color: #6DB0E8;
  box-shadow: inset 0 2px 4px rgba(62, 50, 45, 0.1), 0 3px 6px rgba(124, 185, 232, 0.2);
}

/* ---- Using flash animation ---- */
.inventory-slot--using {
  animation: item-use-flash 0.3s ease-out;
  pointer-events: none;
}

@keyframes item-use-flash {
  0% { transform: scale(1); filter: brightness(1); }
  40% { transform: scale(1.08); filter: brightness(1.3); }
  100% { transform: scale(0.95); filter: brightness(0.8); opacity: 0.5; }
}

/* ---- Item Emoji ---- */
.inventory-item-emoji {
  font-size: 7.5cqw;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  flex-shrink: 0;
}

/* ---- Item Name ---- */
.inventory-item-name {
  font-size: 1.8cqw;
  font-weight: 700;
  color: #5E4638;
  line-height: 1.1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 90%;
  pointer-events: none;
}

/* ---- Item Count Badge ---- */
.inventory-item-count {
  position: absolute;
  bottom: 1px;
  right: 3px;
  background: rgba(255, 255, 255, 0.85);
  color: #5E4638;
  font-size: 2cqw;
  font-weight: 900;
  line-height: 1;
  pointer-events: none;
  padding: 0 2px;
  border-radius: 4px;
}

/* ---- Type Badge (Consumable / Board Tool) ---- */
.inventory-item-badge {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 1.5cqw;
  font-weight: 800;
  line-height: 1;
  padding: 1px 3px;
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 1;
}

.consumable-badge {
  background: rgba(200, 159, 212, 0.85);
  color: #fff;
}

.board-tool-badge {
  background: rgba(33, 150, 243, 0.85);
  color: #fff;
}

/* ---- Use Button (consumable items) ---- */
.inventory-use-btn {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #9B6DB5, #B06DC0);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 1.8cqw;
  font-weight: 800;
  font-family: 'Jiangcheng Yuanti', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  cursor: pointer;
  z-index: 2;
  line-height: 1.2;
  box-shadow: 0 2px 6px rgba(200, 159, 212, 0.4);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  touch-action: manipulation;
}

.inventory-use-btn:active {
  transform: translateX(-50%) scale(0.9);
  box-shadow: 0 1px 3px rgba(200, 159, 212, 0.3);
}

/* ---- Empty Slot ---- */
.inventory-empty {
  width: 24px;
  height: 24px;
  border: 1.5px dashed var(--warm-border);
  border-radius: 4px;
  opacity: 0.65;
}

.inventory-slot:not(.inventory-slot--filled) {
  background: #FCF5EC;
  border: 1.5px dashed var(--warm-border);
  box-shadow: none;
  opacity: 0.65;
  cursor: default;
}

/* ---- Drag Ghost ---- */
.inventory-drag-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  font-size: 42px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%) scale(1.15);
  transition: none;
  opacity: 0.9;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.3));
}

/* ---- Tooltip ---- */
.inventory-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  z-index: 100000;
  pointer-events: none;
  background: rgba(62, 50, 45, 0.92);
  color: #fff;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  max-width: 200px;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-family: 'Jiangcheng Yuanti', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.inventory-tooltip-name {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inventory-tooltip-desc {
  font-size: 11px;
  line-height: 1.4;
  opacity: 0.9;
}

.inventory-tooltip-hint {
  font-size: 10px;
  margin-top: 4px;
  opacity: 0.7;
  font-style: italic;
}

/* ---- Tooltip Transition ---- */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
