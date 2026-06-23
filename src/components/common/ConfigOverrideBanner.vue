<template>
  <Transition name="override-banner">
    <div v-if="configStore.hasOverrides" class="config-override-banner">
      <span class="config-override-banner__text">预览模式 - 未保存的配置修改</span>
      <button class="config-override-banner__btn" @click="handleClear">清除</button>
      <button class="config-override-banner__close" @click="handleClear">✕</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useConfigStore } from '@/stores/configStore'

const configStore = useConfigStore()

function handleClear() {
    configStore.clearOverrides()
    configStore.loadGameData()
    if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('config-editor')
        ch.postMessage({ type: 'clear' })
        ch.close()
    }
}
</script>

<style scoped>
.config-override-banner {
    position: fixed;
    top: 8px;
    right: 8px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(220, 38, 38, 0.9);
    color: #fff;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
}

.config-override-banner__text {
    white-space: nowrap;
}

.config-override-banner__btn {
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
}

.config-override-banner__btn:hover {
    background: rgba(255, 255, 255, 0.35);
}

.config-override-banner__close {
    padding: 2px 6px;
    background: transparent;
    color: #fff;
    border: none;
    font-size: 14px;
    cursor: pointer;
    line-height: 1;
    opacity: 0.7;
}

.config-override-banner__close:hover {
    opacity: 1;
}

.override-banner-enter-active,
.override-banner-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.override-banner-enter-from,
.override-banner-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
