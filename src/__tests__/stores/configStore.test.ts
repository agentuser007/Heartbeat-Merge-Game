import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfigStore } from '../../stores/configStore'

describe('configStore.deepMerge', () => {
  let store: ReturnType<typeof useConfigStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useConfigStore()
  })

  it('merges flat objects', () => {
    const result = store.deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })
    expect(result).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('merges nested objects recursively', () => {
    const result = store.deepMerge(
      { a: { x: 1, y: 2 } },
      { a: { y: 3, z: 4 } }
    )
    expect(result).toEqual({ a: { x: 1, y: 3, z: 4 } })
  })

  it('overlay null preserves base', () => {
    const result = store.deepMerge({ a: 1 }, { a: null })
    expect(result).toEqual({ a: 1 })
  })

  it('overlay undefined preserves base', () => {
    const result = store.deepMerge({ a: 1 }, { a: undefined })
    expect(result).toEqual({ a: 1 })
  })

  it('overlay primitive wins over base', () => {
    const result = store.deepMerge({ a: 1 }, { a: 'hello' })
    expect(result).toEqual({ a: 'hello' })
  })

  it('merges arrays by index (no id fields)', () => {
    const result = store.deepMerge([1, 2, 3], [10, 20])
    expect(result).toEqual([10, 20, 3])
  })

  it('merges arrays by id matching', () => {
    const base = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }]
    const overlay = [{ id: 'b', value: 20 }]
    const result = store.deepMerge(base, overlay)
    expect(result).toEqual([{ id: 'a', value: 1 }, { id: 'b', value: 20 }])
  })

  it('C1 fix: appends overlay array entries whose id is not in base', () => {
    const base = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }]
    const overlay = [{ id: 'b', value: 20 }, { id: 'c', value: 3 }]
    const result = store.deepMerge(base, overlay)
    expect(result).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 20 },
      { id: 'c', value: 3 }
    ])
  })

  it('base is null returns overlay', () => {
    const result = store.deepMerge(null, { a: 1 })
    expect(result).toEqual({ a: 1 })
  })

  it('overlay is empty object returns base', () => {
    const result = store.deepMerge({ a: 1 }, {})
    expect(result).toEqual({ a: 1 })
  })

  it('deep merges objects within id-matched arrays', () => {
    const base = [{ id: 'x', data: { nested: 1, other: 2 } }]
    const overlay = [{ id: 'x', data: { nested: 10 } }]
    const result = store.deepMerge(base, overlay)
    expect(result[0].data).toEqual({ nested: 10, other: 2 })
  })
})
