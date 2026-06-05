// ============================================================
// gachaStore.ts — Gacha Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { GachaLogic, GachaItem as LogicGachaItem, GachaConfig } from '../logic/GachaLogic';
import { useConfigStore } from './configStore';

export type GachaItem = LogicGachaItem;

export const useGachaStore = defineStore('gacha', () => {
    // --- State ---
    const ssrOwned = ref<Record<string, boolean>>({}); // ssr_id -> owned status
    const results = ref<GachaItem[]>([]);
    const freePullsLeft = ref(0);
    const lastFreePullDate = ref('');

    // --- Logic instance ---
    const logic = new GachaLogic();

    // NOTE: useConfigStore() is called at the top level of this defineStore setup.
    // This creates an init order dependency — Pinia must be installed before this store is first accessed.
    // In practice this is safe because stores are first accessed after app.mount(), but restructuring
    // to use a lazy getter would remove this dependency if needed.
    const configStore = useConfigStore();

    // Initialize state from logic
    ssrOwned.value = { ...logic.ssrOwned };

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

    const canFreePull = computed(() => {
        const today = new Date().toISOString().split('T')[0];
        return freePullsLeft.value > 0 && lastFreePullDate.value !== today;
    });

    // --- Actions ---
    function singlePull(maxRarity?: 'R' | 'SR' | 'SSR'): GachaItem | null {
        // Prepare gacha config
        const gachaConfig: GachaConfig = {
            rarityConfig: configStore.gachaRarityConfig,
            gachaCost: {
                singleCost: configStore.gachaCost.singleCost || 0,
                tenCost: configStore.gachaCost.tenCost || 0
            },
            subWeights: configStore.gachaSubWeights,
            gachaPoolV2: configStore.gachaPoolV2 || configStore.gachaPool
        };
        
        const result = logic.pullSingle(gachaConfig, maxRarity);
        
        if (result) {
            results.value = [result];
            
            if (result.rarity === 'SSR') {
                const isFirst = !ssrOwned.value[result.id];
                ssrOwned.value[result.id] = true;
                
                globalBus.emit('gacha:ssrObtained', {
                    item: result,
                    isFirst
                });
            }
        }
        
        return result || null;
    }

    function tenPull(): GachaItem[] | null {
        // Prepare gacha config
        const gachaConfig: GachaConfig = {
            rarityConfig: configStore.gachaRarityConfig,
            gachaCost: {
                singleCost: configStore.gachaCost.singleCost || 0,
                tenCost: configStore.gachaCost.tenCost || 0
            },
            subWeights: configStore.gachaSubWeights,
            gachaPoolV2: configStore.gachaPoolV2 || configStore.gachaPool
        };
        
        const result = logic.pullTen(gachaConfig);
        
        if (result) {
            results.value = result;
            
            // Track SSR ownership
            const newSSRs: GachaItem[] = [];
            for (const item of result) {
                if (item.rarity === 'SSR') {
                    const isFirst = !ssrOwned.value[item.id];
                    ssrOwned.value[item.id] = true;
                    if (isFirst) {
                        newSSRs.push(item);
                    }
                }
            }
            
            if (newSSRs.length > 0) {
                globalBus.emit('gacha:newSSRsObtained', {
                    items: newSSRs
                });
            }
        }
        
        return result || null;
    }

    function freePull(): GachaItem | null {
        if (!canFreePull.value) return null;
        
        freePullsLeft.value--;
        lastFreePullDate.value = new Date().toISOString().split('T')[0];
        
        return singlePull('SR');
    }

    function resetResults() {
        results.value = [];
        logic.acknowledge();
    }

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
        return currency.diamonds >= (configStore.gachaCost.singleCost || 0);
    }

    function canAffordTen(currency: { diamonds: number }): boolean {
        return currency.diamonds >= (configStore.gachaCost.tenCost || 0);
    }

    // --- Serialization ---
    function serialize() {
        return {
            ssrOwned: { ...ssrOwned.value },
            freePullsLeft: freePullsLeft.value,
            lastFreePullDate: lastFreePullDate.value
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        ssrOwned.value = data.ssrOwned || {};
        freePullsLeft.value = data.freePullsLeft || 0;
        lastFreePullDate.value = data.lastFreePullDate || '';
        
        // Sync to logic
        logic.ssrOwned = { ...ssrOwned.value };
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
        canFreePull,
        
        // Serialization
        serialize,
        deserialize
    };
});