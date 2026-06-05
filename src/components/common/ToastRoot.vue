<!-- ============================================================
     ToastRoot.vue — Container for toast notifications
     Replaces #toast-root from index.html line 415
     ============================================================ -->
<template>
  <div id="toast-root"></div>
</template>

<script setup lang="ts">
// Pure container component — toasts are spawned by useEffects composable
</script>

<style scoped>
/* Container for all system toasts — sits above dialogue/parade overlays (800/850)
   but below blocking modals (900+). Children use position:absolute within this. */
#toast-root {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 890;
}

/* ---- Daily Toast ---- */
:deep(.daily-toast) {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%) translateY(-20px);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Jiangcheng Yuanti', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

:deep(.daily-toast.show) {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ---- Achievement Toast ---- */
:deep(.achievement-toast) {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  background: rgb(255, 255, 255);
  padding: 12px 20px;
  border-radius: 30px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid rgba(255, 215, 0, 0.4);
}

:deep(.achievement-toast.show) {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

:deep(.achievement-toast-icon) {
  font-size: 32px;
}

:deep(.achievement-toast-info) {
  display: flex;
  flex-direction: column;
}

:deep(.achievement-toast-title) {
  font-size: 10px;
  color: var(--daily-icon-end);
  font-weight: 800;
  text-transform: uppercase;
}

:deep(.achievement-toast-name) {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-dark);
}

:deep(.achievement-toast-reward) {
  font-size: 11px;
  color: var(--color-success);
  font-weight: 600;
}
</style>
