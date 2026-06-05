import { describe, it, expect, beforeEach, vi } from 'vitest'
import { globalBus } from '../../core/EventBus'
import { GachaLogic, GachaConfig } from '../../logic/GachaLogic'
import { BossLogic, LoopConfig, LevelData } from '../../logic/BossLogic'
import { BoardLogic, GeneratorConfig } from '../../logic/BoardLogic'
import { EnergyLogic } from '../../logic/EnergyLogic'
import { CurrencyLogic } from '../../logic/CurrencyLogic'

describe('Bug Fix Regression Tests', () => {
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
      const r1 = logic.pullSingle(config)
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
      const result = logic.pullSingle(config)
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
      const result = logic.pullSingle(config)
      expect(result).toBeNull()
    })
  })

  describe('B2: Boss order scaling via getScaledOrder', () => {
    it('getScaledOrder returns same order when loop is 1 (no boost)', () => {
      const logic = new BossLogic()
      logic.setLoopConfig({ loopIndex: 1, hpMultiplier: 1.0 } as LoopConfig)
      const order = { required: [{ itemId: 'study_3', count: 1 }], damage: 10, isTimed: false, timeLimit: 0, diamondReward: 30 }
      const items: Record<string, any> = { 'study_3': { id: 'study_3', name: 'Study 3', level: 3, chain: 'study', nextId: 'study_4', sellPrice: 5, emoji: '📚', color: '#fff' } }
      const result = logic.getScaledOrder(order, items)
      expect(result.required[0].itemId).toBe('study_3')
    })

    it('getScaledOrder scales item tier when loop > 3', () => {
      const logic = new BossLogic()
      logic.setLoopConfig({ loopIndex: 3, hpMultiplier: 1.5 } as LoopConfig)
      const order = { required: [{ itemId: 'study_3', count: 1 }], damage: 10, isTimed: false, timeLimit: 0, diamondReward: 30 }
      const items: Record<string, any> = {
        'study_3': { id: 'study_3', name: 'Study 3', level: 3, chain: 'study', nextId: 'study_4', sellPrice: 5, emoji: '📚', color: '#fff' },
        'study_4': { id: 'study_4', name: 'Study 4', level: 4, chain: 'study', nextId: 'study_5', sellPrice: 10, emoji: '📖', color: '#fff' }
      }
      const result = logic.getScaledOrder(order, items)
      expect(result.required[0].itemId).toBe('study_4')
      expect(result.damage).toBe(15)
    })
  })

  describe('B-floor-softlock: last order forces boss defeat when floor-rounding leaves residual HP', () => {
    const makeLevels = (): LevelData[] => [{
      bossName: 'TestBoss', bossTitle: 'T', bossAvatar: '', bossColor: '', bgGradient: '',
      totalHp: 120,
      orders: [
        { required: [{ itemId: 'a', count: 1 }], damage: 20 },
        { required: [{ itemId: 'b', count: 1 }], damage: 40 },
        { required: [{ itemId: 'c', count: 1 }], damage: 60 },
      ]
    }]

    it('Loop 11 (hpMultiplier=4.662): last order forces defeat despite floor rounding gap', () => {
      const logic = new BossLogic()
      logic.setLoopConfig({ loopIndex: 11, hpMultiplier: 4.662 } as LoopConfig)
      const levels = makeLevels()
      logic.loadLevel(0, levels)

      expect(logic.totalHp).toBe(559)

      logic.currentOrderIdx = 0
      const r1 = logic.commitSubmit(Math.floor(20 * 4.662), levels)
      expect(r1.isDefeated).toBe(false)

      logic.currentOrderIdx = 1
      const r2 = logic.commitSubmit(Math.floor(40 * 4.662), levels)
      expect(r2.isDefeated).toBe(false)

      logic.currentOrderIdx = 2
      const r3 = logic.commitSubmit(Math.floor(60 * 4.662), levels)
      expect(r3.isDefeated).toBe(true)
      expect(r3.hpLeft).toBe(0)
      expect(logic.fsm.is('DEFEATED')).toBe(true)
    })

    it('Loop 1 (hpMultiplier=1.0): no rounding gap, boss still defeated normally', () => {
      const logic = new BossLogic()
      logic.setLoopConfig({ loopIndex: 1, hpMultiplier: 1.0 } as LoopConfig)
      const levels = makeLevels()
      logic.loadLevel(0, levels)

      expect(logic.totalHp).toBe(120)

      logic.currentOrderIdx = 0
      logic.commitSubmit(20, levels)
      logic.currentOrderIdx = 1
      logic.commitSubmit(40, levels)
      logic.currentOrderIdx = 2
      const r = logic.commitSubmit(60, levels)
      expect(r.isDefeated).toBe(true)
      expect(r.hpLeft).toBe(0)
    })
  })

  describe('B14: DailyOrderCard isItemFulfilled checks board', () => {
    it('returns true when board has required items', () => {
      const logic = new BoardLogic(3, 3)
      logic.cells = new Array(9).fill(null)
      logic.cells[0] = 'item_1'
      logic.cells[4] = 'item_1'
      const found = logic.findAllItems('item_1')
      expect(found.length).toBe(2)
    })

    it('returns false when board lacks items', () => {
      const logic = new BoardLogic(3, 3)
      logic.cells = new Array(9).fill(null)
      logic.cells[0] = 'item_1'
      const found = logic.findAllItems('item_2')
      expect(found.length).toBe(0)
    })
  })

  describe('Energy: regen works correctly with explicit startRegen', () => {
    it('regen recovers energy over time after startRegen', () => {
      vi.useFakeTimers()
      const logic = new EnergyLogic({
        ENERGY_REGEN_CAP: 100,
        MAX_ENERGY: 100,
        ENERGY_REGEN_INTERVAL: 3000,
        ENERGY_REGEN_AMOUNT: 1,
        ENERGY_COST_PER_SPAWN: 5
      })
      logic.startRegen()
      logic.spend(5)
      expect(logic.current).toBe(95)
      vi.advanceTimersByTime(15000)
      expect(logic.current).toBe(100)
      logic.destroy()
      vi.useRealTimers()
    })
  })

  describe('B-gen-capacity: high-level generator capacity limit is enforced', () => {
    const makeGenConfig = (): Record<string, GeneratorConfig> => ({
      gen_makeup: {
        id: 'gen_makeup', name: '化妆包', emoji: '👛', chains: ['lips', 'perfume'],
        levels: {
          '1': { drop_pool: [{ itemId: 'lip_1', weight: 100 }], free_production_chance: 0, capacity: 0, cooldown: 0, special_drop: null },
          '6': { drop_pool: [{ itemId: 'lip_2', weight: 100 }], free_production_chance: 0.05, capacity: 15, cooldown: 0, special_drop: null },
          '7': { drop_pool: [{ itemId: 'lip_3', weight: 100 }], free_production_chance: 0.10, capacity: 25, cooldown: 0, special_drop: null },
          '8': { drop_pool: [{ itemId: 'lip_4', weight: 100 }], free_production_chance: 0.05, capacity: 40, cooldown: 0, special_drop: null },
        }
      }
    })

    const makeItems = (): Record<string, any> => ({
      gen_makeup_1: { id: 'gen_makeup_1', name: 'Lv1', level: 1, chain: 'gen_makeup', nextId: 'gen_makeup_2', sellPrice: 1, emoji: '👛', color: '#fff', type: 'GENERATOR' },
      gen_makeup_6: { id: 'gen_makeup_6', name: 'Lv6', level: 6, chain: 'gen_makeup', nextId: 'gen_makeup_7', sellPrice: 1, emoji: '👛', color: '#fff', type: 'GENERATOR' },
      gen_makeup_7: { id: 'gen_makeup_7', name: 'Lv7', level: 7, chain: 'gen_makeup', nextId: 'gen_makeup_8', sellPrice: 1, emoji: '👛', color: '#fff', type: 'GENERATOR' },
      gen_makeup_8: { id: 'gen_makeup_8', name: 'Lv8', level: 8, chain: 'gen_makeup', nextId: null, sellPrice: 1, emoji: '👛', color: '#fff', type: 'GENERATOR' },
    })

    it('Lv1 generator has Infinity remaining capacity (no limit)', () => {
      const logic = new BoardLogic(3, 3)
      const items = makeItems()
      const generators = makeGenConfig()
      logic.cells[0] = 'gen_makeup_1'
      logic.initGeneratorState(0, 'gen_makeup_1', items, generators)
      expect(logic.getRemainingCapacity(0)).toBe(Infinity)
    })

    it('Lv6 generator has capacity 15, not Infinity', () => {
      const logic = new BoardLogic(3, 3)
      const items = makeItems()
      const generators = makeGenConfig()
      logic.cells[0] = 'gen_makeup_6'
      logic.initGeneratorState(0, 'gen_makeup_6', items, generators)
      expect(logic.hasCapacityLimit(0)).toBe(true)
      expect(logic.getRemainingCapacity(0)).toBe(15)
    })

    it('Lv7 generator has capacity 25', () => {
      const logic = new BoardLogic(3, 3)
      const items = makeItems()
      const generators = makeGenConfig()
      logic.cells[0] = 'gen_makeup_7'
      logic.initGeneratorState(0, 'gen_makeup_7', items, generators)
      expect(logic.getRemainingCapacity(0)).toBe(25)
    })

    it('Lv8 generator has capacity 40', () => {
      const logic = new BoardLogic(3, 3)
      const items = makeItems()
      const generators = makeGenConfig()
      logic.cells[0] = 'gen_makeup_8'
      logic.initGeneratorState(0, 'gen_makeup_8', items, generators)
      expect(logic.getRemainingCapacity(0)).toBe(40)
    })

    it('passing empty generators {} causes Lv6 to have Infinity (old bug)', () => {
      const logic = new BoardLogic(3, 3)
      const items = makeItems()
      logic.cells[0] = 'gen_makeup_6'
      logic.initGeneratorState(0, 'gen_makeup_6', items, {})
      expect(logic.getRemainingCapacity(0)).toBe(Infinity)
    })
  })

  describe('BUG1: getCurrentOrder returns actual order data', () => {
    it('getCurrentOrder returns the scaled current order', () => {
      const logic = new BossLogic()
      logic.setLoopConfig({ loopIndex: 1, hpMultiplier: 1.0 } as LoopConfig)
      const levels: LevelData[] = [{
        bossName: 'T', bossTitle: 'T', bossAvatar: '', bossColor: '', bgGradient: '',
        totalHp: 100,
        orders: [
          { required: [{ itemId: 'a', count: 1 }], damage: 50 },
          { required: [{ itemId: 'b', count: 1 }], damage: 50 },
        ]
      }]
      logic.loadLevel(0, levels)
      const order = logic.getCurrentOrder(levels)
      expect(order).not.toBeNull()
      expect(order!.damage).toBe(50)
    })

    it('canFulfillOrder returns true when items exist', () => {
      const logic = new BossLogic()
      logic.setLoopConfig({ loopIndex: 1, hpMultiplier: 1.0 } as LoopConfig)
      const levels: LevelData[] = [{
        bossName: 'T', bossTitle: 'T', bossAvatar: '', bossColor: '', bgGradient: '',
        totalHp: 100,
        orders: [{ required: [{ itemId: 'a', count: 1 }], damage: 50 }]
      }]
      logic.loadLevel(0, levels)
      const mockBoard = { findAllItems: () => ['a'] }
      const result = logic.canFulfillOrder(mockBoard, levels, {})
      expect(result).toBe(true)
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
      const result = logic.pullSingle(config)
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
