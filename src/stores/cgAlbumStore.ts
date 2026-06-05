// ============================================================
// cgAlbumStore.ts — CG Album Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';

export interface CGData {
    unlocked: number[];          // Array of unlocked story indices
    memoryFragments: number;     // Count of memory fragments
    title: string;               // Title of the CG story
    maleLead: string;            // Male lead character name
    ssrId: string;               // Associated SSR card ID
}

export const useCGAlbumStore = defineStore('cgAlbum', () => {
    // --- State ---
    const cgData = ref<Record<string, CGData>>({}); // cg_id -> CG data
    const unlockedCGs = ref<Set<string>>(new Set()); // Set of unlocked CG IDs

    // --- Computed ---
    const totalCGs = computed(() => {
        return Object.keys(cgData.value).length;
    });
    
    const unlockedCount = computed(() => {
        return unlockedCGs.value.size;
    });
    
    const completionRate = computed(() => {
        return totalCGs.value > 0 
            ? Math.round((unlockedCount.value / totalCGs.value) * 100) 
            : 0;
    });
    
    const hasUnlockedCGs = computed(() => {
        return unlockedCount.value > 0;
    });

    // --- Actions ---
    function unlockCG(cgId: string, storyIndex: number): boolean {
        if (!cgData.value[cgId]) {
            // Initialize CG data if it doesn't exist
            cgData.value[cgId] = {
                unlocked: [],
                memoryFragments: 0,
                title: '',
                maleLead: '',
                ssrId: ''
            };
        }
        
        const cg = cgData.value[cgId];
        if (cg.unlocked.includes(storyIndex)) {
            return false; // Already unlocked
        }
        
        cg.unlocked.push(storyIndex);
        unlockedCGs.value.add(cgId);
        
        // Emit event for UI updates
        globalBus.emit('cg:unlocked', {
            cgId,
            storyIndex
        });
        
        return true;
    }

    function readCG(cgId: string, storyIndex: number): boolean {
        if (!cgData.value[cgId]) {
            return false; // CG not initialized
        }
        
        const cg = cgData.value[cgId];
        if (!cg.unlocked.includes(storyIndex)) {
            return false; // Story not unlocked
        }
        
        // Emit event for reading the story
        globalBus.emit('cg:read', {
            cgId,
            storyIndex
        });
        
        return true;
    }

    function getCGList(): Array<{ id: string; data: CGData }> {
        return Object.entries(cgData.value).map(([id, data]) => ({
            id,
            data
        }));
    }

    function addMemoryFragments(cgId: string, count: number): void {
        if (!cgData.value[cgId]) {
            // Initialize CG data if it doesn't exist
            cgData.value[cgId] = {
                unlocked: [],
                memoryFragments: 0,
                title: '',
                maleLead: '',
                ssrId: ''
            };
        }
        
        cgData.value[cgId].memoryFragments += count;
        
        // Emit event for UI updates
        globalBus.emit('cg:memoryFragmentsAdded', {
            cgId,
            count,
            total: cgData.value[cgId].memoryFragments
        });
    }

    function tryUnlockNext(cgId: string): boolean {
        if (!cgData.value[cgId]) {
            return false;
        }
        
        const cg = cgData.value[cgId];
        const configStore = useConfigStore();
        
        if (cg.memoryFragments < configStore.fragmentToStory) return false;
        
        const nextIndex = cg.unlocked.length;
        const cgStoryConfig = configStore.cgStories[cgId];
        const stories = cgStoryConfig?.stories;
        if (stories && nextIndex >= stories.length) return false;
        
        if (cg.unlocked.includes(nextIndex)) return false;
        
        cg.unlocked.push(nextIndex);
        unlockedCGs.value.add(cgId);
        
        cg.memoryFragments = Math.max(0, cg.memoryFragments - configStore.fragmentToStory);
        
        globalBus.emit('cg:nextUnlocked', {
            cgId,
            storyIndex: nextIndex
        });
        
        return true;
    }

    function isStoryUnlocked(cgId: string, storyIndex: number): boolean {
        if (!cgData.value[cgId]) {
            return false;
        }
        
        return cgData.value[cgId].unlocked.includes(storyIndex);
    }

    function getUnlockedStories(cgId: string): number[] {
        if (!cgData.value[cgId]) {
            return [];
        }
        
        return [...cgData.value[cgId].unlocked];
    }

    function getMemoryFragments(cgId: string): number {
        if (!cgData.value[cgId]) {
            return 0;
        }
        
        return cgData.value[cgId].memoryFragments;
    }

    // --- Serialization ---
    function serialize() {
        return {
            cgData: JSON.parse(JSON.stringify(cgData.value)), // Deep clone
            unlockedCGs: Array.from(unlockedCGs.value)
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        cgData.value = data.cgData || {};
        unlockedCGs.value = new Set(data.unlockedCGs || []);
    }

    return {
        // State
        cgData,
        unlockedCGs,
        
        // Computed
        totalCGs,
        unlockedCount,
        completionRate,
        hasUnlockedCGs,
        
        // Actions
        unlockCG,
        readCG,
        getCGList,
        addMemoryFragments,
        tryUnlockNext,
        isStoryUnlocked,
        getUnlockedStories,
        getMemoryFragments,
        
        // Serialization
        serialize,
        deserialize
    };
});