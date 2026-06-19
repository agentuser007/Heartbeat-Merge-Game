import { z } from 'zod'

export const GameSettingsConfigSchema = z.object({
    BOARD_COLS: z.number().int().positive(),
    BOARD_ROWS: z.number().int().positive(),
    MAX_ENERGY: z.number().int().positive(),
    ENERGY_REGEN_CAP: z.number().int().positive(),
    ENERGY_REGEN_INTERVAL: z.number().int().positive(),
    ENERGY_REGEN_AMOUNT: z.number().int().positive(),
    ENERGY_COST_PER_SPAWN: z.number().int().positive(),
    ENERGY_REGEN_DOWN_MULTIPLIER: z.number().positive(),
})

export const HeroineUpgradeLevelSchema = z.object({
    cost: z.number().nonnegative(),
    value: z.number().nonnegative(),
    label: z.string(),
})

export const HeroineUpgradeSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    description: z.string(),
    levels: z.array(HeroineUpgradeLevelSchema),
})

export const UIAnimationConfigSchema = z.object({
    flashDuration: z.number(),
    mergePopDuration: z.number(),
    spawnPopDuration: z.number(),
    transitionDuration: z.number(),
    energyPulseDuration: z.number(),
    genClickDuration: z.number(),
    shakeDuration: z.number(),
    particleDistance: z.number(),
    particleFallStartY: z.number(),
    particleFallDriftX: z.number(),
    diamondParticleCount: z.number().int().nonnegative(),
    confettiCount: z.number().int().nonnegative(),
    heartFlyDuration: z.number(),
    defeatBossDelay: z.number(),
    paradeToCompleteDelay: z.number(),
    autoSaveInterval: z.number(),
    swipeCloseThreshold: z.number(),
    swipeHandleArea: z.number(),
    timerWarningThreshold: z.number(),
    interactiveTransition: z.number(),
})

export const UIColorsConfigSchema = z.object({
    toastSSR: z.string(),
    toastSR: z.string(),
    toastDefault: z.string(),
})

export const DialogueConfigSchema = z.object({
    typewriterSpeedNormal: z.number(),
    typewriterSpeedFast: z.number(),
})

export const UIDialogueTextSchema = z.object({
    npc: z.string(),
    emoji: z.string().optional(),
    text: z.string(),
    player: z.string(),
})

export const UITextConfigSchema = z.object({
    intro: UIDialogueTextSchema,
    game_complete: z.object({
        title: z.string(),
        subtitle: z.string(),
        emoji: z.string(),
        button: z.string(),
    }),
    default_fail: z.object({
        text: z.string(),
        player: z.string(),
    }),
})

export const DailyOrderConfigSchema = z.object({
    MAX_ACTIVE: z.number().int().positive(),
    REFRESH_COST: z.number().int().nonnegative(),
})

export const UITimerConfigSchema = z.object({
    achievementToastDisplay: z.number(),
    achievementToastFadeOut: z.number(),
    unlockConfirmAutoClose: z.number(),
    unlockConfirmCloseDelay: z.number(),
    unlockAnimation: z.number(),
    bossDefeatAnim: z.number(),
    dialogueAutoAdvance: z.number(),
    orderTimerInterval: z.number(),
    energyRegenInterval: z.number(),
    particleLifespan: z.number(),
    paradeStepInterval: z.number(),
    gachaRevealDelay: z.number(),
    gachaCardFlipDuration: z.number(),
    toastFadeOut: z.number(),
    bgmFadeIn: z.number(),
    bgmResumeFade: z.number(),
    affectionToastDisplay: z.number(),
    affectionLevelUpToastDisplay: z.number(),
    touchDialogueDisplay: z.number(),
    vnTitleDisplay: z.number(),
    bgmSwitchDelay: z.number(),
    itemUseDelay: z.number(),
    sparkleStartDelay: z.number(),
})

export const UIColorThemeConfigSchema = z.object({
    hpGradientHigh: z.string(),
    hpGradientMid: z.string(),
    hpGradientLow: z.string(),
    hpHighThreshold: z.number(),
    hpMidThreshold: z.number(),
    energyHighThreshold: z.number(),
    energyLowThreshold: z.number(),
    energyGradientHigh: z.string(),
    energyGradientMid: z.string(),
    energyGradientLow: z.string(),
})

export const UILayoutConfigSchema = z.object({
    unlockPopupMinOffset: z.number(),
    unlockParticleCount: z.number(),
    recycleParticleCount: z.number(),
})

