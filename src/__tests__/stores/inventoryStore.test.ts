import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '../../stores/inventoryStore'

describe('inventoryStore — C8: slot-count capacity model', () => {
  let store: ReturnType<typeof useInventoryStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useInventoryStore()
  })

  it('starts empty', () => {
    expect(store.totalItems).toBe(0)
    expect(store.isEmpty).toBe(true)
    expect(store.isFull).toBe(false)
  })

  it('C8: totalItems counts occupied slots (unique item IDs), not total count', () => {
    store.addItem('item_a', 3)
    expect(store.totalItems).toBe(1)
    store.addItem('item_b', 5)
    expect(store.totalItems).toBe(2)
  })

  it('C8: addItem for existing item ID does not increase slot count', () => {
    store.addItem('item_a', 2)
    expect(store.totalItems).toBe(1)
    store.addItem('item_a', 3)
    expect(store.totalItems).toBe(1)
    expect(store.getCount('item_a')).toBe(5)
  })

  it('isFull when slots reach maxSlots', () => {
    for (let i = 0; i < 20; i++) {
      store.addItem(`item_${i}`, 1)
    }
    expect(store.isFull).toBe(true)
    expect(store.totalItems).toBe(20)
  })

  it('addItem fails when full (no available slots for new item)', () => {
    for (let i = 0; i < 20; i++) {
      store.addItem(`item_${i}`, 1)
    }
    const result = store.addItem('new_item', 1)
    expect(result).toBe(false)
  })

  it('addItem succeeds for existing item even when full', () => {
    for (let i = 0; i < 20; i++) {
      store.addItem(`item_${i}`, 1)
    }
    const result = store.addItem('item_0', 5)
    expect(result).toBe(true)
    expect(store.getCount('item_0')).toBe(6)
  })

  it('removeItem decreases count', () => {
    store.addItem('item_a', 3)
    store.removeItem('item_a', 1)
    expect(store.getCount('item_a')).toBe(2)
    expect(store.totalItems).toBe(1)
  })

  it('removeItem to 0 removes slot', () => {
    store.addItem('item_a', 2)
    store.removeItem('item_a', 2)
    expect(store.getCount('item_a')).toBe(0)
    expect(store.totalItems).toBe(0)
    expect(store.isEmpty).toBe(true)
  })

  it('availableSlots = maxSlots - totalItems', () => {
    store.addItem('item_a', 1)
    store.addItem('item_b', 1)
    expect(store.availableSlots).toBe(18)
  })

  it('expandSlots increases maxSlots', () => {
    store.expandSlots(5)
    expect(store.maxSlots).toBe(25)
  })

  it('hasItem works', () => {
    store.addItem('item_a', 1)
    expect(store.hasItem('item_a')).toBe(true)
    expect(store.hasItem('item_b')).toBe(false)
  })

  it('getItemIds returns occupied IDs', () => {
    store.addItem('a', 1)
    store.addItem('b', 2)
    expect(store.getItemIds()).toEqual(['a', 'b'])
  })

  it('clear empties all slots', () => {
    store.addItem('a', 1)
    store.addItem('b', 2)
    store.clear()
    expect(store.isEmpty).toBe(true)
    expect(store.totalItems).toBe(0)
  })

  it('serialize/deserialize round-trip', () => {
    store.addItem('a', 3)
    store.addItem('b', 1)
    const data = store.serialize()
    store.clear()
    store.deserialize(data)
    expect(store.getCount('a')).toBe(3)
    expect(store.getCount('b')).toBe(1)
    expect(store.totalItems).toBe(2)
  })
})
