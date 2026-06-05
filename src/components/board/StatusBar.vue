<template>
  <div id="status-bar">
    <div class="status-left">
      <div class="level-badge">
        <span class="level-text">{{ levelText }}</span>
      </div>
      <div class="x-badge">
        <span class="x-text">x{{ loopStore.loopIndex }}</span>
      </div>
    </div>

    <div class="status-center">
      <div class="energy-pill">
        <span class="energy-icon">⚡</span>
        <span class="energy-value">{{ energyDisplay }}</span>
      </div>
      <div class="currency-pill">
        <span class="currency-icon">🪙</span>
        <span class="currency-value">{{ goldDisplay }}</span>
      </div>
      <div class="currency-pill">
        <span class="currency-diamond">💎</span>
        <span class="currency-value">{{ diamondDisplay }}</span>
      </div>
      <div
        v-if="dailyBuffStore.isPending"
        class="buff-pill buff-pending"
        @click.stop="openPopover('pending')"
      >
        <span class="buff-icon">{{ dailyBuffStore.pendingBuff?.icon }}</span>
      </div>
      <div
        v-for="buff in dailyBuffStore.activeBuffs"
        :key="buff.id"
        class="buff-pill buff-active"
        @click.stop="openPopover(buff.id)"
      >
        <span class="buff-icon">{{ buff.icon }}</span>
        <span class="buff-timer">{{ formatRemaining(buff) }}</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="popoverBuff" class="buff-popover-overlay" @click="closePopover" />
      <Transition name="popover">
        <div v-if="popoverBuff" class="buff-popover" @click.stop>
          <div class="popover-icon">{{ popoverBuff.icon }}</div>
          <div class="popover-name">{{ i18nStore.t(popoverBuff.nameKey) || popoverBuff.id }}</div>
          <div class="popover-desc">{{ i18nStore.t(popoverBuff.descKey) }}</div>
          <template v-if="popoverType === 'pending'">
            <div class="popover-timer-hint">{{ i18nStore.t('dailyBuff.durationHint') || '生效30分钟' }}</div>
            <div class="popover-actions">
              <button class="popover-btn popover-cancel" @click="closePopover">{{ i18nStore.t('dailyBuff.dismiss') || '取消' }}</button>
              <button class="popover-btn popover-activate" @click="onActivate">{{ i18nStore.t('dailyBuff.activate') || '激活' }}</button>
            </div>
          </template>
          <template v-else>
            <div class="popover-remaining">{{ formatRemaining(popoverBuff) }}</div>
            <div class="popover-actions">
              <button class="popover-btn popover-close" @click="closePopover">{{ i18nStore.t('common.close') || '关闭' }}</button>
            </div>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCurrencyStore } from '../../stores/currencyStore'
import { useLoopStore } from '../../stores/loopStore'
import { useBossStore } from '../../stores/bossStore'
import { useEnergyStore } from '../../stores/energyStore'
import { useDailyBuffStore, type DailyBuff } from '../../stores/dailyBuffStore'
import { useI18nStore } from '../../stores/i18nStore'

const currencyStore = useCurrencyStore()
const loopStore = useLoopStore()
const bossStore = useBossStore()
const energyStore = useEnergyStore()
const dailyBuffStore = useDailyBuffStore()
const i18nStore = useI18nStore()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    dailyBuffStore.checkBuffExpiry()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const popoverId = ref<string | null>(null)

const popoverType = computed<'pending' | 'active'>(() => {
  if (popoverId.value === 'pending') return 'pending'
  return 'active'
})

const popoverBuff = computed<DailyBuff | null>(() => {
  if (!popoverId.value) return null
  if (popoverId.value === 'pending') return dailyBuffStore.pendingBuff
  return dailyBuffStore.activeBuffs.find(b => b.id === popoverId.value) || null
})

function openPopover(id: string) {
  popoverId.value = id
}

function closePopover() {
  popoverId.value = null
}

function onActivate() {
  dailyBuffStore.activatePendingBuff()
  closePopover()
}

