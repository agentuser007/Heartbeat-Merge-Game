// ============================================================
// cgAlbumStore.ts — CG Album Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { resolveTryUnlockNext } from '../services/CGAlbumService';
import type { StoryChapter } from '@/types/game';

export interface CGData {
    unlocked: number[];          // Array of unlocked story indices
    memoryFragments: number;     // Count of memory fragments
    title: string;               // Title of the CG story
    maleLeadId: string;
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
                maleLeadId: '',
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
                maleLeadId: '',
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
        const storyConfig = configStore.cgStories[cgId];
        const stories = storyConfig?.stories;

        const result = resolveTryUnlockNext({
            cgId,
            memoryFragments: cg.memoryFragments,
            unlockedStories: cg.unlocked,
            fragmentToStory: configStore.fragmentToStory,
            totalStories: stories?.length ?? 0,
        });

        if (!result.ok) return false;

        unlockNextStoryField(cgId);
        spendMemoryFragmentsField(cgId, configStore.fragmentToStory);

        result.resolveResult.events?.forEach((e: { name: string; data: unknown }) => globalBus.emit(e.name, e.data));
        return true;
    }

    function unlockNextStoryField(cgId: string): void {
        if (!cgData.value[cgId]) {
            cgData.value[cgId] = {
                unlocked: [],
                memoryFragments: 0,
                title: '',
                maleLeadId: '',
                ssrId: ''
            };
        }
        const cg = cgData.value[cgId];
        const nextIndex = cg.unlocked.length;
        cg.unlocked.push(nextIndex);
        unlockedCGs.value.add(cgId);
    }

    function spendMemoryFragmentsField(cgId: string, amount: number): void {
        if (!cgData.value[cgId]) return;
        cgData.value[cgId].memoryFragments = Math.max(0, cgData.value[cgId].memoryFragments - amount);
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

    function getStoriesForCG(cgId: string): Array<{ index: number; title: string; unlocked: boolean }> {
        const cg = cgData.value[cgId];
        if (!cg) return [];
        const configStore = useConfigStore();
        const storyConfig = configStore.cgStories[cgId];
        if (!storyConfig?.stories) return [];
        return storyConfig.stories.map((s: StoryChapter, i: number) => ({
            index: i,
            title: s.title || `${i + 1}`,
            unlocked: cg.unlocked.includes(i)
        }));
    }

    function canUnlockNext(cgId: string): boolean {
        const cg = cgData.value[cgId];
        if (!cg) return false;
        const configStore = useConfigStore();
        const storyConfig = configStore.cgStories[cgId];
        if (!storyConfig?.stories) return false;
        const nextIndex = cg.unlocked.length;
        if (nextIndex >= storyConfig.stories.length) return false;
        return cg.memoryFragments >= configStore.fragmentToStory;
    }

    function getNextUnlockInfo(cgId: string): { nextIndex: number; nextTitle: string; cost: number; currentFragments: number } | null {
        const cg = cgData.value[cgId];
        if (!cg) return null;
        const configStore = useConfigStore();
        const storyConfig = configStore.cgStories[cgId];
        if (!storyConfig?.stories) return null;
        const nextIndex = cg.unlocked.length;
        if (nextIndex >= storyConfig.stories.length) return null;
        return {
            nextIndex,
            nextTitle: storyConfig.stories[nextIndex].title || `${nextIndex + 1}`,
            cost: configStore.fragmentToStory,
            currentFragments: cg.memoryFragments
        };
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

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { cgData?: Record<string, CGData>; unlockedCGs?: string[] };
        
        cgData.value = d.cgData || {};
        unlockedCGs.value = new Set(d.unlockedCGs || []);
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
        unlockNextStoryField,
        spendMemoryFragmentsField,
        isStoryUnlocked,
        getUnlockedStories,
        getStoriesForCG,
        canUnlockNext,
        getNextUnlockInfo,
        getMemoryFragments,
        
        // Serialization
        serialize,
        deserialize
    };
});