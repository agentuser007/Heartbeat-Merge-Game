import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDialogueStore } from '../../stores/dialogueStore'

describe('dialogueStore', () => {
  let store: ReturnType<typeof useDialogueStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDialogueStore()
  })

  it('starts closed', () => {
    expect(store.isOpen).toBe(false)
  })

  it('show opens dialogue with correct data', () => {
    store.show('NPC Name', '😊', 'Hello there', 'I think so')
    expect(store.isOpen).toBe(true)
    expect(store.npcName).toBe('NPC Name')
    expect(store.npcText).toBe('Hello there')
    expect(store.playerText).toBe('I think so')
    expect(store.isTyping).toBe(true)
  })

  it('close resets all fields', () => {
    store.show('NPC', '😊', 'Hi', '')
    store.close()
    expect(store.isOpen).toBe(false)
    expect(store.npcName).toBe('')
    expect(store.npcText).toBe('')
    expect(store.playerText).toBe('')
  })

  it('show with URL portrait sets portraitUrl', () => {
    store.show('NPC', 'https://example.com/portrait.png', 'Hi', '')
    expect(store.portraitUrl).toBe('https://example.com/portrait.png')
    expect(store.portraitEmoji).toBe('')
  })

  it('show with emoji portrait sets portraitEmoji', () => {
    store.show('NPC', '😊', 'Hi', '')
    expect(store.portraitEmoji).toBe('😊')
    expect(store.portraitUrl).toBe('')
  })

  it('skip sets isTyping to false', () => {
    store.show('NPC', '😊', 'Hello', '')
    store.skip()
    expect(store.isTyping).toBe(false)
  })

  it('queueDialogue adds to queue', () => {
    store.queueDialogue('NPC2', '😊', 'World', '')
    expect(store.dialogueQueue.length).toBe(1)
    expect(store.dialogueQueue[0].npcName).toBe('NPC2')
  })

  it('hasPlayerText computed works', () => {
    expect(store.hasPlayerText).toBe(false)
    store.show('NPC', '😊', 'Hi', 'My thought')
    expect(store.hasPlayerText).toBe(true)
  })

  it('hasPortrait computed works', () => {
    expect(store.hasPortrait).toBe(false)
    store.show('NPC', '😊', 'Hi', '')
    expect(store.hasPortrait).toBe(true)
  })
})
