import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import ParadeOverlay from '../../components/overlays/ParadeOverlay.vue'
import GameCompleteOverlay from '../../components/overlays/GameCompleteOverlay.vue'

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

describe('ParadeOverlay — C3: Transition + v-if', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountOverlay(visible = false) {
    return mount(ParadeOverlay, {
      props: { visible },
      global: {
        plugins: [pinia],
        stubs: { Transition: { template: '<div><slot /></div>' } }
      }
    })
  }

  it('C3: hidden when visible=false', () => {
    const wrapper = mountOverlay(false)
    expect(wrapper.find('#parade-overlay').exists()).toBe(false)
  })

  it('C3: visible when visible=true', async () => {
    const wrapper = mountOverlay(true)
    await nextTick()
    expect(wrapper.find('#parade-overlay').exists()).toBe(true)
  })

  it('C3: no .active class on overlay', async () => {
    const wrapper = mountOverlay(true)
    await nextTick()
    const overlay = wrapper.find('#parade-overlay')
    expect(overlay.classes()).not.toContain('active')
  })

  it('emits close', async () => {
    const wrapper = mountOverlay(true)
    await nextTick()
    wrapper.vm.$emit('close')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

describe('GameCompleteOverlay — C3: Transition + v-if', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountOverlay(visible = false) {
    return mount(GameCompleteOverlay, {
      props: { visible },
      global: {
        plugins: [pinia],
        stubs: { Transition: { template: '<div><slot /></div>' } }
      }
    })
  }

  it('C3: hidden when visible=false', () => {
    const wrapper = mountOverlay(false)
    expect(wrapper.find('#game-complete-overlay').exists()).toBe(false)
  })

  it('C3: visible when visible=true', async () => {
    const wrapper = mountOverlay(true)
    await nextTick()
    expect(wrapper.find('#game-complete-overlay').exists()).toBe(true)
  })

  it('C3: no .active class', async () => {
    const wrapper = mountOverlay(true)
    await nextTick()
    const overlay = wrapper.find('#game-complete-overlay')
    expect(overlay.classes()).not.toContain('active')
  })
})
