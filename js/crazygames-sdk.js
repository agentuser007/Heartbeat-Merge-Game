// ============================================================
// crazygames-sdk.js — CrazyGames SDK Adapter (Singleton)
// ============================================================
// Decouples the game from CrazyGames SDK internals.
// All SDK calls go through this module.
// In non-CrazyGames environments, all methods are no-op.
// ============================================================

const CrazyGamesSDK = {
    // ---- State ----
    ready: false,           // SDK initialized successfully
    isAvailable: false,     // Running on CrazyGames platform
    isAdPlaying: false,     // An ad is currently showing
    _audioMuted: false,     // Game audio was muted by ad
    _settingsListener: null,
    _authListener: null,

    // ---- Initialization ----

    async init() {
        // Check if the CrazyGames SDK script is loaded
        if (typeof window.CrazyGames === 'undefined' || !window.CrazyGames.SDK) {
            console.log('[CG SDK] Not running on CrazyGames platform, SDK adapter is no-op.');
            return;
        }

        try {
            // Add a timeout to prevent hanging forever
            await Promise.race([
                window.CrazyGames.SDK.init(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('SDK init timeout')), 2000))
            ]);
            this.ready = true;

            // Determine environment: 'local' | 'crazygames' | 'disabled'
            const env = window.CrazyGames.SDK.environment;
            this.isAvailable = (env === 'local' || env === 'crazygames');

            if (this.isAvailable) {
                console.log('[CG SDK] Initialized. Environment:', env);

                // Apply initial platform settings
                this._applySettings(window.CrazyGames.SDK.game.settings);

                // Listen for settings changes (mute audio, disable chat, etc.)
                this._settingsListener = (newSettings) => {
                    this._applySettings(newSettings);
                };
                window.CrazyGames.SDK.game.addSettingsChangeListener(this._settingsListener);

                // iOS audio resume handler
                this._setupIOSAudioResume();
            } else {
                console.log('[CG SDK] Environment is "disabled", SDK adapter is no-op.');
            }
        } catch (e) {
            console.warn('[CG SDK] Initialization failed:', e);
        }
    },

    // ============================================================
    // GAME MODULE
    // ============================================================

    gameplayStart() {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.game.gameplayStart();
        } catch (e) {
            console.warn('[CG SDK] gameplayStart error:', e);
        }
    },

    gameplayStop() {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.game.gameplayStop();
        } catch (e) {
            console.warn('[CG SDK] gameplayStop error:', e);
        }
    },

    loadingStart() {
        // Can be called before init() — SDK script is in <head>
        if (typeof window.CrazyGames === 'undefined' || !window.CrazyGames.SDK) return;
        try {
            window.CrazyGames.SDK.game.loadingStart();
        } catch (e) {
            console.warn('[CG SDK] loadingStart error:', e);
        }
    },

    loadingStop() {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.game.loadingStop();
        } catch (e) {
            console.warn('[CG SDK] loadingStop error:', e);
        }
    },

    happytime() {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.game.happytime();
        } catch (e) {
            console.warn('[CG SDK] happytime error:', e);
        }
    },

    setGameContext(context) {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.game.setGameContext(context);
        } catch (e) {
            console.warn('[CG SDK] setGameContext error:', e);
        }
    },

    clearGameContext() {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.game.clearGameContext();
        } catch (e) {
            console.warn('[CG SDK] clearGameContext error:', e);
        }
    },

    // ============================================================
    // AD MODULE
    // ============================================================

    /**
     * Show a rewarded video ad.
     * @param {Object} callbacks - { adStarted, adFinished, adError }
     */
    async showRewardedAd(callbacks = {}) {
        if (!this.isAvailable) {
            if (callbacks.adError) callbacks.adError({ code: 'notAvailable', message: 'Not on CrazyGames platform' });
            return;
        }

        try {
            this.isAdPlaying = true;
            const self = this;

            const sdkCallbacks = {
                adStarted: () => {
                    console.log('[CG SDK] Rewarded ad started');
                    self._muteGameAudio();
                    if (callbacks.adStarted) callbacks.adStarted();
                },
                adFinished: () => {
                    console.log('[CG SDK] Rewarded ad finished');
                    self._unmuteGameAudio();
                    self.isAdPlaying = false;
                    if (callbacks.adFinished) callbacks.adFinished();
                },
                adError: (errorData) => {
                    console.warn('[CG SDK] Rewarded ad error:', errorData);
                    self._unmuteGameAudio();
                    self.isAdPlaying = false;
                    if (callbacks.adError) callbacks.adError(errorData);
                }
            };

            window.CrazyGames.SDK.ad.requestAd('rewarded', sdkCallbacks);
        } catch (e) {
            console.warn('[CG SDK] showRewardedAd error:', e);
            this.isAdPlaying = false;
            this._unmuteGameAudio();
            if (callbacks.adError) callbacks.adError({ code: 'other', message: String(e) });
        }
    },

    /**
     * Show a midgame video ad.
     * @param {Object} callbacks - { adStarted, adFinished, adError }
     */
    async showMidgameAd(callbacks = {}) {
        if (!this.isAvailable) {
            if (callbacks.adError) callbacks.adError({ code: 'notAvailable', message: 'Not on CrazyGames platform' });
            return;
        }

        try {
            this.isAdPlaying = true;
            const self = this;

            const sdkCallbacks = {
                adStarted: () => {
                    console.log('[CG SDK] Midgame ad started');
                    self._muteGameAudio();
                    if (callbacks.adStarted) callbacks.adStarted();
                },
                adFinished: () => {
                    console.log('[CG SDK] Midgame ad finished');
                    self._unmuteGameAudio();
                    self.isAdPlaying = false;
                    if (callbacks.adFinished) callbacks.adFinished();
                },
                adError: (errorData) => {
                    console.warn('[CG SDK] Midgame ad error:', errorData);
                    self._unmuteGameAudio();
                    self.isAdPlaying = false;
                    if (callbacks.adError) callbacks.adError(errorData);
                }
            };

            window.CrazyGames.SDK.ad.requestAd('midgame', sdkCallbacks);
        } catch (e) {
            console.warn('[CG SDK] showMidgameAd error:', e);
            this.isAdPlaying = false;
            this._unmuteGameAudio();
            if (callbacks.adError) callbacks.adError({ code: 'other', message: String(e) });
        }
    },

    /**
     * Check if user has an adblocker.
     * @returns {Promise<boolean>}
     */
    async hasAdblock() {
        if (!this.isAvailable) return false;
        try {
            return await window.CrazyGames.SDK.ad.hasAdblock();
        } catch (e) {
            console.warn('[CG SDK] hasAdblock error:', e);
            return false;
        }
    },

    // ============================================================
    // BANNER MODULE
    // ============================================================

    requestBanner(container) {
        if (!this.isAvailable || !container) return;
        try {
            window.CrazyGames.SDK.banner.requestBanner(container);
        } catch (e) {
            console.warn('[CG SDK] requestBanner error:', e);
        }
    },

    clearBanner() {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.banner.clearBanner();
        } catch (e) {
            console.warn('[CG SDK] clearBanner error:', e);
        }
    },

    // ============================================================
    // USER MODULE
    // ============================================================

    isUserAccountAvailable() {
        if (!this.isAvailable) return false;
        try {
            return window.CrazyGames.SDK.user.isUserAccountAvailable;
        } catch (e) {
            return false;
        }
    },

    async getUser() {
        if (!this.isAvailable) return null;
        try {
            return await window.CrazyGames.SDK.user.getUser();
        } catch (e) {
            console.warn('[CG SDK] getUser error:', e);
            return null;
        }
    },

    async getUserToken() {
        if (!this.isAvailable) return null;
        try {
            return await window.CrazyGames.SDK.user.getUserToken();
        } catch (e) {
            console.warn('[CG SDK] getUserToken error:', e);
            return null;
        }
    },

    async showAuthPrompt() {
        if (!this.isAvailable) return null;
        try {
            return await window.CrazyGames.SDK.user.showAuthPrompt();
        } catch (e) {
            console.warn('[CG SDK] showAuthPrompt error:', e);
            return null;
        }
    },

    addAuthListener(listener) {
        if (!this.isAvailable || !listener) return;
        try {
            this._authListener = listener;
            window.CrazyGames.SDK.user.addAuthListener(listener);
        } catch (e) {
            console.warn('[CG SDK] addAuthListener error:', e);
        }
    },

    removeAuthListener(listener) {
        if (!this.isAvailable || !listener) return;
        try {
            window.CrazyGames.SDK.user.removeAuthListener(listener);
        } catch (e) {
            console.warn('[CG SDK] removeAuthListener error:', e);
        }
    },

    getSystemInfo() {
        if (!this.isAvailable) return null;
        try {
            return window.CrazyGames.SDK.user.systemInfo;
        } catch (e) {
            return null;
        }
    },

    // ============================================================
    // DATA MODULE (Cloud Save)
    // ============================================================

    dataSetItem(key, value) {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.data.setItem(key, value);
        } catch (e) {
            console.warn('[CG SDK] data.setItem error:', e);
        }
    },

    dataGetItem(key) {
        if (!this.isAvailable) return null;
        try {
            return window.CrazyGames.SDK.data.getItem(key);
        } catch (e) {
            console.warn('[CG SDK] data.getItem error:', e);
            return null;
        }
    },

    dataRemoveItem(key) {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.data.removeItem(key);
        } catch (e) {
            console.warn('[CG SDK] data.removeItem error:', e);
        }
    },

    dataClear() {
        if (!this.isAvailable) return;
        try {
            window.CrazyGames.SDK.data.clear();
        } catch (e) {
            console.warn('[CG SDK] data.clear error:', e);
        }
    },

    // ============================================================
    // INTERNAL HELPERS
    // ============================================================

    _muteGameAudio() {
        if (this._audioMuted) return;
        this._audioMuted = true;
        if (typeof Effects !== 'undefined' && Effects.muteAudio) {
            Effects.muteAudio();
        }
    },

    _unmuteGameAudio() {
        if (!this._audioMuted) return;
        this._audioMuted = false;
        // Only unmute if platform settings don't require audio to stay muted
        const settings = this._getPlatformSettings();
        if (settings && settings.muteAudio) return; // Platform wants audio muted
        if (typeof Effects !== 'undefined' && Effects.unmuteAudio) {
            Effects.unmuteAudio();
        }
    },

    _getPlatformSettings() {
        if (!this.isAvailable) return null;
        try {
            return window.CrazyGames.SDK.game.settings;
        } catch (e) {
            return null;
        }
    },

    _applySettings(settings) {
        if (!settings) return;
        // Handle muteAudio from platform settings
        if (settings.muteAudio) {
            this._audioMuted = true;
            if (typeof Effects !== 'undefined' && Effects.muteAudio) {
                Effects.muteAudio();
            }
        } else {
            // Only unmute if we muted it (not if user muted manually)
            if (this._audioMuted) {
                this._audioMuted = false;
                if (typeof Effects !== 'undefined' && Effects.unmuteAudio) {
                    Effects.unmuteAudio();
                }
            }
        }
        // Note: disableChat can be checked via CrazyGamesSDK.getSettings().disableChat
        // if chat functionality is added in the future
    },

    /**
     * iOS AudioContext resume: when iOS interrupts audio and the user
     * returns, we need to resume the AudioContext on a user gesture.
     */
    _setupIOSAudioResume() {
        document.addEventListener('touchend', () => {
            try {
                // Resume any suspended AudioContext
                if (window.AudioContext) {
                    const ctx = window._gameAudioContext;
                    if (ctx && ctx.state === 'suspended') {
                        ctx.resume();
                    }
                }
            } catch (e) {
                // Silently ignore
            }
        }, { passive: true });
    }
};