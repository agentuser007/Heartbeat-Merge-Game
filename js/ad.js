// ============================================================
// ad.js — Ad Reward System (BASIC mode)
// ============================================================

const AD_CONFIG = {
    energy: { reward: 20, dailyLimit: Infinity, cooldownMs: 0, emoji: '⚡' },
    gold: { reward: 50, dailyLimit: 3, cooldownMs: 0, emoji: '💰' },
    diamonds: { reward: 50, dailyLimit: 3, cooldownMs: 0, emoji: '💎', betaBenefit: true },
    freePull: { dailyLimit: 1, cooldownMs: 0, maxRarity: 'SR', emoji: '🃏' }
};

class AdSystem {
    constructor(game) {
        this.game = game;
        this.mode = 'BASIC'; // Always BASIC — no external SDK; set to 'FULL' when a new ad provider is integrated
        this.dailyCounts = { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
        this.lastWatchTime = { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
        this._lastResetDate = this._todayStr();
        this._popupOpen = false;
        this._popupDebounceMs = 2000;
        this._lastPopupTime = { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
        this.energyAdBtn = document.getElementById('reward-energy-btn');
        this.diamondAdBtn = document.getElementById('reward-diamond-btn');
        this.freePullAdBtn = document.getElementById('reward-freepull-btn');
        this._createPopupDOM();
        this._bindUI();
        this.updateAllButtons();
    }

    _createPopupDOM() {
        var overlay = document.createElement('div');
        overlay.id = 'reward-modal-overlay';
        overlay.className = 'reward-modal-overlay';
        overlay.innerHTML =
            '<div class="reward-modal">' +
                '<div class="reward-modal-header">' +
                    '<span class="reward-modal-icon">🎬</span> ' +
                    '<span class="reward-modal-title" id="reward-modal-title"></span>' +
                '</div>' +
                '<div class="reward-modal-body">' +
                    '<div class="reward-modal-desc" id="reward-modal-desc"></div>' +
                    '<div class="reward-modal-beta" id="reward-modal-beta"></div>' +
                    '<div class="reward-modal-remaining" id="reward-modal-remaining"></div>' +
                '</div>' +
                '<div class="reward-modal-actions">' +
                    '<button class="reward-modal-watch-btn" id="reward-modal-watch-btn"></button>' +
                    '<button class="reward-modal-cancel-btn" id="reward-modal-cancel-btn"></button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        this._popupOverlay = overlay;
        this._popupTitle = document.getElementById('reward-modal-title');
        this._popupDesc = document.getElementById('reward-modal-desc');
        this._popupBeta = document.getElementById('reward-modal-beta');
        this._popupRemaining = document.getElementById('reward-modal-remaining');
        this._popupWatchBtn = document.getElementById('reward-modal-watch-btn');
        this._popupCancelBtn = document.getElementById('reward-modal-cancel-btn');
        this._currentPopupType = null;
        var self = this;
        this._popupCancelBtn.addEventListener('click', function() { self._closePopup(); });
        this._popupOverlay.addEventListener('click', function(e) {
            if (e.target === self._popupOverlay) self._closePopup();
        });
        this._popupWatchBtn.addEventListener('click', function() {
            if (self._currentPopupType) {
                var type = self._currentPopupType;
                self._closePopup();
                self.watchAd(type);
            }
        });
    }

    showAdPopup(adType) {
        if (!this.canWatch(adType)) return false;
        if (this._popupOpen) return false;
        var now = Date.now();
        if (now - this._lastPopupTime[adType] < this._popupDebounceMs) return false;
        this._lastPopupTime[adType] = now;
        var config = AD_CONFIG[adType];
        if (!config) return false;
        var remaining = this.getRemaining(adType);
        this._popupTitle.textContent = I18n.t('ad.popupTitle');
        this._popupDesc.textContent = I18n.t('ad.popupDesc.' + adType, { count: config.reward });
        if (config.betaBenefit) {
            this._popupBeta.textContent = I18n.t('ad.betaBenefit');
            this._popupBeta.style.display = 'block';
        } else {
            this._popupBeta.style.display = 'none';
        }
        this._popupRemaining.textContent = I18n.t('ad.popupRemaining', { remaining: remaining, limit: config.dailyLimit });
        this._popupWatchBtn.textContent = I18n.t('ad.watchBtn');
        this._popupCancelBtn.textContent = I18n.t('ad.cancelBtn');
        this._currentPopupType = adType;
        this._popupOpen = true;
        this._popupOverlay.classList.add('active');
        return true;
    }

    _closePopup() {
        this._popupOpen = false;
        this._currentPopupType = null;
        this._popupOverlay.classList.remove('active');
    }

    _todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    _checkDailyReset() {
        var today = this._todayStr();
        if (today !== this._lastResetDate) {
            this.dailyCounts = { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
            this._lastResetDate = today;
        }
    }

    canWatch(adType) {
        this._checkDailyReset();
        var config = AD_CONFIG[adType];
        if (!config) return false;
        if (this.dailyCounts[adType] >= config.dailyLimit) return false;
        if (config.cooldownMs > 0 && this.lastWatchTime[adType]) {
            if (Date.now() - this.lastWatchTime[adType] < config.cooldownMs) return false;
        }
        return true;
    }

    getRemaining(adType) {
        this._checkDailyReset();
        var config = AD_CONFIG[adType];
        if (!config) return 0;
        return config.dailyLimit - this.dailyCounts[adType];
    }

    watchAd(adType) {
        if (!this.canWatch(adType)) return false;
        // BASIC mode: grant reward directly (no real ad)
        // When a new ad provider is integrated, add real-ad logic here
        this._grantReward(adType);
        return true;
    }

    _grantReward(adType) {
        this.dailyCounts[adType]++;
        this.lastWatchTime[adType] = Date.now();
        AudioManager.playSound('reward');
        var config = AD_CONFIG[adType];
        switch (adType) {
            case 'energy':
                this.game.energy.recover(config.reward);
                Effects.showToast(I18n.t('ad.energyReward', { count: config.reward }), 'info');
                break;
            case 'gold':
                this.game.currency.addGold(config.reward);
                Effects.showToast(I18n.t('ad.goldReward', { count: config.reward }), 'info');
                break;
            case 'diamonds':
                this.game.currency.addDiamonds(config.reward);
                Effects.showToast(I18n.t('ad.diamondReward', { count: config.reward }), 'info');
                break;
            case 'freePull':
                this._doFreePull();
                break;
        }
        this.updateAllButtons();
        if (this.game.save) this.game.save.saveAll();
    }

    _doFreePull() {
        if (!this.game.gacha) return;
        var result = this.game.gacha.logic.pullSingle(AD_CONFIG.freePull.maxRarity || null);
        if (!result) return;
        this.game.gacha.showResults([result]);
        this.game.gacha.logic.acknowledge();
        Effects.showToast(I18n.t('ad.freePullReward'), 'info');
    }

    // Placeholder for real ad integration — implement when a new ad provider is available
    // _showRealAd(adType) { ... }

    showMidgameAd(callbacks) {
        // No real ad to show — just invoke the callback immediately
        callbacks = callbacks || {};
        if (callbacks.adFinished) callbacks.adFinished();
    }

    _bindUI() {
        var self = this;
        if (this.energyAdBtn) this.energyAdBtn.addEventListener('click', function(e) { e.stopPropagation(); self.showAdPopup('energy'); });
        if (this.diamondAdBtn) this.diamondAdBtn.addEventListener('click', function(e) { e.stopPropagation(); self.showAdPopup('diamonds'); });
        if (this.freePullAdBtn) this.freePullAdBtn.addEventListener('click', function(e) { e.stopPropagation(); self.showAdPopup('freePull'); });

        var energyBar = document.getElementById('energy-bar');
        if (energyBar) energyBar.addEventListener('click', function() { self.showAdPopup('energy'); });

        var goldText = document.getElementById('gold-text');
        if (goldText) { goldText.style.cursor = 'pointer'; goldText.addEventListener('click', function() { self.showAdPopup('gold'); }); }

        var diamondText = document.getElementById('diamond-text');
        if (diamondText) { diamondText.style.cursor = 'pointer'; diamondText.addEventListener('click', function() { self.showAdPopup('diamonds'); }); }

        globalBus.on('currency:insufficient', function(data) {
            self.showAdPopup(data.type === 'gold' ? 'gold' : 'diamonds');
        });
        globalBus.on('energy:insufficient', function() { self.showAdPopup('energy'); });
    }

    updateAllButtons() {
        this._updateEnergyButton();
        this._updateDiamondButton();
        this._updateFreePullButton();
    }

    _updateEnergyButton() {
        var btn = this.energyAdBtn;
        if (!btn) return;
        var rem = this.getRemaining('energy');
        if (rem <= 0) {
            btn.disabled = true; btn.classList.add('reward-btn-disabled');
            btn.innerHTML = '<span class="reward-btn-text">' + I18n.t('ad.limitReached') + '</span>';
        } else {
            btn.disabled = false; btn.classList.remove('reward-btn-disabled');
            btn.innerHTML = '<span class="reward-btn-text">' + I18n.t('ad.energyBtn', { count: AD_CONFIG.energy.reward, remaining: rem }) + '</span>';
        }
    }

    _updateDiamondButton() {
        var btn = this.diamondAdBtn;
        if (!btn) return;
        var rem = this.getRemaining('diamonds');
        if (rem <= 0) {
            btn.disabled = true; btn.classList.add('reward-btn-disabled');
            btn.innerHTML = '<span class="reward-btn-text">' + I18n.t('ad.limitReached') + '</span>';
        } else {
            btn.disabled = false; btn.classList.remove('reward-btn-disabled');
            btn.innerHTML = '<span class="reward-btn-text">' + I18n.t('ad.diamondBtn', { count: AD_CONFIG.diamonds.reward, remaining: rem }) + '</span>';
        }
    }

    _updateFreePullButton() {
        var btn = this.freePullAdBtn;
        if (!btn) return;
        var rem = this.getRemaining('freePull');
        if (rem <= 0) {
            btn.disabled = true; btn.classList.add('reward-btn-disabled');
            btn.innerHTML = '<i data-lucide="video" class="free-pull-cam-icon"></i> <span>免费0/1</span>';
        } else {
            btn.disabled = false; btn.classList.remove('reward-btn-disabled');
            btn.innerHTML = '<i data-lucide="video" class="free-pull-cam-icon"></i> <span>免费1/1</span>';
        }
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({
                attrs: {
                    class: 'lucide'
                },
                nameAttr: 'data-lucide'
            });
        }
    }

    serialize() {
        return {
            dailyCounts: { ...this.dailyCounts },
            lastWatchTime: { ...this.lastWatchTime },
            lastResetDate: this._lastResetDate
        };
    }

    deserialize(data) {
        if (!data) return;
        this.dailyCounts = data.dailyCounts || { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
        this.lastWatchTime = data.lastWatchTime || { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
        this._lastResetDate = data.lastResetDate || this._todayStr();
        this._checkDailyReset();
        this.updateAllButtons();
    }
}