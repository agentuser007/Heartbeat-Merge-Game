<!-- ============================================================
     ParticleLayer.vue — Container for particle effects
     Replaces #particle-layer from index.html line 409
     ============================================================ -->
<template>
  <div id="particle-layer"></div>
</template>

<script setup lang="ts">
// Pure container component — particles are spawned by useEffects composable
</script>

<style scoped>
#particle-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 600;
  overflow: hidden;
}
</style>
