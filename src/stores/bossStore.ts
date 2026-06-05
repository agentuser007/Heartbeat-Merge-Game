// ============================================================
// bossStore.ts — Boss Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { BossLogic, LevelData, OrderData } from '../logic/BossLogic';
import { useConfigStore } from './configStore';
import { useLoopStore } from './loopStore';

export const useBossStore = defineStore('boss', () => {
    // --- State ---
    const currentLevelIdx = ref(0);
    const currentHp = ref(0);
    const totalHp = ref(0);
    const bossName = ref('');
    const bossAvatar = ref('');
    const fsmState = ref('');
    const orders = ref<OrderData[]>([]);
    const currentOrderIdx = ref(0);

    // --- Logic instance ---
    const logic = new BossLogic();

    // Initialize state from logic
    currentLevelIdx.value = logic.currentLevelIdx;
    currentHp.value = logic.currentHp;
    totalHp.value = logic.totalHp;
    currentOrderIdx.value = logic.currentOrderIdx;
    fsmState.value = logic.fsm.getState();

    // --- Subscribe to logic events ---
    // HMR LIMITATION: globalBus.on() listeners registered here will stack on HMR updates.
    // EventBus.on() returns the handler ref (not an unsubscribe fn), so per-listener HMR cleanup
    // would require storing each handler ref and calling globalBus.off() with it on dispose.
    // For now, this is a known dev-only issue — full page reload clears it.
    globalBus.on('boss:levelLoaded', (data) => {
        if (data) {
            currentLevelIdx.value = data.levelIdx;
            bossName.value = data.bossName;
            bossAvatar.value = data.bossAvatar;
            currentHp.value = data.currentHp;
            totalHp.value = data.totalHp;
        }
    });

    globalBus.on('boss:hpChanged', (data) => {
        if (data) {
            currentHp.value = data.currentHp;
            totalHp.value = data.totalHp;
        }
    });

    globalBus.on('boss:orderLoaded', (data) => {
        if (data) {
            currentOrderIdx.value = data.orderIdx;
            orders.value = [data.order];
        }
    });

    globalBus.on('bossfsm:stateChanged', (data) => {
        if (data) {
            fsmState.value = data.to;
        }
    });

    // --- Computed ---
    const hpPercentage = computed(() => {
        return totalHp.value > 0 ? Math.max(0, ((totalHp.value - currentHp.value) / totalHp.value) * 100) : 0;
    });

    const isDefeated = computed(() => currentHp.value <= 0);

    // --- Actions ---
    function loadLevel(levelIdx: number) {
        const configStore = useConfigStore();
        const level = logic.loadLevel(levelIdx, configStore.levels as unknown as LevelData[]);
        if (level) {
            currentLevelIdx.value = logic.currentLevelIdx;
            currentHp.value = logic.currentHp;
            totalHp.value = logic.totalHp;
        }
        return level;
    }

    function submitOrder(damage: number) {
        const configStore = useConfigStore();
        const result = logic.commitSubmit(damage, configStore.levels as unknown as LevelData[]);
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        currentOrderIdx.value = logic.currentOrderIdx;

        if (!result.isDefeated) {
            loadOrder(logic.currentOrderIdx);
        }

        return result;
    }

    function nextLevel() {
        const nextLevelIdx = currentLevelIdx.value + 1;
        return loadLevel(nextLevelIdx);
    }

    function damageBoss(damage: number) {
        const result = logic.applyDamage(damage);
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        return result;
    }

    function setLoopConfig(config: any) {
        logic.setLoopConfig(config);
    }

    function loadOrder(orderIdx: number) {
        const configStore = useConfigStore();
        const loopStore = useLoopStore();
        const level = logic.getCurrentLevel(configStore.levels as unknown as LevelData[]);
        if (level && level.orders && orderIdx < level.orders.length) {
            const order = logic.loadOrder(orderIdx, configStore.levels as unknown as LevelData[], configStore.items as any);
            if (order && loopStore.hasRule('timedOrdersUp')) {
                if (!order.isTimed) {
                    order.isTimed = true;
                    order.timeLimit = 30;
                }
                order.timeLimit = Math.floor((order.timeLimit || 30) * 0.7);
                logic.timerRemaining = order.timeLimit;
            }
            if (order) {
                orders.value = [order];
                currentOrderIdx.value = logic.currentOrderIdx;
            }
            return order;
        }
        return null;
    }

    function reset(): void {
        // Reset all boss state for a new run (matches Game.resetRunState)
        logic.currentLevelIdx = -1;
        logic.currentOrderIdx = 0;
        logic.currentHp = 0;
        logic.totalHp = 0;
        logic.timerRemaining = 0;
        logic.fsm.reset('IDLE');

        currentLevelIdx.value = logic.currentLevelIdx;
        currentOrderIdx.value = logic.currentOrderIdx;
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        fsmState.value = logic.fsm.getState();
        orders.value = [];
        bossName.value = '';
        bossAvatar.value = '';
    }

    // --- Serialization ---
    function serialize() {
        return {
            levelIdx: currentLevelIdx.value,
            orderIdx: currentOrderIdx.value,
            hp: currentHp.value,
            totalHp: totalHp.value,
            state: fsmState.value,
            timerRemaining: logic.timerRemaining,
            bossName: bossName.value,
            bossAvatar: bossAvatar.value
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        logic.currentLevelIdx = data.levelIdx ?? 0;
        logic.currentOrderIdx = data.orderIdx ?? 0;
        logic.currentHp = data.hp ?? 0;
        logic.totalHp = data.totalHp ?? 0;
        logic.timerRemaining = data.timerRemaining ?? 0;
        
        if (data.bossName) bossName.value = data.bossName;
        if (data.bossAvatar) bossAvatar.value = data.bossAvatar;
        
        // Restore FSM state
        if (data.state) {
            logic.fsm.reset(data.state === 'SUBMITTING' ? 'BATTLE' : data.state);
        }
        
        currentLevelIdx.value = logic.currentLevelIdx;
        currentOrderIdx.value = logic.currentOrderIdx;
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        fsmState.value = logic.fsm.getState();
    }

    return {
        // State
        currentLevelIdx,
        currentHp,
        totalHp,
        bossName,
        bossAvatar,
        fsmState,
        orders,
        currentOrderIdx,
        
        // Computed
        hpPercentage,
        isDefeated,
        
        // Actions
        loadLevel,
        submitOrder,
        nextLevel,
        damageBoss,
        setLoopConfig,
        loadOrder,
        reset,
        
        // Serialization
        serialize,
        deserialize
    };
});