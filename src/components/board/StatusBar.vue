<template>
  <div id="status-bar">
    <div class="status-left">
      <img class="coin-icon" src="/assets/items/coin_icon.png" alt="coin" />
      <span class="gold-text">{{ goldDisplay }}</span>
      <div class="loop-badge">
        <span class="loop-text">x{{ loopStore.loopIndex }}</span>
      </div>
    </div>

    <div class="status-center">
      <div class="energy-container">
        <div class="energy-pill">
          <img class="energy-icon-img" src="/assets/items/lightning-02.svg" alt="stamina" />
          <span class="energy-value">{{ energyStore.current }}</span>
          <button class="add-btn" @click="shopSheet.open()">+</button>
        </div>
        <div v-if="formattedEnergyCountdown" class="energy-countdown">
          {{ formattedEnergyCountdown }}
        </div>
      </div>

      <div class="diamond-pill">
        <img class="diamond-icon-img" src="/assets/items/diamond.svg" alt="diamond" />
        <span class="diamond-value">{{ diamondDisplay }}</span>
        <button class="add-btn" @click="shopSheet.open()">+</button>
      </div>
    </div>

    <div class="status-right">
      <button class="shop-circle-btn" @click="shopSheet.open()">
        <img class="shop-btn-icon-img" src="/assets/items/shop.svg" alt="shop" />
      </button>
      <button class="map-circle-btn" @click="$emit('open-map')">
        <span class="map-btn-icon">🗺️</span>
      </button>
      <div class="rank-container">
        <span class="rank-label">Rank</span>
        <div class="rank-circle">
          <span class="rank-number">{{ levelText }}</span>
        </div>
      </div>
    </div>

    <!-- Floating buff pills -->
    <div class="buff-row">
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCurrencyStore } from '../../stores/currencyStore'
import { useLoopStore } from '../../stores/loopStore'
import { useBossStore } from '../../stores/bossStore'
import { useEnergyStore } from '../../stores/energyStore'
import { useDailyBuffStore, type DailyBuff } from '../../stores/dailyBuffStore'
import { useI18nStore } from '../../stores/i18nStore'
import { useSheet } from '../../composables/useSheet'

const currencyStore = useCurrencyStore()
const loopStore = useLoopStore()
const bossStore = useBossStore()
const energyStore = useEnergyStore()
const dailyBuffStore = useDailyBuffStore()
const i18nStore = useI18nStore()
const shopSheet = useSheet('shop-sheet')

defineEmits<{
  (e: 'open-map'): void
}>()

const now = ref(Date.now())
const lastEnergy = ref(energyStore.current)
const energyCountdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

watch(() => energyStore.current, (newVal) => {
  if (newVal < energyStore.regenCap) {
    if (newVal > lastEnergy.value || energyCountdown.value === 0) {
      energyCountdown.value = Math.floor(energyStore.regenInterval / 1000)
    }
  } else {
    energyCountdown.value = 0
  }
  lastEnergy.value = newVal
}, { immediate: true })

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    dailyBuffStore.checkBuffExpiry()
    
    // Decrement energy countdown
    if (energyStore.current < energyStore.regenCap) {
      if (energyCountdown.value > 0) {
        energyCountdown.value--
      } else {
        energyCountdown.value = Math.floor(energyStore.regenInterval / 1000)
      }
    }
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

const formattedEnergyCountdown = computed(() => {
  if (energyStore.current >= energyStore.regenCap) {
    return i18nStore.t('energy.full') || '已满'
  }
  const min = Math.floor(energyCountdown.value / 60)
  const sec = energyCountdown.value % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
})
</script>

<style scoped>
#status-bar {
  position: relative;
  width: 100cqw;
  height: 33.58cqw;
  box-sizing: border-box;
  z-index: var(--z-fixed);
  flex-shrink: 0;
  padding: calc(2.99cqw + env(safe-area-inset-top, 0px)) 2.99cqw 0 2.99cqw;
}

.status-left {
  position: absolute;
  top: calc(12.94cqw + env(safe-area-inset-top, 0px));
  left: 3.98cqw;
  width: 11.94cqw;
  height: 20.4cqw;
}

