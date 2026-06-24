<!-- ============================================================
     VNReaderOverlay.vue — Visual Novel Reader Overlay
     Replaces VNReader from js/vn-reader.js and .vn-overlay CSS
     from css/style.css lines 2598-2796
     ============================================================ -->
<template>
  <Transition name="vn-fade">
    <div
      v-if="vnStore.isOpen"
      class="vn-overlay"
      @click="onOverlayClick"
    >
      <!-- Background Layer -->
      <div
        class="vn-background"
        :style="backgroundStyle"
      />

      <!-- Character Sprite Layer (legacy kept for structural parity) -->
      <div class="vn-character-layer">
        <div
          class="vn-character-sprite"
        />
      </div>

      <!-- Top Controls -->
      <div class="vn-controls">
        <button class="vn-btn-back" @click.stop="onClose">←</button>
        <button class="vn-btn-review" @click.stop="onToggleHistory">
          {{ i18nStore.t('vn_reader.review') }}
        </button>
      </div>

      <!-- Dialogue Box -->
      <div class="vn-dialogue-box" @click.stop>
        <div
          class="vn-name-tag"
          :class="{ 'vn-narrator': speakerInfo.isNarrator }"
          :style="nameTagStyle"
        >
          {{ speakerInfo.name }}
        </div>
        <div
          class="vn-text-content"
          :class="{ 'vn-narrator-text': speakerInfo.isNarrator }"
        >
          <template v-if="vnStore.ended">
            {{ i18nStore.t('vn_reader.chapterEnded') }}
          </template>
          <template v-else>
            {{ displayedText }}<span v-if="isTyping" class="vn-cursor">|</span>
          </template>
        </div>
        <div
          v-if="!vnStore.ended && !isTyping"
          class="vn-continue-indicator"
        >
          ▼
        </div>
      </div>

      <!-- Choice Panel (scene mode only) -->
      <Transition name="vn-choice-fade">
        <div
          v-if="vnStore.pendingChoice"
          class="vn-choice-panel"
          @click.stop
        >
          <div class="vn-choice-prompt">{{ vnStore.pendingChoice.prompt }}</div>
          <button
            v-for="(opt, idx) in vnStore.pendingChoice.options"
            :key="idx"
            :disabled="!isOptionAvailable(opt)"
            class="vn-choice-btn"
            @click.stop="onSelectChoice(idx)"
          >{{ opt.text }}</button>
        </div>
      </Transition>

      <!-- Bottom Controls (Skip / Auto) -->
      <div class="vn-bottom-controls">
        <button
          class="vn-btn-control vn-btn-skip"
          :class="{ 'vn-btn-active': vnStore.skipMode }"
          @click.stop="onToggleSkip"
        >
          {{ vnStore.skipMode ? i18nStore.t('vn_reader.skipActive') : i18nStore.t('vn_reader.skip') }}
        </button>
        <button
          class="vn-btn-control vn-btn-auto"
          :class="{ 'vn-btn-active': vnStore.autoMode }"
          @click.stop="onToggleAuto"
        >
          {{ vnStore.autoMode ? i18nStore.t('vn_reader.autoActive') : i18nStore.t('vn_reader.auto') }}
        </button>
      </div>

      <!-- History Panel -->
      <Transition name="vn-fade">
        <div
          v-if="vnStore.showingHistory"
          class="vn-history-panel"
          @click.stop
        >
          <div class="vn-history-title">
            {{ i18nStore.t('vn_reader.dialogueReview') }}
            <span class="vn-history-close" @click.stop="onToggleHistory">✕</span>
          </div>
          <div ref="historyListEl" class="vn-history-list">
            <div
              v-for="(entry, idx) in vnStore.history"
              :key="idx"
              class="vn-history-item"
            >
              <span
                class="vn-history-speaker"
                :style="{ color: entry.speakerId ? vnStore.getCharacterColor(entry.speakerId) : '#888' }"
              >{{ entry.speaker }}</span>
              <span class="vn-history-text">{{ entry.text }}</span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Title Overlay (shown briefly when story opens) -->
      <Transition name="vn-title">
        <div
          v-if="vnStore.showingTitle"
          class="vn-title-overlay"
        >
          <div class="vn-title-chapter">{{ storyTitle }}</div>
          <div class="vn-title-cg">{{ cgTitle }}</div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { useVNReaderStore } from '../../stores/vnReaderStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useAudio } from '../../composables/useAudio';
