// ============================================================
// configStore.ts — Game Configuration Data Store
// ============================================================
// Replaces global config variables from config.js
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
    GameSettingsConfig,
    GameItem,
    GeneratorConfig,
    LevelData,
    GachaRarityConfig,
    GachaCostConfig,
    GachaSubWeights,
    GachaPoolItem,
    CGStory,
    LoopRule,
    LoopNarrative,
    LoopEvent,
    ChainId,
    HeroineUpgrade,
    UIAnimationConfig,
    UIColorsConfig,
    DialogueConfig,
    UITextConfig,
    Achievement,
    DailyOrder,
    ShopItem,
    ItemEffectsConfig,
    BoardEconomyConfig,
    BossProgressionConfig,
    GachaSimpleConfig,
    AffectionConfig,
    TouchInteractionsConfig,
    CharacterProfile,
    AffectionShopConfig,
    DailyOrderConfig,
    SettingsData,
    UITimerConfig,
    UIColorThemeConfig,
    UILayoutConfig,
    LoopMultipliersConfig,
    AdConfig,
    DailyBuffConfig,
    AudioConfig,
    VNRoute,
    NarrativeConfig,
} from '@/types/game';
import { validateConfig, type ConfigKey } from '@/schemas';
import { deepMerge } from '@/core/deepMerge';

const BASE_FILENAMES = [
    'settings', 'items', 'generators', 'levels', 'daily_orders',
    'gacha_pool', 'achievements', 'loop_rules', 'loop_narratives',
    'loop_events', 'cg_stories', 'affection_config', 'touch_interactions',
    'character_profiles', 'affection_shop',
] as const;

const PLUGGABLE_FILENAMES = [
    'item_effects', 'board_economy', 'boss_progression', 'gacha_config',
    'shop_items', 'loop_multipliers', 'ad_config', 'daily_buff_config', 'audio_config',
] as const;

interface ValidationResult<T> {
    result: T;
    usedFallback: boolean;
    error?: string;
}

