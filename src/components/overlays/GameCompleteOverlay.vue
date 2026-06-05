<!-- ============================================================
     GameCompleteOverlay.vue — Game Completion Overlay
     Replaces #game-complete-overlay from index.html lines 400-406
     ============================================================ -->
<template>
  <Transition name="fade">
    <div v-if="visible" id="game-complete-overlay">
      <div class="complete-emoji">{{ i18nStore.t('game_complete.emoji') }}</div>
      <div class="complete-title">{{ i18nStore.t('game_complete.title') }}</div>
      <div class="complete-subtitle">{{ i18nStore.t('game_complete.subtitle') }}</div>
      <button class="restart-btn" @click="restart">{{ i18nStore.t('game_complete.button') }}</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useI18nStore } from '../../stores/i18nStore';
import { useSaveStore } from '../../stores/saveStore';

defineProps<{
  visible: boolean;
}>();

const i18nStore = useI18nStore();

function restart() {
  const saveStore = useSaveStore();
  saveStore.clearAll();
  window.location.reload();
}
</script>

<style scoped>
/* ===== Game Complete Overlay ===== */
#game-complete-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 920;
  opacity: 1;
  pointer-events: auto;
  text-align: center;
}

.complete-title {
  font-size: 32px;
  font-weight: 900;
  color: white;
  margin-bottom: 8px;
  text-shadow: 0 2px 10px rgba(255, 107, 157, 0.6);
}

.complete-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 24px;
}

.complete-emoji {
  font-size: 64px;
  margin-bottom: 16px;
  animation: float-bounce 2s infinite;
}

.restart-btn {
  padding: 14px 40px;
  border: none;
  border-radius: 25px;
  background: linear-gradient(135deg, var(--accent-pink), var(--accent-purple));
  color: white;
  font-size: 16px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(196, 79, 226, 0.5);
  transition: transform var(--transition-fast);
}
.restart-btn:hover {
  filter: brightness(1.1);
  box-shadow: 0 6px 25px rgba(196, 79, 226, 0.6);
}
.restart-btn:active {
  transform: scale(0.93);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
