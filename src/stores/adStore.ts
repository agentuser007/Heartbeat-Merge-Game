// ============================================================
// adStore.ts — Ad Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';

export interface AdConfig {
    energy: { reward: number; dailyLimit: number; cooldownMs: number; emoji: string };
    gold: { reward: number; dailyLimit: number; cooldownMs: number; emoji: string };
    diamonds: { reward: number; dailyLimit: number; cooldownMs: number; emoji: string; betaBenefit: boolean };
    freePull: { dailyLimit: number; cooldownMs: number; maxRarity: string; emoji: string };
}

export const useAdStore = defineStore('ad', () => {
    // --- State ---
    const dailyAdCounts = ref<Record<string, number>>({
        energy: 0,
        gold: 0,
        diamonds: 0,
        freePull: 0
    });
    
    const lastWatchTime = ref<Record<string, number>>({
        energy: 0,
        gold: 0,
        diamonds: 0,
        freePull: 0
    });
    
    const lastResetDate = ref<string>('');

    // --- Config ---
    const adConfig: AdConfig = {
        energy: { reward: 20, dailyLimit: Infinity, cooldownMs: 0, emoji: '⚡' },
        gold: { reward: 50, dailyLimit: 3, cooldownMs: 0, emoji: '💰' },
        diamonds: { reward: 50, dailyLimit: 3, cooldownMs: 0, emoji: '💎', betaBenefit: true },
        freePull: { dailyLimit: 1, cooldownMs: 0, maxRarity: 'SR', emoji: '🃏' }
    };

    // --- Computed ---
    const canWatchEnergyAd = computed(() => canWatch('energy'));
    const canWatchGoldAd = computed(() => canWatch('gold'));
    const canWatchDiamondsAd = computed(() => canWatch('diamonds'));
    const canWatchFreePullAd = computed(() => canWatch('freePull'));

    // --- Actions ---
    function watchAd(adType: string): boolean {
        checkDailyReset();
        if (!canWatch(adType)) return false;
        
        // Grant reward directly (no real ad in BASIC mode)
        grantReward(adType);
        return true;
    }

    function canWatch(adType: string): boolean {
        const config = adConfig[adType as keyof AdConfig];
        if (!config) return false;
        
        // Check daily limit
        if (dailyAdCounts.value[adType] >= (config as any).dailyLimit) return false;
        
        // Check cooldown
        if ((config as any).cooldownMs > 0 && lastWatchTime.value[adType]) {
            if (Date.now() - lastWatchTime.value[adType] < (config as any).cooldownMs) return false;
        }
        
        return true;
    }

    function getRemaining(adType: string): number | string {
        checkDailyReset();
        const config = adConfig[adType as keyof AdConfig];
        if (!config) return 0;
        
        const remaining = (config as any).dailyLimit - (dailyAdCounts.value[adType] || 0);
        return remaining === Infinity ? '∞' : remaining;
    }

    function grantReward(adType: string): void {
        dailyAdCounts.value[adType]++;
        lastWatchTime.value[adType] = Date.now();
        
        const config = adConfig[adType as keyof AdConfig];
        if (!config) return;
        
        // Emit event for rewards
        globalBus.emit('ad:rewardGranted', {
            adType,
            reward: (config as any).reward
        });
    }

    function checkDailyReset(): void {
        const today = getCurrentDateStr();
        if (lastResetDate.value !== today) {
            dailyAdCounts.value = {
                energy: 0,
                gold: 0,
                diamonds: 0,
                freePull: 0
            };
            lastResetDate.value = today;
        }
    }

    function getCurrentDateStr(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function resetDaily(): void {
        dailyAdCounts.value = {
            energy: 0,
            gold: 0,
            diamonds: 0,
            freePull: 0
        };
        lastResetDate.value = getCurrentDateStr();
        
        // Emit event for UI updates
        globalBus.emit('ad:dailyReset');
    }

    // --- Serialization ---
    function serialize() {
        return {
            dailyAdCounts: { ...dailyAdCounts.value },
            lastWatchTime: { ...lastWatchTime.value },
            lastResetDate: lastResetDate.value
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        dailyAdCounts.value = data.dailyAdCounts || {
            energy: 0,
            gold: 0,
            diamonds: 0,
            freePull: 0
        };
        
        lastWatchTime.value = data.lastWatchTime || {
            energy: 0,
            gold: 0,
            diamonds: 0,
            freePull: 0
        };
        
        lastResetDate.value = data.lastResetDate || getCurrentDateStr();
        checkDailyReset();
    }

    return {
        // State
        dailyAdCounts,
        lastWatchTime,
        lastResetDate,
        
        // Computed
        canWatchEnergyAd,
        canWatchGoldAd,
        canWatchDiamondsAd,
        canWatchFreePullAd,
        
        // Actions
        watchAd,
        canWatch,
        getRemaining,
        grantReward,
        checkDailyReset,
        resetDaily,
        
        // Serialization
        serialize,
        deserialize
    };
});