.coin-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 7.96cqw;
  height: 7.96cqw;
  filter: drop-shadow(0px 1px 3.7px #60190F);
}

.gold-text {
  position: absolute;
  top: 5.97cqw;
  left: 0;
  font-size: 2.99cqw;
  font-weight: 900;
  color: #fff;
  text-shadow: 1px 0 0 #DDAA8B, -1px 0 0 #DDAA8B, 0 1px 0 #DDAA8B, 0 -1px 0 #DDAA8B, 1px 1px 0 #DDAA8B, -1px -1px 0 #DDAA8B, 1px -1px 0 #DDAA8B, -1px 1px 0 #DDAA8B;
  font-family: 'Plus Jakarta Sans', sans-serif;
  z-index: 3;
}

.loop-badge {
  position: absolute;
  top: 11.94cqw;
  left: -0.25cqw;
  width: 6.97cqw;
  height: 6.97cqw;
  border-radius: 1.99cqw;
  background-color: #DDAA8B;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.loop-text {
  font-size: 3.48cqw;
  font-weight: 700;
  color: #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.status-center {
  position: absolute;
  top: calc(13.68cqw + env(safe-area-inset-top, 0px));
  left: 19.65cqw;
  display: flex;
  gap: 3.48cqw;
}

.energy-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.energy-pill,
.diamond-pill {
  background: #FAF5F8;
  border-radius: 0px 13px 13px 0px;
  width: 18.91cqw;
  height: 6.22cqw;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1.24cqw;
  padding: 0 1.24cqw 0 5.47cqw;
  position: relative;
  box-shadow: 0px 4px 4px rgba(0,0,0,0.25);
}

.energy-icon-img,
.diamond-icon-img {
  position: absolute;
  left: -2.49cqw;
  top: -1cqw;
  width: 7.96cqw;
  height: 7.96cqw;
  z-index: 4;
  border-radius: 50%;
  background: #F5F5FA;
  box-shadow: 5px 5px 10px rgba(170,170,204,0.5), -5px -5px 10px white;
  padding: 1.24cqw;
}

.energy-value,
.diamond-value {
  font-size: 3.48cqw;
  font-weight: 800;
  color: #DDAA8B;
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1;
}

.add-btn {
  width: 3.98cqw;
  height: 3.98cqw;
  border-radius: 50%;
  background: #73D13D;
  border: none;
  color: white;
  font-size: 2.99cqw;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-left: auto;
}

.energy-countdown {
  position: absolute;
  top: 5.22cqw;
  left: 50%;
  transform: translateX(-50%);
  background: #FAF5F8;
  border-radius: 5px 5px 12px 12px;
  padding: 1px 6px;
  font-size: 2.49cqw;
  font-weight: 700;
  color: #73D13D;
  font-family: 'Plus Jakarta Sans', sans-serif;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  z-index: 2;
  white-space: nowrap;
}

.status-right {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 135px;
  pointer-events: none;
}

.shop-circle-btn {
  position: absolute;
  top: calc(12.94cqw + env(safe-area-inset-top, 0px));
  right: 28.86cqw;
  width: 7.96cqw;
  height: 7.96cqw;
  border-radius: 50%;
  background: #FAF5F8;
  border: none;
  box-shadow: 5px 5px 10px rgba(170, 170, 204, 0.5), -5px -5px 10px #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  pointer-events: auto;
}

.shop-btn-icon-img {
  width: 4.48cqw;
  height: 4.48cqw;
}

.map-circle-btn {
  display: none;
}

.map-btn-icon {
  font-size: 16px;
  line-height: 1;
}

.rank-container {
  position: absolute;
  top: calc(13.93cqw + env(safe-area-inset-top, 0px));
  right: 2.49cqw;
  display: flex;
  align-items: center;
  gap: 1cqw;
  pointer-events: auto;
}

.rank-label {
  font-size: 5.97cqw;
  font-weight: 900;
  color: #DDAA8B;
  text-shadow: 1px 0 0 #fff, -1px 0 0 #fff, 0 1px 0 #fff, 0 -1px 0 #fff, 1px 1px 0 #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1;
  margin-right: 4px;
}

