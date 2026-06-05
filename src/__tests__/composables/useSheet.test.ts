import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSheet } from '../../composables/useSheet'

describe('useSheet — single-sheet mutual exclusion', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('isOpen is false initially', () => {
    const { isOpen } = useSheet('test-sheet')
    expect(isOpen.value).toBe(false)
  })

  it('open sets isOpen to true', () => {
    const { isOpen, open } = useSheet('test-sheet')
    open()
    expect(isOpen.value).toBe(true)
  })

  it('close sets isOpen to false', () => {
    const { isOpen, open, close } = useSheet('test-sheet')
    open()
    close()
    expect(isOpen.value).toBe(false)
  })

  it('opening one sheet closes another', () => {
    const sheet1 = useSheet('sheet-1')
    const sheet2 = useSheet('sheet-2')
    sheet1.open()
    expect(sheet1.isOpen.value).toBe(true)
    expect(sheet2.isOpen.value).toBe(false)
    sheet2.open()
    expect(sheet1.isOpen.value).toBe(false)
    expect(sheet2.isOpen.value).toBe(true)
  })

  it('close only affects own sheet', () => {
    const sheet1 = useSheet('sheet-1')
    const sheet2 = useSheet('sheet-2')
    sheet2.open()
    sheet1.close()
    expect(sheet2.isOpen.value).toBe(true)
  })
})
