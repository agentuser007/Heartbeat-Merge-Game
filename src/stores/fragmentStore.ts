// ============================================================
// fragmentStore.ts — Fragment Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';

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
        if (!fragments.value[fragmentId] || fragments.value[fragmentId] < count) {
            return false;
        }
        
        fragments.value[fragmentId] -= count;
        if (fragments.value[fragmentId] <= 0) {
            delete fragments.value[fragmentId];
        }
        
        // Emit event for UI updates
        globalBus.emit('fragment:exchanged', {
            fragmentId,
            count,
            remaining: fragments.value[fragmentId] || 0
        });
        
        return true;
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

    function deserialize(data: any) {
        if (!data) return;
        
        fragments.value = data.fragments || {};
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