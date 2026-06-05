// ============================================================
// useStateMachine.ts — StateMachine Composable for Vue Components
// ============================================================
// Provides reactive state machine integration with Vue
// ============================================================

import { ref } from 'vue';
import { StateMachine, StateMachineConfig } from '../core/StateMachine';
import { useEventBus } from './useEventBus';

export function useStateMachine(config: StateMachineConfig) {
    // Create state machine instance
    const fsm = new StateMachine(config);
    
    // Reactive state
    const currentState = ref(fsm.getState());
    const previousState = ref(fsm.previous);
    const canSend = ref((event: string) => fsm.can(event));
    
    // Event bus for state change events
    const eventBus = useEventBus();
    
    // Watch for state changes
    eventBus.on(`${config.name.toLowerCase()}:stateChanged`, (data: { from: string; to: string; event: string }) => {
        currentState.value = data.to;
        previousState.value = data.from;
    });
    
    /**
     * Send an event to the state machine
     */
    function send(event: string, data?: any): boolean {
        const result = fsm.send(event, data);
        if (result) {
            currentState.value = fsm.getState();
            previousState.value = fsm.previous;
        }
        return result;
    }
    
    /**
     * Check if the machine is in a specific state
     */
    function is(state: string): boolean {
        return fsm.is(state);
    }
    
    /**
     * Get the current state
     */
    function getState(): string {
        return fsm.getState();
    }
    
    /**
     * Get the state history
     */
    function getHistory() {
        return [...fsm.history];
    }
    
    /**
     * Reset the state machine to initial state
     */
    function reset(): void {
        fsm.current = config.initial;
        fsm.previous = null;
        fsm.history = [];
        currentState.value = config.initial;
        previousState.value = null;
    }
    
    return {
        // Reactive state
        currentState,
        previousState,
        canSend,
        
        // Methods
        send,
        is,
        getState,
        getHistory,
        reset,
        
        // Direct access to FSM if needed
        fsm
    };
}