<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="gacha-sheet"
    title="扭蛋"
    icon="✨"
  >
    <!-- Rates header -->
    <div class="gacha-rates-pills">
      <span class="rate-pill r-rate">R : {{ gachaRateR }}%</span>
      <span class="rate-pill sr-rate">SR : {{ gachaRateSR }}%</span>
      <span class="rate-pill ssr-rate">SSR : {{ gachaRateSSR }}%</span>
    </div>

    <div class="gacha-outer-frame">
      <div class="gacha-inner-frame">
        <!-- Grid Results Area (Charcoal Box) -->
        <div class="gacha-result-container">
          <div v-if="gachaStore.results.length === 0" class="gacha-welcome-screen">
            <span class="welcome-egg">✨</span>
            <span class="welcome-title">{{ i18nStore.t('gacha.panelTitle') || '心动扭蛋机' }}</span>
            <span class="welcome-subtitle">{{ i18nStore.t('gacha.hint') || '抽取随机合成器与实用道具！' }}</span>
          </div>
          <div v-else id="gacha-result" class="gacha-grid-results">
            <div
              v-for="(card, i) in gachaGridCards"
              :key="card.id || i"
              class="gacha-card"
              :class="[card.placeholder ? 'placeholder' : getRarityTag(card)]"
            >
              <template v-if="!card.placeholder">
                <!-- Card Rarity Badge (Top Right) -->
                <span class="card-rarity-badge">{{ getRarityTag(card) }}</span>
                
                <!-- Card Emoji / Image Portrait -->
                <div class="card-content-area">
                  <span class="card-icon-emoji">{{ card.icon }}</span>
                </div>

                <!-- Card Level / Affection Heart (Bottom) -->
                <div class="card-footer-badge">
                  <span class="lvl-label">Lv.{{ card.value?.level || 1 }}</span>
                </div>
              </template>
              <template v-else>
                <!-- Clean empty slot visual -->
                <div class="gacha-card-empty-slot">
                  <span class="empty-slot-mark">?</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Rhombus Pull Button Controls -->
        <div class="gacha-redesign-controls">
          <div class="gacha-pull-option">
            <div class="gacha-diamond-container">
              <button class="gacha-diamond-btn" @click="singlePull">
                <div class="diamond-btn-content">
                  <span class="pull-text">单抽</span>
                </div>
              </button>
            </div>
            <div class="gacha-cost-badge">
              <span class="cost-icon">💎</span>
              <span class="cost-value">x{{ singleCost }}</span>
            </div>
          </div>

          <div class="gacha-pull-option">
            <div class="gacha-diamond-container">
              <button class="gacha-diamond-btn ten" @click="tenPull">
                <div class="diamond-btn-content">
                  <span class="pull-text">十连抽</span>
                </div>
              </button>
            </div>
            <div class="gacha-cost-badge">
              <span class="cost-icon">💎</span>
              <span class="cost-value">x{{ tenCost }}</span>
            </div>
          </div>
        </div>

        <!-- Free Video Pull Capsule -->
        <div class="gacha-free-pull-container">
          <button
            class="gacha-free-pull-btn"
            :disabled="!gachaStore.canFreePull"
            @click="freePull"
          >
            <span class="video-icon">📹</span>
            <span class="free-text">免费 {{ gachaStore.freePullsLeft }}/1</span>
          </button>
        </div>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useGachaStore } from '../../stores/gachaStore'
import { useCurrencyStore } from '../../stores/currencyStore'
import { useConfigStore } from '../../stores/configStore'
import { useEffects } from '../../composables/useEffects'
import { useI18nStore } from '../../stores/i18nStore'
import { useApplyDeps } from '../../composables/useApplyDeps'
import { applyResolveResult } from '../../composables/useGameLoop'
import type { GachaItem } from '../../logic/GachaLogic'

type GachaGridCard = Partial<GachaItem> & { id: string; placeholder?: boolean };

const { isOpen } = useSheet('gacha-sheet')
const gachaStore = useGachaStore()
const configStore = useConfigStore()
const currencyStore = useCurrencyStore()
const i18nStore = useI18nStore()
const effects = useEffects()
const applyDeps = useApplyDeps()

