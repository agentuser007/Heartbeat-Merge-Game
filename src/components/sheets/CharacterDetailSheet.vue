<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="character-detail"
    :title="characterName"
    icon="💕"
  >
    <div v-if="charData" class="detail-content">
      <div class="detail-avatar-section">
        <img :src="charData.avatar" class="detail-avatar" :alt="charData.name" />
        <div class="detail-level-badge" :style="{ background: charData.color }">
          Lv.{{ affectionStore.getLevel(characterId) }} {{ affectionStore.getLevelName(characterId) }}
        </div>
      </div>

      <div class="detail-progress">
        <div class="detail-bar-track">
          <div class="detail-bar-fill" :style="{ width: `${affectionStore.getLevelProgress(characterId) * 100}%`, background: charData.color }" />
        </div>
        <span class="detail-pts">{{ affectionStore.getPoints(characterId) }} pts</span>
      </div>

      <div class="detail-profile" v-if="profile">
        <div class="profile-title">{{ profile.title }}</div>
        <div class="profile-birthday" v-if="profile.birthday">🎂 {{ profile.birthday }}</div>
        <div class="profile-likes">❤️ {{ profile.likes?.join(' · ') }}</div>
      </div>

      <div class="detail-section">
        <div class="section-header">
          <span>👋 {{ i18nStore.t('affection.touchBtn') }}</span>
        </div>
        <div class="touch-buttons">
          <button
            v-for="zone in zones"
            :key="zone.id"
            class="touch-zone-btn"
            :class="{ locked: !isUnlocked(zone.id), cooldown: isInCooldown(zone.id) }"
            :disabled="!canTouchZone(zone.id)"
            @click="onTouch(zone.id)"
          >
            <span class="zone-icon">{{ zone.icon }}</span>
            <span class="zone-name">{{ zone.name }}</span>
            <span v-if="!isUnlocked(zone.id)" class="zone-lock">🔒</span>
          </button>
        </div>
      </div>

      <div v-if="touchResult" class="touch-dialogue" :style="{ borderColor: charData.color }">
        {{ touchResult.dialogue }}
        <span v-if="touchResult.affection > 0" class="touch-affection">+{{ touchResult.affection }} 💕</span>
      </div>

      <div class="detail-section">
        <div class="section-header">
          <span>🎁 {{ i18nStore.t('affection.giftBtn') }}</span>
        </div>
        <div class="gift-list">
          <button
            v-for="gift in availableGifts"
            :key="gift.id"
            class="gift-btn"
            :disabled="!affectionStore.canAffordCoins(gift.price)"
            @click="onGift(gift)"
          >
            <span>{{ gift.icon }}</span>
            <span class="gift-name">{{ gift.name }}</span>
            <span class="gift-price">💰{{ gift.price }}</span>
          </button>
        </div>
      </div>

      <div class="detail-actions">
        <button class="action-btn touch-action" @click="openTouchOverlay">
          {{ i18nStore.t('affection.touchBtn') }}
        </button>
        <button class="action-btn shop-action" @click="openShop">
          {{ i18nStore.t('affection.shopBtn') }}
        </button>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useAffectionStore } from '../../stores/affectionStore'
import { useTouchInteractionStore } from '../../stores/touchInteractionStore'
import type { TouchData } from '../../services/TouchInteractionService'
import { useConfigStore } from '../../stores/configStore'
import { useI18nStore } from '../../stores/i18nStore'
import { useApplyDeps } from '../../composables/useApplyDeps'
import { applyResolveResult } from '../../composables/useGameLoop'
import type { AffectionCharacterDef, AffectionShopItem, TouchZone } from '../../types/game'

const { isOpen } = useSheet('character-detail')
const affectionStore = useAffectionStore()
const touchStore = useTouchInteractionStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()
const applyDeps = useApplyDeps()

const touchResult = ref<TouchData | null>(null)

const characterId = computed(() => {
  return affectionStore._selectedCharacterId || 'morven'
})

const charData = computed(() => {
  const chars = configStore.affectionConfig?.characters || []
  return chars.find((c: AffectionCharacterDef) => c.id === characterId.value) || null
})

const characterName = computed(() => charData.value?.name || '')