import { useConfigStore } from '../../stores/configStore';
import { useAffectionStore } from '../../stores/affectionStore';
import { useLoopStore } from '../../stores/loopStore';
import { checkChoiceCondition } from '../../services/NarrativeService';
import type { VNChoiceOption } from '@/types/game';

const vnStore = useVNReaderStore();
const i18nStore = useI18nStore();
const audio = useAudio();
const configStore = useConfigStore();
const affectionStore = useAffectionStore();
const loopStore = useLoopStore();

// --- Typewriter state ---
const displayedText = ref('');
const isTyping = ref(false);
let typeTimer: ReturnType<typeof setTimeout> | null = null;
let autoTimer: ReturnType<typeof setTimeout> | null = null;
let skipTimer: ReturnType<typeof setTimeout> | null = null;
let titleTimer: ReturnType<typeof setTimeout> | null = null;
let typeEpoch = 0;

// Ref for history list scrolling
const historyListEl = ref<HTMLElement | null>(null);

// --- Computed ---
const speakerInfo = computed(() => vnStore.speakerInfo);

const backgroundStyle = computed(() => {
  const bg = vnStore.backgroundImage;
  if (bg) {
    return {
      backgroundImage: `url('${bg}')`,
    };
  }
  return {};
});

const nameTagStyle = computed(() => {
  if (speakerInfo.value.isNarrator) {
    return { background: 'rgba(120,120,140,0.85)' };
  }
  if (speakerInfo.value.color) {
    return { background: speakerInfo.value.color };
  }
  return {};
});

const storyTitle = computed(() => vnStore.currentStory?.title || '');
const cgTitle = computed(() => vnStore.currentCG?.title || '');

// --- Typewriter ---
function typeText(text: string, epoch: number): Promise<void> {
  return new Promise((resolve) => {
    displayedText.value = '';
    isTyping.value = true;
    vnStore.isTyping = true;
    let i = 0;

    function tick() {
      if (epoch !== typeEpoch || !vnStore.isTyping || !vnStore.isOpen) {
        displayedText.value = text;
        isTyping.value = false;
        vnStore.isTyping = false;
        resolve();
        return;
      }

      if (i < text.length) {
        displayedText.value += text[i];
        i++;
        typeTimer = setTimeout(tick, vnStore.typingSpeed);
      } else {
        isTyping.value = false;
        vnStore.isTyping = false;
        resolve();
      }
    }

    tick();
  });
}

function clearAllTimers() {
  if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  if (skipTimer) { clearTimeout(skipTimer); skipTimer = null; }
  if (titleTimer) { clearTimeout(titleTimer); titleTimer = null; }
}

// --- Show current line ---
async function showCurrentLine() {
  const line = vnStore.currentLine;
  if (!line) {
    if (vnStore.mode === 'scene') return;
    vnStore.showEnd();
    return;
  }

  vnStore.onLineShown(line);

  typeEpoch++;
  await typeText(line.text, typeEpoch);

  if (vnStore.skipMode && !vnStore.ended) {
    skipTimer = setTimeout(() => {
      vnStore.advance();
    }, vnStore.skipDelay);
  } else if (vnStore.autoMode && !vnStore.ended) {
    autoTimer = setTimeout(() => {
      vnStore.advance();
    }, vnStore.autoDelay);
  }
}

// --- Watch for line changes ---
watch(
  () => vnStore.currentIndex,
  async () => {
    if (vnStore.isOpen && !vnStore.ended && !vnStore.pendingChoice) {
      clearAllTimers();
      await showCurrentLine();
    }
  },
);

watch(
  () => vnStore.lines,
  async () => {
    if (vnStore.isOpen && !vnStore.ended && !vnStore.pendingChoice && vnStore.mode === 'scene') {
      clearAllTimers();
      await nextTick();
      await showCurrentLine();
    }
  },
);

// --- Watch for open/close ---
watch(
  () => vnStore.isOpen,
  async (open) => {
    if (open) {
      // Switch to story BGM
      audio.playBGM('story_bgm');

      // Show title overlay, then fade it after 2 seconds
      vnStore.showingTitle = true;
      titleTimer = setTimeout(() => {
        vnStore.showingTitle = false;
      }, configStore.uiTimers.vnTitleDisplay);

      // Start showing the first line
      await nextTick();
      await showCurrentLine();
    } else {
      // Clean up
      clearAllTimers();
      isTyping.value = false;
      vnStore.isTyping = false;
      displayedText.value = '';

      // Switch back to game BGM
      audio.playBGM('game_bgm');
    }
  },
);

