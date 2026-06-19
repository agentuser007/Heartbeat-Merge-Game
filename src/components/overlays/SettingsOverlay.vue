<template>
  <Transition name="fade">
    <div v-if="visible" class="settings-overlay-backdrop" @click.self="$emit('close')">
      <Transition name="scale-up">
        <div v-if="visible" class="settings-card">
          <!-- Header -->
          <div class="settings-header">
            <span class="settings-title">
              <span class="settings-title-icon">⚙️</span>
              {{ i18nStore.t('settings.title') || '音频设置' }}
            </span>
            <button class="settings-close-btn" @click="$emit('close')">✕</button>
          </div>

          <!-- Content / Controls -->
          <div class="settings-content">
            <!-- Mute Section -->
            <div class="settings-item mute-toggle-container">
              <span class="settings-label">
                <span class="settings-icon">🔇</span>
                {{ i18nStore.t('settings.mute') || '全局静音' }}
              </span>
              <label class="toggle-switch">
                <input type="checkbox" v-model="audio.muted.value" />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="divider"></div>

            <!-- Master Volume Slider -->
            <div class="settings-item slider-container" :class="{ 'item-disabled': audio.muted.value }">
              <div class="slider-header">
                <span class="settings-label">
                  <span class="settings-icon">🔊</span>
                  {{ i18nStore.t('settings.masterVolume') || '全局主音量' }}
                </span>
                <span class="slider-value">{{ Math.round(audio.masterVolume.value * 100) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                v-model.number="audio.masterVolume.value"
                :disabled="audio.muted.value"
                class="volume-slider"
              />
            </div>

            <!-- BGM Volume Slider -->
            <div class="settings-item slider-container" :class="{ 'item-disabled': audio.muted.value }">
              <div class="slider-header">
                <span class="settings-label">
                  <span class="settings-icon">🎵</span>
                  {{ i18nStore.t('settings.bgmVolume') || '音乐音量' }}
                </span>
                <span class="slider-value">{{ Math.round(audio.bgmVolume.value * 100) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                v-model.number="audio.bgmVolume.value"
                :disabled="audio.muted.value"
                class="volume-slider"
              />
            </div>

            <!-- SFX Volume Slider -->
            <div class="settings-item slider-container" :class="{ 'item-disabled': audio.muted.value }">
              <div class="slider-header">
                <span class="settings-label">
                  <span class="settings-icon">⚔️</span>
                  {{ i18nStore.t('settings.sfxVolume') || '音效音量' }}
                </span>
                <span class="slider-value">{{ Math.round(audio.sfxVolume.value * 100) }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                v-model.number="audio.sfxVolume.value"
                :disabled="audio.muted.value"
                class="volume-slider"
              />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useAudio } from '../../composables/useAudio';
import { useI18nStore } from '../../stores/i18nStore';

defineProps<{
  visible: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const audio = useAudio();
const i18nStore = useI18nStore();
</script>

<style scoped>
.settings-overlay-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(43, 29, 39, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-card {
  background: rgba(253, 246, 250, 0.9);
  border: 2px solid #FFFFFF;
  box-shadow: 0 20px 40px rgba(115, 80, 102, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #5D4353;
}

.settings-header {
  padding: 20px 24px;
  background: rgba(246, 227, 237, 0.5);
  border-bottom: 1px solid rgba(220, 200, 212, 0.4);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-title {
  font-size: 20px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5D4353;
  letter-spacing: -0.5px;
}

.settings-title-icon {
  font-size: 20px;
}

.settings-close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #B29AA9;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-close-btn:hover {
  color: #5D4353;
  transform: rotate(90deg);
}

.settings-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-item {
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s ease;
}

.mute-toggle-container {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.settings-label {
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-icon {
  font-size: 16px;
}

.divider {
  height: 1px;
  background: rgba(220, 200, 212, 0.4);
}

.slider-container {
  gap: 8px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-value {
  font-size: 14px;
  font-weight: 800;
  color: #DDAA8B;
  background: #FFFFFF;
  padding: 2px 8px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(115, 80, 102, 0.05);
}

.item-disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* Custom premium slider styling */
.volume-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #EEDEE7;
  outline: none;
  margin: 8px 0;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #DDAA8B;
  border: 3px solid #FFFFFF;
  box-shadow: 0 4px 8px rgba(115, 80, 102, 0.2);
  cursor: pointer;
  transition: transform 0.1s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.volume-slider::-webkit-slider-thumb:active {
  transform: scale(0.95);
  background: #cba085;
}

/* Custom toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #EEDEE7;
  transition: .3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(115, 80, 102, 0.15);
}

input:checked + .toggle-slider {
  background-color: #DDAA8B;
}

input:focus + .toggle-slider {
  box-shadow: 0 0 1px #DDAA8B;
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-up-enter-active,
.scale-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}

.scale-up-enter-from,
.scale-up-leave-to {
  transform: scale(0.85);
  opacity: 0;
}
</style>
