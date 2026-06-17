<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="affection-panel"
    :title="i18nStore.t('affection.panelTitle')"
    icon="💕"
    :subtitle="i18nStore.t('affection.panelSub')"
  >
    <div class="affection-grid">
      <div
        v-for="char in characters"
        :key="char.id"
        class="affection-card"
        :style="{ '--char-color': char.color }"
        @click="openDetail(char.id)"
      >
        <img :src="char.avatar" class="affection-avatar" :alt="char.name" />
        <div class="affection-info">
          <span class="affection-name">{{ char.name }}</span>
          <span class="affection-level">Lv.{{ affectionStore.getLevel(char.id) }} {{ affectionStore.getLevelName(char.id) }}</span>
        </div>
        <div class="affection-bar-track">
          <div
            class="affection-bar-fill"
            :style="{ width: `${affectionStore.getLevelProgress(char.id) * 100}%`, background: char.color }"
          />
        </div>
        <span class="affection-pts">{{ affectionStore.getPoints(char.id) }} pts</span>
      </div>
    </div>

    <div class="affection-actions">
      <button class="affection-shop-btn" @click="openShop">
        💝 {{ i18nStore.t('affection.shopTitle') }}
      </button>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useAffectionStore } from '../../stores/affectionStore'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'

const { isOpen } = useSheet('affection-panel')
const affectionStore = useAffectionStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()

const characters = computed(() => {
  return configStore.affectionConfig?.characters || []
})

function openDetail(characterId: string) {
  affectionStore._selectedCharacterId = characterId
  isOpen.value = false
  const detailSheet = useSheet('character-detail')
  detailSheet.open()
}

function openShop() {
  isOpen.value = false
  const shopSheet = useSheet('affection-shop')
  shopSheet.open()
}
</script>

<style scoped>
.affection-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 4px 0;
}

.affection-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(255,255,255,0.75);
  border: 1.5px solid rgba(0,0,0,0.06);
  border-radius: 14px;
  cursor: pointer;
  transition: var(--interactive-transition);
}
.affection-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  border-color: var(--char-color);
}

.affection-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--char-color, #ddd);
}

.affection-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.affection-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dark);
}

.affection-level {
  font-size: 10px;
  color: var(--char-color, #888);
  font-weight: 600;
}

.affection-bar-track {
  width: 80%;
  height: 4px;
  background: rgba(0,0,0,0.08);
  border-radius: 2px;
  overflow: hidden;
}

.affection-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.affection-pts {
  font-size: 9px;
  color: rgba(0,0,0,0.4);
}

.affection-actions {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.affection-shop-btn {
  padding: 8px 24px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, #FF69B4, #FF1493);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--interactive-transition);
}
.affection-shop-btn:active {
  transform: scale(0.95);
}
</style>