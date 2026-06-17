import { z } from 'zod'
import {
    SettingsDataSchema,
    GameItemSchema,
    GeneratorConfigSchema,
    LevelDataSchema,
} from './core.schema'
import {
    ItemEffectsConfigSchema,
    BoardEconomyConfigSchema,
    BossProgressionConfigSchema,
    GachaSimpleConfigSchema,
    ShopItemSchema,
    GachaPoolDataSchema,
    AdConfigSchema,
    DailyBuffConfigSchema,
} from './economy.schema'
import {
    AffectionConfigSchema,
    CharacterProfileSchema,
    TouchInteractionsConfigSchema,
    AffectionShopConfigSchema,
} from './affection.schema'
import {
    LoopRuleSchema,
    LoopEventSchema,
    LoopNarrativeSchema,
    LoopMultipliersSchema,
    DailyOrderPoolDataSchema,
    AchievementDataSchema,
    CGStorySchema,
} from './loop.schema'

const ItemsSchema = z.record(z.string(), GameItemSchema)
const GeneratorsSchema = z.record(z.string(), GeneratorConfigSchema)
const LevelsSchema = z.array(LevelDataSchema)
const LoopRulesSchema = z.record(z.string(), LoopRuleSchema)
const LoopNarrativesSchema = z.record(z.string(), LoopNarrativeSchema)
const LoopEventsSchema = z.record(z.string(), LoopEventSchema)
const CGStoriesSchema = z.record(z.string(), CGStorySchema)
const CharacterProfilesSchema = z.record(z.string(), CharacterProfileSchema)
const ShopItemsSchema = z.array(ShopItemSchema)

export const CONFIG_SCHEMAS = {
    settings:            SettingsDataSchema,
    items:               ItemsSchema,
    generators:          GeneratorsSchema,
    levels:              LevelsSchema,
    dailyOrders:         DailyOrderPoolDataSchema,
    gachaPool:           GachaPoolDataSchema,
    achievements:        AchievementDataSchema,
    loopRules:           LoopRulesSchema,
    loopNarratives:      LoopNarrativesSchema,
    loopEvents:          LoopEventsSchema,
    cgStories:           CGStoriesSchema,
    affectionConfig:     AffectionConfigSchema,
    touchInteractions:   TouchInteractionsConfigSchema,
    characterProfiles:   CharacterProfilesSchema,
    affectionShop:       AffectionShopConfigSchema,
    itemEffects:         ItemEffectsConfigSchema,
    boardEconomy:        BoardEconomyConfigSchema,
    bossProgression:     BossProgressionConfigSchema,
    gachaConfig:         GachaSimpleConfigSchema,
    shopItems:           ShopItemsSchema,
    loopMultipliers:     LoopMultipliersSchema,
    adConfig:            AdConfigSchema,
    dailyBuffConfig:     DailyBuffConfigSchema,
}

export type ConfigKey = keyof typeof CONFIG_SCHEMAS

export function validateConfig<K extends ConfigKey>(
    key: K,
    data: unknown,
) {
    const schema = CONFIG_SCHEMAS[key]
    const result = schema.safeParse(data)
    if (!result.success) {
        const issues = result.error.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join('; ')
        throw new Error(`Config validation failed [${key}]: ${issues}`)
    }
    return result.data as z.infer<typeof schema>
}
