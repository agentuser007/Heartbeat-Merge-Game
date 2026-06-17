import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGachaStore } from '../../stores/gachaStore'
import { useConfigStore } from '../../stores/configStore'
import { useCurrencyStore } from '../../stores/currencyStore'
import { GachaService } from '../../services/GachaService'
import type { GachaItem } from '../../logic/GachaLogic'
import type { SinglePullData, TenPullData } from '../../services/GachaService'
import type { ServiceResultWithData } from '../../services/ServiceResultTypes'
import {
    createGameSettingsConfig,
    createGachaCostConfig,
    createGachaRarityConfig,
    createGachaPoolItem,
    createGachaSimpleConfig,
    createTestItems,
} from '../helpers/configFactory'

afterEach(() => { vi.restoreAllMocks() })

function setupStores() {
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.gachaRarityConfig = createGachaRarityConfig()
    configStore.gachaCost = createGachaCostConfig()
    configStore.gachaSubWeights = { R: {}, SR: {}, SSR: {} }
    configStore.gachaPool = [
        createGachaPoolItem({ id: 'item_r1', name: 'R Item 1', rarity: 'R', effect: 'spawn_board_item', value: { chain: 'lips', level: 1 } }),
        createGachaPoolItem({ id: 'item_sr1', name: 'SR Item 1', rarity: 'SR', effect: 'spawn_board_item', value: { chain: 'lips', level: 2 } }),
        createGachaPoolItem({ id: 'item_ssr1', name: 'SSR Item 1', rarity: 'SSR', effect: 'ssr_generator', value: { genChain: 'gen_makeup', level: 1 } }),
    ]
    configStore.gameConfig = createGameSettingsConfig()
    configStore.gachaConfig = createGachaSimpleConfig()
    configStore.chains = ['lips']
    configStore.chainItemPrefix = { lips: 'lip' }
    configStore.items = createTestItems()

    const currencyStore = useCurrencyStore()
    currencyStore.addDiamonds(10000)

    const store = useGachaStore()
    return { store, configStore, currencyStore }
}

function makeGachaItem(overrides: Partial<GachaItem> = {}): GachaItem {
    return {
        id: 'item1',
        rarity: 'R',
        weight: 1,
        icon: 'icon',
        name: 'Test Item',
        effect: 'add_joker',
        value: null,
        ...overrides,
    }
}

function makeSinglePullOk(data: SinglePullData, resolveResultOverrides: Record<string, unknown> = {}): ServiceResultWithData<SinglePullData> {
    return {
        ok: true,
        data,
        resolveResult: { applyTo: { ...resolveResultOverrides } },
    };
}

function makeTenPullOk(data: TenPullData, resolveResultOverrides: Record<string, unknown> = {}): ServiceResultWithData<TenPullData> {
    return {
        ok: true,
        data,
        resolveResult: { applyTo: { ...resolveResultOverrides } },
    };
}

