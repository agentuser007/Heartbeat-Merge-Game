<template>
  <Teleport to="body">
    <Transition name="touch-overlay">
      <div v-if="touchStore.isOverlayOpen" class="touch-overlay" @click.self="close">
        <div class="touch-container" :style="{ '--char-color': charColor }">
          <div class="touch-header">
            <button class="touch-back" @click="close">↩</button>
            <span class="touch-name">{{ charName }}</span>
            <span class="touch-affection-display">💕 {{ affectionStore.getPoints(activeCharId) }}</span>
          </div>

          <div class="touch-avatar-area">
            <img :src="charAvatar" class="touch-avatar" :alt="charName" />
            <div class="touch-level-badge" :style="{ background: charColor }">
              Lv.{{ affectionStore.getLevel(activeCharId) }} {{ affectionStore.getLevelName(activeCharId) }}
            </div>
          </div>

          <div class="touch-zones">
            <button
              v-for="zone in zones"
              :key="zone.id"
              class="touch-zone-btn"
              :class="{ unlocked: isUnlocked(zone.id), cooldown: isInCooldown(zone.id) }"
              :disabled="!touchStore.canTouch(activeCharId, zone.id)"
              @click="onTouch(zone.id)"
            >
              <span class="tz-icon">{{ zone.icon }}</span>
              <span class="tz-name">{{ zone.name }}</span>
              <span v-if="!isUnlocked(zone.id)" class="tz-lock">🔒</span>
              <span v-else-if="isInCooldown(zone.id)" class="tz-cd">{{ cdRemaining(zone.id) }}s</span>
            </button>
          </div>

          <Transition name="touch-dialogue">
            <div v-if="lastResult" class="touch-dialogue-bubble" :style="{ borderColor: charColor }">
              <div class="td-text">{{ lastResult.dialogue }}</div>
              <div v-if="lastResult.affection > 0" class="td-affection">+{{ lastResult.affection }} 💕</div>
            </div>
          </Transition>

          <div class="touch-footer">
            <button class="tf-btn" @click="openShop">💝</button>
            <button class="tf-btn" @click="openGift">🎁</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTouchInteractionStore } from '../../stores/touchInteractionStore'
import type { TouchData } from '../../services/TouchInteractionService'
import { useAffectionStore } from '../../stores/affectionStore'
import { useConfigStore } from '../../stores/configStore'
import { useSheet } from '../../composables/useSheet'
import { useApplyDeps } from '../../composables/useApplyDeps'
import { applyResolveResult } from '../../composables/useGameLoop'

const touchStore = useTouchInteractionStore()
const affectionStore = useAffectionStore()
const configStore = useConfigStore()
const applyDeps = useApplyDeps()

const lastResult = ref<TouchData | null>(null)

const activeCharId = computed(() => touchStore.activeCharacterId || 'morven')

const charData = computed(() => {
  const chars = configStore.affectionConfig?.characters || []
  return chars.find((c) => c.id === activeCharId.value) || null
})

const charName = computed(() => charData.value?.name || '')
const charAvatar = computed(() => charData.value?.avatar || '')
const charColor = computed(() => charData.value?.color || '#FF69B4')

const zones = computed(() => {
  return configStore.touchInteractions?.zones || []
})

function isUnlocked(zoneId: string): boolean {
  const level = affectionStore.getLevel(activeCharId.value)
  const zone = zones.value.find((z) => z.id === zoneId)
  return zone ? zone.unlockLevel <= level : false
}

function isInCooldown(zoneId: string): boolean {
  if (!isUnlocked(zoneId)) return false
  return touchStore.getCooldownRemaining(activeCharId.value, zoneId) > 0
}

function cdRemaining(zoneId: string): number {
  return Math.ceil(touchStore.getCooldownRemaining(activeCharId.value, zoneId) / 1000)
}

function onTouch(zoneId: string) {
  const result = touchStore.performTouch(activeCharId.value, zoneId)
  if (!result.ok) return
  applyResolveResult(result.resolveResult, applyDeps)
  lastResult.value = result.data
  setTimeout(() => { lastResult.value = null }, configStore.uiTimers.touchDialogueDisplay)
}

function close() {
  touchStore.closeOverlay()
}

function openShop() {
  touchStore.closeOverlay()
  const shopSheet = useSheet('affection-shop')
  shopSheet.open()
}

function openGift() {
  touchStore.closeOverlay()
  affectionStore._selectedCharacterId = activeCharId.value
  const detailSheet = useSheet('character-detail')
  detailSheet.open()
}
</script>

<style scoped>
.touch-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.touch-container {
  width: 90%;
  max-width: 360px;
  max-height: 85vh;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,240,245,0.95));
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.touch-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.touch-back {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.06);
  font-size: 16px;
  cursor: pointer;
}

.touch-name {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-dark);
}

.touch-affection-display {
  font-size: 13px;
  font-weight: 700;
  color: #FF69B4;
}

.touch-avatar-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.touch-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--char-color, #ddd);
}

.touch-level-badge {
  padding: 3px 14px;
  border-radius: 12px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.touch-zones {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.touch-zone-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border: 1.5px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  background: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: var(--interactive-transition);
  font-size: 13px;
}
.touch-zone-btn.unlocked:hover:not(:disabled) {
  border-color: var(--char-color, #FF69B4);
  background: rgba(255,105,180,0.08);
}
.touch-zone-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.touch-zone-btn.cooldown {
  opacity: 0.6;
}

.tz-icon { font-size: 16px; }
.tz-name { flex: 1; font-weight: 600; text-align: left; }
.tz-lock { font-size: 11px; }
.tz-cd { font-size: 10px; color: rgba(0,0,0,0.4); }

.touch-dialogue-bubble {
  padding: 12px 16px;
  background: rgba(255,255,255,0.95);
  border-left: 3px solid;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.td-text {
  font-size: 14px;
  color: var(--text-dark);
  font-style: italic;
}

.td-affection {
  font-size: 13px;
  font-weight: 700;
  color: #FF69B4;
  white-space: nowrap;
}

.touch-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.tf-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(0,0,0,0.06);
  font-size: 18px;
  cursor: pointer;
  transition: var(--interactive-transition);
}
.tf-btn:active { transform: scale(0.9); }

.touch-overlay-enter-active { animation: overlayIn 0.3s ease-out; }
.touch-overlay-leave-active { animation: overlayOut 0.2s ease-in; }
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes overlayOut { from { opacity: 1; } to { opacity: 0; } }

.touch-dialogue-enter-active { animation: dialogueIn 0.3s ease-out; }
.touch-dialogue-leave-active { animation: dialogueOut 0.2s ease-in; }
@keyframes dialogueIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes dialogueOut { from { opacity: 1; } to { opacity: 0; } }
</style>