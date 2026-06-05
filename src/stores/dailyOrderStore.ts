// ============================================================
// dailyOrderStore.ts — Daily Order Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';

export interface DailyOrder {
    id?: string;
    name: string;
    required: Array<{
        itemId: string;
        count: number;
    }>;
    goldReward: number;
    fulfilled: boolean;
    minLoop?: number;
    dialogue?: string;
}

export const useDailyOrderStore = defineStore('dailyOrder', () => {
    // --- State ---
    const activeOrders = ref<DailyOrder[]>([]);
    const completedCount = ref(0);
    const lastRollDate = ref('');
    const loopIndex = ref(1);

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
        activeOrders.value.length > 0
    );

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

    function rollNewOrders() {
        const today = getCurrentDateStr();
        if (lastRollDate.value === today && activeOrders.value.length > 0) {
            // Already rolled today
            return;
        }
        
        lastRollDate.value = today;
        
        // Filter pool by current loop index
        const loopIdx = loopIndex.value;
        const available = configStore.dailyOrderPool.filter(order =>
            (order.minLoop || 1) <= loopIdx
        );
        
        // Determine max active orders (default 3)
        const maxActive = configStore.gameConfig.DAILY_ORDER_MAX_ACTIVE || 3;
        
        // Shuffle and select orders
        const shuffled = [...available];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        activeOrders.value = shuffled.slice(0, maxActive).map(order => ({
            ...order,
            fulfilled: false
        }));
        
        completedCount.value = 0;
        
        // Emit event for UI updates
        globalBus.emit('dailyOrders:updated', {
            orders: activeOrders.value
        });
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
            goldReward: order.goldReward
        });
        
        // Check if all orders are completed
        if (completedOrders.value.length === activeOrders.value.length) {
            globalBus.emit('dailyOrders:allCompleted');
        }
        
        return true;
    }

    function checkOrder(orderIndex: number, itemCounts: Record<string, number>): boolean {
        if (orderIndex < 0 || orderIndex >= activeOrders.value.length) return false;
        
        const order = activeOrders.value[orderIndex];
        if (order.fulfilled) return false;
        
        // Check if all required items are available
        for (const req of order.required) {
            const available = itemCounts[req.itemId] || 0;
            if (available < req.count) {
                return false;
            }
        }
        
        return true;
    }

    // --- Serialization ---
    function serialize() {
        return {
            activeOrders: [...activeOrders.value],
            completedCount: completedCount.value,
            lastRollDate: lastRollDate.value
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        activeOrders.value = data.activeOrders || [];
        completedCount.value = data.completedCount ?? 0;
        lastRollDate.value = data.lastRollDate || getCurrentDateStr();
        
        // Check if we need to roll new orders
        const today = getCurrentDateStr();
        if (lastRollDate.value !== today) {
            rollNewOrders();
        }
    }

    return {
        // State
        activeOrders,
        completedCount,
        lastRollDate,
        loopIndex,
        
        // Computed
        completedOrders,
        pendingOrders,
        completionRate,
        canRefresh,
        
        // Actions
        init,
        rollNewOrders,
        fulfillOrder,
        checkOrder,
        setLoopIndex,
        
        // Serialization
        serialize,
        deserialize
    };
});