const singleCost = computed(() => configStore.gachaCost?.singleCost ?? 100)
const tenCost = computed(() => configStore.gachaCost?.tenCost ?? 900)
const gachaRateR = computed(() => (configStore.gachaRarityConfig?.R?.probability ?? 0.74) * 100)
const gachaRateSR = computed(() => (configStore.gachaRarityConfig?.SR?.probability ?? 0.25) * 100)
const gachaRateSSR = computed(() => (configStore.gachaRarityConfig?.SSR?.probability ?? 0.01) * 100)

const gachaGridCards = computed<GachaGridCard[]>(() => {
  const cards: GachaGridCard[] = [...gachaStore.results];
  while (cards.length < 10) {
    cards.push({
      id: 'placeholder-' + cards.length,
      placeholder: true
    });
  }
  return cards;
});

function getRarityTag(result: GachaGridCard) {
  return result.rarity || 'R';
}

function singlePull() {
  if (!currencyStore.canAffordDiamonds(singleCost.value)) {
    effects.showToast(i18nStore.t('currency.insufficientDiamonds') || '钻石不足！', 'error')
    return
  }
  const result = gachaStore.singlePull()
  if (!result.ok) {
    effects.showToast(i18nStore.t('gacha.pullFailed') || '抽卡失败', 'error')
    return
  }
  applyResolveResult(result.resolveResult, applyDeps)
  if (!result.data.pullResult) {
    effects.showToast(i18nStore.t('gacha.pullFailed') || '抽卡失败', 'error')
  }
}

function tenPull() {
  if (!currencyStore.canAffordDiamonds(tenCost.value)) {
    effects.showToast(i18nStore.t('currency.insufficientDiamonds') || '钻石不足！', 'error')
    return
  }
  const result = gachaStore.tenPull()
  if (!result.ok) {
    effects.showToast(i18nStore.t('gacha.pullFailed') || '抽卡失败', 'error')
    return
  }
  applyResolveResult(result.resolveResult, applyDeps)
  if (!result.data.pullResults) {
    effects.showToast(i18nStore.t('gacha.pullFailed') || '抽卡失败', 'error')
  }
}

function freePull() {
  if (!gachaStore.canFreePull) {
    effects.showToast(i18nStore.t('gacha.noFreePulls') || '今日免费次数已用完！', 'info')
    return
  }
  const result = gachaStore.freePull()
  if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
}
</script>

