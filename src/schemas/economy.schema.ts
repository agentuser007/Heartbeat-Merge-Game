import { z } from 'zod'
import { ChainIdSchema, RaritySchema } from './core.schema'

export const LuckyCoinConfigSchema = z.object({
    defaultCount: z.number().int().positive(),
    goldChance: z.number().min(0).max(1),
    goldAmount: z.number().int().positive(),
    diamondAmount: z.number().int().positive(),
})

export const FragmentConfigSchema = z.object({
    defaultCount: z.number().int().positive(),
    defaultGenLevel: z.number().int().positive(),
})

export const EnergyItemConfigSchema = z.object({
    defaultRecover: z.number().int().positive(),
})

export const DoubleGenConfigSchema = z.object({
    defaultTurns: z.number().int().positive(),
})

export const ClearLevelConfigSchema = z.object({
    targetLevels: z.array(z.number().int().positive()),
    energyPerItem: z.number().int().positive(),
})

export const RerollConfigSchema = z.object({
    defaultCount: z.number().int().positive(),
})

export const ItemEffectsConfigSchema = z.object({
    luckyCoin: LuckyCoinConfigSchema,
    fragment: FragmentConfigSchema,
    energyItem: EnergyItemConfigSchema,
    doubleGen: DoubleGenConfigSchema,
    clearLv1: ClearLevelConfigSchema,
    spaceClean: ClearLevelConfigSchema,
    reroll: RerollConfigSchema,
    toolItems: z.record(z.string(), z.string()),
})

export const BoardEconomyConfigSchema = z.object({
    sellPriceBoost: z.number().nonnegative(),
    luckyMergeChance: z.number().min(0).max(1),
    dailyGoldBoost: z.number().nonnegative(),
    achievementTokenBonus: z.number().nonnegative(),
    energyDiscountFreeChance: z.number().min(0).max(1),
    perfumeBoostChains: z.array(z.string()),
})

export const BossProgressionTierEntrySchema = z.object({
    maxLoop: z.number().int().positive().nullable(),
    boost: z.number().int().nonnegative(),
})

export const TimedOrdersUpConfigSchema = z.object({
    defaultTimeLimit: z.number().int().positive(),
    timeMultiplier: z.number().min(0).max(1),
})

export const BossProgressionConfigSchema = z.object({
    orderTierBoost: z.array(BossProgressionTierEntrySchema),
    maxItemTier: z.number().int().positive(),
    timedOrdersUp: TimedOrdersUpConfigSchema,
})

export const GachaSimpleConfigSchema = z.object({
    tenPullCount: z.number().int().positive(),
    freePullMaxRarity: z.string(),
})

export const GachaRarityConfigSchema = z.object({
    probability: z.number().min(0).max(1),
    color: z.string(),
    glow: z.string(),
})

export const GachaCostConfigSchema = z.object({
    singleCost: z.number().int().positive(),
    tenCost: z.number().int().positive(),
})

export const GachaSubWeightsSchema = z.record(z.string(), z.record(z.string(), z.number()))

export const GachaPoolItemValueSchema = z.object({
    chain: ChainIdSchema.or(z.literal('random')).optional(),
    level: z.union([z.number().int().positive(), z.string()]).optional(),
    genChain: z.string().optional(),
    cgId: z.string().nullable().optional(),
    energy: z.number().int().positive().optional(),
    amount: z.number().int().positive().optional(),
    count: z.number().int().positive().optional(),
    turns: z.number().int().positive().optional(),
    genLevel: z.number().int().positive().optional(),
    energyPerItem: z.number().int().positive().optional(),
}).passthrough()

export const GachaPoolItemSchema = z.object({
    id: z.string(),
    rarity: RaritySchema,
    subCategory: z.string(),
    weight: z.number(),
    icon: z.string(),
    name: z.string(),
    effect: z.string(),
    value: GachaPoolItemValueSchema,
    itemId: z.string().optional(),
    description: z.string().optional(),
})

export const GachaPoolDataSchema = z.object({
    rarityConfig: z.record(z.string(), GachaRarityConfigSchema),
    gachaCost: GachaCostConfigSchema,
    subWeights: GachaSubWeightsSchema,
    fragmentToGenerator: z.number().int().positive(),
    fragmentToStory: z.number().int().positive(),
    chains: z.array(ChainIdSchema),
    chainNames: z.record(z.string(), z.string()),
    chainIcons: z.record(z.string(), z.string()),
    chainToGen: z.record(z.string(), z.string()),
    chainItemPrefix: z.record(z.string(), z.string()),
    gachaPoolV2: z.array(GachaPoolItemSchema),
})

export const AdTypeWithRewardSchema = z.object({
    reward: z.number().nonnegative(),
    dailyLimit: z.number().positive().nullable(),
    cooldownMs: z.number().nonnegative(),
    emoji: z.string(),
})

export const AdTypeDiamondsSchema = AdTypeWithRewardSchema.extend({
    betaBenefit: z.boolean(),
})

export const AdTypeFreePullSchema = z.object({
    dailyLimit: z.number().positive().nullable(),
    cooldownMs: z.number().nonnegative(),
    maxRarity: z.string(),
    emoji: z.string(),
})

export const AdConfigSchema = z.object({
    energy: AdTypeWithRewardSchema,
    gold: AdTypeWithRewardSchema,
    diamonds: AdTypeDiamondsSchema,
    freePull: AdTypeFreePullSchema,
})

export const DailyBuffTypeSchema = z.object({
    id: z.string(),
    icon: z.string(),
    nameKey: z.string(),
    descKey: z.string(),
})

export const DailyBuffConfigSchema = z.object({
    buffDurationMs: z.number().int().positive(),
    buffTypes: z.array(DailyBuffTypeSchema).min(1),
})

export const ShopItemSchema = z.object({
    id: z.string(),
    icon: z.string(),
    cost: z.number().int().nonnegative(),
    effect: z.string(),
    value: z.record(z.string(), z.unknown()),
    i18nName: z.string(),
    i18nDesc: z.string(),
})
