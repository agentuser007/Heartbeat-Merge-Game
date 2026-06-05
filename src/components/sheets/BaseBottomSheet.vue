<!-- ============================================================
     BaseBottomSheet.vue — Shared base component for all bottom sheets
     ============================================================
     Handles: slide-up animation, drag handle + swipe-to-close,
     backdrop click to close, body scroll lock
     ============================================================ -->
<template>
    <Transition name="sheet-backdrop">
      <div v-if="modelValue" class="bottom-sheet-backdrop" @click="close" />
    </Transition>
    <Transition name="sheet-slide">
      <div
        v-if="modelValue"
        :id="sheetId"
        class="bottom-sheet"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="sheet-drag-handle" />
        <div class="sheet-header">
          <div class="sheet-header-left">
            <span class="sheet-header-icon">{{ icon }}</span>
            <span>{{ title }}</span>
          </div>
          <button class="sheet-close" @click="close">✕</button>
        </div>
        <div v-if="subtitle" class="sheet-sub">{{ subtitle }}</div>
        <div class="sheet-body">
          <slot />
        </div>
      </div>
    </Transition>
  </template>

<script setup lang="ts">
import { watch, ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
  sheetId: string
  title: string
  icon: string
  subtitle?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// --- Close ---
function close() {
  emit('update:modelValue', false)
}

// --- Swipe-to-close ---
const touchStartY = ref(0)

function onTouchStart(e: TouchEvent) {
  touchStartY.value = e.touches[0].clientY
}

function onTouchMove(e: TouchEvent) {
  const deltaY = e.touches[0].clientY - touchStartY.value;
  if (deltaY > 0) {
    const sheetBody = (e.currentTarget as HTMLElement)?.querySelector('.sheet-body');
    if (!sheetBody || sheetBody.scrollTop <= 0) {
      e.preventDefault();
    }
  }
}

function onTouchEnd(e: TouchEvent) {
  const deltaY = e.changedTouches[0].clientY - touchStartY.value
  if (deltaY > 100) {
    close()
  }
}

// --- Body scroll lock ---
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* ---- Bottom Sheet Backdrop ---- */
.bottom-sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(90, 62, 43, 0.35);
  z-index: 199;
  opacity: 1;
  pointer-events: auto;
}

/* ---- Bottom Sheet ---- */
.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 90%;
  background: var(--cream);
  z-index: 200;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(160, 120, 80, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---- Drag Handle ---- */
.sheet-drag-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.15);
  margin: 8px auto 4px;
  flex-shrink: 0;
}

/* ---- Sheet Header ---- */
.sheet-header {
  padding: 8px 16px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.sheet-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sheet-header-left > span {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-dark);
}

/* Lucide icon in sheet headers */
.sheet-header-icon {
  width: 18px;
  height: 18px;
  stroke: var(--accent-pink);
  flex-shrink: 0;
}

/* ---- Close Button ---- */
.sheet-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.5);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-family: 'Jiangcheng Yuanti', inherit;
}

.sheet-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.sheet-close:active {
  transform: scale(0.9);
  background: rgba(0, 0, 0, 0.15);
}

/* ---- Subtitle ---- */
.sheet-sub {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  font-weight: 500;
  padding: 2px 16px 6px;
  flex-shrink: 0;
}

/* ---- Sheet Body ---- */
.sheet-body {
  padding: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ---- Vue Transitions ---- */
.sheet-backdrop-enter-active,
.sheet-backdrop-leave-active {
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-backdrop-enter-from,
.sheet-backdrop-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
