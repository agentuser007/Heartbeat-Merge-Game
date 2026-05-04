// ============================================================
// StateMachine.js — Generic Finite State Machine
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

class StateMachine {
    /**
     * @param {Object} config
     * @param {string} config.name - Human-readable name for debugging
     * @param {string} config.initial - Initial state
     * @param {Object} config.states - State definitions with transition maps
     * @param {Object} [config.actions] - Optional callbacks: onEnterSTATE, onExitSTATE, onFROMToTO
     */
    constructor(config) {
        this.name = config.name || 'StateMachine';
        this.states = config.states || {};
        this.current = config.initial;
        this.previous = null;
        this.history = [];
        this.actions = config.actions || {};
    }

    /**
     * Attempt a state transition via an event.
     * @param {string} event - The event name (e.g. 'ENCOUNTER')
     * @param {*} [data] - Optional payload passed to action callbacks
     * @returns {boolean} true if transition succeeded, false if invalid
     */
    send(event, data) {
        const stateConfig = this.states[this.current];
        if (!stateConfig || !stateConfig.on || !stateConfig.on[event]) {
            console.warn(
                `[${this.name}] Invalid transition: "${event}" in state "${this.current}"`
            );
            return false;
        }

        const nextState = stateConfig.on[event];

        // Exit action for current state
        const exitAction = this.actions[`onExit${this.current}`];
        if (exitAction) exitAction(data);

        // Transition
        this.previous = this.current;
        this.current = nextState;
        this.history.push({ from: this.previous, to: nextState, event, timestamp: Date.now() });

        // Emit state change event to EventBus
        if (typeof globalBus !== 'undefined') {
            globalBus.emit(`${this.name.toLowerCase()}:stateChanged`, {
                from: this.previous,
                to: this.current,
                event,
                data
            });
        }

        // Enter action for new state
        const enterAction = this.actions[`onEnter${this.current}`];
        if (enterAction) enterAction(data);

        // Transition-specific action
        const transAction = this.actions[`on${this.previous}To${this.current}`];
        if (transAction) transAction(data);

        return true;
    }

    /**
     * Check if a transition is valid from the current state.
     * @param {string} event
     * @returns {boolean}
     */
    can(event) {
        const stateConfig = this.states[this.current];
        return !!(stateConfig && stateConfig.on && stateConfig.on[event]);
    }

    /**
     * Check if the machine is in a specific state.
     * @param {string} state
     * @returns {boolean}
     */
    is(state) {
        return this.current === state;
    }

    /**
     * Get the list of valid events from the current state.
     * @returns {string[]}
     */
    availableEvents() {
        const stateConfig = this.states[this.current];
        return stateConfig && stateConfig.on ? Object.keys(stateConfig.on) : [];
    }

    /**
     * Reset to initial state (or a specified state).
     * @param {string} [state] - Target state, defaults to initial
     */
    reset(state) {
        this.previous = this.current;
        this.current = state || this.history[0]?.from || Object.keys(this.states)[0];
        this.history = [];
    }

    /**
     * Debug: print current state and available transitions.
     */
    debug() {
        console.log(
            `[${this.name}] State: ${this.current}, Available: [${this.availableEvents().join(', ')}]`
        );
    }
}