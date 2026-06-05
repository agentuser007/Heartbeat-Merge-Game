// ============================================================
// useAutoSave.ts — Auto-Save Composable
// ============================================================
// Provides periodic auto-save, save on tab hide, and save on
// page unload.  Intended to be called once in the root game
// view (e.g. GameView.vue) inside its setup() function.
// ============================================================

import { onMounted, onUnmounted } from 'vue';
import { useSaveStore } from '@/stores/saveStore';

export function useAutoSave(intervalMs: number = 30000) {
    const saveStore = useSaveStore();
    let timer: number | null = null;

    // --- Save callbacks ---

    function onVisibilityChange() {
        if (document.hidden) {
            saveStore.saveAll();
        }
    }

    function onBeforeUnload() {
        saveStore.saveAll();
    }

    // --- Lifecycle ---

    function startAutoSave() {
        if (timer !== null) return; // already running
        timer = window.setInterval(() => {
            saveStore.saveAll();
        }, intervalMs);
    }

    function stopAutoSave() {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    }

    onMounted(() => {
        startAutoSave();

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('beforeunload', onBeforeUnload);
    });

    onUnmounted(() => {
        stopAutoSave();

        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('beforeunload', onBeforeUnload);
    });

    return { startAutoSave, stopAutoSave };
}
