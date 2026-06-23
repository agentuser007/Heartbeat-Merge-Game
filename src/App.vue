<template>
  <GameView :style="uiCssVars" />
  <DevPanel />
  <ConfigOverrideBanner />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GameView from './views/GameView.vue'
import DevPanel from './components/common/DevPanel.vue'
import ConfigOverrideBanner from './components/common/ConfigOverrideBanner.vue'
import { useConfigStore } from './stores/configStore'

const configStore = useConfigStore()

const uiCssVars = computed(() => ({
  '--interactive-transition': `all ${configStore.uiAnimation.interactiveTransition}ms ease`,
}))
</script>

<style>
/* Global app styles are imported in main.ts */
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
