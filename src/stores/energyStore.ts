// ============================================================
// energyStore.ts — Energy Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { EnergyLogic } from '../logic/EnergyLogic';
import { useConfigStore } from './configStore';
import { useLoopStore } from './loopStore';

export const useEnergyStore = defineStore('energy', () => {
    // --- State ---
    const current = ref(0);
    const max = ref(0);
    const regenInterval = ref(0);
    const regenCap = ref(0);
    const fsmState = ref('');
    const regenTimer = ref<any>(null);

    // NOTE: useConfigStore() is called at the top level of this defineStore setup.
    // This creates an init order dependency — Pinia must be installed before this store is first accessed.
    // In practice this is safe because stores are first accessed after app.mount(), but restructuring
    // to use a lazy getter would remove this dependency if needed.
    const configStore = useConfigStore();
    const logic = new EnergyLogic({
        ENERGY_REGEN_CAP: configStore.gameConfig.ENERGY_REGEN_CAP,
        MAX_ENERGY: configStore.gameConfig.MAX_ENERGY,
        ENERGY_REGEN_INTERVAL: configStore.gameConfig.ENERGY_REGEN_INTERVAL || 3000,
        ENERGY_REGEN_AMOUNT: configStore.gameConfig.ENERGY_REGEN_AMOUNT || 1,
        ENERGY_COST_PER_SPAWN: configStore.gameConfig.ENERGY_COST_PER_SPAWN || 5
    });

    // Initialize state from logic
    current.value = logic.current;
    max.value = logic.max;
    regenInterval.value = logic.regenInterval;
    regenCap.value = logic.regenCap;
    fsmState.value = logic.fsm.getState();

    // --- Subscribe to logic events ---
    // HMR LIMITATION: globalBus.on() listeners registered here will stack on HMR updates.
    // EventBus.on() returns the handler ref (not an unsubscribe fn), so per-listener HMR cleanup
    // would require storing each handler ref and calling globalBus.off() with it on dispose.
    // For now, this is a known dev-only issue — full page reload clears it.
    globalBus.on('energy:changed', (data) => {
        if (data) {
            current.value = data.current;
            max.value = data.max;
        }
    });

    globalBus.on('energyfsm:stateChanged', (data) => {
        if (data) {
            fsmState.value = data.to;
        }
    });

    // --- Computed ---
    const percentage = computed(() => {
        return regenCap.value > 0 ? Math.min(100, (current.value / regenCap.value) * 100) : 0;
    });

    const isFull = computed(() => current.value >= regenCap.value);
    const isEmpty = computed(() => current.value <= 0);

    // --- Actions ---
    function spend(amount?: number): boolean {
        const result = logic.spend(amount);
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
        return result;
    }

    function add(amount: number): void {
        logic.recover(amount);
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
    }

    function startRegen(): void {
        logic.startRegen();
        regenTimer.value = logic.regenTimer;
    }

    function stopRegen(): void {
        logic.stopRegen();
        regenTimer.value = logic.regenTimer;
    }

    function tick(): void {
        // This would be called by a timer in the actual implementation
        // For now, we just update the state
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
    }

    function setMax(newMax: number): void {
        logic.setMax(newMax);
        max.value = logic.max;
        regenCap.value = logic.regenCap;
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
    }

    function setRegenCap(newCap: number): void {
        logic.setRegenCap(newCap);
        regenCap.value = logic.regenCap;
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
    }

    function setRegenInterval(newInterval: number): void {
        logic.setRegenInterval(newInterval);
        regenInterval.value = logic.regenInterval;
        regenTimer.value = logic.regenTimer;
    }

    function resetToBase(): void {
        const configStore = useConfigStore();
        const loopStore = useLoopStore();
        logic.setMax(configStore.gameConfig.MAX_ENERGY || 100);
        logic.setRegenCap(configStore.gameConfig.ENERGY_REGEN_CAP || configStore.gameConfig.MAX_ENERGY || 100);
        let interval = configStore.gameConfig.ENERGY_REGEN_INTERVAL || 3000;
        if (loopStore.hasRule('energyRegenDown')) {
            interval = Math.floor(interval * 1.5);
        }
        logic.setRegenInterval(interval);
        logic.current = logic.max;

        max.value = logic.max;
        regenCap.value = logic.regenCap;
        regenInterval.value = logic.regenInterval;
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
    }

    function destroyLogic(): void {
        logic.destroy();
    }

    // --- Serialization ---
    function serialize() {
        return {
            current: current.value,
            max: max.value,
            regenCap: regenCap.value,
            regenInterval: regenInterval.value,
            state: fsmState.value
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        logic.current = data.current ?? logic.current;
        logic.max = data.max ?? logic.max;
        logic.regenCap = data.regenCap ?? logic.regenCap;
        logic.regenInterval = data.regenInterval ?? logic.regenInterval;
        
        // Restore FSM state
        if (data.state) {
            logic.fsm.reset(data.state);
        }
        
        current.value = logic.current;
        max.value = logic.max;
        regenCap.value = logic.regenCap;
        regenInterval.value = logic.regenInterval;
        fsmState.value = logic.fsm.getState();
    }

    return {
        // State
        current,
        max,
        regenInterval,
        regenCap,
        fsmState,
        regenTimer,
        
        // Computed
        percentage,
        isFull,
        isEmpty,
        
        // Actions
        spend,
        add,
        startRegen,
        stopRegen,
        tick,
        setMax,
        setRegenCap,
        setRegenInterval,
        resetToBase,
        destroyLogic,
        
        // Serialization
        serialize,
        deserialize
    };
});