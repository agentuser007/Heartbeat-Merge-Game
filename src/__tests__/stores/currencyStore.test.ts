import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCurrencyStore } from '../../stores/currencyStore'

describe('currencyStore', () => {
  let store: ReturnType<typeof useCurrencyStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCurrencyStore()
  })

  it('starts with 0 gold and 0 diamonds', () => {
    expect(store.gold).toBe(0)
    expect(store.diamonds).toBe(0)
  })

  it('addGold increases gold', () => {
    store.addGold(100)
    expect(store.gold).toBe(100)
  })

  it('spendGold decreases gold when affordable', () => {
    store.addGold(100)
    const result = store.spendGold(30)
    expect(result).toBe(true)
    expect(store.gold).toBe(70)
  })

  it('spendGold fails when not enough gold', () => {
    store.addGold(50)
    const result = store.spendGold(100)
    expect(result).toBe(false)
    expect(store.gold).toBe(50)
  })

  it('canAffordGold checks correctly', () => {
    store.addGold(50)
    expect(store.canAffordGold(50)).toBe(true)
    expect(store.canAffordGold(51)).toBe(false)
  })

  it('addDiamonds increases diamonds', () => {
    store.addDiamonds(10)
    expect(store.diamonds).toBe(10)
  })

  it('spendDiamonds decreases diamonds when affordable', () => {
    store.addDiamonds(20)
    const result = store.spendDiamonds(5)
    expect(result).toBe(true)
    expect(store.diamonds).toBe(15)
  })

  it('spendDiamonds fails when not enough', () => {
    store.addDiamonds(5)
    const result = store.spendDiamonds(10)
    expect(result).toBe(false)
    expect(store.diamonds).toBe(5)
  })

  it('totalBalance = gold + diamonds', () => {
    store.addGold(100)
    store.addDiamonds(50)
    expect(store.totalBalance).toBe(150)
  })

  it('formatGold formats correctly', () => {
    expect(store.formatGold(500)).toBe('500')
    expect(store.formatGold(1500)).toBe('1.5K')
    expect(store.formatGold(2500000)).toBe('2.5M')
  })

  it('serialize/deserialize round-trip', () => {
    store.addGold(100)
    store.addDiamonds(50)
    const data = store.serialize()
    store.deserialize({ gold: 0, diamonds: 0 })
    expect(store.gold).toBe(0)
    store.deserialize(data)
    expect(store.gold).toBe(100)
    expect(store.diamonds).toBe(50)
  })
})
