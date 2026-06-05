// ============================================================
// configStore.ts — Game Configuration Data Store
// ============================================================
// Replaces global config variables from config.js
// ============================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';

// Type definitions
export interface GameConfig {
    BOARD_COLS: number;
    BOARD_ROWS: number;
    MAX_ENERGY: number;
    ENERGY_REGEN_INTERVAL: number;
    ENERGY_REGEN_CAP: number;
    [key: string]: any;
}

export interface ItemData {
    id: string;
    name: string;
    emoji: string;
    level: number;
    chain: string;
    type: string;
    nextId?: string;
    sellPrice?: number;
    color?: string;
    sellable?: boolean;
    description?: string;
    energyRecover?: number;
    [key: string]: any;
}

export interface GeneratorData {
    id: string;
    itemId: string;
    interval: number;
    [key: string]: any;
}

export interface LevelData {
    id: number;
    bossId: string;
    bossName: string;
    bossAvatar: string;
    hp: number;
    [key: string]: any;
}

export const useConfigStore = defineStore('config', () => {
    // Reactive state
    const gameConfig = ref<GameConfig>({} as GameConfig);
    const items = ref<Record<string, ItemData>>({});
    const generators = ref<Record<string, GeneratorData>>({});
    const lockedCellsInitial = ref<number[]>([]);
    const unlockPerBoss = ref<any[]>([]);
    const levels = ref<LevelData[]>([]);
    const uiText = ref<Record<string, any>>({});
    const recycleEnergyTable = ref<Record<string, any>>({});
    const dailyOrderConfig = ref<Record<string, any>>({});
    const dailyOrderPool = ref<any[]>([]);
    const cellUnlockCosts = ref<number[]>([]);
    const heroineUpgrades = ref<any[]>([]);
    const gachaPool = ref<any[]>([]);
    const achievementData = ref<any[]>([]);
    const uiAnimation = ref<Record<string, any>>({});
    const uiColors = ref<Record<string, any>>({});
    const dialogueConfig = ref<Record<string, any>>({});
    
    // Gacha pool data
    const gachaRarityConfig = ref<Record<string, any>>({});
    const gachaCost = ref<Record<string, any>>({});
    const gachaSubWeights = ref<Record<string, any>>({});
    const gachaPoolV2 = ref<any[]>([]);
    const cgStories = ref<Record<string, any>>({});
    const loopRules = ref<Record<string, any>>({});
    const loopNarratives = ref<Record<string, any>>({});
    const loopEvents = ref<Record<string, any>>({});
    const chains = ref<any[]>([]);
    const chainNames = ref<Record<string, string>>({});
    const chainIcons = ref<Record<string, string>>({});
    const chainToGen = ref<Record<string, string>>({});
    const chainItemPrefix = ref<Record<string, string>>({});
    const fragmentToGenerator = ref<number>(60);
    const fragmentToStory = ref<number>(60);
    const recycleEnergy = ref<Record<string, any>>({});
    
    // Shop items
    const shopItems = ref([
        { id: 'shop_energy_small', name: '小瓶体力药水', icon: '⚡', description: '恢复30点体力', cost: 50, effect: 'add_energy_item', value: { energy: 30 }, i18nName: 'shopEnergySmall', i18nDesc: 'shopEnergySmallDesc' },
        { id: 'shop_energy_large', name: '大瓶体力药水', icon: '🔋', description: '恢复80点体力', cost: 120, effect: 'add_energy_item', value: { energy: 80 }, i18nName: 'shopEnergyLarge', i18nDesc: 'shopEnergyLargeDesc' },
        { id: 'shop_joker', name: '百搭牌', icon: '🃏', description: '放置到棋盘，与任意物品合成为更高级', cost: 200, effect: 'add_joker', value: {}, i18nName: 'shopJoker', i18nDesc: 'shopJokerDesc' },
        { id: 'shop_scissor', name: '剪刀', icon: '✂️', description: '点击棋盘物品拆分为2个低级物品', cost: 150, effect: 'add_scissor', value: {}, i18nName: 'shopScissor', i18nDesc: 'shopScissorDesc' },
        { id: 'shop_clear_lv1', name: '扫帚', icon: '🧹', description: '清除所有Lv.1物品，回收体力', cost: 80, effect: 'clear_lv1', value: {}, i18nName: 'shopClearLv1', i18nDesc: 'shopClearLv1Desc' },
    ]);

    /**
     * Deep merge utility - recursively merges overlay onto base data
     * - Plain objects: merge by key, overlay wins for primitives
     * - Arrays with `id` fields: match elements by `id`, then recursively merge
     * - Arrays without `id`: merge by index
     * - Primitives: overlay wins if present
     */
    function deepMerge(base: any, overlay: any): any {
        // If overlay is null/undefined, keep base unchanged
        if (overlay === null || overlay === undefined) return base;
        // If overlay is not an object (primitive), it wins
        if (typeof overlay !== 'object') return overlay;
        // If base is not an object (primitive) but overlay is, overlay wins
        if (typeof base !== 'object' || base === null) return overlay;

        // Both are arrays
        if (Array.isArray(base) && Array.isArray(overlay)) {
            // If both arrays have elements with 'id', merge by id matching
            if (base.length > 0 && overlay.length > 0 &&
                base[0] && typeof base[0] === 'object' && 'id' in base[0] &&
                overlay[0] && typeof overlay[0] === 'object' && 'id' in overlay[0]) {
                // Build a lookup map from overlay elements by id
                const overlayById: Record<string, any> = {};
                for (const item of overlay) {
                    if (item && typeof item === 'object' && 'id' in item) {
                        overlayById[item.id] = item;
                    }
                }
                // Map over base: merge matched overlay element, keep unmatched base element
                const result = base.map((baseEl: any) => {
                    if (baseEl && typeof baseEl === 'object' && 'id' in baseEl && baseEl.id in overlayById) {
                        return deepMerge(baseEl, overlayById[baseEl.id]);
                    }
                    return baseEl;
                });
                // Append overlay elements whose id is NOT in base
                const baseIds = new Set(base.filter((el: any) => el && typeof el === 'object' && 'id' in el).map((el: any) => el.id));
                for (const item of overlay) {
                    if (item && typeof item === 'object' && 'id' in item && !baseIds.has(item.id)) {
                        result.push(item);
                    }
                }
                return result;
            }
            // Fallback: merge by index
            return base.map((item: any, i: number) => {
                return i < overlay.length ? deepMerge(item, overlay[i]) : item;
            });
        }

        // Both are plain objects: merge by key
        const result = Object.assign({}, base);
        const keys = Object.keys(overlay);
        for (const key of keys) {
            if (key in result) {
                result[key] = deepMerge(result[key], overlay[key]);
            } else {
                result[key] = overlay[key];
            }
        }
        return result;
    }

    /**
     * Load all game data from JSON files
     */
    async function loadGameData(locale?: string): Promise<void> {
        const currentLocale = locale || localStorage.getItem('i18n_locale') || 'zh-CN';
        const isEnglish = currentLocale === 'en';
        const basePath = '/assets';
        const cacheBust = '?v=' + Date.now();
        
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
            ]);

            // Merge data: only apply English overlay when locale is English
            const mergedData = isEnglish
                ? baseData.map((base, index) => deepMerge(base, enData[index]))
                : baseData;

            // Assign to refs — extract nested fields from settings.json (mergedData[0])
            const settings = mergedData[0];
            gameConfig.value = settings.GAME_CONFIG || settings;
            items.value = mergedData[1];
            // NOTE: generators.json contains debug fields like "_cooldownOriginal" alongside "cooldown".
            // These are dev/test overrides (cooldown: 0 for instant testing) and should be ignored
            // by production code. Only the "cooldown" field is used at runtime.
            generators.value = mergedData[2];
            levels.value = mergedData[3];
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

            // Extract arrays from wrapper objects
            dailyOrderPool.value = mergedData[4]?.orderPool || [];

            // Extract gacha_pool.json nested fields (mergedData[5])
            const gacha = mergedData[5];
            gachaRarityConfig.value = gacha.rarityConfig || {};
            gachaCost.value = gacha.gachaCost || {};
            gachaSubWeights.value = gacha.subWeights || {};
            gachaPoolV2.value = gacha.gachaPoolV2 || [];
            gachaPool.value = gacha.gachaPoolV2 || [];
            chains.value = gacha.chains || [];
            chainNames.value = gacha.chainNames || {};
            chainIcons.value = gacha.chainIcons || {};
            chainToGen.value = gacha.chainToGen || {};
            chainItemPrefix.value = gacha.chainItemPrefix || {};
            fragmentToGenerator.value = gacha.fragmentToGenerator ?? 60;
            fragmentToStory.value = gacha.fragmentToStory ?? 60;
            recycleEnergy.value = gacha.recycleEnergy || {};

            achievementData.value = mergedData[6]?.achievements || [];
            loopRules.value = mergedData[7];
            loopNarratives.value = mergedData[8];
            loopEvents.value = mergedData[9];
            cgStories.value = mergedData[10];

            // Load additional constant data
            // NOTE: ui-config.json overlaps with settings.json fields (UI_ANIMATION, UI_COLORS).
            // ui-config.json values take precedence when present. Future refactor should consolidate
            // these into a single source to avoid confusion about which file owns which setting.
            const constants = await Promise.all([
                fetch(`${basePath}/constants/ui-config.json${cacheBust}`).then(r => r.json()).catch(() => ({})),
            ]);

            uiAnimation.value = constants[0]?.timers || constants[0]?.animation || uiAnimation.value;
            uiColors.value = constants[0]?.colors || uiColors.value;

        } catch (error) {
            console.error('[ConfigStore] Failed to load game data:', error);
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
        
        // Actions
        loadGameData,
        deepMerge
    };
});