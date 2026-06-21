<template>
  <div class="achievement-card" :class="status">
    <div class="card-left">
      <span class="card-desc">{{ achievement.description }}</span>
      <div class="card-name-row">
        <span class="card-name">{{ achievement.name }}</span>
        <span v-if="status === 'active' || status === 'claimed'" class="card-check">✓</span>
        <template v-else>
          <svg class="card-progress-svg" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="#e4d0c1" stroke-width="2.5" />
            <circle
              cx="12" cy="12" r="9" fill="none"
              stroke="#e0b75d" stroke-width="2.5"
              stroke-dasharray="56.55"
              :stroke-dashoffset="56.55 * (1 - progress / 100)"
              stroke-linecap="round"
              transform="rotate(-90 12 12)"
            />
          </svg>
          <span class="card-progress-text">{{ progress }}%</span>
        </template>
      </div>
    </div>

    <div class="card-right">
      <div class="card-right-top">
        <button
          v-if="status === 'active'"
          class="card-action-btn claim"
          @click="emit('claim', achievement.id)"
        >
          领取
        </button>
        <button v-else-if="status === 'claimed'" class="card-action-btn claimed" disabled>
          已领取
        </button>
        <button v-else class="card-action-btn locked" disabled>
          未完成
        </button>
      </div>
      <div class="card-divider" />
      <div class="card-rewards">
        <span v-if="achievement.reward.diamonds" class="reward-badge">💎{{ achievement.reward.diamonds }}</span>
        <span v-if="achievement.reward.energy" class="reward-badge">⚡{{ achievement.reward.energy }}</span>
        <span v-if="achievement.reward.gold" class="reward-badge">🪙{{ achievement.reward.gold }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Achievement } from '../../stores/achievementStore'

const props = defineProps<{
  achievement: Achievement
  status: 'active' | 'claimed' | 'locked'
  progress: number
}>()

const emit = defineEmits<{
  claim: [id: string]
}>()

const hasReward = computed(() => {
  const r = props.achievement.reward
  return (r.diamonds ?? 0) > 0 || (r.energy ?? 0) > 0 || (r.gold ?? 0) > 0
})
</script>

<style scoped>
.achievement-card {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  box-shadow: var(--ach-shadow-red);
  box-sizing: border-box;
  transition: var(--interactive-transition);
}

.achievement-card.active,
.achievement-card.claimed {
  background: var(--ach-card-active);
}

.achievement-card.locked {
  background: var(--ach-card-inactive);
}

.card-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  padding-right: 10px;
  min-width: 0;
  justify-content: center;
}

.card-desc {
  font-size: 10px;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  font-weight: 400;
  line-height: 1.3;
}

.active .card-desc,
.claimed .card-desc {
  color: var(--off-white, #FAF5F8);
  opacity: 0.7;
}

.locked .card-desc {
  color: var(--ach-text-dark, #695e59);
  opacity: 0.7;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.card-name {
  font-size: 14px;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  font-weight: 500;
  line-height: 1.2;
}

.active .card-name,
.claimed .card-name {
  color: var(--off-white, #FAF5F8);
}

.locked .card-name {
  color: var(--ach-text-dark, #695e59);
}

.card-check {
  color: var(--color-success, #5BAD7D);
  font-size: 12.8px;
  font-weight: 900;
  line-height: 1;
}

.card-progress-svg {
  flex-shrink: 0;
}

.card-progress-text {
  font-size: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  color: var(--ach-text-dark, #695e59);
  line-height: 1;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  justify-content: center;
  min-width: 80px;
}

.card-right-top {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.card-action-btn {
  padding: 2px 10px;
  border: none;
  border-radius: 7px;
  font-size: 11px;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  font-weight: 500;
  cursor: pointer;
  line-height: 1.5;
  transition: transform 0.15s ease;
}

.card-action-btn:active:not(:disabled) {
  transform: scale(0.92);
}

.card-action-btn.claim {
  background: var(--ach-btn-claim, #c99270);
  color: var(--off-white, #FAF5F8);
  box-shadow: var(--ach-shadow-red);
}

.card-action-btn.claimed {
  background: var(--ach-card-active, #968173);
  color: var(--off-white, #FAF5F8);
  cursor: default;
  opacity: 0.7;
}

.card-action-btn.locked {
  background: var(--ach-card-active, #968173);
  color: var(--off-white, #FAF5F8);
  cursor: default;
  opacity: 0.6;
}

.card-divider {
  width: 100%;
  height: 1px;
  background: rgba(250, 245, 248, 0.3);
}

.card-rewards {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.reward-badge {
  font-size: 9px;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: var(--ach-text-dark, #695e59);
  color: var(--off-white, #FAF5F8);
  padding: 1px 5px;
  border-radius: 5px;
  line-height: 1.4;
}

.locked .reward-badge {
  background: var(--ach-text-dark, #695e59);
  color: var(--off-white, #FAF5F8);
  opacity: 0.65;
}
</style>
