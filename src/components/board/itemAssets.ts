import type { GameItem } from '@/types/game'

const assetBase = import.meta.env.BASE_URL + 'assets/items/'

const chainAssets: Partial<Record<GameItem['chain'], string[]>> = {
  food: ['donut.png', 'sandwich.png', 'popsicle.png', 'pizza.png', '3d_food_1.png', '3d_food_2.png', '3d_food_3.png', '3d_food_main.png'],
  lips: ['popsicle.png', 'donut.png', '3d_food_2.png', '3d_food_3.png'],
  perfume: ['3d_food_1.png', '3d_food_2.png', '3d_food_3.png', '3d_food_main.png'],
  study: ['book-03.svg', 'Trophy.svg', '3d_food_1.png', '3d_food_main.png'],
  gen_makeup: ['donut.png', '3d_food_main.png', 'sandwich.png', 'popsicle.png'],
  gen_study: ['book-03.svg', '3d_food_1.png', 'Trophy.svg', '3d_food_main.png'],
  special: ['diamond.svg', 'lightning-02.svg', 'gacha.svg', 'shop.svg'],
}

const typeAssets: Partial<Record<NonNullable<GameItem['type']>, string>> = {
  GENERATOR: 'donut.png',
  JOKER: 'gacha.svg',
  SCISSOR: 'shop.svg',
  ENERGY_POTION: 'lightning-02.svg',
  SPECIAL: 'diamond.svg',
  SURPRISE_BOX: 'gacha.svg',
}

export function getItemAsset(item: GameItem | null | undefined): string | null {
  if (!item) return null

  const typedAsset = item.type ? typeAssets[item.type] : null
  if (typedAsset) return assetBase + typedAsset

  const assets = chainAssets[item.chain]
  if (!assets || assets.length === 0) return null

  const levelIndex = Math.max(0, item.level - 1)
  return assetBase + assets[levelIndex % assets.length]
}
