<!-- ============================================================
     GachaSheet.vue — Gacha pull bottom sheet
     ============================================================
     Replaces #gacha-sheet from index.html lines 470-544.
     Uses gachaStore for gacha data. Most complex sheet with
     pull controls and results.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="gacha-sheet"
    :title="i18nStore.t('gacha.panelTitle')"
    icon="✨"
  >
    <div class="gacha-redesign-header">
      <button class="gacha-header-back-btn" @click="close">←</button>
      <div class="gacha-header-title-pill">{{ i18nStore.t('gacha.panelTitle') }}</div>
      <button class="gacha-header-help-btn" @click="showHelp">?</button>
    </div>
    <div class="gacha-outer-frame">
      <div class="gacha-inner-frame">
        <div class="gacha-result-container">
          <div id="gacha-result" class="gacha-grid-results">
            <div v-if="gachaStore.results.length === 0" class="gacha-hint">
              {{ i18nStore.t('gacha.hint') }}
            </div>
            <div
              v-for="(result, i) in gachaStore.results"
              :key="i"
              class="gacha-result-item"
              :class="result.rarity"
            >
              {{ result.icon }}
            </div>
          </div>
        </div>
        <div class="gacha-redesign-controls">
          <div class="gacha-pull-option">
            <button class="gacha-rhombus-btn" @click="singlePull">{{ i18nStore.t('gacha.singlePull') }}</button>
            <div class="gacha-cost-pill">💎 x{{ singleCost }}</div>
          </div>
          <div class="gacha-pull-option">
            <button class="gacha-rhombus-btn ten" @click="tenPull">{{ i18nStore.t('gacha.tenPull') }}</button>
            <div class="gacha-cost-pill">💎 x{{ tenCost }}</div>
          </div>
        </div>
        <div class="gacha-free-pull-container">
          <button
            class="gacha-free-pull-btn"
            :disabled="gachaStore.freePullsLeft <= 0"
            @click="freePull"
          >
            {{ i18nStore.t('gacha.freePull') }} {{ gachaStore.freePullsLeft }}/1
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
import { useI18nStore } from '../../stores/i18nStore'

const { isOpen, close } = useSheet('gacha-sheet')
const gachaStore = useGachaStore()
const currencyStore = useCurrencyStore()
const configStore = useConfigStore()
const i18nStore = useI18nStore()

const singleCost = computed(() => configStore.gachaCost?.singleCost || 100)
const tenCost = computed(() => configStore.gachaCost?.tenCost || 900)

function singlePull() {
  if (!currencyStore.canAffordDiamonds(singleCost.value)) return
  currencyStore.spendDiamonds(singleCost.value)
  const result = gachaStore.singlePull()
  if (!result) {
    currencyStore.addDiamonds(singleCost.value)
  }
}

function tenPull() {
  if (!currencyStore.canAffordDiamonds(tenCost.value)) return
  currencyStore.spendDiamonds(tenCost.value)
  const result = gachaStore.tenPull()
  if (!result) {
    currencyStore.addDiamonds(tenCost.value)
  }
}

function freePull() {
  if (gachaStore.freePullsLeft <= 0) return
  gachaStore.freePull()
}

function showHelp() {
  // Emit event for help dialog; actual UI handled elsewhere
  // Minimal implementation — full help panel in Phase 9
}
</script>

<style scoped>
/* ---- Premium Gacha Header ---- */
.gacha-redesign-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 18px 16px 10px;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
}

.gacha-header-back-btn,
.gacha-header-help-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--warm-border);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  transition: transform 0.15s ease;
}

.gacha-header-back-btn:active,
.gacha-header-help-btn:active {
  transform: scale(0.85);
}

.gacha-header-title-pill {
  background: #FFF;
  border: 3px solid var(--warm-border);
  border-radius: 99px;
  padding: 6px 42px;
  font-size: 16px;
  font-weight: 900;
  color: var(--warm-border);
  box-shadow: 0 4px 8px rgba(181, 147, 116, 0.15), inset 0 1.5px 3px rgba(0, 0, 0, 0.02);
  text-align: center;
  line-height: 1;
  letter-spacing: 3px;
  text-indent: 3px;
}

