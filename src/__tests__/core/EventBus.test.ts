import { describe, it, expect, beforeEach } from 'vitest'
import { EventBus } from '../../core/EventBus'
import { globalBus } from '../../core/EventBus'

describe('EventBus', () => {
  let bus: EventBus

  beforeEach(() => {
    bus = new EventBus()
  })

  it('on + emit: receives data', () => {
    let received: any
    bus.on('test', (data: { x: number }) => { received = data })
    bus.emit('test', { x: 1 })
    expect(received).toEqual({ x: 1 })
  })

  it('on: multiple listeners for same event', () => {
    const results: number[] = []
    bus.on('ev', () => results.push(1))
    bus.on('ev', () => results.push(2))
    bus.emit('ev')
    expect(results).toEqual([1, 2])
  })

  it('off: removes specific listener', () => {
    let called = false
    const fn = () => { called = true }
    bus.on('ev', fn)
    bus.off('ev', fn)
    bus.emit('ev')
    expect(called).toBe(false)
  })

  it('off: no-op for unknown event', () => {
    expect(() => bus.off('nonexistent', () => {})).not.toThrow()
  })

  it('once: fires only once', () => {
    let count = 0
    bus.once('ev', () => count++)
    bus.emit('ev')
    bus.emit('ev')
    expect(count).toBe(1)
  })

  it('once: auto-removes after first emit', () => {
    let count = 0
    bus.once('ev', () => count++)
    bus.emit('ev')
    bus.emit('ev')
    bus.emit('ev')
    expect(count).toBe(1)
  })

  it('clear(event): removes all listeners for one event', () => {
    let count = 0
    bus.on('a', () => count++)
    bus.on('b', () => count++)
    bus.clear('a')
    bus.emit('a')
    bus.emit('b')
    expect(count).toBe(1)
  })

  it('clear(): removes all listeners for all events', () => {
    let count = 0
    bus.on('a', () => count++)
    bus.on('b', () => count++)
    bus.clear()
    bus.emit('a')
    bus.emit('b')
    expect(count).toBe(0)
  })

  it('emit: does nothing for event with no listeners', () => {
    expect(() => bus.emit('nonexistent')).not.toThrow()
  })

  it('emit: handler errors are caught and logged', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    bus.on('ev', () => { throw new Error('test') })
    bus.emit('ev')
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('globalBus is a singleton instance', () => {
    expect(globalBus).toBeInstanceOf(EventBus)
  })
})
