// ============================================================
// achievementStore.ts — Achievement Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { useCollectionStore } from './collectionStore';
import { useLoopStore } from './loopStore';

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: string; // stat name or special condition
    target: number;     // target value to unlock
    reward: {
        gold?: number;
        diamonds?: number;
        energy?: number;
    };
}

export const useAchievementStore = defineStore('achievement', () => {
    // --- State ---
    const unlocked = ref<Set<string>>(new Set()); // Achievements unlocked but reward NOT yet claimed
    const unlockedThisLoop = ref<Set<string>>(new Set()); // Achievements unlocked in current loop only
    const completed = ref<Set<string>>(new Set()); // Achievements unlocked AND reward claimed
    const stats = ref<Record<string, number>>({
        merges: 0,
        bossDefeats: 0,
        maxLevelItems: 0,
        totalGoldEarned: 0,
        recycled: 0,
        gachaPulls: 0,
        cellsUnlocked: 0,
        dailyCompleted: 0
    });
    
    const achievementList = ref<Achievement[]>([]);

    // NOTE: useConfigStore() is called at the top level of this defineStore setup.
    // This creates an init order dependency — Pinia must be installed before this store is first accessed.
    // In practice this is safe because stores are first accessed after app.mount(), but restructuring
    // to use a lazy getter would remove this dependency if needed.
    const configStore = useConfigStore();
    achievementList.value = configStore.achievementData;

    // --- Computed ---
    const unlockedCount = computed(() => unlocked.value.size);
    const completedCount = computed(() => completed.value.size);
    const totalAchievements = computed(() => achievementList.value.length);
    const completionPercentage = computed(() => 
        totalAchievements.value > 0 
            ? Math.round(((unlockedCount.value + completedCount.value) / totalAchievements.value) * 100) 
            : 0
    );
    
    const pendingClaims = computed(() => 
        Array.from(unlocked.value).map(id => 
            achievementList.value.find(a => a.id === id)
        ).filter(Boolean) as Achievement[]
    );

    // --- Actions ---
    function checkAll() {
        if (achievementList.value.length === 0) return;

        for (const ach of achievementList.value) {
            // Skip if already unlocked (pending claim) or already completed (claimed)
            if (unlocked.value.has(ach.id) || completed.value.has(ach.id)) continue;

            let currentValue = 0;
            if (ach.condition === 'collectionPct') {
                currentValue = useCollectionStore().completionPercentage ?? 0;
            } else if (ach.condition === 'loopReached') {
                currentValue = useLoopStore().loopIndex;
            } else {
                currentValue = stats.value[ach.condition] || 0;
            }

            if (currentValue >= ach.target) {
                unlock(ach.id);
            }
        }
    }

    function unlock(achievementId: string) {
        // Check if already unlocked or completed
        if (unlocked.value.has(achievementId) || completed.value.has(achievementId)) {
            return;
        }

        unlocked.value.add(achievementId);
        unlockedThisLoop.value.add(achievementId);

        const ach = achievementList.value.find(a => a.id === achievementId);
        if (ach) {
            // Emit event for UI effects
            globalBus.emit('achievement:unlocked', {
                achievement: ach
            });
        }
    }

    function complete(achievementId: string) {
        // Move from unlocked to completed
        if (!unlocked.value.has(achievementId)) return;
        
        unlocked.value.delete(achievementId);
        completed.value.add(achievementId);

        const ach = achievementList.value.find(a => a.id === achievementId);
        if (ach) {
            // Emit event for rewards
            globalBus.emit('achievement:claimed', {
                achievement: ach,
                reward: ach.reward
            });
        }
    }

    function incrementStat(statName: string, amount: number = 1) {
        if (stats.value[statName] !== undefined) {
            stats.value[statName] += amount;
            checkAll();
        }
    }

    function getStatValue(statName: string): number {
        return stats.value[statName] || 0;
    }

    function isUnlocked(achievementId: string): boolean {
        return unlocked.value.has(achievementId);
    }

    function isCompleted(achievementId: string): boolean {
        return completed.value.has(achievementId);
    }

    function canClaim(achievementId: string): boolean {
        return unlocked.value.has(achievementId) && !completed.value.has(achievementId);
    }

    function getUnlockedCountThisLoop(): number {
        return unlockedThisLoop.value.size;
    }

    function resetLoopAchievements(): void {
        unlockedThisLoop.value.clear();
    }

    // --- Serialization ---
    function serialize() {
        return {
            unlocked: Array.from(unlocked.value),
            unlockedThisLoop: Array.from(unlockedThisLoop.value),
            completed: Array.from(completed.value),
            stats: { ...stats.value }
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        unlocked.value = new Set(data.unlocked || []);
        unlockedThisLoop.value = new Set(data.unlockedThisLoop || []);
        completed.value = new Set(data.completed || []);
        stats.value = data.stats || {
            merges: 0,
            bossDefeats: 0,
            maxLevelItems: 0,
            totalGoldEarned: 0,
            recycled: 0,
            gachaPulls: 0,
            cellsUnlocked: 0,
            dailyCompleted: 0
        };
    }

    return {
        // State
        unlocked,
        unlockedThisLoop,
        completed,
        stats,
        achievementList,
        
        // Computed
        unlockedCount,
        completedCount,
        totalAchievements,
        completionPercentage,
        pendingClaims,
        
        // Actions
        checkAll,
        unlock,
        complete,
        incrementStat,
        getStatValue,
        isUnlocked,
        isCompleted,
        canClaim,
        getUnlockedCountThisLoop,
        resetLoopAchievements,
        
        // Serialization
        serialize,
        deserialize
    };
});