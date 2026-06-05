import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BaseBottomSheet from '../../components/sheets/BaseBottomSheet.vue'

describe('BaseBottomSheet — C3+H13: Transition-based visibility', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  function mountSheet(props = {}) {
    return mount(BaseBottomSheet, {
      props: {
        modelValue: false,
        sheetId: 'test-sheet',
        title: 'Test',
        icon: '📦',
        ...props
      },
      slots: {
        default: '<div class="test-content">Content</div>'
      },
      global: { plugins: [pinia] },
      attachTo: document.body
    })
  }

  it('C3: does not render when modelValue is false', () => {
    mountSheet({ modelValue: false })
    expect(document.body.querySelector('.bottom-sheet')).toBeNull()
    expect(document.body.querySelector('.bottom-sheet-backdrop')).toBeNull()
  })

  it('C3: renders when modelValue is true', () => {
    mountSheet({ modelValue: true })
    expect(document.body.querySelector('.bottom-sheet')).not.toBeNull()
    expect(document.body.querySelector('.bottom-sheet-backdrop')).not.toBeNull()
  })

  it('C3: visibility controlled by v-if, NOT by CSS class', async () => {
    const wrapper = mountSheet({ modelValue: false })
    expect(document.body.querySelector('.bottom-sheet')).toBeNull()
    await wrapper.setProps({ modelValue: true })
    expect(document.body.querySelector('.bottom-sheet')).not.toBeNull()
    await wrapper.setProps({ modelValue: false })
    expect(document.body.querySelector('.bottom-sheet')).toBeNull()
  })

  it('emits update:modelValue=false on backdrop click', async () => {
    const wrapper = mountSheet({ modelValue: true })
    const backdrop = document.body.querySelector('.bottom-sheet-backdrop') as HTMLElement
    backdrop.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('emits update:modelValue=false on close button click', async () => {
    const wrapper = mountSheet({ modelValue: true })
    const closeBtn = document.body.querySelector('.sheet-close') as HTMLElement
    closeBtn.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('renders slot content', () => {
    mountSheet({ modelValue: true })
    expect(document.body.querySelector('.test-content')).not.toBeNull()
    expect(document.body.querySelector('.test-content')!.textContent).toBe('Content')
  })

  it('renders subtitle when provided', () => {
    mountSheet({ modelValue: true, subtitle: 'Test Sub' })
    expect(document.body.querySelector('.sheet-sub')).not.toBeNull()
    expect(document.body.querySelector('.sheet-sub')!.textContent).toBe('Test Sub')
  })

  it('hides subtitle when not provided', () => {
    mountSheet({ modelValue: true })
    expect(document.body.querySelector('.sheet-sub')).toBeNull()
  })

  it('sets body overflow:hidden when open', async () => {
    const wrapper = mountSheet({ modelValue: true })
    expect(document.body.style.overflow).toBe('hidden')
    await wrapper.setProps({ modelValue: false })
    expect(document.body.style.overflow).toBe('')
  })

  it('renders sheetId on the sheet element', () => {
    mountSheet({ modelValue: true, sheetId: 'my-sheet' })
    expect(document.body.querySelector('#my-sheet')).not.toBeNull()
  })
})
