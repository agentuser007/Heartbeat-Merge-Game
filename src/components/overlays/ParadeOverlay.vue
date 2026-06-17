<!-- ============================================================
     ParadeOverlay.vue — Queen's Parade Celebration Overlay
     Replaces #parade-overlay from index.html lines 286-356
     ============================================================ -->
<template>
  <Transition name="fade">
    <div v-if="visible" id="parade-overlay">
      <canvas id="sparkle-canvas" ref="sparkleCanvasRef"></canvas>
      <div class="spotlight spotlight-left"></div>
      <div class="spotlight spotlight-right"></div>
      <div class="red-carpet"></div>
      <div class="carpet-sparkle"></div>
      <div class="parade-title">
        <div class="parade-title-sub">{{ i18nStore.t('parade.congrats') }}</div>
        <div class="parade-title-main">{{ i18nStore.t('parade.title') }}</div>
      </div>
      <div class="parade-scene">
        <div class="throne">
          <div class="throne-glow"></div>
          <div class="throne-back">👑</div>
          <div class="throne-seat"></div>
          <div class="queen-on-throne">
            <div class="queen-crown">👑</div>
            <div class="queen-avatar-parade" :style="queenAvatarStyle"></div>
          </div>
        </div>
        <div class="carriers">
          <div v-for="(carrier, i) in carriers" :key="i" class="carrier" :class="'carrier-' + (i + 1)">
            <div class="carrier-pole" :class="i < 2 ? 'carrier-pole-left' : 'carrier-pole-right'"></div>
            <div class="carrier-avatar" :style="carrier.style"></div>
            <div class="carrier-speech">{{ i18nStore.t(carrier.speechKey) }}</div>
          </div>
        </div>
      </div>
      <div class="parade-bottom-text">{{ i18nStore.t('parade.bottomText') }}</div>
      <button class="parade-close-btn" @click="$emit('close')">
        {{ i18nStore.t('parade.continue') || '继续' }}
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useI18nStore } from '../../stores/i18nStore';
import { useConfigStore } from '../../stores/configStore';

