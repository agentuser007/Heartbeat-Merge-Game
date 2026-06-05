<!-- ============================================================
     DialogueOverlay.vue — Dialogue Popup Overlay
     Replaces DialogueSystem from js/dialogue.js and
     #dialogue-overlay from index.html lines 265-284
     ============================================================ -->
<template>
  <Transition name="fade">
    <div v-if="dialogueStore.isOpen" id="dialogue-overlay" @click="onOverlayClick">
      <div class="dialogue-box" @click.stop>
        <div id="dialogue-portrait" :style="portraitStyle">{{ portraitEmoji }}</div>
        <div id="dialogue-npc-name">{{ dialogueStore.npcName }}</div>
        <div id="dialogue-npc-text">{{ displayedNpcText }}<span v-if="isTyping" class="cursor">_</span></div>
        <div v-if="dialogueStore.playerText && !isNpcTyping" id="dialogue-player-text">
          {{ displayedPlayerText }}<span v-if="isPlayerTyping" class="cursor">_</span>
        </div>
        <button v-if="isTyping" id="dialogue-skip-btn" @click="skipTyping">
          {{ i18nStore.t('dialogueSkip') }}
        </button>
        <button v-if="!isTyping" id="dialogue-close-btn" @click="close">
          {{ i18nStore.t('dialogue.tapContinue') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { useDialogueStore } from '../../stores/dialogueStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useAudio } from '../../composables/useAudio';

const dialogueStore = useDialogueStore();
const i18nStore = useI18nStore();
const audio = useAudio();

// --- Reactive typewriter state ---
const displayedNpcText = ref('');
const displayedPlayerText = ref('');
const isNpcTyping = ref(false);
const isPlayerTyping = ref(false);
const skipRequested = ref(false);

const isTyping = computed(() => isNpcTyping.value || isPlayerTyping.value);

// --- Portrait styling ---
const portraitStyle = computed(() => {
  if (dialogueStore.portraitUrl) {
    return {
      backgroundImage: `url('${dialogueStore.portraitUrl}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
    };
  }
  return {};
});

const portraitEmoji = computed(() => {
  return dialogueStore.portraitUrl ? '' : dialogueStore.portraitEmoji;
});

// --- Typewriter timers ---
let npcTypingTimer: ReturnType<typeof setTimeout> | null = null;
let playerTypingTimer: ReturnType<typeof setTimeout> | null = null;

// --- BGM state tracking ---
let bgmWasPaused = false;

/**
 * Animate text character-by-character.
 * Returns a Promise that resolves when all characters are shown or skip is requested.
 */
function typewrite(
  text: string,
  displayedRef: ReturnType<typeof ref<string>>,
  typingFlag: ReturnType<typeof ref<boolean>>,
  speed: number,
): Promise<void> {
  return new Promise((resolve) => {
    displayedRef.value = '';
    typingFlag.value = true;
    let i = 0;

    function tick() {
      // If dialogue was closed externally, stop immediately
      if (!dialogueStore.isOpen) {
        typingFlag.value = false;
        resolve();
        return;
      }

      // If skip was requested, show full text and stop
      if (skipRequested.value) {
        displayedRef.value = text;
        typingFlag.value = false;
        skipRequested.value = false;
        resolve();
        return;
      }

      if (i < text.length) {
        displayedRef.value += text[i];
        i++;
        const timer = setTimeout(tick, speed);
        if (typingFlag === isNpcTyping) {
          npcTypingTimer = timer;
        } else {
          playerTypingTimer = timer;
        }
      } else {
        typingFlag.value = false;
        resolve();
      }
    }

    tick();
  });
}

/**
 * Clear all pending typewriter timers
 */
function clearTimers() {
  if (npcTypingTimer) {
    clearTimeout(npcTypingTimer);
    npcTypingTimer = null;
  }
  if (playerTypingTimer) {
    clearTimeout(playerTypingTimer);
    playerTypingTimer = null;
  }
}

// --- Watch for dialogue open/close ---
watch(
  () => dialogueStore.isOpen,
  async (isOpen) => {
    if (isOpen) {
      // Dialogue just opened — start typewriter for NPC text
      skipRequested.value = false;
      displayedNpcText.value = '';
      displayedPlayerText.value = '';

      // Handle BGM: pause game_bgm, play story_bgm
      if (audio.getCurrentBGM() === 'game_bgm') {
        audio.pauseBGM(500);
        bgmWasPaused = true;
      }
      audio.playBGM('story_bgm');

      // Start NPC typewriter (30ms per character, matching original)
      await typewrite(dialogueStore.npcText, displayedNpcText, isNpcTyping, 30);

      // After NPC text completes, start player text typewriter if present
      if (dialogueStore.playerText && dialogueStore.isOpen) {
        const playerFullText = i18nStore.emoji('thought') + ' ' + dialogueStore.playerText;
        await typewrite(playerFullText, displayedPlayerText, isPlayerTyping, 25);
      }
    } else {
      // Dialogue closed — clean up
      clearTimers();
      isNpcTyping.value = false;
      isPlayerTyping.value = false;
      skipRequested.value = false;

      // Restore BGM
      if (audio.getCurrentBGM() === 'story_bgm') {
        audio.pauseBGM(500);
      }
      if (bgmWasPaused) {
        audio.playBGM('game_bgm');
        bgmWasPaused = false;
      }
    }
  },
);

// --- Also watch npcText changes (in case dialogue content updates while open) ---
watch(
  () => dialogueStore.npcText,
  async (newText) => {
    if (dialogueStore.isOpen && newText) {
      clearTimers();
      skipRequested.value = false;
      displayedNpcText.value = '';
      displayedPlayerText.value = '';
      isNpcTyping.value = false;
      isPlayerTyping.value = false;

      await typewrite(newText, displayedNpcText, isNpcTyping, 30);

      if (dialogueStore.playerText && dialogueStore.isOpen) {
        const playerFullText = i18nStore.emoji('thought') + ' ' + dialogueStore.playerText;
        await typewrite(playerFullText, displayedPlayerText, isPlayerTyping, 25);
      }
    }
  },
);

// --- User actions ---
function skipTyping() {
  skipRequested.value = true;
}

function close() {
  // If still typing, complete the text first then close
  if (isNpcTyping.value) {
    displayedNpcText.value = dialogueStore.npcText;
    isNpcTyping.value = false;
  }
  if (isPlayerTyping.value) {
    const playerFullText = i18nStore.emoji('thought') + ' ' + dialogueStore.playerText;
    displayedPlayerText.value = playerFullText;
    isPlayerTyping.value = false;
  }
  clearTimers();
  dialogueStore.close();
}

function onOverlayClick() {
  // Close dialogue when clicking outside the dialogue box
  close();
}

// --- Cleanup on unmount ---
onBeforeUnmount(() => {
  clearTimers();
});
</script>

<style scoped>
/* ===== Dialogue Overlay ===== */
#dialogue-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 800;
  opacity: 1;
  pointer-events: auto;
}

.dialogue-box {
  width: 90%;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 24px 20px 18px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  transform: scale(1);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

#dialogue-portrait {
  width: 86px;
  height: 86px;
  border-radius: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin: -60px auto 12px;
  border: none;
  box-shadow: none;
}

#dialogue-npc-name {
  font-size: 16px;
  font-weight: 900;
  color: var(--text-heading);
  margin-bottom: 10px;
}

#dialogue-npc-text {
  font-size: 14px;
  color: var(--text-dark);
  line-height: 1.6;
  min-height: 42px;
  margin-bottom: 10px;
}

#dialogue-player-text {
  font-size: 13px;
  color: var(--accent-pink);
  font-weight: 600;
  display: none;
  margin-bottom: 8px;
}

.cursor {
  animation: blink 0.6s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

#dialogue-skip-btn {
  padding: 6px 18px;
  border: none;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.5);
  font-size: 12px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
  transition: transform var(--transition-fast);
}
#dialogue-skip-btn:hover {
  background: rgba(0, 0, 0, 0.12);
}
#dialogue-skip-btn:active {
  transform: scale(0.93);
}

#dialogue-close-btn {
  padding: 8px 32px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--accent-pink), var(--accent-purple));
  color: white;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Jiangcheng Yuanti', inherit;
  cursor: pointer;
  transition: transform var(--transition-fast);
}
#dialogue-close-btn:hover {
  filter: brightness(1.1);
}
#dialogue-close-btn:active {
  transform: scale(0.93);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from {
  opacity: 0;
}
.fade-enter-from .dialogue-box {
  transform: scale(0.9);
}
.fade-leave-to {
  opacity: 0;
}
</style>
