// ============================================================
// collectionStore.ts — Item Collection Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { resolveCheckChainCompletion } from '../services/CollectionService';

export const useCollectionStore = defineStore('collection', () => {
    // --- State ---
    const discovered = ref<Set<string>>(new Set()); // Set of itemIds discovered
    const discoveredThisLoop = ref<Set<string>>(new Set()); // Items discovered in current loop only
    const gachaCollected = ref<Set<string>>(new Set()); // Set of gacha card IDs collected
    const completedChains = ref<Set<string>>(new Set()); // Set of chain IDs that have been completed & rewarded
    const activeTab = ref<'items' | 'gacha' | 'fragments'>('items');

    // NOTE: useConfigStore() is called at the top level of this defineStore setup.
    // This creates an init order dependency — Pinia must be installed before this store is first accessed.
    // In practice this is safe because stores are first accessed after app.mount(), but restructuring
    // to use a lazy getter would remove this dependency if needed.
    const configStore = useConfigStore();

    // --- Computed ---
    const completionPercentage = computed(() => {
        const totalItems = Object.keys(configStore.items).length;
        if (totalItems === 0) return 0;
        return Math.round((discovered.value.size / totalItems) * 100);
    });

    const gachaCompletionPercentage = computed(() => {
        const total = configStore.gachaPool.length;
        if (total === 0) return 0;
        return Math.round((gachaCollected.value.size / total) * 100);
    });

    const chainGroups = computed(() => {
        const chains: Record<string, Array<{ id: string; discovered: boolean } & any>> = {};
        
        for (const [id, item] of Object.entries(configStore.items)) {
            if (!chains[item.chain]) {
                chains[item.chain] = [];
            }
            chains[item.chain].push({
                ...item,
                id,
                discovered: discovered.value.has(id)
            });
        }
        
        // Sort each chain by level
        for (const chain of Object.values(chains)) {
            chain.sort((a, b) => a.level - b.level);
        }
        
        return chains;
    });

    const gachaByRarity = computed(() => {
        const groups: Record<string, any[]> = { SSR: [], SR: [], R: [] };
        for (const card of configStore.gachaPool) {
            const r = card.rarity;
            if (groups[r]) {
                groups[r].push({
                    ...card,
                    collected: gachaCollected.value.has(card.id)
                });
            }
        }
        return groups;
    });

    const gachaSSRCount = computed(() => gachaByRarity.value.SSR.filter(c => c.collected).length);
    const gachaSRCount = computed(() => gachaByRarity.value.SR.filter(c => c.collected).length);
    const gachaRCount = computed(() => gachaByRarity.value.R.filter(c => c.collected).length);

    const discoveredItemsCount = computed(() => discovered.value.size);
    const gachaCollectedCount = computed(() => gachaCollected.value.size);

    // --- Actions ---
    function discover(itemId: string): boolean {
        if (discovered.value.has(itemId)) {
            return false; // already discovered
        }
        
        discovered.value.add(itemId);
        discoveredThisLoop.value.add(itemId);
        
        // Emit event for UI effects and achievements
        globalBus.emit('collection:itemDiscovered', {
            itemId
        });
        
        // Check chain completion
        const item = configStore.items[itemId];
        if (item) {
            checkChainCompletion(item.chain);
        }
        
        return true; // new discovery
    }

    function collectGacha(cardId: string): boolean {
        if (gachaCollected.value.has(cardId)) {
            return false; // already collected
        }
        
        gachaCollected.value.add(cardId);
        
        // Emit event for UI effects
        globalBus.emit('collection:gachaCollected', {
            cardId
        });
        
        return true; // new collection
    }

    function checkChainCompletion(chainId: string) {
        const result = resolveCheckChainCompletion({
            chainId,
            items: configStore.items,
            discovered: discovered.value,
            completedChains: completedChains.value,
        });

        if (result.applyTo.collection?.markChainCompleted) {
            markChainCompletedField(result.applyTo.collection.markChainCompleted);
        }

        result.events?.forEach((e: { name: string; data: unknown }) => globalBus.emit(e.name, e.data));
    }

    function markChainCompletedField(chainId: string): void {
        completedChains.value.add(chainId);
    }

    function checkCompletion(): number {
        const totalItems = Object.keys(configStore.items).length;
        return totalItems > 0 ? Math.round((discovered.value.size / totalItems) * 100) : 0;
    }

    function getCompletionPct(): number {
        return completionPercentage.value;
    }

    function switchTab(tab: 'items' | 'gacha' | 'fragments') {
        activeTab.value = tab;
    }

    function isInChainCompleted(chainId: string): boolean {
        return completedChains.value.has(chainId);
    }

    function getNewDiscoveriesCountThisLoop(): number {
        return discoveredThisLoop.value.size;
    }

    function resetLoopDiscoveries(): void {
        discoveredThisLoop.value.clear();
    }

    // --- Serialization ---
    function serialize() {
        return {
            discovered: Array.from(discovered.value),
            discoveredThisLoop: Array.from(discoveredThisLoop.value),
            gachaCollected: Array.from(gachaCollected.value),
            completedChains: Array.from(completedChains.value),
            activeTab: activeTab.value
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { discovered?: string[]; discoveredThisLoop?: string[]; gachaCollected?: string[]; completedChains?: string[]; activeTab?: 'items' | 'gacha' | 'fragments' };
        
        discovered.value = new Set(d.discovered || []);
        discoveredThisLoop.value = new Set(d.discoveredThisLoop || []);
        gachaCollected.value = new Set(d.gachaCollected || []);
        completedChains.value = new Set(d.completedChains || []);
        activeTab.value = d.activeTab || 'items';
    }

    return {
        // State
        discovered,
        discoveredThisLoop,
        gachaCollected,
        completedChains,
        activeTab,
        
        // Computed
        completionPercentage,
        gachaCompletionPercentage,
        chainGroups,
        gachaByRarity,
        gachaSSRCount,
        gachaSRCount,
        gachaRCount,
        discoveredItemsCount,
        gachaCollectedCount,
        
        // Actions
        discover,
        collectGacha,
        checkChainCompletion,
        markChainCompletedField,
        checkCompletion,
        getCompletionPct,
        switchTab,
        isInChainCompleted,
        getNewDiscoveriesCountThisLoop,
        resetLoopDiscoveries,
        
        // Serialization
        serialize,
        deserialize
    };
});