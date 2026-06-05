import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdStore } from '../../stores/adStore'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('adStore — H1: side effects removed from computed', () => {
  let store: ReturnType<typeof useAdStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAdStore()
  })

  it('energy ad has unlimited daily limit (Infinity)', () => {
    expect(store.canWatch('energy')).toBe(true)
  })

  it('gold ad has limited daily limit', () => {
    expect(store.canWatch('gold')).toBe(true)
    store.dailyAdCounts.gold = 3
    expect(store.canWatch('gold')).toBe(false)
  })

  it('watchAd returns true and grants reward', () => {
    store.lastResetDate = todayStr()
    const result = store.watchAd('gold')
    expect(result).toBe(true)
    expect(store.dailyAdCounts.gold).toBe(1)
  })

  it('watchAd returns false when limit reached', () => {
    store.lastResetDate = todayStr()
    store.dailyAdCounts.gold = 3
    const result = store.watchAd('gold')
    expect(result).toBe(false)
  })

  it('getRemaining returns ∞ for energy (Infinity limit)', () => {
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
    store.resetDaily()
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