export const useConfigStore = defineStore('config', () => {
    // Reactive state
    const gameConfig = ref<GameSettingsConfig>({} as GameSettingsConfig);
    const items = ref<Record<string, GameItem>>({});
    const generators = ref<Record<string, GeneratorConfig>>({});
    const lockedCellsInitial = ref<number[]>([]);
    const unlockPerBoss = ref<number[][]>([]);
    const levels = ref<LevelData[]>([]);
    const uiText = ref<UITextConfig>({} as UITextConfig);
    const recycleEnergyTable = ref<Record<string, number>>({});
    const dailyOrderConfig = ref<DailyOrderConfig>({} as DailyOrderConfig);
    const dailyOrderPool = ref<DailyOrder[]>([]);
    const cellUnlockCosts = ref<number[]>([]);
    const heroineUpgrades = ref<HeroineUpgrade[]>([]);
    const gachaPool = ref<GachaPoolItem[]>([]);
    const achievementData = ref<Achievement[]>([]);
    const uiAnimation = ref<UIAnimationConfig>({} as UIAnimationConfig);
    const uiColors = ref<UIColorsConfig>({} as UIColorsConfig);
    const dialogueConfig = ref<DialogueConfig>({} as DialogueConfig);
    const uiTimers = ref<UITimerConfig>({} as UITimerConfig);
    const uiColorTheme = ref<UIColorThemeConfig>({} as UIColorThemeConfig);
    const uiLayout = ref<UILayoutConfig>({} as UILayoutConfig);
    
    // Gacha pool data
    const gachaRarityConfig = ref<Record<string, GachaRarityConfig>>({});
    const gachaCost = ref<GachaCostConfig>({} as GachaCostConfig);
    const gachaSubWeights = ref<GachaSubWeights>({});
    const cgStories = ref<Record<string, CGStory>>({});
    const loopRules = ref<Record<string, LoopRule>>({});
    const loopNarratives = ref<Record<string, LoopNarrative>>({});
    const loopEvents = ref<Record<string, LoopEvent>>({});
    const chains = ref<ChainId[]>([]);
    const chainNames = ref<Record<string, string>>({});
    const chainIcons = ref<Record<string, string>>({});
    const chainToGen = ref<Record<string, string>>({});
    const chainItemPrefix = ref<Record<string, string>>({});
    const fragmentToGenerator = ref<number>(60);
    const fragmentToStory = ref<number>(60);
    
    const affectionConfig = ref<AffectionConfig>({} as AffectionConfig);
    const touchInteractions = ref<TouchInteractionsConfig>({} as TouchInteractionsConfig);
    const characterProfiles = ref<Record<string, CharacterProfile>>({});
    const affectionShop = ref<AffectionShopConfig>({} as AffectionShopConfig);
    const loopMultipliers = ref<LoopMultipliersConfig>({} as LoopMultipliersConfig);
    const adConfig = ref<AdConfig>({} as AdConfig);
    const dailyBuffConfig = ref<DailyBuffConfig>({} as DailyBuffConfig);

    // Pluggable config: item effects, board economy, boss progression, gacha
    const itemEffects = ref<ItemEffectsConfig>({} as ItemEffectsConfig);
    const boardEconomy = ref<BoardEconomyConfig>({} as BoardEconomyConfig);
    const bossProgression = ref<BossProgressionConfig>({} as BossProgressionConfig);
    const gachaConfig = ref<GachaSimpleConfig>({} as GachaSimpleConfig);
    const audioConfig = ref<AudioConfig>({} as AudioConfig);
    
    // Shop items
    const shopItems = ref<ShopItem[]>([]);

    // VN scene routes + narrative config
    const vnScenes = ref<Record<string, VNRoute>>({});
    const narrativeConfig = ref<NarrativeConfig | null>(null);

    // Loading state
    const isLoading = ref(false);
    const loadError = ref<string | null>(null);
    const isDataReady = computed(() => !isLoading.value && loadError.value === null && Object.keys(gameConfig.value).length > 0);

    const _overrideKeys = ref<string[]>([]);
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('config_override:')) {
            _overrideKeys.value.push(key.replace('config_override:', ''));
        }
    }
    const hasOverrides = computed(() => _overrideKeys.value.length > 0);

    function checkOverride(filename: string, data: unknown): unknown {
        try {
            const raw = localStorage.getItem(`config_override:${filename}`);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (!_overrideKeys.value.includes(filename)) {
                    _overrideKeys.value.push(filename);
                }
                return parsed;
            }
        } catch (e) {
            console.warn(`[ConfigStore] Invalid override for ${filename}, using fetched data`, e);
        }
        const idx = _overrideKeys.value.indexOf(filename);
        if (idx !== -1) _overrideKeys.value.splice(idx, 1);
        return data;
    }

    function clearOverrides() {
        const keysToRemove = _overrideKeys.value.slice();
        for (const key of keysToRemove) {
            localStorage.removeItem(`config_override:${key}`);
        }
        _overrideKeys.value = [];
    }


    /**
     * Load all game data from JSON files
     */
    async function loadGameData(locale?: string): Promise<void> {
        const currentLocale = locale || localStorage.getItem('i18n_locale') || 'zh-CN';
        const isEnglish = currentLocale === 'en';
        const basePath = import.meta.env.BASE_URL + 'assets';
        const cacheBust = '?v=' + Date.now();
        const _fallbackWarnings: Array<{ filename: string; error?: string }> = [];

        function handleFallback(filename: string, vr: ValidationResult<unknown>) {
            if (!vr.usedFallback) return;
            localStorage.removeItem(`config_override:${filename}`);
            const idx = _overrideKeys.value.indexOf(filename);
            if (idx !== -1) _overrideKeys.value.splice(idx, 1);
            _fallbackWarnings.push({ filename, error: vr.error });
        }

        isLoading.value = true;
        loadError.value = null;

        try {
            // Load base data
            const baseData = await Promise.all([
                fetch(`${basePath}/data/settings.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/items.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/generators.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/levels.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/daily_orders.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/gacha_pool.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/achievements.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/loop_rules.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/loop_narratives.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/loop_events.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/cg_stories.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/affection_config.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/touch_interactions.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/character_profiles.json${cacheBust}`).then(r => r.json()),
                fetch(`${basePath}/data/affection_shop.json${cacheBust}`).then(r => r.json()),
            ]);

            // Load English data (for merging)
            const enData = await Promise.all([
                fetch(`${basePath}/data/en/settings.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/items.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/generators.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/levels.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/daily_orders.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/gacha_pool.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/achievements.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/loop_rules.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/loop_narratives.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/loop_events.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/cg_stories.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/affection_config.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/touch_interactions.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/character_profiles.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/en/affection_shop.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
            ]);

            // Merge data: apply English overlay when locale is English, then apply editor overrides
            const mergedData = (isEnglish
                ? baseData.map((base, index) => deepMerge(base, enData[index]))
                : baseData
            ).map((data, index) => checkOverride(BASE_FILENAMES[index], data));

            // Validate merged data — if merged data fails validation, fall back to base
            function validateWithOverlayFallback<K extends ConfigKey>(key: K, merged: unknown, base: unknown): ValidationResult<unknown> {
                try {
                    return { result: validateConfig(key, merged), usedFallback: false };
                } catch (e) {
                    const errMsg = e instanceof Error ? e.message : String(e);
                    try {
                        const baseResult = validateConfig(key, base);
                        console.warn(`[ConfigStore] Invalid data for ${key}, using base data:`, errMsg);
                        return { result: baseResult, usedFallback: true, error: errMsg };
                    } catch {
                        throw e;
                    }
                }
            }

            const vrSettings = validateWithOverlayFallback('settings', mergedData[0], baseData[0]);
            handleFallback(BASE_FILENAMES[0], vrSettings);
            const vrItems = validateWithOverlayFallback('items', mergedData[1], baseData[1]);
            handleFallback(BASE_FILENAMES[1], vrItems);
            const vrGenerators = validateWithOverlayFallback('generators', mergedData[2], baseData[2]);
            handleFallback(BASE_FILENAMES[2], vrGenerators);
            const vrLevels = validateWithOverlayFallback('levels', mergedData[3], baseData[3]);
            handleFallback(BASE_FILENAMES[3], vrLevels);
            const vrDailyOrders = validateWithOverlayFallback('dailyOrders', mergedData[4], baseData[4]);
            handleFallback(BASE_FILENAMES[4], vrDailyOrders);
            const vrGacha = validateWithOverlayFallback('gachaPool', mergedData[5], baseData[5]);
            handleFallback(BASE_FILENAMES[5], vrGacha);
            const vrAchievements = validateWithOverlayFallback('achievements', mergedData[6], baseData[6]);
            handleFallback(BASE_FILENAMES[6], vrAchievements);
            const vrLoopRules = validateWithOverlayFallback('loopRules', mergedData[7], baseData[7]);
            handleFallback(BASE_FILENAMES[7], vrLoopRules);
            const vrLoopNarratives = validateWithOverlayFallback('loopNarratives', mergedData[8], baseData[8]);
            handleFallback(BASE_FILENAMES[8], vrLoopNarratives);
            const vrLoopEvents = validateWithOverlayFallback('loopEvents', mergedData[9], baseData[9]);
            handleFallback(BASE_FILENAMES[9], vrLoopEvents);
            const vrCgStories = validateWithOverlayFallback('cgStories', mergedData[10], baseData[10]);
            handleFallback(BASE_FILENAMES[10], vrCgStories);
            const vrAffectionConfig = validateWithOverlayFallback('affectionConfig', mergedData[11], baseData[11]);
            handleFallback(BASE_FILENAMES[11], vrAffectionConfig);
            const vrTouchInteractions = validateWithOverlayFallback('touchInteractions', mergedData[12], baseData[12]);
            handleFallback(BASE_FILENAMES[12], vrTouchInteractions);
            const vrCharacterProfiles = validateWithOverlayFallback('characterProfiles', mergedData[13], baseData[13]);
            handleFallback(BASE_FILENAMES[13], vrCharacterProfiles);
            const vrAffectionShop = validateWithOverlayFallback('affectionShop', mergedData[14], baseData[14]);
            handleFallback(BASE_FILENAMES[14], vrAffectionShop);

            const settings = vrSettings.result as SettingsData;
            const validatedItems = vrItems.result as Record<string, GameItem>;
            const validatedGenerators = vrGenerators.result as Record<string, GeneratorConfig>;
            const validatedLevels = vrLevels.result as LevelData[];
            const validatedDailyOrders = vrDailyOrders.result as { orderPool?: DailyOrder[] };
            const validatedGacha = vrGacha.result as Record<string, unknown>;
            const validatedAchievements = vrAchievements.result as { achievements?: Achievement[] };
            const validatedLoopRules = vrLoopRules.result as Record<string, LoopRule>;
            const validatedLoopNarratives = vrLoopNarratives.result as Record<string, LoopNarrative>;
            const validatedLoopEvents = vrLoopEvents.result as Record<string, LoopEvent>;
            const validatedCgStories = vrCgStories.result as Record<string, CGStory>;
            const validatedAffectionConfig = vrAffectionConfig.result as AffectionConfig;
            const validatedTouchInteractions = vrTouchInteractions.result as TouchInteractionsConfig;
            const validatedCharacterProfiles = vrCharacterProfiles.result as Record<string, CharacterProfile>;
            const validatedAffectionShop = vrAffectionShop.result as AffectionShopConfig;

            // Assign to refs — extract nested fields from settings.json
            gameConfig.value = settings.GAME_CONFIG;
            items.value = validatedItems;
            generators.value = validatedGenerators;
            levels.value = validatedLevels;
            lockedCellsInitial.value = settings.LOCKED_CELLS_INITIAL;
            unlockPerBoss.value = settings.UNLOCK_PER_BOSS;
            cellUnlockCosts.value = settings.CELL_UNLOCK_COSTS;
            heroineUpgrades.value = settings.HEROINE_UPGRADES;
            recycleEnergyTable.value = settings.RECYCLE_ENERGY_TABLE;
            dailyOrderConfig.value = settings.DAILY_ORDER_CONFIG;
            dialogueConfig.value = settings.DIALOGUE_CONFIG;
            uiText.value = settings.UI_TEXT;
            uiAnimation.value = settings.UI_ANIMATION;
            uiColors.value = settings.UI_COLORS;
            uiTimers.value = settings.UI_TIMERS;
            uiColorTheme.value = settings.UI_COLOR_THEME;
            uiLayout.value = settings.UI_LAYOUT;

            dailyOrderPool.value = validatedDailyOrders?.orderPool || [];

            const gacha = validatedGacha as Record<string, any>;
            gachaRarityConfig.value = gacha.rarityConfig || {};
            gachaCost.value = gacha.gachaCost || {};
            gachaSubWeights.value = gacha.subWeights || {};
            gachaPool.value = (gacha.gachaPoolV2 as GachaPoolItem[]) || [];
            chains.value = gacha.chains || [];
            chainNames.value = gacha.chainNames || {};
            chainIcons.value = gacha.chainIcons || {};
            chainToGen.value = gacha.chainToGen || {};
            chainItemPrefix.value = gacha.chainItemPrefix || {};
            fragmentToGenerator.value = gacha.fragmentToGenerator ?? 60;
            fragmentToStory.value = gacha.fragmentToStory ?? 60;

            achievementData.value = validatedAchievements?.achievements || [];
            loopRules.value = validatedLoopRules;
            loopNarratives.value = validatedLoopNarratives;
            loopEvents.value = validatedLoopEvents;
            cgStories.value = validatedCgStories;

            affectionConfig.value = validatedAffectionConfig;
            touchInteractions.value = validatedTouchInteractions;
            characterProfiles.value = validatedCharacterProfiles;
            affectionShop.value = validatedAffectionShop;

            // Load pluggable config files — keep raw (pre-override) for fallback
            const _pluggableRaw = await Promise.all([
                fetch(`${basePath}/data/item_effects.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/board_economy.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/boss_progression.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/gacha_config.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/shop_items.json${cacheBust}`).then(r => r.json()).catch(() => ([])),
                fetch(`${basePath}/data/loop_multipliers.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/ad_config.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/daily_buff_config.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/audio_config.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
            ]);
            const _pluggableOverride = _pluggableRaw.map((data, index) => checkOverride(PLUGGABLE_FILENAMES[index], data));

            const vrItemEffects = validateWithOverlayFallback('itemEffects', _pluggableOverride[0], _pluggableRaw[0]);
            handleFallback(PLUGGABLE_FILENAMES[0], vrItemEffects);
            const vrBoardEconomy = validateWithOverlayFallback('boardEconomy', _pluggableOverride[1], _pluggableRaw[1]);
            handleFallback(PLUGGABLE_FILENAMES[1], vrBoardEconomy);
            const vrBossProgression = validateWithOverlayFallback('bossProgression', _pluggableOverride[2], _pluggableRaw[2]);
            handleFallback(PLUGGABLE_FILENAMES[2], vrBossProgression);
            const vrGachaConfig = validateWithOverlayFallback('gachaConfig', _pluggableOverride[3], _pluggableRaw[3]);
            handleFallback(PLUGGABLE_FILENAMES[3], vrGachaConfig);
            const vrShopItems = validateWithOverlayFallback('shopItems', _pluggableOverride[4], _pluggableRaw[4]);
            handleFallback(PLUGGABLE_FILENAMES[4], vrShopItems);
            const vrLoopMultipliers = validateWithOverlayFallback('loopMultipliers', _pluggableOverride[5], _pluggableRaw[5]);
            handleFallback(PLUGGABLE_FILENAMES[5], vrLoopMultipliers);
            const vrAdConfig = validateWithOverlayFallback('adConfig', _pluggableOverride[6], _pluggableRaw[6]);
            handleFallback(PLUGGABLE_FILENAMES[6], vrAdConfig);
            const vrDailyBuffConfig = validateWithOverlayFallback('dailyBuffConfig', _pluggableOverride[7], _pluggableRaw[7]);
            handleFallback(PLUGGABLE_FILENAMES[7], vrDailyBuffConfig);

            itemEffects.value = vrItemEffects.result as ItemEffectsConfig;
            boardEconomy.value = vrBoardEconomy.result as BoardEconomyConfig;
            bossProgression.value = vrBossProgression.result as BossProgressionConfig;
            gachaConfig.value = vrGachaConfig.result as GachaSimpleConfig;
            shopItems.value = vrShopItems.result as ShopItem[];
            loopMultipliers.value = vrLoopMultipliers.result as LoopMultipliersConfig;
            adConfig.value = vrAdConfig.result as AdConfig;
            dailyBuffConfig.value = vrDailyBuffConfig.result as DailyBuffConfig;
            
            const audioOverride = _pluggableOverride[8];
            const audioRaw = _pluggableRaw[8];
            if (audioOverride && Object.keys(audioOverride).length > 0) {
                const vrAudio = validateWithOverlayFallback('audioConfig', audioOverride, audioRaw);
                handleFallback(PLUGGABLE_FILENAMES[8], vrAudio);
                audioConfig.value = vrAudio.result as AudioConfig;
            } else {
                audioConfig.value = {
                    defaults: { masterVolume: 1.0, bgmVolume: 0.3, sfxVolume: 0.8 },
                    fade: { bgmFadeIn: 800, bgmFadeOut: 500, bgmResumeFade: 500, bgmCrossfade: 600, bgmSwitchDelay: 50 },
                    sfxRegistry: {},
                    bgmRegistry: {}
                } as AudioConfig;
            }

            // Load VN scene routes
            const vnRouteFiles = ['morven_route'];
            const vnRouteData = await Promise.all(
                vnRouteFiles.map(name =>
                    fetch(`${basePath}/data/vn_scenes/${name}.json${cacheBust}`)
                        .then(r => r.json())
                        .catch(() => null)
                )
            );
            const vnRoutesMap: Record<string, VNRoute> = {};
            for (let i = 0; i < vnRouteFiles.length; i++) {
                if (vnRouteData[i]) {
                    try {
                        vnRoutesMap[vnRouteFiles[i].replace('_route', '')] = validateConfig('vnRoutes', { [vnRouteFiles[i]]: vnRouteData[i] })[vnRouteFiles[i]] as VNRoute;
                    } catch {
                        vnRoutesMap[vnRouteFiles[i].replace('_route', '')] = vnRouteData[i] as VNRoute;
                    }
                }
            }
            vnScenes.value = vnRoutesMap;

            // Load narrative config
            try {
                const ncRaw = await fetch(`${basePath}/data/narrative_config.json${cacheBust}`).then(r => r.json());
                narrativeConfig.value = validateConfig('narrativeConfig', ncRaw) as NarrativeConfig;
            } catch {
                narrativeConfig.value = null;
            }

            // Notify config editor about fallbacks
            if (_fallbackWarnings.length > 0 && typeof BroadcastChannel !== 'undefined') {
                const ch = new BroadcastChannel('config-editor');
                ch.postMessage({ type: 'preview-fallback', failures: _fallbackWarnings });
                ch.close();
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[ConfigStore] Failed to load game data:', error);
            loadError.value = message;
            throw error;
        } finally {
            isLoading.value = false;
        }
    }

    if (typeof BroadcastChannel !== 'undefined') {
        const _ch = new BroadcastChannel('config-editor');
        _ch.onmessage = (e: MessageEvent) => {
            if (e.data?.type === 'preview') {
                loadGameData();
            } else if (e.data?.type === 'clear') {
                clearOverrides();
                loadGameData();
            }
        };
    }

    return {
        // State
        gameConfig,
        items,
        generators,
        lockedCellsInitial,
        unlockPerBoss,
        levels,
        uiText,
        recycleEnergyTable,
        dailyOrderConfig,
        dailyOrderPool,
        cellUnlockCosts,
        heroineUpgrades,
        gachaPool,
        achievementData,
        uiAnimation,
        uiColors,
        dialogueConfig,
        uiTimers,
        uiColorTheme,
        uiLayout,
        gachaRarityConfig,
        gachaCost,
        gachaSubWeights,
        cgStories,
        loopRules,
        loopNarratives,
        loopEvents,
        chains,
        chainNames,
        chainIcons,
        chainToGen,
        chainItemPrefix,
        fragmentToGenerator,
        fragmentToStory,
        shopItems,
        affectionConfig,
        touchInteractions,
        characterProfiles,
        affectionShop,
        itemEffects,
        boardEconomy,
        bossProgression,
        gachaConfig,
        audioConfig,
        loopMultipliers,
        adConfig,
        dailyBuffConfig,
        vnScenes,
        narrativeConfig,
        isLoading,
        loadError,
        isDataReady,
        hasOverrides,
        
        // Actions
        loadGameData,
        clearOverrides,
        deepMerge,

    };
});