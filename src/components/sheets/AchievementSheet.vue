<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="achievement-sheet"
    title="通行证"
    icon="🏆"
    theme="warm"
  >
    <div class="ach-progress-capsule">
      <div class="ach-trophy-circle">🏆</div>
      <div class="ach-progress-bar">
        <div class="ach-progress-fill" :style="{ width: `${progressPct}%` }" />
      </div>
      <span class="ach-progress-text">{{ achievementStore.completedCount }}/{{ achievementStore.totalAchievements }}</span>
      <div class="ach-gift-circle">🎁</div>
    </div>

    <div class="ach-list">
      <template v-for="(ach, index) in sortedAchievements" :key="ach.id">
        <AchievementCard
          :achievement="ach"
          :status="getStatus(ach.id)"
          :progress="getAchievementProgress(ach)"
          @claim="onClaim"
        />
        <div v-if="index < sortedAchievements.length - 1" class="card-connector" />
      </template>
    </div>

    <div class="claim-all-container">
      <button
        class="claim-all-btn"
        :disabled="achievementStore.unlockedCount === 0"
        @click="claimAll"
      >
        一键领取
      </button>
    </div>
  </BaseBottomSheet>

  <Teleport to="#game-container">
    <Transition name="ach-nav-fade">
      <div v-if="isOpen" class="ach-side-nav">
        <button class="nav-btn nav-trophy" :class="{ active: activeNav === 'achievements' }" @click="activeNav = 'achievements'">🏆</button>
        <button class="nav-btn nav-book" :class="{ active: activeNav === 'collection' }" @click="activeNav = 'collection'">📖</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import AchievementCard from './AchievementCard.vue'
import { useSheet } from '../../composables/useSheet'
import { useAchievementStore, type Achievement } from '../../stores/achievementStore'
import { useCollectionStore } from '../../stores/collectionStore'
import { useLoopStore } from '../../stores/loopStore'

const { isOpen } = useSheet('achievement-sheet')
const achievementStore = useAchievementStore()
const activeNav = ref<'achievements' | 'collection'>('achievements')

const progressPct = computed(() => {
  const total = achievementStore.totalAchievements
  if (total === 0) return 0
  return Math.round((achievementStore.completedCount / total) * 100)
})

function getStatus(id: string): 'active' | 'claimed' | 'locked' {
  if (achievementStore.completed.has(id)) return 'claimed'
  if (achievementStore.unlocked.has(id)) return 'active'
  return 'locked'
}

const statusPriority: Record<string, number> = { active: 0, locked: 1, claimed: 2 }

const sortedAchievements = computed(() => {
  return [...achievementStore.achievementList].sort((a, b) => {
    return statusPriority[getStatus(a.id)] - statusPriority[getStatus(b.id)]
  })
})

function onClaim(id: string) {
  achievementStore.complete(id)
}

function claimAll() {
  const pendingIds = Array.from(achievementStore.unlocked)
  pendingIds.forEach(id => {
    achievementStore.complete(id)
  })
}

function getAchievementProgress(ach: Achievement): number {
  if (achievementStore.completed.has(ach.id) || achievementStore.unlocked.has(ach.id)) {
    return 100
  }
  let currentValue = 0
  if (ach.condition === 'collectionPct') {
    currentValue = useCollectionStore().completionPercentage ?? 0
  } else if (ach.condition === 'loopReached') {
    currentValue = useLoopStore().loopIndex
  } else {
    currentValue = achievementStore.stats[ach.condition] || 0
  }
  return Math.min(100, Math.floor((currentValue / ach.target) * 100))
}
</script>

<style scoped>
/* ---- Progress Capsule ---- */
.ach-progress-capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--ach-text-dark, #695e59);
  border: 1px solid var(--off-white, #FAF5F8);
  border-radius: 13px;
  margin-bottom: 10px;
}

.ach-trophy-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ach-trophy-blue, #70a7c9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
}

.ach-gift-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ach-gift-gold, #e0b352);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
}

.ach-progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(245, 245, 250, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.ach-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ach-btn-claim, #c99270), var(--caramel, #DDAA8B));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.ach-progress-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--off-white, #FAF5F8);
  font-family: 'Plus Jakarta Sans', sans-serif;
  flex-shrink: 0;
}

/* ---- Achievement List ---- */
.ach-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 4px 60px;
}

.card-connector {
  width: 2px;
  height: 12px;
  background: var(--ach-connector, #e3cec0);
  flex-shrink: 0;
}

/* ---- Claim All ---- */
.claim-all-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 14px;
  background: linear-gradient(0deg, var(--ach-bg-panel, #ffdfc8) 80%, rgba(255, 223, 200, 0) 100%);
  display: flex;
  justify-content: center;
  z-index: 5;
}

.claim-all-btn {
  width: 100%;
  max-width: 280px;
  height: 36px;
  border-radius: 32px;
  border: none;
  background: linear-gradient(180deg, var(--ach-btn-claim, #c99270) 0%, #b07e5c 100%);
  color: var(--off-white, #FAF5F8);
  font-size: 13px;
  font-weight: 600;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  cursor: pointer;
  box-shadow: var(--ach-shadow-red);
  transition: transform 0.1s ease, filter 0.15s ease;
}

.claim-all-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.claim-all-btn:disabled {
  background: var(--ach-card-inactive, #e4d0c1);
  color: rgba(105, 94, 89, 0.5);
  box-shadow: none;
  cursor: not-allowed;
}

/* ---- Side Navigation ---- */
.ach-side-nav {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 201;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.nav-btn:active {
  transform: scale(0.9);
}

.nav-trophy {
  background: var(--ach-btn-claim, #c99270);
  box-shadow: var(--ach-shadow-red);
}

.nav-book {
  background: var(--off-white, #FAF5F8);
  box-shadow: var(--shadow-neu-up), var(--shadow-neu-down);
}

.nav-btn.active {
  outline: 2px solid var(--accent-pink, #FF6584);
  outline-offset: 2px;
}

.ach-nav-fade-enter-active,
.ach-nav-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.ach-nav-fade-enter-from,
.ach-nav-fade-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(10px);
}
</style>
