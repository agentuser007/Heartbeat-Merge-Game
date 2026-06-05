// ============================================================
// dailyBuffStore.ts — Daily Buff Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';

export interface DailyBuff {
    id: string;
    icon: string;
    nameKey: string;
    descKey: string;
    activatedAt?: number;
}

const BUFF_DURATION_MS = 30 * 60 * 1000;

export const useDailyBuffStore = defineStore('dailyBuff', () => {
    const activeBuffs = ref<DailyBuff[]>([]);
    const lastRollDate = ref<string>('');
    const buffFlags = ref<Record<string, boolean>>({});
    const pendingBuff = ref<DailyBuff | null>(null);

    const DAILY_BUFF_TYPES: DailyBuff[] = [
        {
            id: 'merge_bonus',
            icon: '✨',
            nameKey: 'dailyBuff.mergeBonus',
            descKey: 'dailyBuff.mergeBonusDesc'
        },
        {
            id: 'energy_discount',
            icon: '⚡',
            nameKey: 'dailyBuff.energyDiscount',
            descKey: 'dailyBuff.energyDiscountDesc'
        },
        {
            id: 'sell_price_up',
            icon: '🪙',
            nameKey: 'dailyBuff.sellPriceUp',
            descKey: 'dailyBuff.sellPriceUpDesc'
        },
        {
            id: 'gen_speed_up',
            icon: '⏩',
            nameKey: 'dailyBuff.genSpeedUp',
            descKey: 'dailyBuff.genSpeedUpDesc'
        },
        {
            id: 'lucky_merge',
            icon: '🍀',
            nameKey: 'dailyBuff.luckyMerge',
            descKey: 'dailyBuff.luckyMergeDesc'
        }
    ];

    const hasActiveBuffs = computed(() => activeBuffs.value.length > 0);
    const currentBuff = computed(() => activeBuffs.value[0] || null);
    const isPending = computed(() => pendingBuff.value !== null);

    function getBuffRemainingMs(buff: DailyBuff): number {
        if (!buff.activatedAt) return 0;
        const elapsed = Date.now() - buff.activatedAt;
        return Math.max(0, BUFF_DURATION_MS - elapsed);
    }

    function isBuffExpired(buff: DailyBuff): boolean {
        return getBuffRemainingMs(buff) <= 0;
    }

    function checkBuffExpiry(): void {
        const expired = activeBuffs.value.filter(b => isBuffExpired(b));
        activeBuffs.value = activeBuffs.value.filter(b => !isBuffExpired(b));
        for (const buff of expired) {
            delete buffFlags.value[buff.id];
            globalBus.emit('dailyBuff:expired', { buff });
        }
    }

    function rollDailyBuff(): void {
        const today = getCurrentDateStr();
        if (lastRollDate.value === today && (activeBuffs.value.length > 0 || pendingBuff.value)) return;

        activeBuffs.value = [];
        buffFlags.value = {};

        const idx = Math.floor(Math.random() * DAILY_BUFF_TYPES.length);
        const newBuff = DAILY_BUFF_TYPES[idx];
        lastRollDate.value = today;

        pendingBuff.value = newBuff;

        globalBus.emit('dailyBuff:rolled', {
            buff: newBuff
        });
    }

    function activatePendingBuff(): void {
        if (!pendingBuff.value) return;
        const buff: DailyBuff = { ...pendingBuff.value, activatedAt: Date.now() };
        activeBuffs.value.push(buff);
        buffFlags.value[buff.id] = true;
        pendingBuff.value = null;

        globalBus.emit('dailyBuff:activated', {
            buff
        });
    }

    function dismissPendingBuff(): void {
        pendingBuff.value = null;
    }

    function hasBuff(buffId: string): boolean {
        return activeBuffs.value.some(buff => buff.id === buffId && !isBuffExpired(buff));
    }

    function getBuffValue(buffId: string): boolean {
        return buffFlags.value[buffId] || false;
    }

    function getCurrentDateStr(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function checkDailyReset(): void {
        const today = getCurrentDateStr();
        if (lastRollDate.value !== today) {
            rollDailyBuff();
        }
    }

    function serialize() {
        return {
            activeBuffs: activeBuffs.value.map(b => ({ ...b })),
            lastRollDate: lastRollDate.value,
            buffFlags: { ...buffFlags.value },
            pendingBuff: pendingBuff.value ? { ...pendingBuff.value } : null
        };
    }

    function deserialize(data: any) {
        if (!data) return;

        activeBuffs.value = data.activeBuffs || [];
        lastRollDate.value = data.lastRollDate || '';
        buffFlags.value = data.buffFlags || {};
        pendingBuff.value = data.pendingBuff || null;

        checkBuffExpiry();
        checkDailyReset();
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
