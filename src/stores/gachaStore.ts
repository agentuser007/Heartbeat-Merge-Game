// ============================================================
// gachaStore.ts — Gacha Game State Store
// ============================================================
// Iron rule #5: Store only does apply + emit.
// All business logic in GachaLogic / GachaService.
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { GachaLogic, GachaItem as LogicGachaItem } from '../logic/GachaLogic';
import { useConfigStore } from './configStore';
import { useBoardStore } from './boardStore';
import { useCurrencyStore } from './currencyStore';
import { GachaService } from '../services/GachaService';
import type { InstantEffectDeps } from '../services/ItemEffectService';
import type { ServiceResultWithData } from '../services/ServiceResultTypes';
import type { SinglePullData, TenPullData } from '../services/GachaService';

export type GachaItem = LogicGachaItem;

export const useGachaStore = defineStore('gacha', () => {
    // --- State ---
    const ssrOwned = ref<Record<string, boolean>>({});
    const results = ref<GachaItem[]>([]);
    const freePullsLeft = ref(0);
    const lastFreePullDate = ref('');

    // --- Logic instance ---
    const logic = new GachaLogic();

    const configStore = useConfigStore();

    ssrOwned.value = { ...logic.ssrOwned };
    checkDailyReset();

    // --- Effect context builder (lazy store instantiation) ---
    function buildEffectDeps(): InstantEffectDeps {
        const boardStore = useBoardStore();
        return {
            findEmptyCell: () => boardStore.findEmptyCell(),
            chains: configStore.chains,
            chainItemPrefix: configStore.chainItemPrefix,
            items: configStore.items,
            fragment: { ...configStore.itemEffects.fragment, random: Math.random },
            resolveItemId: { random: Math.random },
        };
    }

    function _gachaServiceDeps() {
        const currencyStore = useCurrencyStore();
        return {
            gachaCost: configStore.gachaCost,
            gachaRarityConfig: configStore.gachaRarityConfig,
            gachaSubWeights: configStore.gachaSubWeights,
            gachaPool: configStore.gachaPool,
            canAffordDiamonds: (cost: number) => currencyStore.canAffordDiamonds(cost),
            diamonds: currencyStore.diamonds,
            ssrOwned: { ...ssrOwned.value },
            logic,
            effectDeps: buildEffectDeps(),
            tenPullCount: configStore.gachaConfig.tenPullCount,
            random: { random: Math.random },
        };
    }

    // --- Computed ---
    const ownedSSRCount = computed(() => {
        return Object.values(ssrOwned.value).filter(owned => owned).length;
    });
    
    const totalSSRCount = computed(() => {
        const ssrItems = configStore.gachaPool.filter(item => item.rarity === 'SSR');
        return ssrItems.length;
    });
    
    const ssrCollectionRate = computed(() => {
        return totalSSRCount.value > 0
            ? Math.round((ownedSSRCount.value / totalSSRCount.value) * 100)
            : 0;
    });
    
    const hasResults = computed(() => results.value.length > 0);

    function checkDailyReset() {
        const today = new Date().toISOString().split('T')[0];
        if (lastFreePullDate.value !== today) {
            freePullsLeft.value = Math.max(freePullsLeft.value, 1);
            lastFreePullDate.value = today;
        }
    }

    const canFreePull = computed(() => {
        return freePullsLeft.value > 0;
    });

    // --- Actions — return ServiceResultWithData, caller applies ---
    function singlePull(maxRarity?: 'R' | 'SR' | 'SSR'): ServiceResultWithData<SinglePullData> {
        return GachaService.resolveSinglePull(_gachaServiceDeps(), maxRarity);
    }

    function tenPull(): ServiceResultWithData<TenPullData> {
        return GachaService.resolveTenPull(_gachaServiceDeps());
    }

    function freePull(): ServiceResultWithData<SinglePullData> {
        return GachaService.resolveFreePull(_gachaServiceDeps(), {
            canFreePull: canFreePull.value,
            today: new Date().toISOString().split('T')[0],
        });
    }

    function resetResults() {
        results.value = [];
        logic.acknowledge();
    }

    // --- Thin mutations — called by applyResolveResult only ---
    function setResultsField(items: GachaItem[]): void { results.value = items; }
    function markSsrOwnedField(ssrIds: string[]): void {
        for (const id of ssrIds) {
            ssrOwned.value[id] = true;
            logic.ssrOwned[id] = true;
        }
    }
    function decrementFreePullsField(): void { freePullsLeft.value--; }
    function setLastFreePullDateField(date: string): void { lastFreePullDate.value = date; }

    function isSSRFirst(ssrId: string): boolean {
        return !ssrOwned.value[ssrId];
    }

    function markSSROwned(ssrId: string): boolean {
        const isFirst = !ssrOwned.value[ssrId];
        ssrOwned.value[ssrId] = true;
        return isFirst;
    }

    function getOwnedSSRIds(): string[] {
        return Object.entries(ssrOwned.value)
            .filter(([_, owned]) => owned)
            .map(([id, _]) => id);
    }

    function canAffordSingle(currency: { diamonds: number }): boolean {
        return currency.diamonds >= configStore.gachaCost.singleCost;
    }

    function canAffordTen(currency: { diamonds: number }): boolean {
        return currency.diamonds >= configStore.gachaCost.tenCost;
    }

    // --- Serialization ---
    function serialize() {
        return {
            ssrOwned: { ...ssrOwned.value },
            freePullsLeft: freePullsLeft.value,
            lastFreePullDate: lastFreePullDate.value
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { ssrOwned?: Record<string, boolean>; freePullsLeft?: number; lastFreePullDate?: string };
        
        ssrOwned.value = d.ssrOwned || {};
        freePullsLeft.value = d.freePullsLeft || 0;
        lastFreePullDate.value = d.lastFreePullDate || '';
        
        logic.ssrOwned = { ...ssrOwned.value };
        
        checkDailyReset();
    }

    return {
        // State
        ssrOwned,
        results,
        freePullsLeft,
        lastFreePullDate,
        
        // Computed
        ownedSSRCount,
        totalSSRCount,
        ssrCollectionRate,
        hasResults,
        canFreePull,
        
        // Actions
        singlePull,
        tenPull,
        freePull,
        resetResults,
        isSSRFirst,
        markSSROwned,
        getOwnedSSRIds,
        canAffordSingle,
        canAffordTen,
        
        // Thin mutations
        setResultsField,
        markSsrOwnedField,
        decrementFreePullsField,
        setLastFreePullDateField,
        
        // Serialization
        serialize,
        deserialize
    };
});