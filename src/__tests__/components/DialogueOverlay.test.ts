import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import DialogueOverlay from '../../components/overlays/DialogueOverlay.vue'
import { useDialogueStore } from '../../stores/dialogueStore'

vi.mock('../../composables/useAudio', () => ({
  useAudio: () => ({
    init: vi.fn(),
    preloadAll: vi.fn(),
    playSound: vi.fn(),
    playBGM: vi.fn(),
    pauseBGM: vi.fn(),
    tryResumeBGM: vi.fn(),
    setBGMVolume: vi.fn(),
    muteAudio: vi.fn(),
    unmuteAudio: vi.fn(),
    getCurrentBGM: vi.fn(() => null),
  })
}))

vi.mock('../../stores/i18nStore', () => ({
  useI18nStore: vi.fn(() => ({
    t: (key: string) => key,
    emoji: () => '',
    locale: 'zh',
    texts: {},
    emojis: {},
    uiConfig: {},
    loaded: true,
    supportedLocales: ['zh', 'en'],
  }))
}))

describe('DialogueOverlay — C3+H13: Transition + v-if visibility', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountOverlay() {
    return mount(DialogueOverlay, {
      global: {
        plugins: [pinia],
        stubs: {
          Transition: {
            template: '<div><slot /></div>'
          }
        }
      }
    })
  }

  it('C3: does not render when dialogue is closed', () => {
    const wrapper = mountOverlay()
    expect(wrapper.find('#dialogue-overlay').exists()).toBe(false)
  })

  it('C3: renders when dialogue is open', async () => {
    const wrapper = mountOverlay()
    const dialogueStore = useDialogueStore()
    dialogueStore.show('NPC', '😊', 'Hello', '')
    await nextTick()
    expect(wrapper.find('#dialogue-overlay').exists()).toBe(true)
  })

  it('C3: no hardcoded class="active" on overlay element', async () => {
    const wrapper = mountOverlay()
    const dialogueStore = useDialogueStore()
    dialogueStore.show('NPC', '😊', 'Hello', '')
    await nextTick()
    const overlay = wrapper.find('#dialogue-overlay')
    expect(overlay.classes()).not.toContain('active')
  })

  it('visibility toggles with isOpen', async () => {
    const wrapper = mountOverlay()
    const dialogueStore = useDialogueStore()
    dialogueStore.show('NPC', '😊', 'Hello', '')
    await nextTick()
    expect(wrapper.find('#dialogue-overlay').exists()).toBe(true)
    dialogueStore.close()
    await nextTick()
    expect(wrapper.find('#dialogue-overlay').exists()).toBe(false)
  })

  it('shows skip button while typing', async () => {
    const wrapper = mountOverlay()
    const dialogueStore = useDialogueStore()
    dialogueStore.show('NPC', '😊', 'Hello World!', '')
    await nextTick()
    const skipBtn = wrapper.find('#dialogue-skip-btn')
    expect(skipBtn.exists()).toBe(true)
  })

  it('clicking overlay backdrop triggers close', async () => {
    const wrapper = mountOverlay()
    const dialogueStore = useDialogueStore()
    dialogueStore.show('NPC', '😊', 'Hello', '')
    await nextTick()
    await wrapper.find('#dialogue-overlay').trigger('click')
    expect(dialogueStore.isOpen).toBe(false)
  })
})
