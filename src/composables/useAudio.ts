// ============================================================
// useAudio.ts — Audio Manager Composable (Howler.js)
// ============================================================
// Thin wrapper over the core AudioManager singleton.
// Public API is 100% backward-compatible.
// ============================================================

import { ref, watch } from 'vue';
import { audioManager } from '@/core/AudioManager';
import type { AudioSerializeData } from '@/types/serialize';
import type { AudioConfig } from '@/types/game';

const loaded = ref(false);
const muted = ref(audioManager.isMuted());
const masterVolume = ref(1.0);
const bgmVolume = ref(0.3);
const sfxVolume = ref(0.8);
const bgmPaused = ref(audioManager.isPaused());

// Sync Vue reactive refs to core AudioManager singleton
watch(muted, (val) => {
    if (val) {
        audioManager.mute();
    } else {
        audioManager.unmute();
    }
});

watch(masterVolume, (val) => {
    audioManager.setMasterVolume(val);
});

watch(bgmVolume, (val) => {
    audioManager.setBGMVolume(val);
});

watch(sfxVolume, (val) => {
    audioManager.setSFXVolume(val);
});

function syncFromManager() {
    const state = audioManager.getState();
    muted.value = state.muted;
    masterVolume.value = state.masterVolume;
    bgmVolume.value = state.bgmVolume;
    sfxVolume.value = state.sfxVolume;
    bgmPaused.value = audioManager.isPaused();
}

export function useAudio() {
    function init(config?: AudioConfig, globalBus?: any): void {
        if (config && globalBus) {
            audioManager.init(config, globalBus);
            syncFromManager();
        } else {
            // Context unlocking or dynamic check
            (audioManager as any).setupUnlock?.();
        }
    }

    function restoreState(state: AudioSerializeData): void {
        audioManager.restoreState(state);
        syncFromManager();
    }

    return {
        // Reactive states
        muted,
        loaded,
        masterVolume,
        bgmVolume,
        sfxVolume,
        bgmPaused,

        // Methods
        init,
        preloadAll: () => {
            return audioManager.preloadAll().then(() => {
                loaded.value = true;
            });
        },
        playSound: (name: string) => audioManager.playSFX(name),
        playBGM: (name: string) => {
            audioManager.playBGM(name);
            bgmPaused.value = false;
        },
        pauseBGM: (fadeMs?: number) => {
            return audioManager.pauseBGM(fadeMs).then(() => {
                bgmPaused.value = true;
            });
        },
        tryResumeBGM: () => {
            audioManager.resumeBGM();
            bgmPaused.value = audioManager.isPaused();
        },
        setBGMVolume: (v: number) => {
            bgmVolume.value = v;
        },
        setMasterVolume: (v: number) => {
            masterVolume.value = v;
        },
        setSFXVolume: (v: number) => {
            sfxVolume.value = v;
        },
        muteAudio: () => {
            muted.value = true;
        },
        unmuteAudio: () => {
            muted.value = false;
        },
        getCurrentBGM: () => audioManager.getCurrentBGM(),
        getState: () => audioManager.getState(),
        restoreState,
    };
}
