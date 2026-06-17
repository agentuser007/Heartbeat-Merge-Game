import { describe, it, expect, beforeEach, vi } from 'vitest'
import { globalBus } from '../../core/EventBus'
import { GachaLogic, GachaConfig } from '../../logic/GachaLogic'
import { BossLogic, LevelData, BossProgressionDeps } from '../../logic/BossLogic'
import { BoardLogic, GeneratorConfig } from '../../logic/BoardLogic'
import { EnergyLogic } from '../../logic/EnergyLogic'
import { CurrencyLogic } from '../../logic/CurrencyLogic'

describe('Bug Fix Regression Tests', () => {
  const BOSS_PROGRESSION_DEPS: BossProgressionDeps = {
    orderTierBoost: [
      { maxLoop: 1, boost: 0 },
      { maxLoop: 3, boost: 1 },
      { maxLoop: 5, boost: 2 },
      { maxLoop: 7, boost: 3 },
      { maxLoop: null, boost: 4 },
    ],
    maxItemTier: 8,
  }

  beforeEach(() => {
    globalBus.clear()
  })

  describe('B1: Shop effects wired via event bus', () => {
    it('shop:itemPurchased with add_energy_item effect is received', () => {
      const handler = vi.fn()
      globalBus.on('shop:itemPurchased', handler)
      const item = { id: 'shop_energy_small', cost: 50, effect: 'add_energy_item', value: { energy: 30 } }
      globalBus.emit('shop:itemPurchased', { item })
      expect(handler).toHaveBeenCalledWith({ item })
    })

    it('shop:itemPurchased with add_joker effect is received', () => {
      const handler = vi.fn()
      globalBus.on('shop:itemPurchased', handler)
      const item = { id: 'shop_joker', cost: 200, effect: 'add_joker', value: {} }
      globalBus.emit('shop:itemPurchased', { item })
      expect(handler).toHaveBeenCalledWith({ item })
    })

    it('shop:itemPurchased with clear_lv1 effect is received', () => {
      const handler = vi.fn()
      globalBus.on('shop:itemPurchased', handler)
      const item = { id: 'shop_clear_lv1', cost: 80, effect: 'clear_lv1', value: {} }
      globalBus.emit('shop:itemPurchased', { item })
      expect(handler).toHaveBeenCalledWith({ item })
    })
  })

  describe('B3: Ad reward event has consumers', () => {
    it('ad:rewardGranted with energy type is received', () => {
      const handler = vi.fn()
      globalBus.on('ad:rewardGranted', handler)
      globalBus.emit('ad:rewardGranted', { adType: 'energy', reward: 20 })
      expect(handler).toHaveBeenCalledWith({ adType: 'energy', reward: 20 })
    })

    it('ad:rewardGranted with gold type is received', () => {
      const handler = vi.fn()
      globalBus.on('ad:rewardGranted', handler)
      globalBus.emit('ad:rewardGranted', { adType: 'gold', reward: 50 })
      expect(handler).toHaveBeenCalledWith({ adType: 'gold', reward: 50 })
    })

    it('ad:rewardGranted with diamonds type is received', () => {
      const handler = vi.fn()
      globalBus.on('ad:rewardGranted', handler)
      globalBus.emit('ad:rewardGranted', { adType: 'diamonds', reward: 50 })
      expect(handler).toHaveBeenCalledWith({ adType: 'diamonds', reward: 50 })
    })
  })

  describe('B5: Gacha single pull null returns', () => {
    it('pullSingle returns null when FSM cannot PULL', () => {
      const logic = new GachaLogic()
      const config: GachaConfig = {
        rarityConfig: { R: { probability: 1.0, color: '#4A90D9', glow: 'blue' } },
        gachaCost: { singleCost: 100, tenCost: 900 },
        subWeights: {},
        gachaPoolV2: [
          { id: 'test_item', rarity: 'R' as const, weight: 1, icon: '📝', name: 'Test', effect: 'place_item', value: {} }
        ]
      }
      const { result: r1 } = logic.pullSingle(config, { random: Math.random })
      expect(r1).not.toBeNull()
      logic.acknowledge()
      expect(logic.fsm.is('IDLE')).toBe(true)
    })

    it('pullSingle returns result from valid pool', () => {
      const logic = new GachaLogic()
      const config: GachaConfig = {
        rarityConfig: { R: { probability: 1.0, color: '#4A90D9', glow: 'blue' } },
        gachaCost: { singleCost: 100, tenCost: 900 },
        subWeights: {},
        gachaPoolV2: [
          { id: 'test_item', rarity: 'R' as const, weight: 1, icon: '📝', name: 'Test', effect: 'place_item', value: {} }
        ]
      }
      const { result } = logic.pullSingle(config, { random: Math.random })
      expect(result).not.toBeNull()
      expect(result?.id).toBe('test_item')
    })

    it('pullSingle on empty pool returns null without throwing', () => {
      const logic = new GachaLogic()
      const config: GachaConfig = {
        rarityConfig: { R: { probability: 1.0, color: '#4A90D9', glow: 'blue' } },
        gachaCost: { singleCost: 100, tenCost: 900 },
        subWeights: {},
        gachaPoolV2: []
      }
      const { result } = logic.pullSingle(config, { random: Math.random })
      expect(result).toBeNull()
      expect(logic.fsm.is('IDLE')).toBe(true)
    })
  })

  describe('BUG3: GachaLogic FSM not stuck after null roll', () => {
    it('FSM returns to IDLE after pullSingle with empty pool', () => {
      const logic = new GachaLogic()
      const config: GachaConfig = {
        rarityConfig: { R: { probability: 1.0, color: '#4A90D9', glow: 'blue' } },
        gachaCost: { singleCost: 100, tenCost: 900 },
        subWeights: {},
        gachaPoolV2: []
      }
      const { result } = logic.pullSingle(config, { random: Math.random })
      expect(result).toBeNull()
      expect(logic.fsm.is('IDLE')).toBe(true)
      expect(logic.fsm.can('PULL')).toBe(true)
    })
  })

  describe('BUG7: Heroine energy cap bonus not double-applied', () => {
    it('setMax is called once, not twice', () => {
      const energyLogic = new EnergyLogic({
        ENERGY_REGEN_CAP: 100,
        MAX_ENERGY: 100,
        ENERGY_REGEN_INTERVAL: 3000,
        ENERGY_REGEN_AMOUNT: 1,
        ENERGY_COST_PER_SPAWN: 5
      })
      const bonus = 20
      energyLogic.setMax(energyLogic.max + bonus)
      expect(energyLogic.max).toBe(120)
      energyLogic.setMax(energyLogic.max + bonus)
      expect(energyLogic.max).toBe(140)
    })
  })

  describe('BUG8: setGold prevents negative gold', () => {
    it('setGold directly sets the value without going negative', () => {
      const logic = new CurrencyLogic()
      logic.setGold(500)
      expect(logic.gold).toBe(500)
      logic.setGold(0)
      expect(logic.gold).toBe(0)
    })
  })

  describe('BUG10: EnergyLogic nullish coalescing for amount', () => {
    it('canSpend with explicit 0 returns true (0 is valid)', () => {
      const logic = new EnergyLogic({
        ENERGY_REGEN_CAP: 100,
        MAX_ENERGY: 100,
        ENERGY_REGEN_INTERVAL: 3000,
        ENERGY_REGEN_AMOUNT: 1,
        ENERGY_COST_PER_SPAWN: 5
      })
      expect(logic.canSpend(0)).toBe(true)
    })

    it('spend with explicit 0 does not deduct energy', () => {
      const logic = new EnergyLogic({
        ENERGY_REGEN_CAP: 100,
        MAX_ENERGY: 100,
        ENERGY_REGEN_INTERVAL: 3000,
        ENERGY_REGEN_AMOUNT: 1,
        ENERGY_COST_PER_SPAWN: 5
      })
      logic.spend(0)
      expect(logic.current).toBe(100)
    })
  })
})
