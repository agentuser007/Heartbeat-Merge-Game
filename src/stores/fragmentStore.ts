// ============================================================
// fragmentStore.ts — Fragment Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { resolveExchange } from '../services/FragmentService';

export const useFragmentStore = defineStore('fragment', () => {
    // --- State ---
    const fragments = ref<Record<string, number>>({}); // fragment_id -> count

    // --- Computed ---
    const totalFragments = computed(() => {
        return Object.values(fragments.value).reduce((sum, count) => sum + count, 0);
    });
    
    const uniqueFragments = computed(() => {
        return Object.keys(fragments.value).filter(id => fragments.value[id] > 0);
    });
    
    const hasFragments = computed(() => {
        return totalFragments.value > 0;
    });

    // --- Actions ---
    function addFragment(fragmentId: string, count: number = 1): void {
        fragments.value[fragmentId] = (fragments.value[fragmentId] || 0) + count;
        
        // Emit event for UI updates
        globalBus.emit('fragment:added', {
            fragmentId,
            count,
            total: fragments.value[fragmentId]
        });
    }

    function exchangeFragment(fragmentId: string, count: number = 1): boolean {
        const result = resolveExchange({
            fragmentId,
            count,
            currentFragments: { ...fragments.value },
        });

        if (!result.ok) return false;

        const removal = result.resolveResult.applyTo.fragment!.removeFragment!;
        removeFragmentField(removal.fragmentId, removal.count);

        result.resolveResult.events?.forEach((e: { name: string; data: unknown }) => globalBus.emit(e.name, e.data));
        return true;
    }

    function removeFragmentField(fragmentId: string, count: number): void {
        fragments.value[fragmentId] = (fragments.value[fragmentId] || 0) - count;
        if (fragments.value[fragmentId] <= 0) {
            delete fragments.value[fragmentId];
        }
    }

    function getFragmentCount(fragmentId: string): number {
        return fragments.value[fragmentId] || 0;
    }

    function hasFragment(fragmentId: string, count: number = 1): boolean {
        return !!fragments.value[fragmentId] && fragments.value[fragmentId] >= count;
    }

    function clearFragment(fragmentId: string): void {
        delete fragments.value[fragmentId];
        
        // Emit event for UI updates
        globalBus.emit('fragment:cleared', {
            fragmentId
        });
    }

    function clearAll(): void {
        fragments.value = {};
        
        // Emit event for UI updates
        globalBus.emit('fragment:clearedAll');
    }

    function getFragmentIds(): string[] {
        return Object.keys(fragments.value).filter(id => fragments.value[id] > 0);
    }

    function getFragments(): Array<{ id: string; count: number }> {
        return Object.entries(fragments.value)
            .filter(([_, count]) => count > 0)
            .map(([id, count]) => ({ id, count }));
    }

    // --- Serialization ---
    function serialize() {
        return {
            fragments: { ...fragments.value }
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { fragments?: Record<string, number> };
        
        fragments.value = d.fragments || {};
    }

    return {
        // State
        fragments,
        
        // Computed
        totalFragments,
        uniqueFragments,
        hasFragments,
        
        // Actions
        addFragment,
        exchangeFragment,
        removeFragmentField,
        getFragmentCount,
        hasFragment,
        clearFragment,
        clearAll,
        getFragmentIds,
        getFragments,
        
        // Serialization
        serialize,
        deserialize
    };
});