.rank-circle {
  width: 6.97cqw;
  height: 6.97cqw;
  border-radius: 50%;
  background: #DDAA8B;
  border: 2px solid #fff;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rank-number {
  font-size: 5.97cqw;
  font-weight: 900;
  color: #fff;
  font-family: 'Candal', 'Plus Jakarta Sans', sans-serif;
  line-height: 1;
}

.buff-row {
  position: absolute;
  top: calc(25.87cqw + env(safe-area-inset-top, 0px));
  left: 3.98cqw;
  display: flex;
  gap: 6px;
  z-index: 10;
}

.buff-pill {
  background: var(--off-white);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  border-radius: 32px;
  height: 6cqw;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  cursor: pointer;
}

.buff-pending {
  animation: buff-pulse 1.2s ease-in-out infinite;
}

.buff-icon {
  font-size: 12px;
}

.buff-timer {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-success);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

@keyframes buff-pulse {
  0%, 100% { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(243, 86, 131, 0.4); }
  50% { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(243, 86, 131, 0.15); }
}

.buff-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 798;
}

@media (max-height: 560px) {
  #status-bar {
    height: 85px;
    padding: calc(4px + env(safe-area-inset-top, 0px)) 8px 0 8px;
  }
  .status-left {
    top: calc(4px + env(safe-area-inset-top, 0px));
    width: 56px;
    height: 56px;
  }
  .coin-icon {
    width: 30px;
    height: 30px;
  }
  .gold-text {
    top: 22px;
    left: 4px;
    font-size: 10px;
  }
  .loop-badge {
    top: 36px;
    left: 4px;
    width: 22px;
    height: 22px;
    border-radius: 6px;
  }
  .loop-text {
    font-size: 11px;
  }
  .status-center {
    top: calc(8px + env(safe-area-inset-top, 0px));
    left: 44px;
    gap: 8px;
  }
  .energy-pill,
  .diamond-pill {
    height: 22px;
    padding: 0 4px 0 16px;
    gap: 4px;
  }
  .energy-icon-img,
  .diamond-icon-img {
    left: -7px;
    top: calc(50% - 11px);
    width: 22px;
    height: 22px;
  }
  .energy-value,
  .diamond-value {
    font-size: 12px;
  }
  .add-btn {
    width: 16px;
    height: 16px;
    font-size: 10px;
  }
  .energy-countdown {
    top: 22px;
    font-size: 8px;
    padding: 0 4px;
  }
  .status-right {
    height: 85px;
  }
  .shop-circle-btn {
    top: calc(6px + env(safe-area-inset-top, 0px));
    right: 80px;
    width: 28px;
    height: 28px;
  }
  .map-circle-btn {
    top: calc(38px + env(safe-area-inset-top, 0px));
    right: 80px;
    width: 28px;
    height: 28px;
  }
  .map-btn-icon {
    font-size: 13px;
  }
  .rank-container {
    top: calc(4px + env(safe-area-inset-top, 0px));
    right: 10px;
    gap: 2px;
  }
  .rank-label {
    font-size: 18px;
  }
  .rank-circle {
    width: 22px;
    height: 22px;
  }
  .rank-number {
    font-size: 18px;
  }
  .buff-row {
    top: calc(60px + env(safe-area-inset-top, 0px));
  }
  .buff-pill {
    min-height: 20px;
    padding: 0 6px;
  }
}

.buff-popover {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--off-white, #FAF5F8);
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
  color: var(--text-dark, #695E59);
  margin-bottom: 4px;
}

.popover-desc {
  font-size: 12px;
  color: var(--text-medium, #555);
  margin-bottom: 12px;
  line-height: 1.5;
}

.popover-timer-hint {
  font-size: 11px;
  color: var(--text-light, #999);
  margin-bottom: 12px;
}

.popover-remaining {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-pink);
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
  background: var(--surface-muted);
  color: var(--text-muted-alt);
}

.popover-activate {
  background: var(--accent-pink);
  color: white;
}
</style>