// --- Watch for ended state ---
watch(
  () => vnStore.ended,
  (isEnded) => {
    if (isEnded) {
      clearAllTimers();
      isTyping.value = false;
      vnStore.isTyping = false;
    }
  },
);

// --- Watch for auto/skip mode changes to schedule advances ---
watch(
  () => [vnStore.autoMode, vnStore.skipMode],
  () => {
    // Clear existing timers when mode changes
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    if (skipTimer) { clearTimeout(skipTimer); skipTimer = null; }

    // If auto/skip was just enabled and we're not typing, schedule advance
    if (!isTyping.value && !vnStore.ended && vnStore.isOpen) {
      if (vnStore.skipMode) {
        skipTimer = setTimeout(() => {
          vnStore.advance();
        }, vnStore.skipDelay);
      } else if (vnStore.autoMode) {
        autoTimer = setTimeout(() => {
          vnStore.advance();
        }, vnStore.autoDelay);
      }
    }
  },
);

// --- Watch history panel to scroll to bottom ---
watch(
  () => vnStore.showingHistory,
  async (showing) => {
    if (showing) {
      await nextTick();
      if (historyListEl.value) {
        historyListEl.value.scrollTop = historyListEl.value.scrollHeight;
      }
    }
  },
);

// --- User actions ---
function onOverlayClick() {
  if (vnStore.showingHistory) return;
  if (vnStore.ended) {
    vnStore.close();
    return;
  }
  vnStore.advance();
}

function onClose() {
  vnStore.close();
}

function onToggleHistory() {
  vnStore.toggleHistory();
}

function onToggleAuto() {
  vnStore.toggleAuto();
}

function onToggleSkip() {
    vnStore.toggleSkip();
}

function isOptionAvailable(opt: VNChoiceOption): boolean {
    if (!opt.condition) return true;
    return checkChoiceCondition(opt, {
        affection: { ...affectionStore.affection },
        darkness: { ...affectionStore.darkness },
        controlLevel: loopStore.controlLevel,
        flags: [...loopStore.unlockedNarrativeFlags],
    });
}

function onSelectChoice(idx: number) {
    vnStore.selectChoice(idx);
}

// --- Cleanup on unmount ---
onBeforeUnmount(() => {
  clearAllTimers();
});
</script>

<style scoped>
/* ===== VN Reader Overlay ===== */
/* Ported from css/style.css lines 2598-2796 */

.vn-overlay {
  position: fixed;
  inset: 0;
  z-index: 9500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  opacity: 1;
  overflow: hidden;
}

/* Background Layer */
.vn-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: #1a1a3e;
  background-image: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 30%, #24243e 60%, #1a1a2e 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-image 0.8s ease;
}
.vn-background::after {
  display: none;
}
.vn-background::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15,12,41,0) 0%, rgba(15,12,41,0) 60%, rgba(10,8,30,0.3) 100%);
  z-index: 1;
}

/* Character Sprite Layer */
.vn-character-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: none;
}
.vn-character-sprite {
  width: 70vw;
  max-width: 400px;
  height: 75vh;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center bottom;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
  filter: drop-shadow(0 0 20px rgba(123,104,238,0.3));
}

/* UI Controls Layer */
.vn-controls {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  pointer-events: none;
}
.vn-controls > * {
  pointer-events: auto;
}

.vn-btn-back {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--vn-pink), var(--vn-pink-light));
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(255,107,157,0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}
.vn-btn-back:active {
  transform: scale(0.9);
  box-shadow: 0 1px 6px rgba(255,107,157,0.3);
}

.vn-btn-review {
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  color: rgba(255,255,255,0.9);
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: background 0.2s, transform 0.2s;
}
.vn-btn-review:active {
  background: rgba(255,255,255,0.25);
  transform: scale(0.95);
}

/* Dialogue Box Layer */
.vn-dialogue-box {
  position: relative;
  z-index: 5;
  width: 90vw;
  max-width: 420px;
  margin-bottom: 10vh;
  padding: 24px 28px 18px;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(123,104,238,0.1);
  max-height: 40vh;
  overflow: visible;
}

