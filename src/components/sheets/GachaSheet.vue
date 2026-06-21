<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="gacha-sheet"
    title="扭蛋"
    icon="✨"
  >
    <div class="gacha-outer-frame">
      <div class="gacha-inner-frame">
        <div class="gacha-result-container">
          <div class="gacha-rates-pills">
            <span class="rate-pill r-rate">R : {{ gachaRateR }}%</span>
            <span class="rate-pill sr-rate">SR : {{ gachaRateSR }}%</span>
            <span class="rate-pill ssr-rate">SSR : {{ gachaRateSSR }}%</span>
          </div>
          <div id="gacha-result" class="gacha-grid-results">
            <div
              v-for="(card, i) in gachaGridCards"
              :key="card.id || i"
              class="gacha-card"
              :class="[card.placeholder ? 'placeholder' : getRarityTag(card)]"
            >
              <template v-if="!card.placeholder">
                <!-- Rarity-specific background layer -->
                <div class="gacha-card-bg" :style="getCardBgStyle(card)"></div>

                <span class="card-rarity-badge">{{ getRarityTag(card) }}</span>
                <div class="card-content-area">
                  <img class="card-icon-img" :src="getCardAsset(card)" alt="" />
                  <span v-if="!getCardAsset(card)" class="card-icon-emoji">{{ card.icon }}</span>
                </div>
                <div class="card-footer-badge" :class="getRarityTag(card)">
                  <span class="lvl-label">Lv.{{ card.value?.level || 1 }}</span>
                </div>
              </template>
              <template v-else>
                <div class="gacha-card-empty-slot">
                  <img class="empty-slot-img" :src="baseUrl + 'assets/figma/food-icon.png'" alt="" />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Rhombus Pull Button Controls -->
        <div class="gacha-redesign-controls">
          <div class="gacha-pull-option">
            <div class="gacha-diamond-container">
              <button
                class="gacha-diamond-btn"
                :style="{ '--btn-bg': `url(${baseUrl}assets/figma/onepull.svg)` }"
                @click="singlePull"
              >
                <div class="diamond-btn-content">
                  <span class="pull-text">单抽</span>
                </div>
              </button>
            </div>
            <div class="gacha-cost-badge">
              <img class="cost-icon-img" :src="baseUrl + 'assets/figma/gacha-diamond.png'" alt="" />
              <span class="cost-value">x{{ singleCost }}</span>
            </div>
          </div>

          <div class="gacha-pull-option">
            <div class="gacha-diamond-container">
              <button
                class="gacha-diamond-btn ten"
                :style="{ '--btn-bg': `url(${baseUrl}assets/figma/tenpull.svg)` }"
                @click="tenPull"
              >
                <div class="diamond-btn-content">
                  <span class="pull-text">十连抽</span>
                </div>
              </button>
            </div>
            <div class="gacha-cost-badge">
              <img class="cost-icon-img" :src="baseUrl + 'assets/figma/gacha-diamond.png'" alt="" />
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
            <img class="video-icon" :src="baseUrl + 'assets/figma/video-camera.png'" alt="" />
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

const baseUrl = import.meta.env.BASE_URL

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
  const rarity = String(result.rarity || 'R').toUpperCase();
  if (rarity === 'SSR' || rarity === 'SR' || rarity === 'R') return rarity;
  return 'R';
}

function getCardBgStyle(result: GachaGridCard) {
  if (result.placeholder) return {};
  const rarity = getRarityTag(result);
  let bgFile = 'r-bg.svg';
  if (rarity === 'SR') bgFile = 'sr-bg.svg';
  else if (rarity === 'SSR') bgFile = 'ssr-bg.svg';

  return {
    backgroundImage: `url(${import.meta.env.BASE_URL}assets/figma/${bgFile})`
  };
}

