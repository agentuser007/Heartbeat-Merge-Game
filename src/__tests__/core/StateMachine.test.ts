import { describe, it, expect, beforeEach } from 'vitest'
import { StateMachine } from '../../core/StateMachine'
import { globalBus } from '../../core/EventBus'

describe('StateMachine', () => {
  let fsm: StateMachine

  const config = {
    name: 'TestFSM',
    initial: 'IDLE',
    states: {
      IDLE: { on: { START: 'RUNNING' } },
      RUNNING: { on: { STOP: 'IDLE', FAIL: 'ERROR' } },
      ERROR: { on: { RESET: 'IDLE' } }
    }
  }

  beforeEach(() => {
    globalBus.clear()
    fsm = new StateMachine(config)
  })

  it('starts in initial state', () => {
    expect(fsm.current).toBe('IDLE')
  })

  it('send: valid transition changes state', () => {
    const result = fsm.send('START')
    expect(result).toBe(true)
    expect(fsm.current).toBe('RUNNING')
  })

  it('send: invalid transition is ignored', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = fsm.send('STOP')
    expect(result).toBe(false)
    expect(fsm.current).toBe('IDLE')
    warnSpy.mockRestore()
  })

  it('is(): checks current state', () => {
    expect(fsm.is('IDLE')).toBe(true)
    expect(fsm.is('RUNNING')).toBe(false)
  })

  it('can(): checks if transition is possible', () => {
    expect(fsm.can('START')).toBe(true)
    expect(fsm.can('STOP')).toBe(false)
  })

  it('availableEvents(): returns valid events from current state', () => {
    expect(fsm.availableEvents()).toEqual(['START'])
  })

  it('history: tracks transitions', () => {
    fsm.send('START')
    fsm.send('FAIL')
    expect(fsm.history).toHaveLength(2)
    expect(fsm.history[0]).toMatchObject({ from: 'IDLE', to: 'RUNNING', event: 'START' })
    expect(fsm.history[1]).toMatchObject({ from: 'RUNNING', to: 'ERROR', event: 'FAIL' })
  })

  it('previous: tracks previous state', () => {
    expect(fsm.previous).toBeNull()
    fsm.send('START')
    expect(fsm.previous).toBe('IDLE')
  })

  it('reset(): returns to initial state', () => {
    fsm.send('START')
    fsm.send('FAIL')
    fsm.reset()
    expect(fsm.current).toBe('IDLE')
    expect(fsm.history).toHaveLength(0)
  })

  it('reset(state): goes to specified state', () => {
    fsm.reset('ERROR')
    expect(fsm.current).toBe('ERROR')
  })

  it('emits stateChanged event on transition', () => {
    let received: any
    globalBus.on('testfsm:stateChanged', (data: { from: string; to: string; event: string }) => { received = data })
    fsm.send('START')
    expect(received).toMatchObject({ from: 'IDLE', to: 'RUNNING', event: 'START' })
  })

  it('enter action fires on state entry', () => {
    let enteredData: any
    const fsm2 = new StateMachine({
      ...config,
      actions: { onEnterRUNNING: (data) => { enteredData = data } }
    })
    fsm2.send('START', { foo: 'bar' })
    expect(enteredData).toEqual({ foo: 'bar' })
  })

  it('exit action fires on state exit', () => {
    let exited = false
    const fsm2 = new StateMachine({
      ...config,
      actions: { onExitIDLE: () => { exited = true } }
    })
    fsm2.send('START')
    expect(exited).toBe(true)
  })

  it('transition action fires on specific from->to', () => {
    let transitioned = false
    const fsm2 = new StateMachine({
      ...config,
      actions: { onIDLEToRUNNING: () => { transitioned = true } }
    })
    fsm2.send('START')
    expect(transitioned).toBe(true)
  })

  it('M13 fix: reset preserves initialState for future resets', () => {
    fsm.send('START')
    fsm.send('FAIL')
    fsm.reset()
    expect(fsm.current).toBe('IDLE')
    fsm.send('START')
    fsm.reset()
    expect(fsm.current).toBe('IDLE')
  })

  it('getState(): returns current state', () => {
    expect(fsm.getState()).toBe('IDLE')
  })
})