.vn-name-tag {
  position: absolute;
  top: -14px;
  left: 20px;
  padding: 4px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--vn-accent), var(--vn-accent-light));
  color: white;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  box-shadow: 0 2px 10px rgba(123,104,238,0.4);
}

.vn-text-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-dark);
  min-height: 48px;
  padding-top: 4px;
  font-weight: 400;
  max-height: 25vh;
  overflow-y: auto;
  overflow-wrap: break-word;
  word-break: break-word;
  -webkit-overflow-scrolling: touch;
}

/* Narrator specific styles */
.vn-name-tag.vn-narrator {
  background: rgba(120,120,140,0.85);
  font-style: italic;
  letter-spacing: 2px;
}
.vn-text-content.vn-narrator-text {
  font-style: italic;
  max-height: 25vh;
  overflow-y: auto;
  color: var(--text-medium);
}

.vn-cursor {
  animation: vn-blink 0.6s step-end infinite;
}

.vn-continue-indicator {
  text-align: center;
  color: var(--vn-accent);
  font-size: 10px;
  margin-top: 6px;
  animation: vn-blink 1.2s infinite;
}
@keyframes vn-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Bottom Controls */
.vn-bottom-controls {
  position: absolute;
  bottom: 3vh;
  right: 5vw;
  z-index: 10;
  display: flex;
  gap: 8px;
  pointer-events: auto;
}
.vn-btn-control {
  padding: 6px 14px;
  border-radius: 16px;
  border: none;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.8);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.2s;
}
.vn-btn-control:active {
  transform: scale(0.95);
}
.vn-btn-control.vn-btn-active {
  background: rgba(123,104,238,0.6);
  color: white;
  box-shadow: 0 0 12px rgba(123,104,238,0.4);
}

/* History Panel */
.vn-history-panel {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: rgba(15,12,41,0.95);
  backdrop-filter: blur(20px);
  padding: 20px;
}

.vn-history-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(255,255,255,0.9);
  font-size: 16px;
  font-weight: 700;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 12px;
}
.vn-history-close {
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  font-size: 14px;
}
.vn-history-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.vn-history-item {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.vn-history-speaker {
  font-size: 13px;
  font-weight: 700;
  margin-right: 8px;
}
.vn-history-text {
  font-size: 14px;
  color: rgba(255,255,255,0.75);
  line-height: 1.6;
}

/* Title Overlay */
.vn-title-overlay {
  position: absolute;
  inset: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(15,12,41,0.8);
}
.vn-title-chapter {
  font-size: 22px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 2px 20px rgba(123,104,238,0.6);
  margin-bottom: 8px;
  letter-spacing: 2px;
}
.vn-title-cg {
  font-size: 14px;
  color: rgba(200,180,240,0.8);
  font-style: italic;
}

/* ===== Choice Panel ===== */
.vn-choice-panel {
  position: relative;
  z-index: 6;
  width: 90vw;
  max-width: 420px;
  margin-bottom: 2vh;
  padding: 16px 20px;
  background: rgba(15,12,41,0.92);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(123,104,238,0.3);
  box-shadow: 0 4px 30px rgba(0,0,0,0.4);
}

.vn-choice-prompt {
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.vn-choice-btn {
  display: block;
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid rgba(123,104,238,0.4);
  background: linear-gradient(135deg, rgba(123,104,238,0.15), rgba(123,104,238,0.05));
  color: rgba(255,255,255,0.9);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.vn-choice-btn:last-child {
  margin-bottom: 0;
}

.vn-choice-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(123,104,238,0.3), rgba(123,104,238,0.15));
  border-color: rgba(123,104,238,0.7);
}

.vn-choice-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.vn-choice-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ===== Transitions ===== */
.vn-fade-enter-active,
.vn-fade-leave-active {
  transition: opacity 0.4s ease;
}
.vn-fade-enter-from,
.vn-fade-leave-to {
  opacity: 0;
}

.vn-title-enter-active {
  transition: opacity 0.6s ease;
}
.vn-title-leave-active {
  transition: opacity 0.8s ease;
}
.vn-title-enter-from,
.vn-title-leave-to {
  opacity: 0;
}

.vn-choice-fade-enter-active {
  transition: opacity 0.3s ease;
}
.vn-choice-fade-leave-active {
  transition: opacity 0.2s ease;
}
.vn-choice-fade-enter-from,
.vn-choice-fade-leave-to {
  opacity: 0;
}
</style>