<style scoped>
/* ---- Rates header pills ---- */
.gacha-rates-pills {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.rate-pill {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.r-rate {
  background: #EAE5C9;
  color: #8A7E55;
}

.sr-rate {
  background: #CBE2F4;
  color: #4A698A;
}

.ssr-rate {
  background: #FCE9D9;
  color: #C97E4A;
}

/* ---- Double Framing Container ---- */
.gacha-outer-frame {
  flex: 1;
  margin: 0;
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0;
}

.gacha-inner-frame {
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  min-height: 0;
}

/* ---- Charcoal Chocolate Results Box ---- */
.gacha-result-container {
  background: #FFF5EE;
  border: 3px solid var(--warm-border, #CDA080);
  border-radius: 18px;
  padding: 10px;
  flex: 1;
  min-height: 180px;
  max-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 6px rgba(160, 120, 80, 0.1);
  margin-bottom: 12px;
  overflow-y: auto;
  box-sizing: border-box;
}

/* ---- Grid Layout for Draw Results ---- */
.gacha-grid-results {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 4px;
  box-sizing: border-box;
}

/* ---- Gacha Result Card ---- */
.gacha-card {
  aspect-ratio: 0.78;
  background: var(--off-white);
  border-radius: 8px;
  border: 2px solid #FEDAB2;
  box-shadow: 0 3px 6px rgba(160, 120, 80, 0.1);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 3px;
  box-sizing: border-box;
  overflow: hidden;
}

.gacha-card.placeholder {
  background: #ECE5E0;
  border-color: #D2C8C0;
  opacity: 0.85;
}

.card-rarity-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 8px;
  font-weight: 900;
  background: var(--warm-brown-icon);
  color: var(--text-primary);
  padding: 0 4px;
  border-radius: 4px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1.2;
}

.card-content-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 4px 0;
}

.card-icon-emoji {
  font-size: 24px;
  line-height: 1;
}

.card-footer-badge {
  background: rgba(221, 170, 139, 0.15);
  border-radius: 4px;
  padding: 1px 4px;
  width: 90%;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1px;
}

.placeholder .card-footer-badge {
  background: rgba(0, 0, 0, 0.05);
}

.lvl-label {
  font-size: 7px;
  font-weight: 800;
  color: var(--warm-brown-icon);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* Rarity variants */
.gacha-card.N {
  background: var(--off-white);
}

.gacha-card.R {
  background: var(--off-white);
  border-color: #B8DCF0;
}
.gacha-card.R .card-rarity-badge {
  background: var(--rarity-r);
}

.gacha-card.SR {
  background: var(--off-white);
  border-color: #E4D2EC;
}
.gacha-card.SR .card-rarity-badge {
  background: var(--rarity-sr);
}

.gacha-card.SSR {
  background: var(--off-white);
  border-color: #FCEBB3;
}
.gacha-card.SSR .card-rarity-badge {
  background: var(--rarity-ssr);
}



/* ---- Pull Controls Rhombus Section ---- */
.gacha-redesign-controls {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  margin: 10px 0;
  padding: 0;
  box-sizing: border-box;
  flex-shrink: 0;
}

.gacha-pull-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.gacha-diamond-container {
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* ---- Rhombus Pull Buttons ---- */
.gacha-diamond-btn {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #FFF9F3 0%, #DFC0A5 100%);
  border: 2.5px solid var(--off-white);
  border-radius: 12px;
  transform: rotate(45deg);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(181, 147, 116, 0.25), inset 0 0 8px rgba(255, 255, 255, 0.8);
  transition: transform 0.15s ease;
}

.gacha-diamond-btn.ten {
  background: linear-gradient(135deg, #FFF6E6 0%, #E8BE88 100%);
  box-shadow: 0 6px 16px rgba(232, 190, 136, 0.3), inset 0 0 8px rgba(255, 255, 255, 0.8);
}

.gacha-diamond-btn:active {
  transform: rotate(45deg) scale(0.93);
}

.diamond-btn-content {
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pull-text {
  font-size: 13px;
  font-weight: 900;
  color: var(--text-heading);
  white-space: nowrap;
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

/* ---- Cost Pill Capsules ---- */
.gacha-cost-badge {
  background: #3E322D;
  border: 2px solid var(--off-white);
  border-radius: 99px;
  padding: 3px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  line-height: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* ---- Free Pull Container ---- */
.gacha-free-pull-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  flex-shrink: 0;
}

.gacha-free-pull-btn {
  background: rgba(62, 50, 45, 0.9);
  border: 2px solid var(--off-white);
  border-radius: 99px;
  padding: 6px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
  line-height: 1;
}

.gacha-free-pull-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gacha-free-pull-btn:active {
  transform: scale(0.94);
}

.video-icon {
  font-size: 13px;
  line-height: 1;
}

.free-text {
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

/* ---- Welcome Graphic & Empty Slot Styles ---- */
.gacha-welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  text-align: center;
}

.welcome-egg {
  font-size: 48px;
  animation: egg-bounce 2s infinite ease-in-out;
}

.welcome-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--text-heading);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.welcome-subtitle {
  font-size: 11px;
  color: var(--warm-brown-icon);
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

@keyframes egg-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.05); }
}

.gacha-card-empty-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 1.5px dashed rgba(160, 120, 80, 0.25);
  border-radius: 6px;
  box-sizing: border-box;
}

.empty-slot-mark {
  font-size: 16px;
  font-weight: 800;
  color: rgba(160, 120, 80, 0.2);
  font-family: 'Plus Jakarta Sans', sans-serif;
}
</style>

