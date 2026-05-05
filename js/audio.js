// ============================================================
// audio.js — Audio Manager (Web Audio API + HTMLAudioElement BGM)
// ============================================================
// Preloads short SFX via AudioContext, provides playSound(name).
// Plays BGM via HTMLAudioElement with loop, fade, and mute support.
// Respects mute state from Effects.muteAudio/unmuteAudio.
// ============================================================

const AudioManager = {
    // ---- Configuration ----
    BASE_PATH: 'assets/audio/',

    // Sound registry: logical name → filename (short SFX)
    SOUNDS: {
        btn_click:     'btn_click.ogg',
        merge:         'merge.ogg',
        pop:           'pop.ogg',
        reward:        'reward.ogg',
        task_complete: 'task_complete.ogg',
    },

    // BGM registry: logical name → filename (long looping tracks)
    BGM: {
        game_bgm:  'game_bgm.ogg',
        story_bgm: 'story_bgm.ogg',
    },

    // ---- Internal state ----
    _ctx: null,          // AudioContext (lazy init, for SFX)
    _buffers: {},        // { name: AudioBuffer } (SFX cache)
    _muted: false,       // mute flag (synced with Effects._audioMuted)
    _loaded: false,      // SFX preload completed

    // BGM state
    _bgmEl: null,        // HTMLAudioElement for current BGM
    _currentBGM: null,   // logical name of currently playing BGM
    _bgmVolume: 0.3,     // default BGM volume (0~1)
    _bgmPaused: false,   // true when BGM is paused (not stopped)
    _bgmSavedVolume: 0.3,// volume before fade (for resume)
    _pendingBGM: null,    // BGM name awaiting user gesture to play (autoplay blocked)

    // ---- Initialise AudioContext (call after first user gesture) ----
    init() {
        if (this._ctx) return;
        try {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Expose to Effects.muteAudio / unmuteAudio via the existing window._gameAudioContext hook
            window._gameAudioContext = this._ctx;
        } catch (e) {
            console.warn('[AudioManager] Web Audio API not available:', e);
        }
    },

    // ---- Preload all registered SFX → returns Promise ----
    async preloadAll() {
        this.init();
        if (!this._ctx) return; // No AudioContext → silent fallback

        const names = Object.keys(this.SOUNDS);
        const promises = names.map(name => this._loadOne(name));
        await Promise.allSettled(promises);
        this._loaded = true;
        console.log('[AudioManager] Preloaded', Object.keys(this._buffers).length, '/', names.length, 'sounds');
    },

    // ---- Load a single SFX file ----
    async _loadOne(name) {
        const url = this.BASE_PATH + this.SOUNDS[name];
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const arrayBuf = await resp.arrayBuffer();
            const audioBuf = await this._ctx.decodeAudioData(arrayBuf);
            this._buffers[name] = audioBuf;
        } catch (e) {
            console.warn('[AudioManager] Failed to load "' + name + '" (' + url + '):', e);
        }
    },

    // ---- Play a SFX by logical name ----
    playSound(name) {
        // Guard: muted or no buffer
        if (this._muted) return;
        if (!this._buffers[name]) return;

        // Ensure AudioContext is running (resume after user gesture or ad unpause)
        if (this._ctx && this._ctx.state === 'suspended') {
            this._ctx.resume();
        }
        if (!this._ctx) return;

        try {
            const source = this._ctx.createBufferSource();
            source.buffer = this._buffers[name];
            source.connect(this._ctx.destination);
            source.start(0);
        } catch (e) {
            // Swallow play errors (e.g. if context is closed)
        }
    },

    // ============================================================
    // BGM Playback (HTMLAudioElement — supports loop & long audio)
    // ============================================================

    /**
     * Play a BGM track by logical name. Fades in over `fadeMs` ms.
     * If another BGM is playing, crossfades to the new one.
     * @param {string} name - Logical name from BGM registry
     * @param {number} fadeMs - Fade-in duration in ms (default 1000)
     */
    playBGM(name, fadeMs = 1000) {
        // If same BGM is already playing (and not paused), do nothing
        if (this._currentBGM === name && this._bgmEl && !this._bgmPaused) return;

        const filename = this.BGM[name];
        if (!filename) {
            console.warn('[AudioManager] Unknown BGM:', name);
            return;
        }

        // Stop current BGM (with short fade)
        if (this._bgmEl) {
            this._stopBGMEl(300); // quick fade out old
        }

        // Create new audio element
        const el = new Audio(this.BASE_PATH + filename);
        el.loop = true;
        el.volume = 0; // start silent for fade-in

        // IMPORTANT: Set _bgmEl and _currentBGM SYNCHRONOUSLY before play()
        // so that rapid subsequent calls to playBGM() can see and stop this element.
        // Previously these were set inside .then(), causing a race condition where
        // two BGM tracks could play simultaneously (only the last was tracked).
        this._bgmEl = el;
        this._currentBGM = name;
        this._bgmPaused = false;

        // If muted, don't play
        if (this._muted) {
            return;
        }

        // Try to play — may be blocked by browser autoplay policy
        try {
            el.play().then(() => {
                this._fadeIn(fadeMs);
            }).catch(e => {
                console.warn('[AudioManager] BGM play() rejected (autoplay blocked):', e);
                this._pendingBGM = name;
            });
        } catch (e) {
            console.warn('[AudioManager] BGM play error:', e);
            this._pendingBGM = name;
        }
    },

    /**
     * Try to resume a BGM that was blocked by autoplay policy.
     * Call this after a user gesture (click/touchstart) is detected.
     */
    tryResumeBGM() {
        if (this._pendingBGM) {
            const name = this._pendingBGM;
            this._pendingBGM = null;
            // Since playBGM() now sets _bgmEl/_currentBGM synchronously,
            // calling playBGM(name) would early-return. Instead, retry
            // play() on the existing element directly.
            if (this._bgmEl && this._currentBGM === name && !this._muted) {
                try {
                    this._bgmEl.play().then(() => {
                        this._fadeIn(1000);
                    }).catch(e => {
                        console.warn('[AudioManager] BGM play() rejected again:', e);
                    });
                } catch (e) {
                    console.warn('[AudioManager] BGM play error:', e);
                }
            } else {
                this.playBGM(name);
            }
        }
    },

    /**
     * Stop the current BGM with fade-out.
     * @param {number} fadeMs - Fade-out duration in ms (default 800)
     */
    stopBGM(fadeMs = 800) {
        if (!this._bgmEl) return;
        this._stopBGMEl(fadeMs);
        this._currentBGM = null;
        this._bgmPaused = false;
    },

    /**
     * Pause the current BGM (can be resumed with resumeBGM).
     * @param {number} fadeMs - Fade-out duration before pause (default 500)
     */
    pauseBGM(fadeMs = 500) {
        if (!this._bgmEl || this._bgmPaused) return;
        this._bgmPaused = true;
        const el = this._bgmEl;
        const startVol = el.volume;
        const steps = 20;
        const stepMs = fadeMs / steps;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            el.volume = Math.max(0, startVol * (1 - step / steps));
            if (step >= steps) {
                clearInterval(timer);
                el.pause();
                el.volume = startVol; // restore volume for resume
            }
        }, stepMs);
    },

    /**
     * Resume a paused BGM with fade-in.
     * @param {number} fadeMs - Fade-in duration in ms (default 800)
     */
    resumeBGM(fadeMs = 800) {
        if (!this._bgmEl || !this._bgmPaused) return;
        this._bgmPaused = false;
        if (this._muted) return;

        const el = this._bgmEl;
        const targetVol = this._bgmVolume;
        el.volume = 0;
        try {
            el.play().then(() => {
                this._fadeIn(fadeMs);
            }).catch(e => {
                console.warn('[AudioManager] BGM resume play() rejected:', e);
            });
        } catch (e) {
            console.warn('[AudioManager] BGM resume error:', e);
        }
    },

    /**
     * Get the name of the currently playing (or paused) BGM.
     */
    getCurrentBGM() {
        return this._currentBGM;
    },

    /**
     * Check if BGM is currently paused.
     */
    isBGMPaused() {
        return this._bgmPaused;
    },

    // ---- Internal: fade in BGM volume ----
    _fadeIn(fadeMs) {
        if (!this._bgmEl) return;
        const el = this._bgmEl;
        const targetVol = this._bgmVolume;
        const steps = 30;
        const stepMs = fadeMs / steps;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            el.volume = Math.min(targetVol, targetVol * (step / steps));
            if (step >= steps) {
                clearInterval(timer);
                el.volume = targetVol;
            }
        }, stepMs);
    },

    // ---- Internal: stop a BGM element with fade-out, then discard ----
    _stopBGMEl(fadeMs) {
        const el = this._bgmEl;
        if (!el) return;
        this._bgmEl = null; // detach immediately so new BGM can start

        const startVol = el.volume;
        if (startVol <= 0 || fadeMs <= 0) {
            el.pause();
            el.src = ''; // release resource
            return;
        }

        const steps = 20;
        const stepMs = fadeMs / steps;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            el.volume = Math.max(0, startVol * (1 - step / steps));
            if (step >= steps) {
                clearInterval(timer);
                el.pause();
                el.src = ''; // release resource
            }
        }, stepMs);
    },

    // ---- Mute / Unmute (called from Effects.muteAudio / unmuteAudio) ----
    mute() {
        this._muted = true;
        // Mute BGM
        if (this._bgmEl) {
            this._bgmSavedVolume = this._bgmEl.volume;
            this._bgmEl.volume = 0;
        }
    },

    unmute() {
        this._muted = false;
        // Restore BGM volume
        if (this._bgmEl && !this._bgmPaused) {
            this._bgmEl.volume = this._bgmSavedVolume || this._bgmVolume;
        }
    },

    isMuted() {
        return this._muted;
    },
};