// ============================================================
// i18nStore.ts — Internationalization & Static Resource Loader
// ============================================================
// Usage:
//   const i18nStore = useI18nStore()
//   i18nStore.t('achievement.unlocked')        → "🏆 成就解锁！"
//   i18nStore.emoji('coin')                     → "🪙"
//   i18nStore.setLocale('en')                   → Switch to English
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';

export const useI18nStore = defineStore('i18n', () => {
    const locale = ref('zh-CN');
    const texts = ref<Record<string, any>>({});
    const emojis = ref<Record<string, string>>({});
    const loaded = ref(false);
    const supportedLocales = ['zh-CN', 'en'];

    async function init(userLocale?: string) {
        let determinedLocale = userLocale || localStorage.getItem('i18n_locale') || _detectBrowserLocale() || 'zh-CN';
        determinedLocale = supportedLocales.includes(determinedLocale) ? determinedLocale : 'zh-CN';
        locale.value = determinedLocale;
        localStorage.setItem('i18n_locale', determinedLocale);
        if (typeof document !== 'undefined') document.documentElement.lang = determinedLocale;

        const basePath = '/assets';
        const cacheBust = '?v=' + Date.now();
        
        try {
            const [textsData, emojisData] = await Promise.all([
                fetch(`${basePath}/i18n/${determinedLocale}.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/constants/emojis.json${cacheBust}`).then(r => r.json()),
            ]);
            
            texts.value = textsData;
            emojis.value = emojisData;
            loaded.value = true;
        } catch (error) {
            console.error('[I18nStore] Failed to load i18n resources:', error);
        }
    }

    function _detectBrowserLocale(): string | null {
        if (typeof navigator !== 'undefined') {
            const browserLocale = navigator.language || (navigator as { userLanguage?: string }).userLanguage;
            if (browserLocale) {
                if (browserLocale.startsWith('zh')) return 'zh-CN';
                if (browserLocale.startsWith('en')) return 'en';
            }
        }
        return null;
    }

    const FALLBACK_TEXTS: Record<string, string> = {
        'vn_reader.end': '—— 完 ——',
        'vn_reader.chapterEnded': '章节已结束，点击任意处返回',
        'vn_reader.narrator': '旁白',
        'vn_reader.review': '📋 回顾',
        'vn_reader.skip': '⏩ 跳过',
        'vn_reader.auto': '▶ 自动',
        'vn_reader.dialogueReview': '📋 对话回顾',
        'vn_reader.autoActive': '⏸ 自动中',
        'vn_reader.skipActive': '⏹ 跳过中',
    };

    function t(key: string, params?: Record<string, unknown>): string {
        let value = _getNestedValue(texts.value, key);
        if (value === undefined) {
            value = FALLBACK_TEXTS[key];
        }
        if (value === undefined) {
            console.warn('[I18nStore] Missing text key:', key);
            return key;
        }
        if (typeof value !== 'string') return key;
        if (params) {
            return value.replace(/\{(\w+)\}/g, (_: string, k: string) => {
                return params[k] !== undefined ? String(params[k]) : `{${k}}`;
            });
        }
        return value;
    }

    function emoji(key: string): string {
        const value = emojis.value[key];
        if (value === undefined) {
            console.warn('[I18nStore] Missing emoji key:', key);
            return key;
        }
        return value;
    }

    async function setLocale(newLocale: string): Promise<void> {
        if (!supportedLocales.includes(newLocale)) {
            console.warn('[I18nStore] Unsupported locale:', newLocale);
            return;
        }
        
        locale.value = newLocale;
        localStorage.setItem('i18n_locale', newLocale);
        if (typeof document !== 'undefined') document.documentElement.lang = newLocale;
        
        try {
            const data = await fetch(`${import.meta.env.BASE_URL}assets/i18n/${newLocale}.json?v=${Date.now()}`).then(r => r.json());
            texts.value = data;
            
            globalBus.emit('locale:changed', { locale: newLocale });
        } catch (error) {
            console.error('[I18nStore] Failed to load locale:', newLocale, error);
        }
    }

    function _getNestedValue(obj: Record<string, unknown>, key: string): unknown {
        return key.split('.').reduce<unknown>((o, k) => {
            if (o && typeof o === 'object') return (o as Record<string, unknown>)[k];
            return undefined;
        }, obj);
    }

    const currentLocale = computed(() => locale.value);

    return {
        locale: currentLocale,
        texts,
        emojis,
        loaded,
        supportedLocales,
        init,
        t,
        emoji,
        setLocale
    };
});