function getCardAsset(result: GachaGridCard) {
  if (result.placeholder) return '';
  const rarity = getRarityTag(result);
  if (result.id?.startsWith('preview-')) {
    if (rarity === 'SSR') return import.meta.env.BASE_URL + 'assets/figma/character-card-art.png';
    return import.meta.env.BASE_URL + 'assets/figma/float.png';
  }
  if (result.icon && /^https?:\/|^\//.test(result.icon)) return result.icon;
  if (rarity === 'SSR') return import.meta.env.BASE_URL + 'assets/figma/character-card-art.png';
  if (rarity === 'SR') return import.meta.env.BASE_URL + 'assets/figma/group75.png';
  return import.meta.env.BASE_URL + 'assets/figma/float.png';
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
  position: absolute;
  top: -9px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
  margin: 0;
  flex-shrink: 0;
  z-index: 3;
}

.rate-pill {
  font-size: 10px;
  font-weight: 800;
  min-width: 58px;
  height: 18px;
  padding: 0 7px;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.r-rate {
  background: #C4D388;
  color: #5B6A31;
}

.sr-rate {
  background: #ADCBE3;
  color: #4B6B8A;
}

.ssr-rate {
  background: #F8D388;
  color: #B37D22;
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
  justify-content: flex-start;
  align-items: center;
  box-sizing: border-box;
  min-height: 0;
  gap: 2px;
}

.gacha-result-container {
  position: relative;
  margin-top: 42px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  padding: 12px 8px 12px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(140, 130, 135, 0.08);
  overflow: visible;
  box-sizing: border-box;
}

.gacha-grid-results {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 12px 8px;
  width: 100%;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
}

.gacha-card {
  width: 50px;
  height: 68px;
  background: rgba(109, 104, 117, 0.05);
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 3px;
  box-sizing: border-box;
  overflow: visible;
}

.gacha-card.placeholder {
  background: rgba(109, 104, 117, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
  opacity: 0.78;
}

.gacha-card-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: none;
}

.card-rarity-badge,
.card-content-area,
.card-footer-badge {
  position: relative;
  z-index: 2;
}

.card-rarity-badge {
  position: absolute;
  top: -5px;
  right: -3px;
  min-width: 22px;
  height: 12px;
  font-size: 7px;
  font-weight: 900;
  color: #fff;
  padding: 1px 4px 0;
  border-radius: 5px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 1px 1px rgba(0,0,0,0.25);
}

.card-content-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1px 0 0;
}

.card-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2));
}

.card-icon-emoji {
  font-size: 20px;
  line-height: 1;
}

.card-footer-badge {
  border-radius: 0 0 4px 4px;
  padding: 2px 4px;
  width: calc(100% + 6px);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 -3px -3px;
}

.placeholder .card-footer-badge {
  background: rgba(0, 0, 0, 0.05);
}

.lvl-label {
  font-size: 7px;
  font-weight: 800;
  color: #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* Rarity variants */
.gacha-card.R {
  border-color: #A3B574;
}
.gacha-card.R .card-rarity-badge {
  background: #759247;
}
.card-footer-badge.R {
  background: rgba(117, 146, 71, 0.85);
}

.gacha-card.SR {
  border-color: #A4C5DE;
}
.gacha-card.SR .card-rarity-badge {
  background: #3B6A97;
}
.card-footer-badge.SR {
  background: rgba(59, 106, 151, 0.85);
}

.gacha-card.SSR {
  border-color: #F7D488;
}
.gacha-card.SSR .card-rarity-badge {
  background: #D88E23;
}
.card-footer-badge.SSR {
  background: rgba(216, 142, 35, 0.85);
}

/* ---- Pull Controls Rhombus Section ---- */
.gacha-redesign-controls {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: min(100%, 250px);
  margin: 12px 0 4px;
  padding: 0;
  box-sizing: border-box;
  flex-shrink: 0;
  gap: 41px;
}

.gacha-pull-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.gacha-diamond-container {
  width: 95px;
  height: 74px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* ---- Rhombus Pull Buttons ---- */
.gacha-diamond-btn {
  width: 63px;
  height: 63px;
  background-image: var(--btn-bg);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  background-color: transparent;
  border: 2px solid #C4C9D3;
  border-radius: 8px;
  transform: rotate(45deg);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.gacha-diamond-btn.ten {
  border-color: #FFAEAE;
}

.gacha-diamond-btn:active {
  transform: rotate(45deg) scale(0.95);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.diamond-btn-content {
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pull-text {
  font-size: 12px;
  font-weight: 800;
  color: #5C5254;
  white-space: nowrap;
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

/* ---- Cost Pill Capsules ---- */
.gacha-cost-badge {
  width: 95px;
  height: 22px;
  margin-top: -10px;
  background: #9A8D99;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 99px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  line-height: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
  z-index: 2;
}

.cost-icon-img {
  width: 22px;
  height: 19px;
  object-fit: contain;
  margin-left: -4px;
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
  width: 110px;
  height: 24px;
  background: rgba(140, 130, 135, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 99px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease, background 0.15s ease;
  line-height: 1;
}

.gacha-free-pull-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gacha-free-pull-btn:hover:not(:disabled) {
  background: rgba(140, 130, 135, 0.85);
}

.gacha-free-pull-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.video-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
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
  border: none;
  border-radius: 6px;
  box-sizing: border-box;
}

.empty-slot-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  opacity: 0.92;
  filter: grayscale(0.15);
}

@media (max-height: 760px) {
  .gacha-result-container {
    margin-top: 20px;
    transform: scale(0.9);
    transform-origin: top center;
  }

  .gacha-redesign-controls {
    margin-top: -12px;
    transform: scale(0.9);
  }
}
</style>
