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
} from '@/types/game';
import { validateConfig, type ConfigKey } from '@/schemas';
import { deepMerge } from '@/core/deepMerge';

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
    const gachaPoolV2 = ref<GachaPoolItem[]>([]);
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
    const recycleEnergy = ref<Record<string, number>>({});
    
    const affectionConfig = ref<AffectionConfig>({} as AffectionConfig);
    const touchInteractions = ref<TouchInteractionsConfig>({} as TouchInteractionsConfig);
    const characterProfiles = ref<Record<string, CharacterProfile>>({});
    const affectionShop = ref<AffectionShopConfig>({} as AffectionShopConfig);

    // Pluggable config: item effects, board economy, boss progression, gacha
    const itemEffects = ref<ItemEffectsConfig>({} as ItemEffectsConfig);
    const boardEconomy = ref<BoardEconomyConfig>({} as BoardEconomyConfig);
    const bossProgression = ref<BossProgressionConfig>({} as BossProgressionConfig);
    const gachaConfig = ref<GachaSimpleConfig>({} as GachaSimpleConfig);
    
    // Shop items
    const shopItems = ref<ShopItem[]>([]);

    // Loading state
    const isLoading = ref(false);
    const loadError = ref<string | null>(null);
    const isDataReady = computed(() => !isLoading.value && loadError.value === null && Object.keys(gameConfig.value).length > 0);


    function getItem(id: string): GameItem | undefined {
        return items.value[id];
    }

    function getGenerator(id: string): GeneratorConfig | undefined {
        return generators.value[id];
    }

    function getCharacter(id: string): CharacterProfile | undefined {
        return characterProfiles.value[id];
    }

    function getLevel(idx: number): LevelData | undefined {
        return levels.value[idx];
    }

    function getShopItem(id: string): ShopItem | undefined {
        return shopItems.value.find(item => item.id === id);
    }

    function getChainName(chainId: string): string {
        return chainNames.value[chainId] ?? chainId;
    }

    /**
     * Load all game data from JSON files
     */
    async function loadGameData(locale?: string): Promise<void> {
        const currentLocale = locale || localStorage.getItem('i18n_locale') || 'zh-CN';
        const isEnglish = currentLocale === 'en';
        const basePath = import.meta.env.BASE_URL + 'assets';
        const cacheBust = '?v=' + Date.now();

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

            // Merge data: only apply English overlay when locale is English
            const mergedData = isEnglish
                ? baseData.map((base, index) => deepMerge(base, enData[index]))
                : baseData;

            // Validate merged data — if overlay broke the data, fall back to base
            function validateWithOverlayFallback<K extends ConfigKey>(key: K, merged: unknown, base: unknown) {
                try {
                    return validateConfig(key, merged)
                } catch (e) {
                    if (isEnglish) {
                        try {
                            const baseValidated = validateConfig(key, base)
                            console.warn(`[ConfigStore] en overlay invalid for ${key}, using base data`)
                            return baseValidated
                        } catch {
                            throw e
                        }
                    }
                    throw e
                }
            }

            const settings = validateWithOverlayFallback('settings', mergedData[0], baseData[0]) as SettingsData;
            const validatedItems = validateWithOverlayFallback('items', mergedData[1], baseData[1]) as Record<string, GameItem>;
            const validatedGenerators = validateWithOverlayFallback('generators', mergedData[2], baseData[2]) as Record<string, GeneratorConfig>;
            const validatedLevels = validateWithOverlayFallback('levels', mergedData[3], baseData[3]) as LevelData[];
            const validatedDailyOrders = validateWithOverlayFallback('dailyOrders', mergedData[4], baseData[4]);
            const validatedGacha = validateWithOverlayFallback('gachaPool', mergedData[5], baseData[5]);
            const validatedAchievements = validateWithOverlayFallback('achievements', mergedData[6], baseData[6]);
            const validatedLoopRules = validateWithOverlayFallback('loopRules', mergedData[7], baseData[7]) as Record<string, LoopRule>;
            const validatedLoopNarratives = validateWithOverlayFallback('loopNarratives', mergedData[8], baseData[8]) as Record<string, LoopNarrative>;
            const validatedLoopEvents = validateWithOverlayFallback('loopEvents', mergedData[9], baseData[9]) as Record<string, LoopEvent>;
            const validatedCgStories = validateWithOverlayFallback('cgStories', mergedData[10], baseData[10]) as Record<string, CGStory>;
            const validatedAffectionConfig = validateWithOverlayFallback('affectionConfig', mergedData[11], baseData[11]) as AffectionConfig;
            const validatedTouchInteractions = validateWithOverlayFallback('touchInteractions', mergedData[12], baseData[12]) as TouchInteractionsConfig;
            const validatedCharacterProfiles = validateWithOverlayFallback('characterProfiles', mergedData[13], baseData[13]) as Record<string, CharacterProfile>;
            const validatedAffectionShop = validateWithOverlayFallback('affectionShop', mergedData[14], baseData[14]) as AffectionShopConfig;

            // Assign to refs — extract nested fields from settings.json
            gameConfig.value = settings.GAME_CONFIG || settings;
            items.value = validatedItems;
            // NOTE: generators.json contains debug fields like "_cooldownOriginal" alongside "cooldown".
            // These are dev/test overrides (cooldown: 0 for instant testing) and should be ignored
            // by production code. Only the "cooldown" field is used at runtime.
            generators.value = validatedGenerators;
            levels.value = validatedLevels;
            lockedCellsInitial.value = settings.LOCKED_CELLS_INITIAL || [];
            unlockPerBoss.value = settings.UNLOCK_PER_BOSS || [];
            cellUnlockCosts.value = settings.CELL_UNLOCK_COSTS || [];
            heroineUpgrades.value = settings.HEROINE_UPGRADES || [];
            recycleEnergyTable.value = settings.RECYCLE_ENERGY_TABLE || {};
            dailyOrderConfig.value = settings.DAILY_ORDER_CONFIG || {};
            dialogueConfig.value = settings.DIALOGUE_CONFIG || {};
            uiText.value = settings.UI_TEXT || {};
            uiAnimation.value = settings.UI_ANIMATION || {};
            uiColors.value = settings.UI_COLORS || {};
            uiTimers.value = settings.UI_TIMERS || {};
            uiColorTheme.value = settings.UI_COLOR_THEME || {};
            uiLayout.value = settings.UI_LAYOUT || {};

            // Extract arrays from wrapper objects
            dailyOrderPool.value = validatedDailyOrders?.orderPool || [];

            // Extract gacha_pool.json nested fields
            const gacha = validatedGacha;
            gachaRarityConfig.value = gacha.rarityConfig || {};
            gachaCost.value = gacha.gachaCost || {};
            gachaSubWeights.value = gacha.subWeights || {};
            gachaPoolV2.value = (gacha.gachaPoolV2 as GachaPoolItem[]) || [];
            gachaPool.value = (gacha.gachaPoolV2 as GachaPoolItem[]) || [];
            chains.value = gacha.chains || [];
            chainNames.value = gacha.chainNames || {};
            chainIcons.value = gacha.chainIcons || {};
            chainToGen.value = gacha.chainToGen || {};
            chainItemPrefix.value = gacha.chainItemPrefix || {};
            fragmentToGenerator.value = gacha.fragmentToGenerator ?? 60;
            fragmentToStory.value = gacha.fragmentToStory ?? 60;
            recycleEnergy.value = gacha.recycleEnergy || {};

            achievementData.value = validatedAchievements?.achievements || [];
            loopRules.value = validatedLoopRules;
            loopNarratives.value = validatedLoopNarratives;
            loopEvents.value = validatedLoopEvents;
            cgStories.value = validatedCgStories;

            affectionConfig.value = validatedAffectionConfig;
            touchInteractions.value = validatedTouchInteractions;
            characterProfiles.value = validatedCharacterProfiles;
            affectionShop.value = validatedAffectionShop;

            // Load pluggable config files
            const [itemEffectsData, boardEconomyData, bossProgressionData, gachaConfigData, shopItemsData] = await Promise.all([
                fetch(`${basePath}/data/item_effects.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/board_economy.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/boss_progression.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/gacha_config.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
                fetch(`${basePath}/data/shop_items.json${cacheBust}`).then(r => r.json()).catch(() => ([])),
            ]);

            itemEffects.value = validateConfig('itemEffects', itemEffectsData);
            boardEconomy.value = validateConfig('boardEconomy', boardEconomyData);
            bossProgression.value = validateConfig('bossProgression', bossProgressionData);
            gachaConfig.value = validateConfig('gachaConfig', gachaConfigData) as GachaSimpleConfig;
            shopItems.value = validateConfig('shopItems', shopItemsData);

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('[ConfigStore] Failed to load game data:', error);
            loadError.value = message;
            throw error;
        } finally {
            isLoading.value = false;
        }
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
        gachaPoolV2,
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
        recycleEnergy,
        shopItems,
        affectionConfig,
        touchInteractions,
        characterProfiles,
        affectionShop,
        itemEffects,
        boardEconomy,
        bossProgression,
        gachaConfig,
        isLoading,
        loadError,
        isDataReady,
        
        // Actions
        loadGameData,
        deepMerge,

        // Getters
        getItem,
        getGenerator,
        getCharacter,
        getLevel,
        getShopItem,
        getChainName,
    };
});