/* ---- Double Framing Container ---- */
.gacha-outer-frame {
  flex: 1;
  margin: 0 16px 16px;
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
  border: 3.5px solid var(--warm-border);
  border-radius: 24px;
  background: #FCF5EC;
  padding: 16px 14px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  min-height: 0;
}

/* ---- Charcoal Chocolate Results Box ---- */
.gacha-result-container {
  background: #3E322D;
  border: 3.5px solid var(--warm-border);
  border-radius: 18px;
  padding: 14px;
  flex: 1;
  min-height: 170px;
  max-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.55);
  margin-bottom: 12px;
  overflow-y: auto;
  box-sizing: border-box;
}

/* ---- Grid Layout for Draw Results ---- */
.gacha-grid-results {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 4px;
  box-sizing: border-box;
}

/* ---- Gacha Hint ---- */
.gacha-hint {
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  padding: 20px 0;
  letter-spacing: 0.5px;
}

/* ---- Gacha Result Item (card in charcoal box) ---- */
.gacha-result-item {
  width: 58px;
  height: 58px;
  background: #FFE4D6;
  border: 2.5px solid #FFF;
  border-radius: 12px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-size: 28px;
  animation: gacha-reveal-scale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25) both;
}

@keyframes gacha-reveal-scale {
  0% { transform: scale(0) rotate(15deg); opacity: 0; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

/* Rarity variants */
.gacha-result-item.SSR {
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.2), rgba(255, 87, 34, 0.15));
  border-color: rgba(241, 196, 15, 0.35);
  box-shadow: 0 0 20px rgba(241, 196, 15, 0.25);
}

.gacha-result-item.SR {
  background: rgba(155, 89, 182, 0.15);
  border-color: rgba(155, 89, 182, 0.25);
  box-shadow: 0 0 12px rgba(155, 89, 182, 0.15);
}

.gacha-result-item.R {
  background: rgba(74, 144, 217, 0.15);
  border-color: rgba(74, 144, 217, 0.25);
}

/* ---- Pull Controls Rhombus Section ---- */
.gacha-redesign-controls {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  margin: 14px 0;
  padding: 0 6px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.gacha-pull-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

/* ---- Rhombus Pull Buttons ---- */
.gacha-rhombus-btn {
  width: 88px;
  height: 88px;
  background: linear-gradient(135deg, #FFF9F3 0%, #DFC0A5 100%);
  border: 3px solid #FFF;
  border-radius: 12px;
  transform: rotate(45deg);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(181, 147, 116, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.8);
  transition: transform 0.2s, filter 0.2s, opacity 0.2s;
}

.gacha-rhombus-btn.ten {
  background: linear-gradient(135deg, #FFF6E6 0%, #E8BE88 100%);
  box-shadow: 0 6px 16px rgba(232, 190, 136, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.8);
}

.gacha-rhombus-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  filter: grayscale(0.2);
}

.gacha-rhombus-btn:not(:disabled):active {
  transform: rotate(45deg) scale(0.93);
}

/* ---- Cost Pill Capsules ---- */
.gacha-cost-pill {
  background: #3E322D;
  border: 2px solid #FFF;
  border-radius: 99px;
  padding: 4px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-inverse);
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  line-height: 1;
}

/* ---- Free Pull Container ---- */
.gacha-free-pull-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: 4px;
  flex-shrink: 0;
}

.gacha-free-pull-btn {
  background: rgba(62, 50, 45, 0.9);
  border: 2px solid #FFF;
  border-radius: 99px;
  padding: 6px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-inverse);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease, filter 0.15s ease;
  line-height: 1;
}

.gacha-free-pull-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gacha-free-pull-btn:not(:disabled):active {
  transform: scale(0.94);
}

/* ---- Legacy Gacha Buttons (fallback) ---- */
.gacha-buttons {
  padding: 12px 16px 16px;
  display: flex;
  gap: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.gacha-pull-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.65), rgba(233, 30, 99, 0.65));
  color: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.gacha-pull-btn.ten {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.65), rgba(255, 87, 34, 0.55));
}

.gacha-pull-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gacha-pull-btn:not(:disabled):hover {
  filter: brightness(1.1);
}

.gacha-pull-btn:not(:disabled):active {
  transform: scale(0.95);
}
</style>