const props = defineProps<{
  visible: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const i18nStore = useI18nStore();
const configStore = useConfigStore();

// --- Refs ---
const sparkleCanvasRef = ref<HTMLCanvasElement | null>(null);
let sparkleAnimFrame: number | null = null;

// --- Queen avatar style ---
const queenAvatarStyle = computed(() => ({
  backgroundImage: `url("${import.meta.env.BASE_URL}assets/avatar/heroine.webp")`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}));

// --- Carrier characters ---
const carriers = ref([
  {
    style: { backgroundImage: `url("${import.meta.env.BASE_URL}assets/avatar/vincent_no_bg.png")`, backgroundSize: 'cover', backgroundPosition: 'center' },
    speechKey: 'parade.carrier1Speech',
  },
  {
    style: { backgroundImage: `url("${import.meta.env.BASE_URL}assets/avatar/leo_no_bg.png")`, backgroundSize: 'cover', backgroundPosition: 'center' },
    speechKey: 'parade.carrier2Speech',
  },
  {
    style: { backgroundImage: `url("${import.meta.env.BASE_URL}assets/avatar/daniel_no_bg.png")`, backgroundSize: 'cover', backgroundPosition: 'center' },
    speechKey: 'parade.carrier3Speech',
  },
  {
    style: { backgroundImage: `url("${import.meta.env.BASE_URL}assets/avatar/morven_no_bg.png")`, backgroundSize: 'cover', backgroundPosition: 'center' },
    speechKey: 'parade.carrier4Speech',
  },
]);

// --- Sparkle canvas animation (simplified) ---
function startSparkleAnimation() {
  const canvas = sparkleCanvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  interface Sparkle {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
    drift: number;
  }

  const sparkles: Sparkle[] = [];
  const sparkleCount = 50;

  // Initialize sparkles
  // exempt: pure visual — no game state impact
  for (let i = 0; i < sparkleCount; i++) {
    sparkles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 1.5 + 0.5,
      opacity: Math.random(),
      drift: (Math.random() - 0.5) * 0.5,
    });
  }

  function animate() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const sparkle of sparkles) {
      sparkle.y -= sparkle.speed;
      sparkle.x += sparkle.drift;
      // exempt: pure visual — no game state impact
      sparkle.opacity += (Math.random() - 0.5) * 0.05;
      sparkle.opacity = Math.max(0.1, Math.min(1, sparkle.opacity));

      // Reset sparkle if it goes off screen
      if (sparkle.y < -10) {
        sparkle.y = canvas.height + 10;
        // exempt: pure visual — no game state impact
        sparkle.x = Math.random() * canvas.width;
      }

      ctx.beginPath();
      ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${sparkle.opacity})`;
      ctx.fill();
    }

    sparkleAnimFrame = requestAnimationFrame(animate);
  }

  animate();
}

function stopSparkleAnimation() {
  if (sparkleAnimFrame !== null) {
    cancelAnimationFrame(sparkleAnimFrame);
    sparkleAnimFrame = null;
  }
}

// --- Watch visibility to start/stop sparkle animation ---
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      // Start sparkle animation after a tick so canvas is mounted
      setTimeout(() => startSparkleAnimation(), configStore.uiTimers.sparkleStartDelay);
    } else {
      stopSparkleAnimation();
    }
  },
);

// --- Cleanup ---
onBeforeUnmount(() => {
  stopSparkleAnimation();
});
</script>

<style scoped>
/* ===== Parade Overlay ===== */
#parade-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(to bottom, #a1c4fd 0%, #c2e9fb 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 850;
  opacity: 1;
  pointer-events: auto;
  overflow: hidden;
}

#sparkle-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.spotlight {
  position: absolute;
  width: 40%;
  height: 100%;
}
.spotlight-left {
  left: 0;
  top: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent);
}
.spotlight-right {
  right: 0;
  top: 0;
  background: linear-gradient(-90deg, rgba(255,255,255,0.15), transparent);
}

.red-carpet {
  position: absolute;
  bottom: 0;
  width: 60%;
  height: 30%;
  background: linear-gradient(0deg, #c0392b, #e74c3c);
  border-radius: 50% 50% 0 0 / 20% 20% 0 0;
}

.carpet-sparkle {
  position: absolute;
  bottom: 0;
  width: 60%;
  height: 30%;
  pointer-events: none;
}

/* ===== Parade Title ===== */
.parade-title {
  text-align: center;
  margin-bottom: 20px;
  z-index: 5;
}
.parade-title-sub {
  font-size: 1.2rem;
  color: rgba(255,255,255,0.8);
}
.parade-title-main {
  font-size: 2rem;
  font-weight: 900;
  color: var(--color-danger-bright);
  text-shadow: 3px 3px 0px white, -3px -3px 0px white, 3px -3px 0px white, -3px 3px 0px white;
  animation: float-bounce 2.5s infinite;
  letter-spacing: 2px;
}

/* ===== Parade Scene ===== */
.parade-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
}

/* ===== Throne ===== */
.throne {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.throne-glow {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,215,0,0.3), transparent 70%);
}
.throne-back {
  font-size: 3rem;
}
.throne-seat {
  width: 80px;
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(90deg, #deb887, #c19a6b);
}

/* ===== Queen on Throne ===== */
.queen-on-throne {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.queen-crown {
  font-size: 1.5rem;
}
.queen-avatar-parade {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  border: 4px solid var(--rarity-ssr);
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.6);
  animation: float-bounce 2s infinite;
}

/* ===== Carriers ===== */
.carriers {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.carrier {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.carrier-pole {
  width: 4px;
  height: 40px;
  background: linear-gradient(90deg, #deb887, #c19a6b);
  border-radius: 2px;
}
.carrier-pole-left {
  transform: rotate(-5deg);
}
.carrier-pole-right {
  transform: rotate(5deg);
}
.carrier-avatar {
  width: 65px;
  height: 65px;
  border-radius: 0;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border: none;
  box-shadow: none;
  animation: walk-bounce 0.5s infinite alternate;
}
.carrier-1 { animation-delay: 0s; }
.carrier-2 { animation-delay: 0.25s; }
.carrier-3 { animation-delay: 0s; }
.carrier-4 { animation-delay: 0.25s; }
.carrier-speech {
  margin-top: 4px;
  font-size: 0.75rem;
  text-align: center;
  max-width: 80px;
  color: rgba(255,255,255,0.9);
}

.parade-bottom-text {
  margin-top: 20px;
  z-index: 1;
  text-align: center;
  color: rgba(255,255,255,0.8);
  font-size: 14px;
}

.parade-close-btn {
  margin-top: 20px;
  padding: 12px 40px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--accent-pink), var(--accent-purple));
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  z-index: 10;
  transition: transform 0.1s ease;
}

.parade-close-btn:active {
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
