// ============================================================
// useAudio.ts — Audio Manager Composable (Howler.js)
// ============================================================
// Howler handles: AudioContext unlock, format fallback, fade,
// mobile WebView quirks (iOS Safari, WeChat).
// Public API is 100% backward-compatible with the old implementation.
// ============================================================

import { ref } from 'vue';
import { Howl, Howler } from 'howler';

const SOUNDS: Record<string, string> = {
  btn_click: 'btn_click.ogg',
  merge: 'merge.ogg',
  pop: 'pop.ogg',
  reward: 'reward.ogg',
  task_complete: 'task_complete.ogg',
};

const BGM: Record<string, string> = {
  game_bgm: 'game_bgm.ogg',
  story_bgm: 'story_bgm.ogg',
};

const sharedState = {
  muted: ref(false),
  loaded: ref(false),
  bgmVolume: ref(0.3),
  bgmPaused: ref(false),
  currentBGMName: null as string | null,
  sfxHowls: {} as Record<string, Howl>,
  bgmHowls: {} as Record<string, Howl>,
  bgmHowl: null as Howl | null,
  pendingBGM: null as string | null,
  unlocked: false,
};

function audioPath(filename: string): string {
  return `${import.meta.env.BASE_URL}assets/audio/${filename}`;
}

export function useAudio() {
  const muted = sharedState.muted;
  const loaded = sharedState.loaded;
  const bgmVolume = sharedState.bgmVolume;
  const bgmPaused = sharedState.bgmPaused;

  function init(): void {
    if (sharedState.unlocked) return;

    const unlock = () => {
      const ctx: AudioContext = Howler.ctx;
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            sharedState.unlocked = true;
            cleanup();
          }).catch(err => {
            console.warn('[useAudio] Failed to resume AudioContext:', err);
          });
        } else {
          sharedState.unlocked = true;
          cleanup();
        }
      }
    };

    const cleanup = () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('click', unlock);
    };

    document.addEventListener('touchstart', unlock);
    document.addEventListener('touchend', unlock);
    document.addEventListener('click', unlock);
  }

  async function preloadAll(): Promise<void> {
    init();
    for (const [name, filename] of Object.entries(SOUNDS)) {
      if (sharedState.sfxHowls[name]) continue;
      sharedState.sfxHowls[name] = new Howl({
        src: [audioPath(filename)],
        volume: 1,
        preload: true,
      });
    }
    sharedState.loaded.value = true;
  }

  function playSound(name: string): void {
    if (sharedState.muted.value) return;
    let howl = sharedState.sfxHowls[name];
    if (!howl) {
      const filename = SOUNDS[name];
      if (!filename) {
        console.warn(`[useAudio] Unknown sound: ${name}`);
        return;
      }
      howl = new Howl({
        src: [audioPath(filename)],
        volume: 1,
        preload: true,
      });
      sharedState.sfxHowls[name] = howl;
    }
    howl.play();
  }

  function playBGM(name: string): void {
    const filename = BGM[name];
    if (!filename) {
      console.warn(`[useAudio] Unknown BGM: ${name}`);
      return;
    }

    if (sharedState.bgmHowl) {
      if (sharedState.currentBGMName === name && !sharedState.bgmPaused.value) return;
      sharedState.bgmHowl.stop();
      sharedState.bgmHowl = null;
    }

    const vol = sharedState.bgmVolume.value;

    let howl = sharedState.bgmHowls[name];
    if (!howl) {
      howl = new Howl({
        src: [audioPath(filename)],
        loop: true,
        volume: 0,
        preload: true,
      });

      howl.once('loaderror', (_id: number, err: unknown) => {
        console.warn(`[useAudio] BGM load error: ${name}`, err);
        sharedState.pendingBGM = name;
        sharedState.bgmPaused.value = true;
      });

      howl.once('playerror', (_id: number, err: unknown) => {
        console.warn(`[useAudio] BGM play blocked: ${name}`, err);
        sharedState.pendingBGM = name;
        sharedState.bgmPaused.value = true;
      });

      sharedState.bgmHowls[name] = howl;
    }

    if (howl.state() === 'loaded') {
      howl.volume(0);
      howl.play();
      howl.fade(0, vol, 800);
    } else {
      howl.once('load', () => {
        howl.volume(0);
        howl.play();
        howl.fade(0, vol, 800);
      });
    }

    sharedState.bgmHowl = howl;
    sharedState.currentBGMName = name;
    sharedState.bgmPaused.value = false;
  }

  function pauseBGM(fadeMs: number = 0): void {
    if (!sharedState.bgmHowl || sharedState.bgmPaused.value) return;

    if (fadeMs > 0) {
      const currentVol = sharedState.bgmHowl.volume();
      sharedState.bgmHowl.fade(currentVol, 0, fadeMs);
      sharedState.bgmHowl.once('fade', () => {
        sharedState.bgmHowl?.pause();
        sharedState.bgmPaused.value = true;
      });
    } else {
      sharedState.bgmHowl.pause();
      sharedState.bgmPaused.value = true;
    }
  }

  function tryResumeBGM(): void {
    init();

    if (sharedState.pendingBGM) {
      playBGM(sharedState.pendingBGM);
      sharedState.pendingBGM = null;
      return;
    }

    if (sharedState.bgmHowl && sharedState.bgmPaused.value) {
      const vol = sharedState.muted.value ? 0 : sharedState.bgmVolume.value;
      sharedState.bgmHowl.volume(0);
      sharedState.bgmHowl.play();
      sharedState.bgmHowl.fade(0, vol, 500);
      sharedState.bgmPaused.value = false;
    }
  }

  function setBGMVolume(volume: number): void {
    sharedState.bgmVolume.value = Math.max(0, Math.min(1, volume));
    if (sharedState.bgmHowl && !sharedState.muted.value) {
      sharedState.bgmHowl.volume(sharedState.bgmVolume.value);
    }
  }

  function muteAudio(): void {
    sharedState.muted.value = true;
    Howler.mute(true);
  }

  function unmuteAudio(): void {
    sharedState.muted.value = false;
    Howler.mute(false);
  }

  function getCurrentBGM(): string | null {
    return sharedState.currentBGMName;
  }

  return {
    muted,
    loaded,
    bgmVolume,
    bgmPaused,
    init,
    preloadAll,
    playSound,
    playBGM,
    pauseBGM,
    tryResumeBGM,
    setBGMVolume,
    muteAudio,
    unmuteAudio,
    getCurrentBGM,
  };
}
