<template>
  <Teleport to="body">
    <Transition name="affection-toast-fade">
      <div v-if="visible" class="affection-toast" :style="{ borderColor: color }">
        <span class="affection-toast-icon">💕</span>
        <span class="affection-toast-text">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useEventBus } from '../../composables/useEventBus'
import { useConfigStore } from '../../stores/configStore'

const visible = ref(false)
const message = ref('')
const color = ref('#FF69B4')
let timer: ReturnType<typeof setTimeout> | null = null

const bus = useEventBus()
const configStore = useConfigStore()

bus.on('affection:changed', (data) => {
  if (!data) return
  const characters = configStore.affectionConfig?.characters || []
  const char = characters.find((c) => c.id === data.characterId)
  if (char) color.value = char.color || '#FF69B4'
  const charName = char?.name || ''
  message.value = charName ? `💕 ${charName} +${data.delta}` : `💕 +${data.delta}`
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { visible.value = false }, configStore.uiTimers.affectionToastDisplay)
})

bus.on('affection:levelUp', (data) => {
  if (!data) return
  const characters = configStore.affectionConfig?.characters || []
  const char = characters.find((c) => c.id === data.characterId)
  if (char) color.value = char.color || '#FF69B4'
  message.value = `⬆️ 关系升级！`
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { visible.value = false }, configStore.uiTimers.affectionLevelUpToastDisplay)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.affection-toast {
  position: fixed;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast, 9999);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(255,105,180,0.9), rgba(255,182,193,0.85));
  border: 2px solid;
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(255,105,180,0.4);
}

.affection-toast-icon {
  font-size: 16px;
}

.affection-toast-text {
  text-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.affection-toast-fade-enter-active {
  animation: affectionToastIn 0.4s ease-out;
}
.affection-toast-fade-leave-active {
  animation: affectionToastOut 0.3s ease-in;
}

@keyframes affectionToastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.8); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes affectionToastOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.9); }
}
</style>