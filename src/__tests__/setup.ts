import { vi } from 'vitest'
import { globalBus } from '../core/EventBus'

beforeEach(() => {
  globalBus.clear()
  localStorage.clear()
})

vi.stubGlobal('AudioContext', class {
  createGain() { return { gain: { value: 1, linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() } }
  createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() } }
  decodeAudioData() { return Promise.resolve({}) }
  close() {}
  state = 'running'
})

vi.stubGlobal('HTMLAudioElement', class {
  play() { return Promise.resolve() }
  pause() {}
  load() {}
  canPlayType() { return 'probably' }
  volume = 1
  currentTime = 0
  duration = 0
  paused = true
  src = ''
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
