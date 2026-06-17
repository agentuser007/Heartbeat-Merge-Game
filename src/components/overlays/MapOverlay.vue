<template>
  <Transition name="fade">
    <div v-if="visible" class="map-overlay" @click.self="$emit('close')">
      <div class="map-card">
        <div class="map-header">
          <span class="map-title">🗺️ {{ i18nStore.t('map.title') || '学园地图' }}</span>
          <button class="map-close-btn" @click="$emit('close')">✕</button>
        </div>
        <div class="map-tree">
          <div
            v-for="node in reversedNodes"
            :key="node.loopIndex"
            class="map-node-wrapper"
          >
            <div class="map-connector" v-if="node.loopIndex !== nodes[0]?.loopIndex" />
            <div
              class="map-node"
              :class="nodeClass(node)"
              @click="onNodeClick(node)"
            >
              <div class="node-body">
                <span class="node-index">{{ node.loopIndex }}</span>
                <span class="node-rank">{{ node.rankTitle }}</span>
              </div>
              <span v-if="node.status === 'completed'" class="node-check">✓</span>
              <span v-else-if="node.status === 'settling'" class="node-hourglass">⏳</span>
              <span v-else-if="node.status === 'active'" class="node-active-dot">●</span>
              <button
                v-if="node.status === 'completed'"
                class="node-story-btn"
                @click.stop="onStoryClick(node)"
                :title="i18nStore.t('map.replayStory') || '重播剧情'"
              >
                💬
              </button>
            </div>
          </div>
          <div v-if="nextUnlockedNode" class="map-node-wrapper">
            <div class="map-connector" />
            <div class="map-node node-locked">
              <div class="node-body">
                <span class="node-index">{{ nextUnlockedNode }}</span>
                <span class="node-rank">🔒</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="archiveNotice" class="archive-notice">
        {{ i18nStore.t('map.archived') || '该棋盘数据已归档，无法操作' }}
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useBoardStore } from '../../stores/boardStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useDialogueStore } from '../../stores/dialogueStore';
import { useConfigStore } from '../../stores/configStore';
import type { MapNode } from '../../types/game';
import { useApplyDeps } from '../../composables/useApplyDeps';
import { applyResolveResult } from '../../composables/useGameLoop';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switch-board', loopIndex: number): void;
}>();

const boardStore = useBoardStore();
const i18nStore = useI18nStore();
const dialogueStore = useDialogueStore();
const configStore = useConfigStore();
const applyDeps = useApplyDeps();
const archiveNotice = ref(false);

const nodes = computed<MapNode[]>(() => boardStore.getMapNodes());

const reversedNodes = computed(() => [...nodes.value].reverse());

const nextUnlockedNode = computed(() => {
  if (nodes.value.length === 0) return 1;
  return nodes.value[nodes.value.length - 1].loopIndex + 1;
});

function nodeClass(node: MapNode): Record<string, boolean> {
  return {
    [`node-${node.status}`]: true,
    'node-current': node.loopIndex === boardStore.activeBoardLoop,
    'node-archived': boardStore.isArchived(node.loopIndex),
  };
}

function onNodeClick(node: MapNode) {
  archiveNotice.value = false;

  if (boardStore.isArchived(node.loopIndex)) {
    archiveNotice.value = true;
    return;
  }

  if (node.loopIndex === boardStore.activeBoardLoop) return;

  const { success, resolveResult } = boardStore.restoreBoard(node.loopIndex);
  applyResolveResult(resolveResult, applyDeps);
  if (success) {
    emit('switch-board', node.loopIndex);
  }
}

function onStoryClick(node: MapNode) {
  const narratives = configStore.loopNarratives;
  const narrative = narratives?.[String(node.loopIndex)];
  if (narrative && narrative.loopIntro) {
    dialogueStore.show(
      '🏫',
      '',
      narrative.loopIntro,
      ''
    );
  }
}
</script>

<style scoped>
.map-overlay {
  position: fixed;
  inset: 0;
  z-index: 9700;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.map-card {
  background: linear-gradient(145deg, #FFF5EE, #FFE1CC);
  border-radius: 20px;
  padding: 20px;
  max-width: 400px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  border: 3.5px solid var(--warm-border, #CDA080);
  box-shadow: 0 12px 36px rgba(138, 109, 85, 0.25);
  animation: mapCardIn 0.4s ease-out;
}

@keyframes mapCardIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.map-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-heading, #5D4037);
}

.map-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.4);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--interactive-transition);
}

.map-close-btn:hover {
  background: rgba(0, 0, 0, 0.12);
}

.map-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.map-node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.map-connector {
  width: 3px;
  height: 16px;
  background: var(--warm-border, #CDA080);
  border-radius: 2px;
}

.map-node {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  cursor: pointer;
  transition: var(--interactive-transition);
  min-width: 200px;
  border: 2px solid transparent;
}

.node-body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.node-index {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}

.node-rank {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-heading, #5D4037);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-check {
  font-size: 14px;
  color: var(--color-success, #4CAF50);
  font-weight: 900;
}

.node-hourglass {
  font-size: 14px;
  animation: hourglass-pulse 1.5s ease-in-out infinite;
}

@keyframes hourglass-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.node-active-dot {
  font-size: 10px;
  color: var(--accent-pink, #F35683);
  animation: active-glow 1.2s ease-in-out infinite;
}

@keyframes active-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}

.node-story-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid rgba(160, 120, 80, 0.25);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: var(--interactive-transition);
}

.node-story-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: var(--accent-pink, #F35683);
  transform: scale(1.1);
}

/* Status-specific styles */
.node-completed {
  background: rgba(205, 160, 128, 0.2);
  border-color: rgba(205, 160, 128, 0.35);
}

.node-completed .node-index {
  background: rgba(205, 160, 128, 0.4);
  color: var(--text-heading, #5D4037);
}

.node-completed:hover {
  background: rgba(205, 160, 128, 0.35);
  transform: translateY(-1px);
}

.node-settling {
  background: rgba(255, 193, 7, 0.12);
  border-color: rgba(255, 193, 7, 0.3);
  opacity: 0.85;
}

.node-settling .node-index {
  background: rgba(255, 193, 7, 0.3);
  color: var(--text-heading, #5D4037);
}

.node-active {
  background: rgba(243, 86, 131, 0.12);
  border-color: var(--accent-pink, #F35683);
  box-shadow: 0 0 12px rgba(243, 86, 131, 0.2);
}

.node-active .node-index {
  background: var(--accent-pink, #F35683);
  color: white;
}

.node-current {
  border-width: 2.5px;
}

.node-locked {
  background: rgba(0, 0, 0, 0.04);
  cursor: default;
  opacity: 0.5;
}

.node-locked .node-index {
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.3);
}

.node-archived {
  opacity: 0.6;
}

.archive-notice {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  z-index: 9800;
  animation: noticeIn 0.3s ease;
}

@keyframes noticeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
