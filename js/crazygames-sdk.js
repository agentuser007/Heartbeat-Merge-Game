// ============================================================
// crazygames-sdk.js — SDK Adapter Stub (No-op)
// ============================================================
// All CrazyGames SDK functionality has been removed.
// This stub preserves the API surface so that existing callers
// continue to work without any logic errors.
// All methods are no-op; isAvailable is always false.
// ============================================================

const CrazyGamesSDK = {
    // ---- State ----
    ready: false,
    isAvailable: false,
    isAdPlaying: false,

    // ---- Initialization ----
    async init() {
        // No external SDK to initialize
    },

    // ---- Game Module ----
    gameplayStart() {},
    gameplayStop() {},
    loadingStart() {},
    loadingStop() {},
    happytime() {},
    setGameContext(/* context */) {},
    clearGameContext() {},

    // ---- Ad Module ----
    async showRewardedAd(callbacks = {}) {
        // Not available — notify error callback
        if (callbacks.adError) callbacks.adError({ code: 'notAvailable', message: 'SDK not available' });
    },

    async showMidgameAd(callbacks = {}) {
        // Not available — notify error callback
        if (callbacks.adError) callbacks.adError({ code: 'notAvailable', message: 'SDK not available' });
    },

    async hasAdblock() {
        return false;
    },

    // ---- Banner Module ----
    requestBanner(/* container */) {},
    clearBanner() {},

    // ---- User Module ----
    isUserAccountAvailable() {
        return false;
    },

    async getUser() {
        return null;
    },

    async getUserToken() {
        return null;
    },

    async showAuthPrompt() {
        return null;
    },

    addAuthListener(/* listener */) {},
    removeAuthListener(/* listener */) {},

    getSystemInfo() {
        return null;
    },

    // ---- Data Module ----
    dataSetItem(/* key, value */) {},
    dataGetItem(/* key */) {
        return null;
    },
    dataRemoveItem(/* key */) {},
    dataClear() {}
};