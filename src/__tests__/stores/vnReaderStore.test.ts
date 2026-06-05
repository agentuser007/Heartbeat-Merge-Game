import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVNReaderStore } from '../../stores/vnReaderStore'
import { useI18nStore } from '../../stores/i18nStore'

describe('vnReaderStore — H12: auto/skip mutual exclusion', () => {
  let store: ReturnType<typeof useVNReaderStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    const i18nStore = useI18nStore()
    i18nStore.texts = {
      vn_reader: {
        end: '—— 完 ——',
        chapterEnded: '章节已结束，点击任意处返回',
        narrator: '旁白',
      }
    }
    store = useVNReaderStore()
  })

  it('H12: toggleAuto disables skipMode', () => {
    store.skipMode = true
    store.toggleAuto()
    expect(store.autoMode).toBe(true)
    expect(store.skipMode).toBe(false)
  })

  it('H12: toggleSkip disables autoMode', () => {
    store.autoMode = true
    store.toggleSkip()
    expect(store.skipMode).toBe(true)
    expect(store.autoMode).toBe(false)
  })

  it('H12: auto and skip are never both true', () => {
    store.autoMode = true
    store.toggleSkip()
    expect(store.autoMode).toBe(false)
    expect(store.skipMode).toBe(true)
    
    store.toggleAuto()
    expect(store.autoMode).toBe(true)
    expect(store.skipMode).toBe(false)
  })

  it('close resets both auto and skip', () => {
    store.autoMode = true
    store.isOpen = true
    store.close()
    expect(store.autoMode).toBe(false)
    expect(store.skipMode).toBe(false)
    expect(store.isOpen).toBe(false)
  })

  it('toggleHistory toggles showingHistory', () => {
    expect(store.showingHistory).toBe(false)
    store.toggleHistory()
    expect(store.showingHistory).toBe(true)
    store.toggleHistory()
    expect(store.showingHistory).toBe(false)
  })

  it('advance increments currentIndex when not typing', () => {
    store.lines = [{ speaker: 'A', text: 'Hello' }, { speaker: 'B', text: 'World' }]
    store.currentIndex = 0
    store.isTyping = false
    store.advance()
    expect(store.currentIndex).toBe(1)
  })

  it('advance signals skip when typing', () => {
    store.isTyping = true
    store.advance()
    expect(store.isTyping).toBe(false)
  })

  it('showEnd sets ended=true and disables auto/skip', () => {
    store.autoMode = true
    store.showEnd()
    expect(store.ended).toBe(true)
    expect(store.autoMode).toBe(false)
    expect(store.skipMode).toBe(false)
  })
})
