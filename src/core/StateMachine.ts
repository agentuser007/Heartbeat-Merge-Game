// ============================================================
// StateMachine.ts — Generic Finite State Machine
// ============================================================
// Core business logic must use state machines to enforce
// valid state transitions and prevent illegal operations.
//
// Usage:
//   const fsm = new StateMachine({
//     name: 'BossFSM',
//     initial: 'IDLE',
//     states: {
//       IDLE:   { on: { ENCOUNTER: 'BATTLE' } },
//       BATTLE: { on: { DEFEAT: 'WIN', TIMEOUT: 'FAIL' } },
//       WIN:    { on: { ACKNOWLEDGE: 'IDLE' } },
//       FAIL:   { on: { RETRY: 'BATTLE', ACKNOWLEDGE: 'IDLE' } }
//     }
//   });
//   fsm.send('ENCOUNTER');  // IDLE → BATTLE
//   fsm.send('ENCOUNTER');  // ignored, not valid from BATTLE
//   fsm.is('BATTLE');       // true
// ============================================================

import { globalBus } from './EventBus';

export interface StateMachineConfig {
    name: string;
    initial: string;
    states: {
        [state: string]: {
            on: {
                [event: string]: string;
            };
        };
    };
    actions?: {
        [action: string]: (data?: any) => void;
    };
}

export class StateMachine {
    name: string;
    states: StateMachineConfig['states'];
    current: string;
    previous: string | null;
    history: Array<{
        from: string | null;
        to: string;
        event: string;
        timestamp: number;
    }>;
    actions: StateMachineConfig['actions'];
    private _initialState!: string;

    /**
     * @param config
     * @param config.name - Human-readable name for debugging
     * @param config.initial - Initial state
     * @param config.states - State definitions with transition maps
     * @param config.actions - Optional callbacks: onEnterSTATE, onExitSTATE, onFROMToTO
     */
    constructor(config: StateMachineConfig) {
        this.name = config.name || 'StateMachine';
        this.states = config.states || {};
        this._initialState = config.initial;
        this.current = config.initial;
        this.previous = null;
        this.history = [];
        this.actions = config.actions || {};
    }

    /**
     * Attempt a state transition via an event.
     * @param event - The event name (e.g. 'ENCOUNTER')
     * @param data - Optional payload passed to action callbacks
     * @returns true if transition succeeded, false if invalid
     */
    send(event: string, data?: any): boolean {
        const stateConfig = this.states[this.current];
        if (!stateConfig || !stateConfig.on || !stateConfig.on[event]) {
            console.warn(
                `[${this.name}] Invalid transition: "${event}" in state "${this.current}"`
            );
            return false;
        }

        const nextState = stateConfig.on[event];

        // Exit action for current state
        const exitAction = this.actions?.[`onExit${this.current}`];
        if (exitAction) exitAction(data);

        // Transition
        this.previous = this.current;
        this.current = nextState;
        this.history.push({ from: this.previous, to: nextState, event, timestamp: Date.now() });

        // Emit state change event to EventBus
        globalBus.emit(`${this.name.toLowerCase()}:stateChanged`, {
            from: this.previous,
            to: this.current,
            event,
            data
        });

        // Enter action for new state
        const enterAction = this.actions?.[`onEnter${this.current}`];
        if (enterAction) enterAction(data);

        // Transition-specific action
        const transAction = this.actions?.[`on${this.previous}To${this.current}`];
        if (transAction) transAction(data);

        return true;
    }

    /**
     * Check if a transition is valid from the current state.
     * @param event
     * @returns
     */
    can(event: string): boolean {
        const stateConfig = this.states[this.current];
        return !!(stateConfig && stateConfig.on && stateConfig.on[event]);
    }

    /**
     * Check if the machine is in a specific state.
     * @param state
     * @returns
     */
    is(state: string): boolean {
        return this.current === state;
    }

    /**
     * Get the current state.
     * @returns
     */
    getState(): string {
        return this.current;
    }

    /**
     * Get the list of valid events from the current state.
     * @returns
     */
    availableEvents(): string[] {
        const stateConfig = this.states[this.current];
        return stateConfig && stateConfig.on ? Object.keys(stateConfig.on) : [];
    }

    /**
     * Reset to initial state (or a specified state).
     * @param state - Target state, defaults to initial
     */
    reset(state?: string): void {
        this.previous = this.current;
        this.current = state || this._initialState;
        this.history = [];
    }
}