const profile = computed(() => {
  return configStore.characterProfiles?.[characterId.value] || null
})

const zones = computed(() => {
  return configStore.touchInteractions?.zones || []
})

const availableGifts = computed(() => {
  const items = configStore.affectionShop?.items || []
  const maxLevel = affectionStore.getMaxLevel()
  return items.filter((i: AffectionShopItem) =>
    i.categoryId === 'gift' &&
    i.unlockLevel <= maxLevel &&
    (!i.characterId || i.characterId === characterId.value)
  )
})

function isUnlocked(zoneId: string): boolean {
  return touchStore.canTouch(characterId.value, zoneId) || affectionStore.getLevel(characterId.value) >= (zones.value.find((z: TouchZone) => z.id === zoneId)?.unlockLevel ?? 999)
}

function isInCooldown(zoneId: string): boolean {
  const level = affectionStore.getLevel(characterId.value)
  const zone = zones.value.find((z: TouchZone) => z.id === zoneId)
  if (!zone || zone.unlockLevel > level) return false
  return touchStore.getCooldownRemaining(characterId.value, zoneId) > 0
}

function canTouchZone(zoneId: string): boolean {
  return touchStore.canTouch(characterId.value, zoneId)
}

function onTouch(zoneId: string) {
  const result = touchStore.performTouch(characterId.value, zoneId)
  if (!result.ok) return
  applyResolveResult(result.resolveResult, applyDeps)
  touchResult.value = result.data
  if (result.data) {
    setTimeout(() => { touchResult.value = null }, configStore.uiTimers.touchDialogueDisplay)
  }
}

function onGift(gift: AffectionShopItem) {
  if (!affectionStore.canAffordCoins(gift.price)) return
  const result = affectionStore.resolveGiftItem(characterId.value, gift.id)
  if (result) applyResolveResult(result, applyDeps)
}

function openTouchOverlay() {
  isOpen.value = false
  touchStore.openOverlay(characterId.value)
}

function openShop() {
  isOpen.value = false
  const shopSheet = useSheet('affection-shop')
  shopSheet.open()
}
</script>

<style scoped>
.detail-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.detail-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--char-color, #ddd);
}

.detail-level-badge {
  padding: 3px 12px;
  border-radius: 12px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.detail-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-bar-track {
  flex: 1;
  height: 6px;
  background: rgba(0,0,0,0.08);
  border-radius: 3px;
  overflow: hidden;
}

.detail-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.detail-pts {
  font-size: 10px;
  color: rgba(0,0,0,0.4);
  white-space: nowrap;
}

.detail-profile {
  text-align: center;
  font-size: 11px;
  color: rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-title {
  font-weight: 600;
  color: rgba(0,0,0,0.7);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dark);
}

.touch-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.touch-zone-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border: 1.5px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  background: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: var(--interactive-transition);
  font-size: 12px;
}
.touch-zone-btn:hover:not(:disabled) {
  border-color: #FF69B4;
  background: rgba(255,105,180,0.08);
}
.touch-zone-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.touch-zone-btn.locked {
  background: rgba(0,0,0,0.03);
}
.touch-zone-btn.cooldown {
  opacity: 0.6;
}

.zone-icon {
  font-size: 14px;
}

.zone-name {
  flex: 1;
  font-weight: 600;
  text-align: left;
}

.zone-lock {
  font-size: 10px;
}

.touch-dialogue {
  padding: 10px 14px;
  background: rgba(255,255,255,0.9);
  border-left: 3px solid;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-dark);
  position: relative;
}

.touch-affection {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 700;
  color: #FF69B4;
}

.gift-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.gift-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  background: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 11px;
  transition: var(--interactive-transition);
}
.gift-btn:hover:not(:disabled) {
  border-color: #FF69B4;
}
.gift-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gift-name {
  font-weight: 600;
}

.gift-price {
  color: rgba(0,0,0,0.4);
  font-size: 10px;
}

.detail-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.action-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: var(--interactive-transition);
}
.action-btn:active {
  transform: scale(0.95);
}

.touch-action {
  background: linear-gradient(135deg, #FF69B4, #FF1493);
  color: #fff;
}

.shop-action {
  background: linear-gradient(135deg, #FFD700, #FFA000);
  color: #fff;
}
</style>