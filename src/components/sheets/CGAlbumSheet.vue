<!-- ============================================================
     CGAlbumSheet.vue — CG Album bottom sheet
     ============================================================
     Replaces #cg-album-sheet from index.html lines 589-600.
     Uses cgAlbumStore for CG album data.
     ============================================================ -->
<template>
  <BaseBottomSheet
    v-model="isOpen"
    sheetId="cg-album-sheet"
    :title="i18nStore.t('cg.albumTitle')"
    icon="🖼️"
  >
    <div id="cg-album-content" class="cg-album-list">
      <div
        v-for="cg in cgList"
        :key="cg.id"
        class="cg-item"
        :class="{ locked: !cg.unlocked }"
        @click="readCG(cg)"
      >
        <div class="cg-thumbnail">{{ cg.unlocked ? cg.emoji : '🔒' }}</div>
        <div class="cg-title">{{ cg.unlocked ? cg.title : '???' }}</div>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseBottomSheet from './BaseBottomSheet.vue'
import { useSheet } from '../../composables/useSheet'
import { useCGAlbumStore } from '../../stores/cgAlbumStore'
import { useI18nStore } from '../../stores/i18nStore'
import { globalBus } from '../../core/EventBus'

const { isOpen } = useSheet('cg-album-sheet')
const cgAlbumStore = useCGAlbumStore()
const i18nStore = useI18nStore()

interface CGDisplayItem {
  id: string
  title: string
  emoji: string
  unlocked: boolean
}

const cgList = computed<CGDisplayItem[]>(() => {
  return cgAlbumStore.getCGList().map(({ id, data }) => ({
    id,
    title: data.title || id,
    emoji: '🖼️',
    unlocked: cgAlbumStore.unlockedCGs.has(id)
  }))
})

function readCG(cg: CGDisplayItem) {
  if (!cg.unlocked) return
  cgAlbumStore.readCG(cg.id, 0)
  globalBus.emit('cg:readRequested', { cgId: cg.id })
}
</script>

<style scoped>
/* ---- CG Album List ---- */
.cg-album-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

/* ---- CG Item ---- */
.cg-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: var(--interactive-transition);
}

.cg-item:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.cg-item.locked {
  opacity: 0.4;
  cursor: default;
}

.cg-thumbnail {
  font-size: 28px;
}

.cg-title {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.7);
  text-align: center;
}

/* ---- CG Preview Overlay ---- */
.cg-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlay-in 0.3s ease;
}

@keyframes overlay-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.cg-preview-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 24px 20px 18px;
  text-align: center;
  width: 90%;
  max-width: 360px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: popup-in-scale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popup-in-scale {
  0% { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.cg-preview-title {
  font-size: 20px;
  font-weight: 900;
  color: var(--text-dark);
  margin-bottom: 4px;
}

.cg-preview-lead {
  font-size: 14px;
  color: var(--accent-pink);
  font-weight: 600;
  margin-bottom: 12px;
}

.cg-preview-story {
  font-size: 13px;
  color: var(--text-medium);
  line-height: 1.7;
  text-align: left;
  max-height: 200px;
  overflow-y: auto;
}

.cg-preview-story p {
  margin-top: 6px;
}

.cg-preview-close {
  margin-top: 14px;
  padding: 8px 32px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--accent-pink), var(--accent-purple));
  color: white;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
}

.cg-preview-close:hover {
  filter: brightness(1.1);
}

.cg-preview-close:active {
  transform: scale(0.93);
}

/* ---- CG Story Reader Overlay ---- */
.cg-reader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlay-in 0.25s ease;
}

.cg-reader-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px 18px;
  max-width: 380px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
  animation: popup-in-scale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.cg-reader-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 10px;
}

.cg-reader-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--text-dark);
}

.cg-reader-lead {
  font-size: 13px;
  color: var(--accent-pink, #F35683);
  font-weight: 600;
}

.cg-reader-story-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-pink, #F35683);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0e0ec;
}

.cg-reader-text {
  font-size: 14px;
  color: #444;
  line-height: 1.8;
  text-align: left;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.cg-reader-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.cg-btn {
  border: none;
  border-radius: 10px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}

.cg-btn:hover {
  filter: brightness(1.08);
}

.cg-btn:active {
  transform: scale(0.93);
}

.cg-btn-close {
  background: #eee;
  color: var(--text-medium);
}

.cg-btn-prev,
.cg-btn-next {
  background: linear-gradient(135deg, var(--accent-pink, #F35683), #c44569);
  color: var(--text-inverse);
}
</style>
