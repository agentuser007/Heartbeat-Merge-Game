<template>
  <Transition name="fade">
    <div v-if="visible" class="confirm-overlay" @click="onCancel">
      <div class="confirm-card" @click.stop>
        <div class="confirm-message">{{ message }}</div>
        <div class="confirm-buttons">
          <button class="confirm-btn confirm-cancel" @click="onCancel">{{ cancelText }}</button>
          <button class="confirm-btn confirm-ok" @click="onConfirm">{{ okText }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean;
  message: string;
  okText?: string;
  cancelText?: string;
}

withDefaults(defineProps<Props>(), {
  okText: '确认',
  cancelText: '取消'
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function onConfirm() {
  emit('confirm');
}

function onCancel() {
  emit('cancel');
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 800;
}

.confirm-card {
  background: var(--off-white, #fff8f0);
  border-radius: 16px;
  padding: 24px;
  min-width: 260px;
  max-width: 85cqw;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.confirm-message {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin-bottom: 20px;
  line-height: 1.5;
}

.confirm-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-btn {
  padding: 8px 24px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.confirm-btn:active {
  transform: scale(0.94);
}

.confirm-cancel {
  background: #e0e0e0;
  color: #666;
}

.confirm-ok {
  background: var(--accent-pink, #F35683);
  color: white;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
