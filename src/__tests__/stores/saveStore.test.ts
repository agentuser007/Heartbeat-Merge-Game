import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSaveStore } from '../../stores/saveStore'

describe('saveStore — H2: old saves auto-deleted on version mismatch', () => {
  let store: ReturnType<typeof useSaveStore>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    store = useSaveStore()
  })

  it('loadAll returns false when no saves exist', () => {
    expect(store.loadAll()).toBe(false)
  })

  it('H2: loadAll clears all saves when meta version mismatches', () => {
    localStorage.setItem('heartbeat_merge_meta', JSON.stringify({ version: 1, timestamp: 0 }))
    localStorage.setItem('heartbeat_merge_run', JSON.stringify({ version: 1, timestamp: 0 }))
    const result = store.loadAll()
    expect(result).toBe(false)
    expect(localStorage.getItem('heartbeat_merge_meta')).toBeNull()
    expect(localStorage.getItem('heartbeat_merge_run')).toBeNull()
  })

  it('loadAll returns true for valid current-version save', () => {
    localStorage.setItem('heartbeat_merge_meta', JSON.stringify({ version: 4, timestamp: Date.now() }))
    const result = store.loadAll()
    expect(result).toBe(true)
  })

  it('clearAll removes all save keys', () => {
    localStorage.setItem('heartbeat_merge_meta', '{"version":4}')
    localStorage.setItem('heartbeat_merge_run', '{"version":4}')
    localStorage.setItem('heartbeat_merge_save', '{"version":1}')
    store.clearAll()
    expect(localStorage.getItem('heartbeat_merge_meta')).toBeNull()
    expect(localStorage.getItem('heartbeat_merge_run')).toBeNull()
    expect(localStorage.getItem('heartbeat_merge_save')).toBeNull()
    expect(store.hasSave).toBe(false)
  })

  it('clearRun only removes run key', () => {
    localStorage.setItem('heartbeat_merge_meta', '{"version":4}')
    localStorage.setItem('heartbeat_merge_run', '{"version":4}')
    store.clearRun()
    expect(localStorage.getItem('heartbeat_merge_meta')).not.toBeNull()
    expect(localStorage.getItem('heartbeat_merge_run')).toBeNull()
  })

  it('canSave is true when not saving', () => {
    expect(store.canSave).toBe(true)
  })

  it('checkHasSave returns true when meta exists', () => {
    localStorage.setItem('heartbeat_merge_meta', '{}')
    expect(store.checkHasSave()).toBe(true)
  })

  it('checkHasSave returns true when run exists', () => {
    localStorage.setItem('heartbeat_merge_run', '{}')
    expect(store.checkHasSave()).toBe(true)
  })

  it('checkHasSave returns false when neither exists', () => {
    expect(store.checkHasSave()).toBe(false)
  })
})