describe('gachaStore', () => {
    describe('singlePull / tenPull / freePull (委托+包装)', () => {
        it('singlePull calls GachaService.resolveSinglePull and returns its result', () => {
            const { store } = setupStores()
            const pullResult = makeGachaItem({ id: 'r1', effect: 'add_joker', value: null })
            vi.spyOn(GachaService, 'resolveSinglePull').mockReturnValue(
                makeSinglePullOk({ pullResult }, { inventory: { addItems: [{ itemId: 'r1', count: 1 }] } })
            )

            const result = store.singlePull()

            expect(GachaService.resolveSinglePull).toHaveBeenCalledOnce()
            expect(result.ok).toBe(true)
            expect(result.data.pullResult).toBe(pullResult)
        })

        it('singlePull with null pullResult returns ok:true with null data', () => {
            const { store } = setupStores()
            vi.spyOn(GachaService, 'resolveSinglePull').mockReturnValue(
                makeSinglePullOk({ pullResult: null })
            )

            const result = store.singlePull()

            expect(result.ok).toBe(true)
            expect(result.data.pullResult).toBeNull()
        })

        it('singlePull returns ok:false when cannot afford', () => {
            const { store } = setupStores()
            vi.spyOn(GachaService, 'resolveSinglePull').mockReturnValue({
                ok: false,
                reason: 'Insufficient diamonds for single pull',
            })

            const result = store.singlePull()

            expect(result.ok).toBe(false)
        })

        it('singlePull transparently passes resolveResult with meta from Service', () => {
            const { store } = setupStores()
            const pullResult = makeGachaItem({ id: 'item1', effect: 'add_joker', value: { level: 2 } })
            vi.spyOn(GachaService, 'resolveSinglePull').mockReturnValue(
                makeSinglePullOk({ pullResult }, { inventory: { addItems: [{ itemId: 'item1', count: 1, meta: { effect: 'add_joker', value: { level: 2 } } }] } })
            )

            const result = store.singlePull()

            expect(result.resolveResult.applyTo.inventory?.addItems?.[0].meta).toEqual({
                effect: 'add_joker',
                value: { level: 2 },
            })
        })

        it('singlePull does not touch meta when no addItems', () => {
            const { store } = setupStores()
            const pullResult = makeGachaItem({ id: 'item1', effect: 'add_gold', value: 100 })
            vi.spyOn(GachaService, 'resolveSinglePull').mockReturnValue(
                makeSinglePullOk({ pullResult }, { currency: { addGold: 100 } })
            )

            const result = store.singlePull()

            expect(result.resolveResult.applyTo.inventory).toBeUndefined()
        })

        it('tenPull calls GachaService.resolveTenPull and returns its result', () => {
            const { store } = setupStores()
            const pullResults = [makeGachaItem({ id: 'a' }), makeGachaItem({ id: 'b' })]
            vi.spyOn(GachaService, 'resolveTenPull').mockReturnValue(
                makeTenPullOk({ pullResults, newSSRs: [] })
            )

            const result = store.tenPull()

            expect(GachaService.resolveTenPull).toHaveBeenCalledOnce()
            expect(result.ok).toBe(true)
            expect(result.data.pullResults).toBe(pullResults)
        })

        it('tenPull with null pullResults returns ok:true with null data', () => {
            const { store } = setupStores()
            vi.spyOn(GachaService, 'resolveTenPull').mockReturnValue(
                makeTenPullOk({ pullResults: null, newSSRs: [] })
            )

            const result = store.tenPull()

            expect(result.ok).toBe(true)
            expect(result.data.pullResults).toBeNull()
        })

        it('tenPull returns ok:false when cannot afford', () => {
            const { store } = setupStores()
            vi.spyOn(GachaService, 'resolveTenPull').mockReturnValue({
                ok: false,
                reason: 'Insufficient diamonds for ten pull',
            })

            const result = store.tenPull()

            expect(result.ok).toBe(false)
        })

        it('tenPull transparently passes resolveResult with meta from Service', () => {
            const { store } = setupStores()
            const itemA = makeGachaItem({ id: 'a', itemId: 'inv_a', effect: 'add_joker', value: { level: 1 } })
            const itemB = makeGachaItem({ id: 'b', itemId: 'inv_b', effect: 'add_scissor', value: { level: 2 } })
            vi.spyOn(GachaService, 'resolveTenPull').mockReturnValue(
                makeTenPullOk({ pullResults: [itemA, itemB], newSSRs: [] }, {
                    inventory: {
                        addItems: [
                            { itemId: 'inv_a', count: 1, meta: { effect: 'add_joker', value: { level: 1 } } },
                            { itemId: 'inv_b', count: 1, meta: { effect: 'add_scissor', value: { level: 2 } } },
                        ]
                    }
                })
            )

            const result = store.tenPull()

            expect(result.resolveResult.applyTo.inventory?.addItems?.[0].meta).toEqual({
                effect: 'add_joker',
                value: { level: 1 },
            })
            expect(result.resolveResult.applyTo.inventory?.addItems?.[1].meta).toEqual({
                effect: 'add_scissor',
                value: { level: 2 },
            })
        })

        it('freePull delegates to GachaService.resolveFreePull', () => {
            const { store } = setupStores()
            store.freePullsLeft = 1
            const pullResult = makeGachaItem({ id: 'r1', rarity: 'SR' })
            vi.spyOn(GachaService, 'resolveFreePull').mockReturnValue(
                makeSinglePullOk({ pullResult }, { gacha: { decrementFreePulls: true, setLastFreePullDate: '2026-06-16', setResults: [pullResult] } })
            )

            const result = store.freePull()

            expect(result.ok).toBe(true)
            expect(result.data.pullResult).toBe(pullResult)
            expect(GachaService.resolveFreePull).toHaveBeenCalledOnce()
        })

        it('freePull returns ok:false when cannot free pull', () => {
            const { store } = setupStores()
            store.freePullsLeft = 0

            const result = store.freePull()

            expect(result.ok).toBe(false)
        })
    })

    describe('thin mutations', () => {
        it('setResultsField sets results', () => {
            const { store } = setupStores()
            const items = [makeGachaItem({ id: 'a' })]
            store.setResultsField(items)
            expect(store.results).toEqual(items)
        })

        it('markSsrOwnedField marks SSRs as owned', () => {
            const { store } = setupStores()
            store.markSsrOwnedField(['ssr1', 'ssr2'])
            expect(store.ssrOwned['ssr1']).toBe(true)
            expect(store.ssrOwned['ssr2']).toBe(true)
        })

        it('decrementFreePullsField decrements freePullsLeft', () => {
            const { store } = setupStores()
            store.freePullsLeft = 2
            store.decrementFreePullsField()
            expect(store.freePullsLeft).toBe(1)
        })

        it('setLastFreePullDateField sets lastFreePullDate', () => {
            const { store } = setupStores()
            store.setLastFreePullDateField('2026-06-16')
            expect(store.lastFreePullDate).toBe('2026-06-16')
        })
    })

    describe('纯状态管理', () => {
        it('canFreePull is true when freePullsLeft > 0', () => {
            const { store } = setupStores()
            store.freePullsLeft = 1
            expect(store.canFreePull).toBe(true)
        })

        it('canFreePull is false when freePullsLeft is 0', () => {
            const { store } = setupStores()
            store.freePullsLeft = 0
            expect(store.canFreePull).toBe(false)
        })

        it('checkDailyReset resets freePullsLeft on new day', () => {
            const { store } = setupStores()
            store.freePullsLeft = 0
            store.lastFreePullDate = '2000-01-01'

            store.deserialize({ ssrOwned: {}, freePullsLeft: 0, lastFreePullDate: '2000-01-01' })

            const today = new Date().toISOString().split('T')[0]
            expect(store.lastFreePullDate).toBe(today)
            expect(store.freePullsLeft).toBeGreaterThanOrEqual(1)
        })

        it('serialize/deserialize round-trip preserves data', () => {
            const { store } = setupStores()
            store.freePullsLeft = 2
            store.ssrOwned = { ssr1: true }
            const data = store.serialize()
            store.freePullsLeft = 0
            store.ssrOwned = {}
            store.deserialize(data)
            expect(store.freePullsLeft).toBe(2)
            expect(store.ssrOwned.ssr1).toBe(true)
        })

        it('deserialize handles null/undefined data', () => {
            const { store } = setupStores()
            store.freePullsLeft = 5
            store.deserialize(null as any)
            expect(store.freePullsLeft).toBe(5)
        })

        it('deserialize handles missing fields with defaults', () => {
            const { store } = setupStores()
            store.deserialize({ ssrOwned: undefined, freePullsLeft: undefined, lastFreePullDate: undefined })
            expect(store.ssrOwned).toEqual({})
            expect(store.freePullsLeft).toBeGreaterThanOrEqual(0)
        })

        it('isSSRFirst returns true for unowned SSR', () => {
            const { store } = setupStores()
            store.ssrOwned = {}
            expect(store.isSSRFirst('ssr1')).toBe(true)
        })

        it('isSSRFirst returns false for owned SSR', () => {
            const { store } = setupStores()
            store.ssrOwned = { ssr1: true }
            expect(store.isSSRFirst('ssr1')).toBe(false)
        })

        it('markSSROwned returns true on first mark', () => {
            const { store } = setupStores()
            store.ssrOwned = {}
            expect(store.markSSROwned('ssr1')).toBe(true)
            expect(store.ssrOwned['ssr1']).toBe(true)
        })

        it('markSSROwned returns false on subsequent mark', () => {
            const { store } = setupStores()
            store.ssrOwned = {}
            store.markSSROwned('ssr1')
            expect(store.markSSROwned('ssr1')).toBe(false)
        })

        it('getOwnedSSRIds lists owned SSR IDs', () => {
            const { store } = setupStores()
            store.ssrOwned = { ssr1: true, ssr2: false, ssr3: true }
            expect(store.getOwnedSSRIds().sort()).toEqual(['ssr1', 'ssr3'])
        })

        it('canAffordSingle checks diamonds vs singleCost', () => {
            const { store } = setupStores()
            expect(store.canAffordSingle({ diamonds: 100 })).toBe(true)
            expect(store.canAffordSingle({ diamonds: 50 })).toBe(false)
        })

        it('canAffordSingle handles missing singleCost', () => {
            const { store, configStore } = setupStores()
            configStore.gachaCost = { singleCost: 0, tenCost: 900 }
            expect(store.canAffordSingle({ diamonds: 0 })).toBe(true)
        })

        it('canAffordTen checks diamonds vs tenCost', () => {
            const { store } = setupStores()
            expect(store.canAffordTen({ diamonds: 900 })).toBe(true)
            expect(store.canAffordTen({ diamonds: 500 })).toBe(false)
        })

        it('canAffordTen handles missing tenCost', () => {
            const { store, configStore } = setupStores()
            configStore.gachaCost = { singleCost: 100, tenCost: 0 }
            expect(store.canAffordTen({ diamonds: 0 })).toBe(true)
        })

        it('resetResults clears results', () => {
            const { store } = setupStores()
            store.setResultsField([makeGachaItem()])
            expect(store.results.length).toBeGreaterThan(0)
            store.resetResults()
            expect(store.results.length).toBe(0)
        })

        it('hasResults computed works', () => {
            const { store } = setupStores()
            expect(store.hasResults).toBe(false)
            store.setResultsField([makeGachaItem()])
            expect(store.hasResults).toBe(true)
        })

        it('ownedSSRCount counts owned SSRs', () => {
            const { store } = setupStores()
            store.ssrOwned = { ssr1: true, ssr2: false, ssr3: true }
            expect(store.ownedSSRCount).toBe(2)
        })

        it('totalSSRCount counts SSRs in gachaPool', () => {
            const { store } = setupStores()
            expect(store.totalSSRCount).toBe(1)
        })

        it('ssrCollectionRate computes percentage', () => {
            const { store } = setupStores()
            store.ssrOwned = { item_ssr1: true }
            expect(store.ssrCollectionRate).toBe(100)
        })

        it('ssrCollectionRate returns 0 when no SSRs in pool', () => {
            const { store, configStore } = setupStores()
            configStore.gachaPool = [
                createGachaPoolItem({ id: 'item_r1', name: 'R Item', rarity: 'R', value: {} }),
            ]
            expect(store.ssrCollectionRate).toBe(0)
        })
    })
})
