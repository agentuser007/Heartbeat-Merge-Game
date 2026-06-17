import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSaveStore } from '../../stores/saveStore'
import { useConfigStore } from '../../stores/configStore'

describe('saveStore — H2: old saves auto-deleted on version mismatch', () => {
  let store: ReturnType<typeof useSaveStore>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.gameConfig = { BOARD_COLS: 7, BOARD_ROWS: 9, MAX_ENERGY: 100, ENERGY_REGEN_CAP: 100, ENERGY_REGEN_INTERVAL: 120000, ENERGY_REGEN_AMOUNT: 1, ENERGY_COST_PER_SPAWN: 1, ENERGY_REGEN_DOWN_MULTIPLIER: 1.5 } as any
    store = useSaveStore()
  })

  it('loadAll returns false when no saves exist', () => {
    expect(store.loadAll()).toBe(false)
  })

  it('H2: loadAll migrates old-version saves', () => {
    localStorage.setItem('heartbeat_merge_meta', JSON.stringify({ version: 1, timestamp: 0 }))
    localStorage.setItem('heartbeat_merge_run', JSON.stringify({ version: 1, timestamp: 0 }))
    const result = store.loadAll()
    expect(result).toBe(true)
  })

  it('H2: loadAll clears future-version saves', () => {
    localStorage.setItem('heartbeat_merge_meta', JSON.stringify({ version: 99, timestamp: 0 }))
    localStorage.setItem('heartbeat_merge_run', JSON.stringify({ version: 99, timestamp: 0 }))
    const result = store.loadAll()
    expect(result).toBe(false)
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
