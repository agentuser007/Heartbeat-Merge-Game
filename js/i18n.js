// ============================================================
// i18n.js — Internationalization & Static Resource Loader
// ============================================================
// Usage:
//   I18n.t('achievement.unlocked')        → "🏆 成就解锁！"
//   I18n.emoji('coin')                     → "🪙"
//   I18n.config('timers.achievementToast') → 3500
//   I18n.setLocale('en')                   → Switch to English

const I18n = {
    _locale: 'zh-CN',
    _texts: {},
    _emojis: {},
    _config: {},
    _loaded: false,
    _supportedLocales: ['zh-CN', 'en'],

    async init(locale) {
        // Determine locale: parameter > localStorage > browser language > default
        if (!locale) {
            locale = localStorage.getItem('i18n_locale') || this._detectBrowserLocale() || 'zh-CN';
        }
        this._locale = this._supportedLocales.includes(locale) ? locale : 'zh-CN';
        localStorage.setItem('i18n_locale', this._locale);

        const basePath = 'assets';
        const cacheBust = '?v=' + Date.now();
        const [texts, emojis, config] = await Promise.all([
            fetch(basePath + '/i18n/' + this._locale + '.json' + cacheBust).then(function(r) { return r.json(); }),
            fetch(basePath + '/constants/emojis.json' + cacheBust).then(function(r) { return r.json(); }),
            fetch(basePath + '/constants/ui-config.json' + cacheBust).then(function(r) { return r.json(); }),
        ]);
        this._texts = texts;
        this._emojis = emojis;
        this._config = config;
        this._loaded = true;
    },

    t: function(key, params) {
        var value = this._getNestedValue(this._texts, key);
        if (value === undefined) {
            console.warn('[I18n] Missing text key: ' + key);
            return key;
        }
        if (params) {
            return value.replace(/\{(\w+)\}/g, function(_, k) {
                return params[k] !== undefined ? params[k] : '{' + k + '}';
            });
        }
        return value;
    },

    emoji: function(key) {
        var value = this._emojis[key];
        if (value === undefined) {
            console.warn('[I18n] Missing emoji key: ' + key);
            return key;
        }
        return value;
    },

    config: function(key) {
        var value = this._getNestedValue(this._config, key);
        if (value === undefined) {
            console.warn('[I18n] Missing config key: ' + key);
            return 0;
        }
        return value;
    },

    setLocale: function(locale) {
        if (!this._supportedLocales.includes(locale)) return Promise.reject('Unsupported locale');
        this._locale = locale;
        localStorage.setItem('i18n_locale', locale);
        var self = this;
        return fetch('assets/i18n/' + locale + '.json?v=' + Date.now())
            .then(function(r) { return r.json(); })
            .then(function(data) {
                self._texts = data;
                self.applyToDOM();
                // Dispatch custom event so other modules can refresh
                window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale: locale } }));
            });
    },

    toggleLocale: function() {
        // Language switching disabled after initial selection
        console.warn('[I18n] Language switching is disabled after initial selection.');
    },

    // Alias for HTML onclick — now disabled
    toggleLanguage: function() {
        console.warn('[I18n] Language switching is disabled after initial selection.');
    },

    /**
     * Show the language selection overlay if no locale has been chosen yet.
     * Returns a Promise that resolves when the user has selected a language
     * (or immediately if already chosen).
     */
    showLangSelectIfNeeded: function() {
        return new Promise(function(resolve) {
            var savedLocale = localStorage.getItem('i18n_locale');
            if (savedLocale) {
                // Already chosen — hide overlay and resolve
                var overlay = document.getElementById('lang-select-overlay');
                if (overlay) overlay.style.display = 'none';
                resolve();
                return;
            }
            // Show the language selection overlay
            var overlay = document.getElementById('lang-select-overlay');
            if (!overlay) { resolve(); return; }
            overlay.style.display = 'flex';

            var btns = overlay.querySelectorAll('.lang-select-btn');
            btns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var locale = btn.getAttribute('data-locale');
                    localStorage.setItem('i18n_locale', locale);
                    overlay.style.display = 'none';
                    resolve(locale);
                });
            });
        });
    },

    getLocale: function() {
        return this._locale;
    },

    _detectBrowserLocale: function() {
        try {
            var lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
            if (lang.startsWith('zh')) return 'zh-CN';
            if (lang.startsWith('en')) return 'en';
        } catch(e) {}
        return null;
    },

    _getNestedValue: function(obj, key) {
        if (!obj) return undefined;
        var parts = key.split('.');
        var current = obj;
        for (var i = 0; i < parts.length; i++) {
            if (current[parts[i]] === undefined) return undefined;
            current = current[parts[i]];
        }
        return current;
    },

    // Apply i18n to all DOM elements with data-i18n, data-i18n-attr, data-emoji
    applyToDOM: function() {
        // Apply data-i18n to text content
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            el.textContent = I18n.t(key);
        });
        // Apply data-i18n-attr (format: "attrName:i18n.key")
        document.querySelectorAll('[data-i18n-attr]').forEach(function(el) {
            var val = el.getAttribute('data-i18n-attr');
            var parts = val.split(':');
            if (parts.length === 2) {
                el.setAttribute(parts[0], I18n.t(parts[1]));
            }
        });
        // Apply data-emoji: set emoji text (for icon-only buttons)
        document.querySelectorAll('[data-emoji]').forEach(function(el) {
            var key = el.getAttribute('data-emoji');
            var emoji = I18n.emoji(key);
            if (emoji && emoji !== key) {
                // Only set textContent if no child elements (preserve badges etc.)
                if (el.children.length === 0) {
                    el.textContent = emoji;
                } else {
                    // Prepend emoji as first text node
                    if (el.firstChild && el.firstChild.nodeType === 3) {
                        el.firstChild.textContent = emoji;
                    } else {
                        el.insertBefore(document.createTextNode(emoji), el.firstChild);
                    }
                }
            }
        });
        // Update page title
        var titleText = I18n.t('gameTitle');
        if (titleText && titleText !== 'gameTitle') {
            document.title = titleText;
        }
    }
};