import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHeroineStore } from '../../stores/heroineStore'
import { useConfigStore } from '../../stores/configStore'
import { useCurrencyStore } from '../../stores/currencyStore'
import { applyResolveResult } from '../../composables/useGameLoop'
import { useApplyDeps } from '../../composables/useApplyDeps'
import {
    createGameSettingsConfig,
    createGachaCostConfig,
    createGachaRarityConfig,
    createHeroineUpgrade,
} from '../helpers/configFactory'

describe('heroineStore — H7: affordability check + spend before upgrade', () => {
  let store: ReturnType<typeof useHeroineStore>
  let currencyStore: ReturnType<typeof useCurrencyStore>
  let applyDeps: ReturnType<typeof useApplyDeps>

  const mockUpgrades = [
    createHeroineUpgrade({
      id: 'energy_cap',
      name: 'Energy Cap',
      description: 'Increase energy cap',
      icon: '⚡',
      levels: [
        { cost: 50, value: 10, label: 'Lv1' },
        { cost: 100, value: 20, label: 'Lv2' },
        { cost: 200, value: 30, label: 'Lv3' },
      ],
    }),
    createHeroineUpgrade({
      id: 'daily_bonus',
      name: 'Daily Bonus',
      description: 'Increase daily gold',
      icon: '💰',
      levels: [
        { cost: 30, value: 1.5, label: 'Lv1' },
      ],
    }),
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.heroineUpgrades = mockUpgrades
    configStore.gameConfig = createGameSettingsConfig()
    configStore.gachaRarityConfig = createGachaRarityConfig()
    configStore.gachaCost = createGachaCostConfig()
    configStore.gachaSubWeights = {}
    configStore.gachaPool = []
    
    currencyStore = useCurrencyStore()
    store = useHeroineStore()
    applyDeps = useApplyDeps()
  })

  it('H7: purchaseUpgrade fails when not enough diamonds', () => {
    currencyStore.addDiamonds(10)
    const result = store.purchaseUpgrade('energy_cap')
    expect(result.ok).toBe(false)
    expect(store.getCurrentLevel('energy_cap')).toBe(-1)
  })

  it('H7: purchaseUpgrade succeeds and spends diamonds', () => {
    currencyStore.addDiamonds(100)
    const result = store.purchaseUpgrade('energy_cap')
    expect(result.ok).toBe(true)
    if (result.ok) {
      applyResolveResult(result.resolveResult, applyDeps)
    }
    expect(store.getCurrentLevel('energy_cap')).toBe(0)
    expect(currencyStore.diamonds).toBe(50)
  })

  it('H7: purchaseUpgrade levels up incrementally', () => {
    currencyStore.addDiamonds(350)
    let result = store.purchaseUpgrade('energy_cap')
    if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
    expect(store.getCurrentLevel('energy_cap')).toBe(0)
    result = store.purchaseUpgrade('energy_cap')
    if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
    expect(store.getCurrentLevel('energy_cap')).toBe(1)
    result = store.purchaseUpgrade('energy_cap')
    if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
    expect(store.getCurrentLevel('energy_cap')).toBe(2)
    expect(currencyStore.diamonds).toBe(0)
  })

  it('purchaseUpgrade fails when maxed', () => {
    currencyStore.addDiamonds(500)
    const result1 = store.purchaseUpgrade('daily_bonus')
    if (result1.ok) applyResolveResult(result1.resolveResult, applyDeps)
    expect(store.getCurrentLevel('daily_bonus')).toBe(0)
    const result2 = store.purchaseUpgrade('daily_bonus')
    expect(result2.ok).toBe(false)
  })

  it('purchaseUpgrade fails for unknown upgrade', () => {
    currencyStore.addDiamonds(1000)
    const result = store.purchaseUpgrade('nonexistent')
    expect(result.ok).toBe(false)
  })

  it('getEffectValue returns null for unpurchased', () => {
    expect(store.getEffectValue('energy_cap')).toBeNull()
  })

  it('getEffectValue returns value for purchased upgrade', () => {
    currencyStore.addDiamonds(100)
    const result = store.purchaseUpgrade('energy_cap')
    if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
    expect(store.getEffectValue('energy_cap')).toBe(10)
  })

  it('getNextCost returns correct cost', () => {
    expect(store.getNextCost('energy_cap')).toBe(50)
    currencyStore.addDiamonds(50)
    const result = store.purchaseUpgrade('energy_cap')
    if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
    expect(store.getNextCost('energy_cap')).toBe(100)
  })

  it('isMaxed works', () => {
    currencyStore.addDiamonds(500)
    const result = store.purchaseUpgrade('daily_bonus')
    if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
    expect(store.isMaxed('daily_bonus')).toBe(true)
  })

  it('maxedUpgrades computed works', () => {
    currencyStore.addDiamonds(500)
    const result = store.purchaseUpgrade('daily_bonus')
    if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
    expect(store.maxedUpgrades).toContain('daily_bonus')
  })

  it('purchasedUpgrades computed works', () => {
    expect(store.purchasedUpgrades.length).toBe(0)
    currencyStore.addDiamonds(50)
    const result = store.purchaseUpgrade('energy_cap')
    if (result.ok) applyResolveResult(result.resolveResult, applyDeps)
    expect(store.purchasedUpgrades.length).toBe(1)
  })
})
