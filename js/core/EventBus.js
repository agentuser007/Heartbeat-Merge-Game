// ============================================================
// EventBus.js — Global Event Bus (Observer Pattern)
// ============================================================
// Central pub/sub system for decoupling UI and Logic layers.
// Logic modules emit events; UI modules subscribe and render.
// Usage:
//   EventBus.on('energy:changed', (data) => { ... });
//   EventBus.emit('energy:changed', { current: 80, max: 100 });
//   EventBus.off('energy:changed', handler);
// ============================================================

class EventBus {
    constructor() {
        this._listeners = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} event - Event name (e.g. 'energy:changed')
     * @param {Function} fn - Callback function
     * @returns {Function} The same function (for chaining/off)
     */
    on(event, fn) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(fn);
        return fn;
    }

    /**
     * Subscribe to an event, but only trigger once.
     * @param {string} event
     * @param {Function} fn
     */
    once(event, fn) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            fn(...args);
        };
        this.on(event, wrapper);
        return wrapper;
    }

    /**
     * Unsubscribe from an event.
     * @param {string} event
     * @param {Function} fn - Must be the same reference used in on()
     */
    off(event, fn) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(f => f !== fn);
        if (this._listeners[event].length === 0) {
            delete this._listeners[event];
        }
    }

    /**
     * Emit an event with data.
     * @param {string} event
     * @param {*} data - Payload passed to all subscribers
     */
    emit(event, data) {
        if (!this._listeners[event]) return;
        const handlers = [...this._listeners[event]];
        for (const fn of handlers) {
            try {
                fn(data);
            } catch (err) {
                console.error(`[EventBus] Error in handler for "${event}":`, err);
            }
        }
    }

    /**
     * Remove all listeners for a specific event, or all events.
     * @param {string} [event] - If omitted, clears all listeners
     */
    clear(event) {
        if (event) {
            delete this._listeners[event];
        } else {
            this._listeners = {};
        }
    }

    /**
     * Debug: list all registered events and their listener counts.
     */
    debug() {
        const summary = {};
        for (const [event, fns] of Object.entries(this._listeners)) {
            summary[event] = fns.length;
        }
        console.table(summary);
    }
}

// Global singleton instance
const globalBus = new EventBus();