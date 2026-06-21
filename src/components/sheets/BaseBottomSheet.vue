<!-- ============================================================
     BaseBottomSheet.vue — Shared base component for all sheets
     ============================================================ -->
<template>
  <Transition name="sheet-backdrop">
    <div
      v-if="modelValue"
      class="bottom-sheet-backdrop"
      :class="{ 'layout-bottom': layout === 'bottom' }"
      @click="close"
    />
  </Transition>
  <Transition name="sheet-slide">
    <div
      v-if="modelValue"
      :id="sheetId"
      class="bottom-sheet"
      :class="{ 'layout-bottom': layout === 'bottom', 'theme-warm': theme === 'warm' }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="sheet-header-new">
        <button class="sheet-back-btn sheet-close" @click="close" aria-label="返回">
          <img src="/assets/figma/refund-back.png" alt="" />
        </button>
        <div class="sheet-title-pill">
          <span v-if="icon" class="sheet-title-icon">{{ icon }}</span>
          <span class="sheet-title-text">{{ title }}</span>
        </div>
        <button class="sheet-help-btn" @click="emit('help')" aria-label="帮助">
          <img src="/assets/figma/question.png" alt="" />
        </button>
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

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    sheetId: string
    title: string
    icon: string
    subtitle?: string
    layout?: 'center' | 'bottom'
    theme?: 'default' | 'warm'
  }>(),
  {
    layout: 'center',
    theme: 'default'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean],
  'help': []
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
  background: rgba(50, 34, 26, 0.16);
  z-index: var(--z-sheet);
  opacity: 1;
  pointer-events: auto;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

/* ---- Bottom Sheet ---- */
.bottom-sheet {
  position: absolute;
  top: calc(31.7% + env(safe-area-inset-top, 0px) * 0.3);
  left: 50%;
  transform: translate(-50%, 0);
  width: min(93.3cqw, 375px);
  max-width: calc(100% - 20px);
  height: min(54.8cqh, 479px);
  max-height: calc(100% - 40px);
  background: #FFDFC8;
  z-index: var(--z-sheet);
  border-radius: 8px;
  border: 3px solid #fff;
  box-shadow: 0 0 5.8px rgba(0, 0, 0, 0.78), 0 22px 28px rgba(96, 25, 15, 0.34);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

/* ---- New Premium Header ---- */
.sheet-header-new {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px 8px;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
}

.sheet-back-btn,
.sheet-help-btn {
  width: 32px;
  height: 32px;
  background: #F5F5FA;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 5px 5px 10px rgba(170, 170, 204, 0.45), -5px -5px 10px #fff;
  transition: transform 0.15s ease;
  padding: 0;
  line-height: 1;
}

.sheet-back-btn img,
.sheet-help-btn img {
  width: 24px;
  height: 24px;
  display: block;
}

.sheet-back-btn:active,
.sheet-help-btn:active {
  transform: scale(0.9);
}

.sheet-title-pill {
  flex: 1;
  min-width: 0;
  height: 25px;
  margin: 0 7px;
  background: #F5F5FA;
  border: none;
  border-radius: 13px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #DDAA8B;
  box-shadow: 0px 4px 2px rgba(0,0,0,0.25);
  text-align: center;
  line-height: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sheet-title-icon {
  display: none;
}

/* ---- Subtitle ---- */
.sheet-sub {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  font-weight: 500;
  padding: 2px 16px 6px;
  flex-shrink: 0;
  text-align: center;
}

/* ---- Sheet Body ---- */
.sheet-body {
  padding: 1px 38px 14px;
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
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-backdrop-enter-from,
.sheet-backdrop-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px) scale(0.98);
}

.sheet-slide-enter-to,
.sheet-slide-leave-from {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}

/* ---- Bottom Layout Styles ---- */
.bottom-sheet-backdrop.layout-bottom {
  background: rgba(90, 62, 43, 0.15);
  pointer-events: none;
}

.bottom-sheet.layout-bottom {
  top: auto;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 0);
  width: 100cqw;
  max-width: 100%;
  height: 48%;
  max-height: 420px;
  border-radius: 24px 24px 0 0;
  border-bottom: none;
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.2);
}

.sheet-slide-enter-from.layout-bottom,
.sheet-slide-leave-to.layout-bottom {
  opacity: 0;
  transform: translate(-50%, 100%);
}

.sheet-slide-enter-to.layout-bottom,
.sheet-slide-leave-from.layout-bottom {
  opacity: 1;
  transform: translate(-50%, 0);
}

/* ---- Warm Theme (Achievement Sheet) ---- */
.bottom-sheet.theme-warm {
  background: var(--ach-bg-panel, #ffdfc8);
  border: 3px solid white;
  border-radius: 12px;
  box-shadow: var(--shadow-panel);
}

.theme-warm .sheet-back-btn,
.theme-warm .sheet-help-btn {
  background: var(--off-white, #FAF5F8);
  border: none;
  border-radius: 32px;
  box-shadow: var(--shadow-neu-up), var(--shadow-neu-down);
  color: var(--ach-text-dark, #695e59);
}

.theme-warm .sheet-title-pill {
  background: #F5F5FA;
  border: none;
  border-radius: 13px;
  box-shadow: 0px 4px 2px rgba(0,0,0,0.25);
  color: var(--caramel, #DDAA8B);
  font-weight: 600;
}

.theme-warm .sheet-title-text {
  font-family: 'Jiangcheng Yuanti', sans-serif;
  font-weight: 600;
}
</style>
