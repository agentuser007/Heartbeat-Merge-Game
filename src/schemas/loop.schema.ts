import { z } from 'zod'
import { OrderRequirementSchema } from './core.schema'

export const LoopSpecialRuleSchema = z.enum([
    'dailyGoldUp', 'perfumeBoost', 'timedOrdersUp', 'energyRegenDown',
])

export const LoopRuleSchema = z.object({
    title: z.string(),
    specialRules: z.array(LoopSpecialRuleSchema),
})

export const LoopEventSchema = z.object({
    npcName: z.string(),
    text: z.string(),
    playerText: z.string(),
    goldReward: z.number().int().nonnegative().optional(),
    diamondReward: z.number().int().nonnegative().optional(),
    energyReward: z.number().int().nonnegative().optional(),
})

export const LoopBossNarrativeSchema = z.object({
    intro: z.string().nullable(),
    defeatOutro: z.string().nullable(),
})

export const LoopNarrativeSchema = z.object({
    loopIntro: z.string(),
    loopOutro: z.string(),
    boss_0: LoopBossNarrativeSchema,
    boss_1: LoopBossNarrativeSchema,
    boss_2: LoopBossNarrativeSchema,
    boss_3: LoopBossNarrativeSchema,
})

export const DailyOrderSchema = z.object({
    id: z.string(),
    name: z.string(),
    required: z.array(OrderRequirementSchema),
    goldReward: z.number().int().nonnegative(),
    reward: z.object({
        gold: z.number().int().nonnegative().optional(),
        diamonds: z.number().int().nonnegative().optional(),
        energy: z.number().int().nonnegative().optional(),
    }).optional(),
    minLoop: z.number().int().nonnegative(),
    dialogue: z.string(),
})

export const DailyOrderPoolDataSchema = z.object({
    orderPool: z.array(DailyOrderSchema),
})

export const AchievementConditionSchema = z.enum([
    'merges', 'bossDefeats', 'collectionPct', 'maxLevelItems',
    'loops', 'gachaPulls', 'dailyOrders', 'energyUsed',
    'totalGoldEarned', 'recycled', 'cellsUnlocked',
    'dailyCompleted', 'loopReached',
])

export const AchievementRewardSchema = z.object({
    diamonds: z.number().int().nonnegative().optional(),
    energy: z.number().int().nonnegative().optional(),
    gold: z.number().int().nonnegative().optional(),
})

export const AchievementSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    description: z.string(),
    condition: AchievementConditionSchema,
    target: z.number().int().positive(),
    reward: AchievementRewardSchema,
})

export const AchievementDataSchema = z.object({
    achievements: z.array(AchievementSchema),
})

export const StoryLineSchema = z.object({
    speakerId: z.string().nullable(),
    expression: z.string().optional(),
    text: z.string(),
})

export const StoryChapterSchema = z.object({
    title: z.string(),
    lines: z.array(StoryLineSchema),
})

export const MetaUpgradeConfigSchema = z.object({
    baseCost: z.number().positive(),
    costScale: z.number().positive(),
    effectPerLevel: z.number(),
    maxLevel: z.number().int().positive(),
})

export const LoopMultiplierTableSchema = z.object({
    table: z.array(z.number()),
    overflowBase: z.number().optional(),
    overflowGrowth: z.number().optional(),
    cap: z.number().optional(),
    overflowValue: z.number().optional(),
})

export const LoopMultipliersSchema = z.object({
    hpMultiplier: LoopMultiplierTableSchema,
    rewardMultiplier: LoopMultiplierTableSchema,
    timeMultiplier: LoopMultiplierTableSchema,
    tokenReward: LoopMultiplierTableSchema,
    startingGoldBase: z.number().positive(),
    metaUpgrades: z.record(z.string(), MetaUpgradeConfigSchema),
})

export const CGStorySchema = z.object({
    cgId: z.string(),
    title: z.string(),
    maleLeadId: z.string(),
    stories: z.array(StoryChapterSchema),
})