export const SettingsDataSchema = z.object({
    GAME_CONFIG: GameSettingsConfigSchema,
    RECYCLE_ENERGY_TABLE: z.record(z.string(), z.number()),
    DAILY_ORDER_CONFIG: DailyOrderConfigSchema,
    CELL_UNLOCK_COSTS: z.array(z.number().int().nonnegative()),
    HEROINE_UPGRADES: z.array(HeroineUpgradeSchema),
    LOCKED_CELLS_INITIAL: z.array(z.number().int().nonnegative()),
    UNLOCK_PER_BOSS: z.array(z.array(z.number().int().nonnegative())),
    UI_ANIMATION: UIAnimationConfigSchema,
    UI_COLORS: UIColorsConfigSchema,
    DIALOGUE_CONFIG: DialogueConfigSchema,
    UI_TEXT: UITextConfigSchema,
    UI_TIMERS: UITimerConfigSchema,
    UI_COLOR_THEME: UIColorThemeConfigSchema,
    UI_LAYOUT: UILayoutConfigSchema,
})

export const ChainIdSchema = z.enum([
    'lips', 'perfume', 'study', 'food',
    'gen_makeup', 'gen_study', 'special',
])

export const RaritySchema = z.enum(['R', 'SR', 'SSR'])

export const GameItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    level: z.number().int().nonnegative(),
    chain: ChainIdSchema.or(z.literal('random')),
    nextId: z.string().nullable(),
    sellPrice: z.number().int().nonnegative().optional(),
    emoji: z.string(),
    color: z.string(),
    energyRecover: z.number().int().positive().optional(),
    type: z.enum([
        'GENERATOR', 'JOKER', 'SCISSOR', 'NORMAL',
        'ENERGY_POTION', 'SPECIAL', 'SURPRISE_BOX',
    ]).optional(),
    sellable: z.boolean().optional(),
    description: z.string().optional(),
})

export const GeneratorDropPoolEntrySchema = z.object({
    itemId: z.string(),
    weight: z.number(),
})

export const GeneratorSpecialDropSchema = z.object({
    chance: z.number(),
    items: z.array(GeneratorDropPoolEntrySchema),
})

export const GeneratorLevelConfigSchema = z.object({
    drop_pool: z.array(GeneratorDropPoolEntrySchema),
    free_production_chance: z.number(),
    capacity: z.number().int().nonnegative(),
    cooldown: z.number(),
    special_drop: GeneratorSpecialDropSchema.nullable(),
})

export const GeneratorConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    emoji: z.string(),
    chains: z.array(ChainIdSchema),
    levels: z.record(z.string(), GeneratorLevelConfigSchema),
})

export const OrderRequirementSchema = z.object({
    itemId: z.string(),
    count: z.number().int().positive(),
})

export const OrderDialogueSchema = z.object({
    npc: z.string(),
    player: z.string(),
})

export const LevelOrderSchema = z.object({
    id: z.string(),
    name: z.string(),
    required: z.array(OrderRequirementSchema),
    isTimed: z.boolean(),
    damage: z.number(),
    diamondReward: z.number().int().nonnegative(),
    dialogue: OrderDialogueSchema,
    timeLimit: z.number().positive().optional(),
    failText: z.string().optional(),
})

export const LevelDataSchema = z.object({
    id: z.number().int().nonnegative(),
    characterId: z.string(),
    bossName: z.string(),
    bossTitle: z.string(),
    bossAvatar: z.string(),
    bossColor: z.string(),
    bgGradient: z.string(),
    totalHp: z.number().int().positive(),
    orders: z.array(LevelOrderSchema),
})

export const AudioConfigSchema = z.object({
    defaults: z.object({
        masterVolume: z.number().min(0).max(1),
        bgmVolume: z.number().min(0).max(1),
        sfxVolume: z.number().min(0).max(1),
    }),
    fade: z.object({
        bgmFadeIn: z.number().nonnegative(),
        bgmFadeOut: z.number().nonnegative(),
        bgmResumeFade: z.number().nonnegative(),
        bgmCrossfade: z.number().nonnegative(),
        bgmSwitchDelay: z.number().nonnegative(),
    }),
    sfxRegistry: z.record(z.string(), z.object({
        file: z.string(),
        volume: z.number().min(0).max(1),
        enabled: z.boolean().optional(),
        triggerEvent: z.string().optional(),
    })),
    bgmRegistry: z.record(z.string(), z.object({
        file: z.string(),
        volume: z.number().min(0).max(1),
    })),
})
