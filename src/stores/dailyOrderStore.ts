// ============================================================
// dailyOrderStore.ts — Daily Order Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { useLoopStore } from './loopStore';
import { resolveCheckOrder, resolveRollOrders } from '../services/DailyOrderService';
import type { DailyOrderState } from '@/types/game';

export type { DailyOrderState }

export const useDailyOrderStore = defineStore('dailyOrder', () => {
    // --- State ---
    const activeOrders = ref<DailyOrderState[]>([]);
    const completedCount = ref(0);
    const lastRollDate = ref('');
    const loopIndex = ref(1);
    const frozenOrders = ref<DailyOrderState[] | null>(null);
    const isSettling = computed(() => {
        const loopStore = useLoopStore();
        return loopStore.loopStatus === 'settling';
    });

// NOTE: useConfigStore() is called at the top level of this defineStore setup.
// This creates an init order dependency — Pinia must be installed before this store is first accessed.
// In practice this is safe because stores are first accessed after app.mount(), but restructuring
// to use a lazy getter would remove this dependency if needed.
const configStore = useConfigStore();

    // --- Computed ---
    const completedOrders = computed(() => 
        activeOrders.value.filter(order => order.fulfilled)
    );
    
    const pendingOrders = computed(() => 
        activeOrders.value.filter(order => !order.fulfilled)
    );
    
    const completionRate = computed(() => 
        activeOrders.value.length > 0 
            ? Math.round((completedCount.value / activeOrders.value.length) * 100) 
            : 0
    );
    
    const canRefresh = computed(() => 
        completedOrders.value.length === activeOrders.value.length && 
        activeOrders.value.length > 0 &&
        !isSettling.value
    );

    const displayOrders = computed<DailyOrderState[]>(() => {
        if (isSettling.value && frozenOrders.value) {
            return frozenOrders.value;
        }
        return activeOrders.value;
    });

    const allFrozenCompleted = computed(() => {
        if (!isSettling.value || !frozenOrders.value) return false;
        return frozenOrders.value.every(o => o.fulfilled);
    });

    // --- Actions ---
    function init() {
        // Initialize with empty state
        activeOrders.value = [];
        completedCount.value = 0;
        lastRollDate.value = getCurrentDateStr();
        
        // Roll initial orders
        rollNewOrders();
    }

    function getCurrentDateStr(): string {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function setLoopIndex(idx: number) {
        loopIndex.value = idx;
    }

    function freezeOrders(): void {
        frozenOrders.value = JSON.parse(JSON.stringify(activeOrders.value));
    }

    function unfreezeOrders(): void {
        frozenOrders.value = null;
    }

    function fulfillFrozenOrder(index: number): boolean {
        if (!frozenOrders.value) return false;
        if (index < 0 || index >= frozenOrders.value.length) return false;
        const order = frozenOrders.value[index];
        if (order.fulfilled) return false;
        order.fulfilled = true;
        completedCount.value++;

        globalBus.emit('dailyOrders:fulfilled', {
            order,
            index,
            goldReward: order.goldReward,
            reward: order.reward || { gold: order.goldReward }
        });

        if (allFrozenCompleted.value) {
            globalBus.emit('dailyOrders:allCompleted');
        }

        return true;
    }

    function rollNewOrders(force: boolean = false) {
        if (isSettling.value) return;

        const today = getCurrentDateStr();
        if (!force && lastRollDate.value === today && activeOrders.value.length > 0) {
            return;
        }
        
        const loopIdx = loopIndex.value;
        const maxActive = configStore.dailyOrderConfig.MAX_ACTIVE;
        
        const rr = resolveRollOrders({
            orderPool: configStore.dailyOrderPool,
            loopIndex: loopIdx,
            maxActive,
            random: Math.random,
        });

        if (rr.applyTo.dailyOrders?.setActiveOrders) {
            activeOrders.value = rr.applyTo.dailyOrders.setActiveOrders;
        }
        if (rr.applyTo.dailyOrders?.setCompletedCount !== undefined) {
            completedCount.value = rr.applyTo.dailyOrders.setCompletedCount;
        }
        lastRollDate.value = today;

        if (rr.events) {
            for (const e of rr.events) globalBus.emit(e.name, e.data);
        }
    }

    function fulfillOrder(index: number) {
        if (index < 0 || index >= activeOrders.value.length) return false;
        
        const order = activeOrders.value[index];
        if (order.fulfilled) return false;
        
        // Mark as fulfilled
        order.fulfilled = true;
        completedCount.value++;
        
        // Emit event for UI updates and rewards
        globalBus.emit('dailyOrders:fulfilled', {
            order,
            index,
            goldReward: order.goldReward,
            reward: order.reward || { gold: order.goldReward }
        });
        
        // Check if all orders are completed
        if (completedOrders.value.length === activeOrders.value.length) {
            globalBus.emit('dailyOrders:allCompleted');
        }
        
        return true;
    }

    function checkOrder(orderIndex: number, itemCounts: Record<string, number>): boolean {
        const result = resolveCheckOrder({
            orderIndex,
            orders: activeOrders.value,
            itemCounts,
        });
        return result.ok;
    }

    function _setActiveOrders(orders: DailyOrderState[]): void { activeOrders.value = orders; }
    function _setCompletedCount(n: number): void { completedCount.value = n; }
    function _setLastRollDate(d: string): void { lastRollDate.value = d; }

    // --- Serialization ---
    function serialize() {
        return {
            activeOrders: JSON.parse(JSON.stringify(activeOrders.value)),
            completedCount: completedCount.value,
            lastRollDate: lastRollDate.value,
            loopIndex: loopIndex.value,
            frozenOrders: frozenOrders.value ? JSON.parse(JSON.stringify(frozenOrders.value)) : null
        };
    }

    function normalizeDailyOrder(raw: Partial<DailyOrderState>): DailyOrderState {
        return {
            id: raw.id ?? '',
            name: raw.name ?? '',
            required: raw.required ?? [],
            goldReward: raw.goldReward ?? 0,
            minLoop: raw.minLoop ?? 1,
            dialogue: raw.dialogue ?? '',
            npcAvatar: raw.npcAvatar,
            reward: raw.reward,
            fulfilled: raw.fulfilled ?? false,
        } satisfies DailyOrderState;
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { activeOrders?: Partial<DailyOrderState>[]; completedCount?: number; lastRollDate?: string; loopIndex?: number; frozenOrders?: Partial<DailyOrderState>[] | null };
        
        activeOrders.value = (d.activeOrders || []).map(normalizeDailyOrder);
        completedCount.value = d.completedCount ?? 0;
        lastRollDate.value = d.lastRollDate || getCurrentDateStr();
        loopIndex.value = d.loopIndex ?? 1;
        frozenOrders.value = d.frozenOrders ? d.frozenOrders.map(normalizeDailyOrder) : null;
        
        if (!isSettling.value) {
            const today = getCurrentDateStr();
            if (lastRollDate.value !== today) {
                rollNewOrders();
            }
        }
    }

    return {
        // State
        activeOrders,
        completedCount,
        lastRollDate,
        loopIndex,
        frozenOrders,
        isSettling,
        
        // Computed
        completedOrders,
        pendingOrders,
        completionRate,
        canRefresh,
        displayOrders,
        allFrozenCompleted,
        
        // Actions
        init,
        rollNewOrders,
        fulfillOrder,
        fulfillFrozenOrder,
        checkOrder,
        setLoopIndex,
        freezeOrders,
        unfreezeOrders,
        _setActiveOrders,
        _setCompletedCount,
        _setLastRollDate,
        
        // Serialization
        serialize,
        deserialize
    };
});