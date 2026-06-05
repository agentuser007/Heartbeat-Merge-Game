import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EnergyLogic } from '../../logic/EnergyLogic'
import { globalBus } from '../../core/EventBus'

describe('EnergyLogic', () => {
  let logic: EnergyLogic

  beforeEach(() => {
    vi.useFakeTimers()
    globalBus.clear()
    logic = new EnergyLogic({
      ENERGY_REGEN_CAP: 100,
      MAX_ENERGY: 100,
      ENERGY_REGEN_INTERVAL: 3000,
      ENERGY_REGEN_AMOUNT: 1,
      ENERGY_COST_PER_SPAWN: 5
    })
  })

  afterEach(() => {
    logic.destroy()
    vi.useRealTimers()
  })

  it('starts at full energy', () => {
    expect(logic.current).toBe(100)
    expect(logic.fsm.is('FULL')).toBe(true)
  })

  it('spend reduces energy', () => {
    const result = logic.spend(10)
    expect(result).toBe(true)
    expect(logic.current).toBe(90)
  })

  it('spend fails when insufficient', () => {
    logic.current = 3
    const result = logic.spend(5)
    expect(result).toBe(false)
    expect(logic.current).toBe(3)
  })

  it('recover increases energy (no hard cap)', () => {
    logic.current = 50
    logic.recover(30)
    expect(logic.current).toBe(80)
  })

  it('recover can exceed regenCap', () => {
    logic.recover(20)
    expect(logic.current).toBe(120)
  })

  it('C5: destroy stops regen interval', () => {
    logic.spend(10)
    expect(logic.current).toBe(90)
    logic.destroy()
    vi.advanceTimersByTime(10000)
    expect(logic.current).toBe(90)
  })

  it('C6: setMax changes max and regenCap', () => {
    logic.setMax(150)
    expect(logic.max).toBe(150)
    expect(logic.regenCap).toBe(150)
  })

  it('C6: setMax does NOT cap current energy', () => {
    logic.recover(20)
    expect(logic.current).toBe(120)
    logic.setMax(80)
    expect(logic.current).toBe(120)
  })

  it('regen stops at regenCap', () => {
    logic.startRegen()
    logic.spend(5)
    expect(logic.current).toBe(95)
    vi.advanceTimersByTime(15000)
    expect(logic.current).toBe(100)
  })

  it('FSM transitions FULL -> REGENNING on spend', () => {
    logic.spend(1)
    expect(logic.fsm.is('REGENNING')).toBe(true)
  })

  it('FSM transitions REGENNING -> FULL on fill', () => {
    logic.spend(1)
    logic.recover(1)
    expect(logic.fsm.is('FULL')).toBe(true)
  })

  it('FSM transitions to EMPTY when current hits 0 from REGENNING', () => {
    logic.spend(1)
    expect(logic.fsm.is('REGENNING')).toBe(true)
    logic.current = 0
    logic._updateFSM()
    expect(logic.fsm.is('EMPTY')).toBe(true)
  })

  it('emits energy:changed on spend', () => {
    let received: any
    globalBus.on('energy:changed', (data) => { received = data })
    logic.spend(10)
    expect(received).toMatchObject({ current: 90, max: 100 })
  })

  it('setRegenCap changes regenCap only', () => {
    logic.setRegenCap(50)
    expect(logic.regenCap).toBe(50)
  })

  it('setRegenInterval restarts regen timer', () => {
    logic.spend(10)
    logic.setRegenInterval(1000)
    vi.advanceTimersByTime(5000)
    expect(logic.current).toBe(95)
  })
})
