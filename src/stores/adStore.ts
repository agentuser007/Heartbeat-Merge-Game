// ============================================================
// adStore.ts — Ad Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useConfigStore } from './configStore';
import { AdService } from '../services/AdService';
import type { ServiceResult } from '../services/ServiceResultTypes';
import type { ResolveResult } from '../services/ServiceResultTypes';
import * as AdLogic from '../logic/AdLogic';

export const useAdStore = defineStore('ad', () => {
    const configStore = useConfigStore();

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

    // --- Computed ---
    const canWatchEnergyAd = computed(() => canWatch('energy'));
    const canWatchGoldAd = computed(() => canWatch('gold'));
    const canWatchDiamondsAd = computed(() => canWatch('diamonds'));
    const canWatchFreePullAd = computed(() => canWatch('freePull'));

    // --- Actions ---
    function watchAd(adType: string): ServiceResult {
        checkDailyReset();
        return AdService.resolveWatchAd(adType, {
            adConfig: configStore.adConfig,
            dailyAdCounts: dailyAdCounts.value,
            lastWatchTime: lastWatchTime.value,
            freePullMaxRarity: configStore.gachaConfig.freePullMaxRarity,
            now: Date.now(),
        });
    }

    function canWatch(adType: string): boolean {
        return AdLogic.canWatch(adType, {
            config: configStore.adConfig,
            dailyAdCounts: dailyAdCounts.value,
            lastWatchTime: lastWatchTime.value,
            now: Date.now(),
        });
    }

    function getRemaining(adType: string): number | string {
        checkDailyReset();
        return AdLogic.getRemaining(adType, {
            config: configStore.adConfig,
            dailyAdCounts: dailyAdCounts.value,
        });
    }

    function checkDailyReset(): void {
        const now = Date.now();
        if (AdLogic.needsDailyReset({ lastResetDate: lastResetDate.value, now })) {
            resetAllCounts();
            lastResetDate.value = AdLogic.getCurrentDateStr(now);
        }
    }

    function resetAllCounts(): void {
        dailyAdCounts.value = { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
    }

    function resetDaily(): ResolveResult {
        return AdService.resolveDailyReset({ now: Date.now() });
    }

    // --- Serialization ---
    function serialize() {
        return {
            dailyAdCounts: { ...dailyAdCounts.value },
            lastWatchTime: { ...lastWatchTime.value },
            lastResetDate: lastResetDate.value
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { dailyAdCounts?: Record<string, number>; lastWatchTime?: Record<string, number>; lastResetDate?: string };
        
        dailyAdCounts.value = d.dailyAdCounts || { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
        lastWatchTime.value = d.lastWatchTime || { energy: 0, gold: 0, diamonds: 0, freePull: 0 };
        lastResetDate.value = d.lastResetDate || AdLogic.getCurrentDateStr(Date.now());
        checkDailyReset();
    }

    return {
        dailyAdCounts,
        lastWatchTime,
        lastResetDate,
        
        canWatchEnergyAd,
        canWatchGoldAd,
        canWatchDiamondsAd,
        canWatchFreePullAd,
        
        watchAd,
        canWatch,
        getRemaining,
        checkDailyReset,
        resetAllCounts,
        resetDaily,
        
        serialize,
        deserialize
    };
});
