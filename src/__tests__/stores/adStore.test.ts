import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdStore } from '../../stores/adStore'
import { useConfigStore } from '../../stores/configStore'
import { applyResolveResult } from '../../composables/useGameLoop'
import { useApplyDeps } from '../../composables/useApplyDeps'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const testAdConfig = {
  energy: { reward: 20, dailyLimit: null, cooldownMs: 0, emoji: '⚡' },
  gold: { reward: 50, dailyLimit: 3, cooldownMs: 0, emoji: '💰' },
  diamonds: { reward: 50, dailyLimit: 3, cooldownMs: 0, emoji: '💎', betaBenefit: true },
  freePull: { dailyLimit: 1, cooldownMs: 0, maxRarity: 'SR', emoji: '🃏' },
}

function setupStore() {
  setActivePinia(createPinia())
  const configStore = useConfigStore()
  configStore.adConfig = testAdConfig as any
  configStore.gachaConfig = { tenPullCount: 10, freePullMaxRarity: 'SR' } as any
  configStore.gameConfig = { BOARD_COLS: 7, BOARD_ROWS: 9, MAX_ENERGY: 100, ENERGY_REGEN_CAP: 100, ENERGY_REGEN_INTERVAL: 120000, ENERGY_REGEN_AMOUNT: 1, ENERGY_COST_PER_SPAWN: 1, ENERGY_REGEN_DOWN_MULTIPLIER: 1.5 } as any
  const store = useAdStore()
  return store
}

describe('adStore — delegates to AdLogic/AdService', () => {
  let store: ReturnType<typeof useAdStore>

  beforeEach(() => {
    store = setupStore()
  })

  it('energy ad has unlimited daily limit (null = ∞)', () => {
    expect(store.canWatch('energy')).toBe(true)
  })

  it('gold ad has limited daily limit', () => {
    expect(store.canWatch('gold')).toBe(true)
    store.dailyAdCounts.gold = 3
    expect(store.canWatch('gold')).toBe(false)
  })

  it('watchAd returns ok=true and grants reward', () => {
    store.lastResetDate = todayStr()
    const result = store.watchAd('gold')
    expect(result.ok).toBe(true)
  })

  it('watchAd returns ok=false when limit reached', () => {
    store.lastResetDate = todayStr()
    store.dailyAdCounts.gold = 3
    const result = store.watchAd('gold')
    expect(result.ok).toBe(false)
  })

  it('getRemaining returns ∞ for energy (null limit)', () => {
    const remaining = store.getRemaining('energy')
    expect(remaining).toBe('∞')
  })

  it('getRemaining returns number for limited ads', () => {
    const remaining = store.getRemaining('gold')
    expect(remaining).toBe(3)
  })

  it('resetDaily resets all ad counts', () => {
    store.lastResetDate = todayStr()
    store.dailyAdCounts.gold = 3
    store.dailyAdCounts.diamonds = 2
    const rr = store.resetDaily()
    applyResolveResult(rr, useApplyDeps())
    expect(store.dailyAdCounts.gold).toBe(0)
    expect(store.dailyAdCounts.diamonds).toBe(0)
  })

  it('checkDailyReset detects new day', () => {
    store.lastResetDate = '2020-01-01'
    store.dailyAdCounts.gold = 3
    store.checkDailyReset()
    expect(store.dailyAdCounts.gold).toBe(0)
  })

  it('canWatchEnergyAd computed works', () => {
    expect(store.canWatchEnergyAd).toBe(true)
  })

  it('canWatchGoldAd computed works', () => {
    expect(store.canWatchGoldAd).toBe(true)
    store.dailyAdCounts.gold = 3
    expect(store.canWatchGoldAd).toBe(false)
  })
})
