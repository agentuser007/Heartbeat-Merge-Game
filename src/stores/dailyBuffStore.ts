// ============================================================
// dailyBuffStore.ts — Daily Buff Game State Store
// ============================================================
// Store only does apply + emit. Business logic delegated to
// DailyBuffLogic (pure functions) and DailyBuffService (ResolveResult).
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useConfigStore } from './configStore';
import { DailyBuffService } from '../services/DailyBuffService';
import * as DailyBuffLogic from '../logic/DailyBuffLogic';
import type { DailyBuffEntry } from '../logic/DailyBuffLogic';
import type { ResolveResult } from '../services/ServiceResultTypes';

export type DailyBuff = DailyBuffEntry;

export const useDailyBuffStore = defineStore('dailyBuff', () => {
    const configStore = useConfigStore();

    const activeBuffs = ref<DailyBuff[]>([]);
    const lastRollDate = ref<string>('');
    const buffFlags = ref<Record<string, boolean>>({});
    const pendingBuff = ref<DailyBuff | null>(null);

    const hasActiveBuffs = computed(() => activeBuffs.value.length > 0);
    const currentBuff = computed(() => activeBuffs.value[0] || null);
    const isPending = computed(() => pendingBuff.value !== null);

    // @deserialize-only — 故意不 emit events，避免在 Store 初始化阶段
    // 触发依赖其他 Store 就绪的 handler。gameplay 路径请使用 applyResolveResult。
    function _applyDeserializeOnly(result: ResolveResult): void {
        const db = result.applyTo.dailyBuff;
        if (!db) return;

        if (db.setActiveBuffs !== undefined) activeBuffs.value = db.setActiveBuffs;
        if (db.setBuffFlags !== undefined) buffFlags.value = db.setBuffFlags;
        if (db.setPendingBuff !== undefined) pendingBuff.value = db.setPendingBuff;
        if (db.setLastRollDate !== undefined) lastRollDate.value = db.setLastRollDate;
    }

    function getBuffRemainingMs(buff: DailyBuff): number {
        return DailyBuffLogic.getBuffRemainingMs(buff, {
            buffDurationMs: configStore.dailyBuffConfig.buffDurationMs,
            now: Date.now(),
        });
    }

    function isBuffExpired(buff: DailyBuff): boolean {
        return DailyBuffLogic.isBuffExpired(buff, {
            buffDurationMs: configStore.dailyBuffConfig.buffDurationMs,
            now: Date.now(),
        });
    }

    function checkBuffExpiry(): ResolveResult | null {
        return DailyBuffService.resolveBuffExpiry(
            activeBuffs.value,
            buffFlags.value,
            { buffDurationMs: configStore.dailyBuffConfig.buffDurationMs, now: Date.now() },
        );
    }

    function rollDailyBuff(): ResolveResult | null {
        const result = DailyBuffService.resolveDailyBuffRoll(
            lastRollDate.value,
            activeBuffs.value,
            pendingBuff.value,
            {
                buffDurationMs: configStore.dailyBuffConfig.buffDurationMs,
                buffTypes: configStore.dailyBuffConfig.buffTypes,
                now: Date.now(),
                random: Math.random,
            },
        );
        return result;
    }

    function activatePendingBuff(): ResolveResult | null {
        if (!pendingBuff.value) return null;
        return DailyBuffService.resolveActivateBuff(pendingBuff.value, { now: Date.now() });
    }

    function dismissPendingBuff(): void {
        pendingBuff.value = null;
    }

    function hasBuff(buffId: string): boolean {
        return DailyBuffLogic.hasBuff(buffId, activeBuffs.value, {
            buffDurationMs: configStore.dailyBuffConfig.buffDurationMs,
            now: Date.now(),
        });
    }

    function getBuffValue(buffId: string): boolean {
        return buffFlags.value[buffId] || false;
    }

    function checkDailyReset(): ResolveResult | null {
        const now = Date.now();
        if (DailyBuffLogic.needsDailyReset({ lastRollDate: lastRollDate.value, now })) {
            return rollDailyBuff();
        }
        return null;
    }

    function serialize() {
        return {
            activeBuffs: activeBuffs.value.map(b => ({ ...b })),
            lastRollDate: lastRollDate.value,
            buffFlags: { ...buffFlags.value },
            pendingBuff: pendingBuff.value ? { ...pendingBuff.value } : null
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { activeBuffs?: DailyBuff[]; lastRollDate?: string; buffFlags?: Record<string, boolean>; pendingBuff?: DailyBuff | null };

        activeBuffs.value = d.activeBuffs || [];
        lastRollDate.value = d.lastRollDate || '';
        buffFlags.value = d.buffFlags || {};
        pendingBuff.value = d.pendingBuff || null;

        const expiryResult = checkBuffExpiry();
        if (expiryResult) _applyDeserializeOnly(expiryResult);

        const resetResult = checkDailyReset();
        if (resetResult) _applyDeserializeOnly(resetResult);
    }

    return {
        activeBuffs,
        lastRollDate,
        buffFlags,
        pendingBuff,

        hasActiveBuffs,
        currentBuff,
        isPending,

        rollDailyBuff,
        activatePendingBuff,
        dismissPendingBuff,
        hasBuff,
        getBuffValue,
        checkDailyReset,
        checkBuffExpiry,
        getBuffRemainingMs,
        isBuffExpired,

        serialize,
        deserialize
    };
});
