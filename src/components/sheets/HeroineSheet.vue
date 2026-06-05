<!-- ============================================================
     HeroineSheet.vue — Heroine upgrade bottom sheet
     ============================================================
     Replaces #heroine-sheet from index.html lines 420-434.
     Shows list of upgrades with purchase buttons.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="heroine-sheet"
    :title="i18nStore.t('heroine.panelTitle')"
    icon="👑"
    :subtitle="i18nStore.t('heroine.panelSub')"
  >
    <div id="heroine-upgrade-list" class="heroine-upgrade-list">
      <div
        v-for="upgrade in heroineStore.upgradeList"
        :key="upgrade.id"
        class="heroine-upgrade-item"
      >
        <div class="upgrade-info">
          <span class="upgrade-icon">{{ upgrade.icon }}</span>
          <span class="upgrade-name">{{ upgrade.name }}</span>
          <span class="upgrade-level">Lv.{{ getUpgradeLevel(upgrade.id) }}</span>
        </div>
        <button
          class="upgrade-buy-btn"
          :disabled="!canAfford(upgrade)"
          @click="purchaseUpgrade(upgrade)"
        >
          {{ getNextCost(upgrade) }} 💰
        </button>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useHeroineStore } from '../../stores/heroineStore'
import { useCurrencyStore } from '../../stores/currencyStore'
import { useI18nStore } from '../../stores/i18nStore'
import type { HeroineUpgrade } from '../../stores/heroineStore'

const { isOpen } = useSheet('heroine-sheet')
const heroineStore = useHeroineStore()
const currencyStore = useCurrencyStore()
const i18nStore = useI18nStore()

function getUpgradeLevel(upgradeId: string): number {
  const level = heroineStore.upgrades[upgradeId]
  return level >= 0 ? level + 1 : 0
}

function getNextCost(upgrade: HeroineUpgrade): number {
  const currentLevel = heroineStore.upgrades[upgrade.id]
  if (currentLevel >= upgrade.levels.length - 1) return 0 // maxed
  const nextLevel = upgrade.levels[currentLevel + 1]
  return nextLevel?.cost ?? 0
}

function canAfford(upgrade: HeroineUpgrade): boolean {
  const currentLevel = heroineStore.upgrades[upgrade.id]
  if (currentLevel >= upgrade.levels.length - 1) return false // maxed
  const cost = getNextCost(upgrade)
  return currencyStore.gold >= cost
}

function purchaseUpgrade(upgrade: HeroineUpgrade) {
  heroineStore.purchaseUpgrade(upgrade.id)
}
</script>

<style scoped>
/* ---- Heroine Upgrade List ---- */
.heroine-upgrade-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ---- Heroine Card ---- */
.heroine-card {
  background: rgb(255, 225, 204);
  border: 1px solid rgba(221, 170, 139, 0.3);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.heroine-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.heroine-card.maxed {
  opacity: 0.7;
  background: rgba(76, 175, 80, 0.08);
  border-color: rgba(76, 175, 80, 0.15);
}

.heroine-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.heroine-icon {
  font-size: 24px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(196, 79, 226, 0.1);
  border-radius: 10px;
  flex-shrink: 0;
}

.heroine-card-info {
  flex: 1;
  min-width: 0;
}

.heroine-card-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dark);
}

.heroine-card-desc {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
}

.heroine-level-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.heroine-level-dot {
  width: 24px;
  height: 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.1);
  transition: background 0.3s ease;
}

.heroine-level-dot.active {
  background: linear-gradient(90deg, var(--accent-pink), var(--accent-purple));
}

.heroine-effect {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 8px;
  font-weight: 500;
}

/* ---- Upgrade Item (simplified row) ---- */
.heroine-upgrade-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgb(255, 225, 204);
  border: 1px solid rgba(221, 170, 139, 0.3);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.heroine-upgrade-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.upgrade-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upgrade-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(196, 79, 226, 0.1);
  border-radius: 10px;
  flex-shrink: 0;
}

.upgrade-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dark);
}

.upgrade-level {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

/* ---- Upgrade Buy Button ---- */
.upgrade-buy-btn {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
}

.upgrade-buy-btn:disabled {
  cursor: not-allowed;
}

.upgrade-buy-btn.affordable {
  background: linear-gradient(135deg, var(--accent-pink), var(--accent-purple));
  color: white;
  box-shadow: 0 2px 8px rgba(196, 79, 226, 0.3);
}

.upgrade-buy-btn.affordable:hover {
  filter: brightness(1.1);
}

.upgrade-buy-btn.affordable:active {
  transform: scale(0.95);
}

/* ---- Heroine Restart Button ---- */
.heroine-restart-btn {
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 12px 0;
  border: 2px solid rgba(244, 67, 54, 0.3);
  border-radius: 12px;
  background: rgba(244, 67, 54, 0.08);
  color: #d32f2f;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.heroine-restart-btn:hover {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.5);
}

.heroine-restart-btn:active {
  transform: scale(0.96);
  background: rgba(244, 67, 54, 0.22);
}
</style>
