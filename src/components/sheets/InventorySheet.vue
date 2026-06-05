<!-- ============================================================
     InventorySheet.vue — Inventory bottom sheet
     ============================================================
     Replaces #inventory-sheet from index.html lines 252-257.
     Shows a grid of inventory slots with items.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="inventory-sheet"
    :title="i18nStore.t('inventory.panelTitle')"
    icon="📦"
  >
    <div id="inventory-list" class="inventory-grid">
      <div
        v-for="(slot, i) in displaySlots"
        :key="i"
        class="inventory-slot"
        :class="{ 'inventory-slot--filled': slot != null }"
        @click="slot && useItem(slot.id)"
      >
        <template v-if="slot">
          <span class="inventory-item-emoji">{{ slot.emoji }}</span>
          <span v-if="slot.count > 1" class="inventory-item-count">×{{ slot.count }}</span>
        </template>
        <span v-else class="inventory-empty" />
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'

const { isOpen } = useSheet('inventory-sheet')
const inventoryStore = useInventoryStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()

interface DisplaySlot {
  id: string
  emoji: string
  count: number
}

const displaySlots = computed<(DisplaySlot | null)[]>(() => {
  const slots: (DisplaySlot | null)[] = []
  for (let i = 0; i < inventoryStore.maxSlots; i++) {
    const itemIds = Object.keys(inventoryStore.slots)
    if (i < itemIds.length) {
      const itemId = itemIds[i]
      const count = inventoryStore.slots[itemId] || 0
      const itemData = configStore.items[itemId]
      slots.push({
        id: itemId,
        emoji: itemData?.emoji || '❓',
        count
      })
    } else {
      slots.push(null)
    }
  }
  return slots
})

function useItem(itemId: string) {
  inventoryStore.useItem(itemId)
}
</script>

<style scoped>
/* ---- Inventory Capacity Bar ---- */
.inventory-capacity-bar {
  margin-bottom: 10px;
  padding: 8px 10px;
  background: rgba(255, 225, 204, 0.5);
  border-radius: 8px;
}

.capacity-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.capacity-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted-alt);
}

.unlock-slot-btn {
  font-size: 10px;
  font-weight: 700;
  color: #7c4dff;
  background: rgba(124, 77, 255, 0.1);
  border: 1px solid rgba(124, 77, 255, 0.3);
  border-radius: 10px;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.unlock-slot-btn:hover {
  background: rgba(124, 77, 255, 0.2);
}

.capacity-track {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.capacity-fill {
  height: 100%;
  background: var(--color-success);
  border-radius: 2px;
  transition: width 0.3s;
}

.capacity-track.capacity-warning .capacity-fill {
  background: var(--daily-icon-end);
}

.capacity-track.capacity-critical .capacity-fill {
  background: #f44336;
}

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
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(62, 50, 45, 0.1), 0 3px 6px rgba(181, 147, 116, 0.25);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: none;
  padding: 0;
  margin: 0;
  flex-direction: row;
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

/* ---- Item Emoji ---- */
.inventory-item-emoji {
  font-size: 8.5cqw;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

/* ---- Item Count Badge ---- */
.inventory-item-count {
  position: absolute;
  bottom: 0.5cqw;
  right: 0.8cqw;
  background: transparent;
  color: #5E4638;
  font-size: 2.2cqw;
  font-weight: 900;
  line-height: 1;
  pointer-events: none;
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
</style>