function formatRemaining(buff: DailyBuff): string {
  void now.value
  const ms = dailyBuffStore.getBuffRemainingMs(buff)
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const energyDisplay = computed(() => {
  return `${energyStore.current}/${energyStore.regenCap}`
})

const goldDisplay = computed(() => {
  return currencyStore.formatGold(currencyStore.gold)
})

const diamondDisplay = computed(() => {
  return currencyStore.formatGold(currencyStore.diamonds)
})

const levelText = computed(() => {
  if (bossStore.currentLevelIdx < 0) return '--'
  return `${bossStore.currentLevelIdx + 1}`
})
</script>

<style scoped>
#status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100cqw;
  padding: 2cqw 2cqw 0 2cqw;
  box-sizing: border-box;
  position: relative;
  z-index: 60;
  flex-shrink: 0;
  min-height: 6cqw;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 1.5cqw;
}

.level-badge {
  background: #DDAA8B;
  border-radius: 8px;
  width: 12.5cqw;
  height: 11cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3.7px #60190F;
}

.level-text {
  font-size: 14px;
  font-weight: 900;
  color: #fff;
  text-shadow: 1px 0 0 #DDAA8B, 0 1px 0 #DDAA8B, -1px 0 0 #DDAA8B, 0 -1px 0 #DDAA8B;
}

.x-badge {
  background: #DDAA8B;
  border-radius: 8px;
  width: 7cqw;
  height: 7cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3.7px #60190F;
}

.x-text {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.status-center {
  display: flex;
  align-items: center;
  gap: 2cqw;
}

.energy-pill {
  background: var(--status-bar-bg);
  box-shadow: var(--status-bar-pill-shadow);
  border-radius: 32px;
  height: 8cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 2cqw;
}

.energy-icon {
  font-size: 10px;
}

.energy-value {
  font-size: 8px;
  font-weight: 700;
  color: var(--energy-text);
}

.currency-pill {
  background: var(--status-bar-bg);
  box-shadow: var(--status-bar-pill-shadow);
  border-radius: 32px;
  height: 8cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 2cqw;
}

.currency-icon {
  font-size: 10px;
}

.currency-diamond {
  font-size: 10px;
}

.currency-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--currency-text);
}

.buff-pill {
  background: var(--status-bar-bg);
  box-shadow: var(--status-bar-pill-shadow);
  border-radius: 32px;
  height: 8cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 1.5cqw;
  cursor: pointer;
}

.buff-pending {
  animation: buff-pulse 1.2s ease-in-out infinite;
}

.buff-icon {
  font-size: 12px;
}

.buff-timer {
  font-size: 7px;
  font-weight: 600;
  color: var(--energy-text);
}

@keyframes buff-pulse {
  0%, 100% { box-shadow: var(--status-bar-pill-shadow), 0 0 0 0 rgba(243, 86, 131, 0.4); }
  50% { box-shadow: var(--status-bar-pill-shadow), 0 0 0 4px rgba(243, 86, 131, 0.15); }
}

.buff-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 798;
}

.buff-popover {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--off-white, #fff8f0);
  border-radius: 16px;
  padding: 20px 24px;
  min-width: 220px;
  max-width: 85cqw;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 799;
}

.popover-icon {
  font-size: 32px;
  margin-bottom: 6px;
}

.popover-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #333);
  margin-bottom: 4px;
}

.popover-desc {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin-bottom: 12px;
  line-height: 1.5;
}

.popover-timer-hint {
  font-size: 11px;
  color: var(--text-secondary, #888);
  margin-bottom: 12px;
}

.popover-remaining {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-pink, #F35683);
  margin-bottom: 12px;
}

.popover-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.popover-btn {
  padding: 7px 20px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.popover-btn:active {
  transform: scale(0.94);
}

.popover-cancel,
.popover-close {
  background: #e0e0e0;
  color: #666;
}

.popover-activate {
  background: var(--accent-pink, #F35683);
  color: white;
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.92);
}
</style>
