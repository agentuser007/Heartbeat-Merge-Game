import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import LoopSummaryOverlay from '../../components/overlays/LoopSummaryOverlay.vue'

vi.mock('../../stores/i18nStore', () => ({
  useI18nStore: vi.fn(() => ({
    t: (key: string, params?: any) => {
      if (params) return `${key} ${JSON.stringify(params)}`
      return key
    },
    emoji: () => '',
    locale: 'zh',
    texts: {},
    emojis: {},
    loaded: true,
    supportedLocales: ['zh', 'en'],
  }))
}))

vi.mock('../../stores/collectionStore', () => ({
  useCollectionStore: vi.fn(() => ({
    getNewDiscoveriesCountThisLoop: vi.fn(() => 3),
    discoveredThisLoop: new Set(['a', 'b', 'c']),
  }))
}))

vi.mock('../../stores/achievementStore', () => ({
  useAchievementStore: vi.fn(() => ({
    getUnlockedCountThisLoop: vi.fn(() => 2),
    unlockedThisLoop: new Set(['ach1', 'ach2']),
  }))
}))

vi.mock('../../stores/configStore', () => ({
  useConfigStore: vi.fn(() => ({
    gameConfig: { BOARD_COLS: 7, BOARD_ROWS: 9, MAX_ENERGY: 100, ENERGY_REGEN_CAP: 100, ENERGY_REGEN_INTERVAL: 120000, ENERGY_REGEN_AMOUNT: 1, ENERGY_COST_PER_SPAWN: 1, ENERGY_REGEN_DOWN_MULTIPLIER: 1.5 },
    gachaCost: { singleCost: 100, tenCost: 900 },
    gachaRarityConfig: {},
    gachaSubWeights: {},
    gachaPool: [],
    dailyOrderConfig: { MAX_ACTIVE: 5, REFRESH_COST: 0 },
    dailyOrderPool: [],
    dailyBuffPool: [],
    adConfig: {},
    gachaConfig: {},
    loopRules: {},
    loopMultipliers: { hpMultiplier: { table: [1], overflowBase: 1, overflowGrowth: 0 }, rewardMultiplier: { table: [1], overflowBase: 1, overflowGrowth: 0, cap: 3 }, timeMultiplier: { table: [1], overflowValue: 1 }, tokenReward: { table: [1], overflowBase: 1, overflowGrowth: 0 }, metaUpgrades: [] },
    touchInteractions: {},
    affectionConfig: {},
    affectionShop: {},
    heroineUpgrades: [],
    boardEconomy: {},
    bossProgression: [],
    items: {},
    generators: {},
    chains: {},
  }))
}))

const loopStoreMocks = {
  calculateLoopRewards: vi.fn(() => ({ loopTokens: 50, baseTokens: 30, bonusTokens: 20, goldReward: 100, diamondReward: 5 })),
}

vi.mock('../../stores/loopStore', () => ({
  useLoopStore: vi.fn(() => ({
    loopIndex: 1,
    loopTokens: 100,
    metaUpgrades: {},
    calculateLoopRewards: loopStoreMocks.calculateLoopRewards,
    getMetaUpgradeCost: vi.fn(() => 20),
    getMetaUpgradeEffect: vi.fn(() => 1.5),
    getMetaUpgradeMaxLevel: vi.fn(() => 5),
    purchaseMetaUpgrade: vi.fn(() => true),
    getLoopTitle: vi.fn(() => 'Next Loop'),
    getHpMultiplier: vi.fn(() => 1.2),
    getRewardMultiplier: vi.fn(() => 1.1),
    getSpecialRules: vi.fn(() => []),
  }))
}))

describe('LoopSummaryOverlay — C3: Transition + v-if visibility', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function mountOverlay(visible = false) {
    return mount(LoopSummaryOverlay, {
      props: { visible },
      global: {
        plugins: [pinia],
        stubs: {
          Transition: { template: '<div><slot /></div>' }
        }
      }
    })
  }

  it('C3: does not render when visible is false', () => {
    const wrapper = mountOverlay(false)
    expect(wrapper.find('#loop-summary-overlay').exists()).toBe(false)
  })

  it('C3: renders when visible is true', async () => {
    const wrapper = mountOverlay(true)
    await nextTick()
    expect(wrapper.find('#loop-summary-overlay').exists()).toBe(true)
  })

  it('C3: visibility toggles with visible prop', async () => {
    const wrapper = mountOverlay(false)
    expect(wrapper.find('#loop-summary-overlay').exists()).toBe(false)
    await wrapper.setProps({ visible: true })
    expect(wrapper.find('#loop-summary-overlay').exists()).toBe(true)
    await wrapper.setProps({ visible: false })
    expect(wrapper.find('#loop-summary-overlay').exists()).toBe(false)
  })

  it('emits next-loop on next button click', async () => {
    const wrapper = mountOverlay(true)
    await nextTick()
    await wrapper.find('.summary-next-btn').trigger('click')
    expect(wrapper.emitted('next-loop')).toBeTruthy()
  })

  it('calculateLoopRewards is called with real summary (not empty) when visible', async () => {
    loopStoreMocks.calculateLoopRewards.mockClear()
    const wrapper = mountOverlay(false)
    await wrapper.setProps({ visible: true })
    await nextTick()
    expect(loopStoreMocks.calculateLoopRewards).toHaveBeenCalled()
    const calls = loopStoreMocks.calculateLoopRewards.mock.calls as unknown as [number, any][]
    const lastCall = calls[calls.length - 1]
    const summaryArg = lastCall[1]
    expect(summaryArg).not.toEqual({})
    expect(typeof summaryArg.newDiscoveries).toBe('number')
    expect(typeof summaryArg.achievementsUnlocked).toBe('number')
  })
})
