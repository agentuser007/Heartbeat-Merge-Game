import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHeroineStore } from '../../stores/heroineStore'
import { useConfigStore } from '../../stores/configStore'
import { useCurrencyStore } from '../../stores/currencyStore'

describe('heroineStore — H7: affordability check + spend before upgrade', () => {
  let store: ReturnType<typeof useHeroineStore>
  let currencyStore: ReturnType<typeof useCurrencyStore>

  const mockUpgrades = [
    {
      id: 'energy_cap',
      name: 'Energy Cap',
      description: 'Increase energy cap',
      icon: '⚡',
      levels: [
        { level: 0, label: 'Lv1', cost: 50, value: 10 },
        { level: 1, label: 'Lv2', cost: 100, value: 20 },
        { level: 2, label: 'Lv3', cost: 200, value: 30 },
      ]
    },
    {
      id: 'daily_bonus',
      name: 'Daily Bonus',
      description: 'Increase daily gold',
      icon: '💰',
      levels: [
        { level: 0, label: 'Lv1', cost: 30, value: 1.5 },
      ]
    }
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.heroineUpgrades = mockUpgrades
    configStore.gameConfig = { MAX_ENERGY: 100, BOARD_COLS: 5, BOARD_ROWS: 5, ENERGY_REGEN_INTERVAL: 3000, ENERGY_REGEN_CAP: 100 }
    configStore.gachaRarityConfig = {}
    configStore.gachaCost = {}
    configStore.gachaSubWeights = {}
    configStore.gachaPoolV2 = []
    configStore.gachaPool = []
    
    currencyStore = useCurrencyStore()
    store = useHeroineStore()
  })

  it('H7: purchaseUpgrade fails when not enough diamonds', () => {
    currencyStore.addDiamonds(10)
    const result = store.purchaseUpgrade('energy_cap')
    expect(result).toBe(false)
    expect(store.getCurrentLevel('energy_cap')).toBe(-1)
  })

  it('H7: purchaseUpgrade succeeds and spends diamonds', () => {
    currencyStore.addDiamonds(100)
    const result = store.purchaseUpgrade('energy_cap')
    expect(result).toBe(true)
    expect(store.getCurrentLevel('energy_cap')).toBe(0)
    expect(currencyStore.diamonds).toBe(50)
  })

  it('H7: purchaseUpgrade levels up incrementally', () => {
    currencyStore.addDiamonds(350)
    store.purchaseUpgrade('energy_cap')
    expect(store.getCurrentLevel('energy_cap')).toBe(0)
    store.purchaseUpgrade('energy_cap')
    expect(store.getCurrentLevel('energy_cap')).toBe(1)
    store.purchaseUpgrade('energy_cap')
    expect(store.getCurrentLevel('energy_cap')).toBe(2)
    expect(currencyStore.diamonds).toBe(0)
  })

  it('purchaseUpgrade fails when maxed', () => {
    currencyStore.addDiamonds(500)
    store.purchaseUpgrade('daily_bonus')
    expect(store.getCurrentLevel('daily_bonus')).toBe(0)
    const result = store.purchaseUpgrade('daily_bonus')
    expect(result).toBe(false)
  })

  it('purchaseUpgrade fails for unknown upgrade', () => {
    currencyStore.addDiamonds(1000)
    const result = store.purchaseUpgrade('nonexistent')
    expect(result).toBe(false)
  })

  it('getEffectValue returns null for unpurchased', () => {
    expect(store.getEffectValue('energy_cap')).toBeNull()
  })

  it('getEffectValue returns value for purchased upgrade', () => {
    currencyStore.addDiamonds(100)
    store.purchaseUpgrade('energy_cap')
    expect(store.getEffectValue('energy_cap')).toBe(10)
  })

  it('getNextCost returns correct cost', () => {
    expect(store.getNextCost('energy_cap')).toBe(50)
    currencyStore.addDiamonds(50)
    store.purchaseUpgrade('energy_cap')
    expect(store.getNextCost('energy_cap')).toBe(100)
  })

  it('isMaxed works', () => {
    currencyStore.addDiamonds(500)
    store.purchaseUpgrade('daily_bonus')
    expect(store.isMaxed('daily_bonus')).toBe(true)
  })

  it('maxedUpgrades computed works', () => {
    currencyStore.addDiamonds(500)
    store.purchaseUpgrade('daily_bonus')
    expect(store.maxedUpgrades).toContain('daily_bonus')
  })

  it('purchasedUpgrades computed works', () => {
    expect(store.purchasedUpgrades.length).toBe(0)
    currencyStore.addDiamonds(50)
    store.purchaseUpgrade('energy_cap')
    expect(store.purchasedUpgrades.length).toBe(1)
  })
})
