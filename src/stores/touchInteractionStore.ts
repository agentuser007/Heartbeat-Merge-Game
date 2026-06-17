// ============================================================
// touchInteractionStore.ts — Touch Interaction Store
// ============================================================
// Manages touch overlay state, cooldowns, and daily limits.
// Belongs to META save (permanent across loops).
// Iron rule #5: Store only does apply + emit.
// ============================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useConfigStore } from './configStore';
import { useAffectionStore } from './affectionStore';
import { TouchInteractionService } from '../services/TouchInteractionService';
import type { ServiceResultWithData } from '../services/ServiceResultTypes';
import type { TouchData } from '../services/TouchInteractionService';
import type { TouchZone, TouchResponse } from '@/types/game';

export const useTouchInteractionStore = defineStore('touchInteraction', () => {
    const activeCharacterId = ref<string | null>(null);
    const isOverlayOpen = ref(false);
    const touchCooldowns = ref<Record<string, Record<string, number>>>({});
    const dailyTouchCount = ref<Record<string, number>>({});
    const lastDailyReset = ref(0);

    function _todayStart(): number {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    function _checkDailyReset(): void {
        const todayStart = _todayStart();
        if (lastDailyReset.value < todayStart) {
            dailyTouchCount.value = {};
            lastDailyReset.value = todayStart;
        }
    }

    function canTouch(characterId: string, zoneId: string): boolean {
        const affectionStore = useAffectionStore();
        const configStore = useConfigStore();
        const zones = configStore.touchInteractions?.zones || [];
        const zone = zones.find((z: TouchZone) => z.id === zoneId);
        if (!zone) return false;

        const level = affectionStore.getLevel(characterId);
        if (zone.unlockLevel > level) return false;

        const cooldown = configStore.affectionConfig?.touchCooldown || 3000;
        const lastTime = touchCooldowns.value[characterId]?.[zoneId] || 0;
        if (Date.now() - lastTime < cooldown) return false;

        return true;
    }

    function getCooldownRemaining(characterId: string, zoneId: string): number {
        const configStore = useConfigStore();
        const cooldown = configStore.affectionConfig?.touchCooldown || 3000;
        const lastTime = touchCooldowns.value[characterId]?.[zoneId] || 0;
        const remaining = cooldown - (Date.now() - lastTime);
        return Math.max(0, remaining);
    }

    function getTouchResponse(characterId: string, zoneId: string): TouchResponse | null {
        const configStore = useConfigStore();
        const affectionStore = useAffectionStore();
        const responses = configStore.touchInteractions?.responses as Record<string, Record<string, Record<string, TouchResponse>>> || {};
        const charResponses = responses[characterId]?.[zoneId];
        if (!charResponses) return null;

        const level = affectionStore.getLevel(characterId);
        const levelKey = String(Math.min(level, 5));
        return charResponses[levelKey] || charResponses['0'] || null;
    }

    function openOverlay(characterId: string): void {
        activeCharacterId.value = characterId;
        isOverlayOpen.value = true;
    }

    function closeOverlay(): void {
        isOverlayOpen.value = false;
        activeCharacterId.value = null;
    }

    function performTouch(characterId: string, zoneId: string): ServiceResultWithData<TouchData> {
        _checkDailyReset();

        return TouchInteractionService.resolvePerformTouch(characterId, zoneId, {
            canTouch,
            getTouchResponse,
        });
    }

    // --- Thin mutations — called by applyResolveResult only ---
    function setTouchCooldownField(characterId: string, zoneId: string, timestamp: number): void {
        if (!touchCooldowns.value[characterId]) {
            touchCooldowns.value[characterId] = {};
        }
        touchCooldowns.value[characterId][zoneId] = timestamp;
    }

    function incrementDailyTouchCountField(characterId: string): void {
        dailyTouchCount.value[characterId] = (dailyTouchCount.value[characterId] || 0) + 1;
    }

    function resetDailyCounts(): void {
        dailyTouchCount.value = {};
        lastDailyReset.value = _todayStart();
    }

    function getDailyTouchCount(characterId: string): number {
        _checkDailyReset();
        return dailyTouchCount.value[characterId] || 0;
    }

    function serialize() {
        return {
            activeCharacterId: activeCharacterId.value,
            touchCooldowns: { ...touchCooldowns.value },
            dailyTouchCount: { ...dailyTouchCount.value },
            lastDailyReset: lastDailyReset.value
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { activeCharacterId?: string | null; touchCooldowns?: Record<string, Record<string, number>>; dailyTouchCount?: Record<string, number>; lastDailyReset?: number };
        activeCharacterId.value = d.activeCharacterId || null;
        touchCooldowns.value = d.touchCooldowns || {};
        dailyTouchCount.value = d.dailyTouchCount || {};
        lastDailyReset.value = d.lastDailyReset || 0;
    }

    return {
        activeCharacterId,
        isOverlayOpen,
        touchCooldowns,
        dailyTouchCount,
        lastDailyReset,

        canTouch,
        getCooldownRemaining,
        getTouchResponse,
        openOverlay,
        closeOverlay,
        performTouch,
        setTouchCooldownField,
        incrementDailyTouchCountField,
        resetDailyCounts,
        getDailyTouchCount,

        serialize,
        deserialize
    };
});