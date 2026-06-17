import { z } from 'zod'

export const AffectionLevelDefSchema = z.object({
    level: z.number().int().nonnegative(),
    name: z.string(),
    minPoints: z.number().int().nonnegative(),
    maxPoints: z.number().int().nonnegative(),
})

export const AffectionCharacterDefSchema = z.object({
    id: z.string(),
    name: z.string(),
    nameEn: z.string(),
    color: z.string(),
    avatar: z.string(),
    background: z.string(),
})

export const AffectionSourcesConfigSchema = z.object({
    bossDefeat: z.object({
        base: z.number().int().positive(),
        perLoop: z.number().int().positive(),
    }),
    vnStorySR: z.number().int().positive(),
    vnStorySSR: z.number().int().positive(),
    touchBase: z.object({
        min: z.number().int().nonnegative(),
        max: z.number().int().positive(),
    }),
    dailyOrderBonus: z.number().int().positive(),
    specialEvent: z.object({
        min: z.number().int().nonnegative(),
        max: z.number().int().positive(),
    }),
})

export const AffectionConfigSchema = z.object({
    levels: z.array(AffectionLevelDefSchema),
    characters: z.array(AffectionCharacterDefSchema),
    bossToCharacter: z.record(z.string(), z.string()),
    sources: AffectionSourcesConfigSchema,
    touchCooldown: z.number().int().nonnegative(),
    dailyTouchBonus: z.object({
        threshold: z.number().int().nonnegative(),
        bonus: z.number().int().nonnegative(),
    }),
    giftPreferenceMultipliers: z.object({
        loved: z.number().positive(),
        liked: z.number().positive(),
    }).optional(),
    affectionCoins: z.object({
        earnRate: z.number().nonnegative(),
        levelUpBonuses: z.record(z.string(), z.number()),
    }),
})

export const SensorySignatureSchema = z.object({
    smell: z.string(),
    touch: z.string(),
    sound: z.string(),
    taste: z.string(),
})

export const CharacterGiftsSchema = z.object({
    loved: z.array(z.string()),
    liked: z.array(z.string()),
    normal: z.array(z.string()),
})

export const CharacterProfileSchema = z.object({
    name: z.string(),
    nameEn: z.string(),
    color: z.string(),
    avatar: z.string(),
    background: z.string(),
    birthday: z.string(),
    title: z.string(),
    likes: z.array(z.string()),
    dislikes: z.array(z.string()),
    sensorySignature: SensorySignatureSchema,
    gifts: CharacterGiftsSchema,
})

export const TouchZoneSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    unlockLevel: z.number().int().nonnegative(),
})

const TouchResponseSchema = z.object({
    dialogue: z.string(),
    affection: z.number().int().nonnegative(),
    animation: z.string(),
}).passthrough()

export const TouchInteractionsConfigSchema = z.object({
    zones: z.array(TouchZoneSchema),
    responses: z.record(
        z.string(),
        z.record(
            z.string(),
            z.record(z.string(), TouchResponseSchema),
        ),
    ),
})

export const AffectionShopCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
})

export const AffectionShopItemSchema = z.object({
    id: z.string(),
    categoryId: z.string(),
    name: z.string(),
    icon: z.string(),
    price: z.number().int().nonnegative(),
    unlockLevel: z.number().int().nonnegative(),
    dailyLimit: z.number().int().positive().nullable(),
    characterId: z.string().nullable(),
    effect: z.object({
        type: z.string(),
    }).passthrough(),
    thankDialogue: z.string().optional(),
    giftPreference: z.string().optional(),
})

export const AffectionShopConfigSchema = z.object({
    categories: z.array(AffectionShopCategorySchema),
    items: z.array(AffectionShopItemSchema),
})
