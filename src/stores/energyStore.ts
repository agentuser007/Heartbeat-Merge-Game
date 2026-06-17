// ============================================================
// energyStore.ts — Energy Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { EnergyLogic } from '../logic/EnergyLogic';
import { resolveResetToBase } from '../services/EnergyService';
import { useConfigStore } from './configStore';
import type { EnergySerializeData } from '../types/serialize';
import { useLoopStore } from './loopStore';
import { devConfig } from '../core/DevConfig';
import { OfflineProductionManager } from '../features/OfflineProductionManager';
import type { LogicEvent } from '../logic/BoardLogic';

function emitEvents(events: LogicEvent[]): void {
    globalBus.emitLogicEvents(events);
}

export const useEnergyStore = defineStore('energy', () => {
    // --- State ---
    const current = ref(0);
    const max = ref(0);
    const regenInterval = ref(0);
    const regenCap = ref(0);
    const fsmState = ref('');
    let regenTimerHandle: ReturnType<typeof setInterval> | null = null;

    const configStore = useConfigStore();
    const logic = new EnergyLogic({
        ENERGY_REGEN_CAP: configStore.gameConfig.ENERGY_REGEN_CAP,
        MAX_ENERGY: configStore.gameConfig.MAX_ENERGY,
        ENERGY_REGEN_INTERVAL: configStore.gameConfig.ENERGY_REGEN_INTERVAL,
        ENERGY_REGEN_AMOUNT: configStore.gameConfig.ENERGY_REGEN_AMOUNT,
        ENERGY_COST_PER_SPAWN: configStore.gameConfig.ENERGY_COST_PER_SPAWN
    });

    // Initialize state from logic
    current.value = logic.current;
    max.value = logic.max;
    regenInterval.value = logic.regenInterval;
    regenCap.value = logic.regenCap;
    fsmState.value = logic.fsm.getState();

    // --- Subscribe to FSM state changes ---
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
        if (devConfig.enabled && devConfig.unlimitedEnergy) return true;
        const { success, events } = logic.spend(amount);
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
        emitEvents(events);
        return success;
    }

    function add(amount: number): void {
        const events = logic.recover(amount);
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
        emitEvents(events);
    }

    function startRegen(): void {
        stopRegen();
        regenTimerHandle = setInterval(() => {
            const result = logic.tick();
            if (result.changed) {
                current.value = result.newCurrent;
                fsmState.value = logic.fsm.getState();
                emitEvents(result.events);
            }
        }, logic.regenInterval);
    }

    function stopRegen(): void {
        if (regenTimerHandle !== null) {
            clearInterval(regenTimerHandle);
            regenTimerHandle = null;
        }
    }

    function setMax(newMax: number): void {
        const events = logic.setMax(newMax);
        max.value = logic.max;
        regenCap.value = logic.regenCap;
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
        emitEvents(events);
    }

    function setRegenCap(newCap: number): void {
        const events = logic.setRegenCap(newCap);
        regenCap.value = logic.regenCap;
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
        emitEvents(events);
    }

    function setRegenInterval(newInterval: number): void {
        logic.regenInterval = newInterval;
        regenInterval.value = logic.regenInterval;
        startRegen();
    }

    function resetToBase(): void {
        const configStore = useConfigStore();
        const loopStore = useLoopStore();
        const result = resolveResetToBase({
            maxEnergy: configStore.gameConfig.MAX_ENERGY,
            regenCap: configStore.gameConfig.ENERGY_REGEN_CAP,
            regenInterval: configStore.gameConfig.ENERGY_REGEN_INTERVAL,
            hasRule: (rule: string) => loopStore.hasRule(rule),
            energyRegenDownMultiplier: configStore.gameConfig.ENERGY_REGEN_DOWN_MULTIPLIER,
        });

        if (!result.ok) return;

        const capEvents = logic.setRegenCap(configStore.gameConfig.ENERGY_REGEN_CAP);
        const maxEvents = logic.setMax(result.resolveResult.applyTo.energy!.setMax!);
        logic.regenInterval = result.resolveResult.applyTo.energy!.setRegenInterval!;
        logic.current = logic.max;

        max.value = logic.max;
        regenCap.value = logic.regenCap;
        regenInterval.value = logic.regenInterval;
        current.value = logic.current;
        fsmState.value = logic.fsm.getState();
        emitEvents([...maxEvents, ...capEvents]);
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

    function deserialize(data: unknown, savedTimestamp?: number) {
        if (!data) return;
        const d = data as EnergySerializeData;
        
        logic.current = d.current ?? logic.current;
        logic.max = d.max ?? logic.max;
        logic.regenCap = d.regenCap ?? logic.regenCap;
        logic.regenInterval = d.regenInterval ?? logic.regenInterval;
        
        if (d.state) {
            logic.fsm.reset(d.state);
        }

        if (savedTimestamp) {
            const result = OfflineProductionManager.calculateEnergyRecovery(savedTimestamp, {
                current: logic.current,
                regenCap: logic.regenCap,
                regenInterval: logic.regenInterval,
                regenAmount: logic.regenAmount,
            });
            if (result.energyRecovered > 0) {
                logic.current = result.newCurrent;
            }
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
        
        // Computed
        percentage,
        isFull,
        isEmpty,
        
        // Actions
        spend,
        add,
        startRegen,
        stopRegen,
        setMax,
        setRegenCap,
        setRegenInterval,
        resetToBase,
        
        // Serialization
        serialize,
        deserialize
    };
});
