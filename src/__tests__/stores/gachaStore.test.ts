import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGachaStore } from '../../stores/gachaStore'
import { useConfigStore } from '../../stores/configStore'

describe('gachaStore — H8: freePull/canFreePull', () => {
  let store: ReturnType<typeof useGachaStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.gachaRarityConfig = {
      R: { probability: 1.0, color: '#4A90D9', glow: 'blue' }
    }
    configStore.gachaCost = { singleCost: 100, tenCost: 900 }
    configStore.gachaSubWeights = { R: {}, SR: {}, SSR: {} }
    configStore.gachaPoolV2 = [
      { id: 'item_r1', name: 'R Item 1', rarity: 'R', chain: 'chain1' },
      { id: 'item_sr1', name: 'SR Item 1', rarity: 'SR', chain: 'chain1' },
      { id: 'item_ssr1', name: 'SSR Item 1', rarity: 'SSR', chain: 'chain1' },
    ]
    configStore.gachaPool = configStore.gachaPoolV2
    configStore.gameConfig = { MAX_ENERGY: 100, BOARD_COLS: 5, BOARD_ROWS: 5, ENERGY_REGEN_INTERVAL: 3000, ENERGY_REGEN_CAP: 100 }
    
    store = useGachaStore()
  })

  it('H8: canFreePull is true when freePullsLeft > 0 and different day', () => {
    store.freePullsLeft = 1
    store.lastFreePullDate = '2020-01-01'
    expect(store.canFreePull).toBe(true)
  })

  it('H8: canFreePull is false when freePullsLeft is 0', () => {
    store.freePullsLeft = 0
    store.lastFreePullDate = '2020-01-01'
    expect(store.canFreePull).toBe(false)
  })

  it('H8: canFreePull is false when already pulled today', () => {
    store.freePullsLeft = 1
    store.lastFreePullDate = new Date().toISOString().split('T')[0]
    expect(store.canFreePull).toBe(false)
  })

  it('H8: freePull decrements freePullsLeft and updates date', () => {
    store.freePullsLeft = 1
    store.lastFreePullDate = '2020-01-01'
    store.freePull()
    expect(store.freePullsLeft).toBe(0)
    expect(store.lastFreePullDate).toBe(new Date().toISOString().split('T')[0])
  })

  it('H8: freePull returns null when cannot free pull', () => {
    store.freePullsLeft = 0
    store.lastFreePullDate = '2020-01-01'
    const result = store.freePull()
    expect(result).toBeNull()
  })

  it('singlePull returns a result item', () => {
    const result = store.singlePull()
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('rarity')
    expect(result).toHaveProperty('id')
    expect(result!.rarity).toBe('R')
  })

  it('SSR ownership tracked in ssrOwned', () => {
    store.ssrOwned = {}
    const result = store.singlePull('SSR')
    if (result?.rarity === 'SSR') {
      expect(store.ssrOwned[result.id]).toBe(true)
    }
  })

  it('markSSROwned tracks first-time ownership', () => {
    const isFirst = store.markSSROwned('ssr_test')
    expect(isFirst).toBe(true)
    const isSecond = store.markSSROwned('ssr_test')
    expect(isSecond).toBe(false)
  })

  it('resetResults clears results', () => {
    store.singlePull()
    expect(store.results.length).toBeGreaterThan(0)
    store.resetResults()
    expect(store.results.length).toBe(0)
  })

  it('hasResults computed works', () => {
    expect(store.hasResults).toBe(false)
    store.singlePull()
    expect(store.hasResults).toBe(true)
  })

  it('canAffordSingle checks diamonds', () => {
    expect(store.canAffordSingle({ diamonds: 50 })).toBe(false)
    expect(store.canAffordSingle({ diamonds: 100 })).toBe(true)
  })

  it('canAffordTen checks diamonds', () => {
    expect(store.canAffordTen({ diamonds: 500 })).toBe(false)
    expect(store.canAffordTen({ diamonds: 900 })).toBe(true)
  })

  it('serialize/deserialize round-trip', () => {
    store.freePullsLeft = 2
    store.ssrOwned = { ssr1: true }
    const data = store.serialize()
    store.freePullsLeft = 0
    store.ssrOwned = {}
    store.deserialize(data)
    expect(store.freePullsLeft).toBe(2)
    expect(store.ssrOwned.ssr1).toBe(true)
  })
})
