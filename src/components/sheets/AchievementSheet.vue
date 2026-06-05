<!-- ============================================================
     AchievementSheet.vue — Achievement bottom sheet
     ============================================================
     Replaces #achievement-sheet from index.html lines 602-616.
     Uses achievementStore for achievement data.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="achievement-sheet"
    :title="i18nStore.t('achievement.panelTitle')"
    icon="🏆"
    :subtitle="i18nStore.t('achievement.panelSub')"
  >
    <div id="achievement-list" class="achievement-list">
      <div
        v-for="ach in achievementStore.achievementList"
        :key="ach.id"
        class="achievement-item"
        :class="{
          completed: achievementStore.completed.has(ach.id),
          unlocked: achievementStore.unlocked.has(ach.id)
        }"
      >
        <span class="achievement-icon">{{ ach.icon }}</span>
        <div class="achievement-info">
          <span class="achievement-name">{{ ach.name }}</span>
          <span class="achievement-desc">{{ ach.description }}</span>
        </div>
        <span v-if="achievementStore.completed.has(ach.id)" class="achievement-check">✅</span>
        <button
          v-else-if="achievementStore.unlocked.has(ach.id)"
          class="achievement-claim-btn"
          @click="claimReward(ach)"
        >
          🎁
        </button>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useAchievementStore } from '../../stores/achievementStore'
import { useI18nStore } from '../../stores/i18nStore'
import type { Achievement } from '../../stores/achievementStore'

const { isOpen } = useSheet('achievement-sheet')
const achievementStore = useAchievementStore()
const i18nStore = useI18nStore()

function claimReward(ach: Achievement) {
  achievementStore.complete(ach.id)
}
</script>

<style scoped>
/* ---- Achievement Progress ---- */
.achievement-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-dark);
}

.achievement-progress-bar {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.achievement-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* ---- Achievement List ---- */
.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ---- Achievement Card ---- */
.achievement-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  opacity: 0.8;
  transition: all 0.2s ease;
}

.achievement-item.completed {
  opacity: 1;
  background: linear-gradient(135deg, #fff, #fffde7);
  border-left: 4px solid #FFC107;
}

.achievement-item.unlocked {
  opacity: 1;
  background: linear-gradient(135deg, #fffde7, #fff8e1);
  border-left: 4px solid #FF9800;
  border-color: rgba(255, 152, 0, 0.4);
  animation: achievement-claimable-pulse 2s ease-in-out infinite;
}

@keyframes achievement-claimable-pulse {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}

/* ---- Achievement Icon ---- */
.achievement-icon {
  font-size: 28px;
  filter: grayscale(1);
  flex-shrink: 0;
}

.achievement-item.completed .achievement-icon,
.achievement-item.unlocked .achievement-icon {
  filter: grayscale(0);
}

/* ---- Achievement Info ---- */
.achievement-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.achievement-name {
  font-size: 14px;
  font-weight: 800;
  color: var(--text-dark);
}

.achievement-desc {
  font-size: 11px;
  color: var(--text-muted-alt);
}

/* ---- Achievement Card Bar ---- */
.achievement-card-bar {
  height: 4px;
  background: #eee;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 2px;
}

.achievement-card-fill {
  height: 100%;
  background: var(--color-success);
}

/* ---- Achievement Reward ---- */
.achievement-card-reward {
  font-size: 12px;
  font-weight: 700;
  color: #1976D2;
  white-space: nowrap;
}

.achievement-card-reward.claimed {
  color: var(--text-light);
}

/* ---- Achievement Check ---- */
.achievement-check {
  font-size: 16px;
  flex-shrink: 0;
}

/* ---- Achievement Claim Button ---- */
.achievement-claim-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.35);
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
  animation: claim-btn-glow 1.5s ease-in-out infinite alternate;
}

@keyframes claim-btn-glow {
  0% { opacity: 0.8; }
  100% { opacity: 1; }
}

.achievement-claim-btn:hover {
  filter: brightness(1.1);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.45);
}

.achievement-claim-btn:active {
  transform: scale(0.93);
}
</style>
