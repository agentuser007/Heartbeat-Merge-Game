// ============================================================
// EventBus.ts — Strongly-typed Global Event Bus
// ============================================================
// Central pub/sub system for decoupling UI and Logic layers.
// Provides compile-time safety for known GameEvents keys,
// with a string fallback for dynamic/unregistered events.
// ============================================================

import type { GameEvents } from '../types/game';

type EventKey = keyof GameEvents;

type TypedHandler<K extends EventKey> = GameEvents[K] extends void
  ? () => void
  : (data: GameEvents[K]) => void;

export class EventBus {
  private listeners: { [event: string]: Function[] } = {};

  // --- Typed overloads (compile-time safety for known events) ---

  on<K extends EventKey>(event: K, fn: TypedHandler<K>): TypedHandler<K>;
  on(event: string, fn: Function): Function;
  on(event: string, fn: Function): Function {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
    return fn;
  }

  once<K extends EventKey>(event: K, fn: TypedHandler<K>): TypedHandler<K>;
  once(event: string, fn: Function): Function;
  once(event: string, fn: Function): Function {
    const wrapper = ((...args: any[]) => {
      this.off(event, wrapper);
      fn(...args);
    });
    this.on(event, wrapper);
    return wrapper;
  }

  off<K extends EventKey>(event: K, fn: TypedHandler<K>): void;
  off(event: string, fn: Function): void;
  off(event: string, fn: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    if (this.listeners[event].length === 0) {
      delete this.listeners[event];
    }
  }

  emit<K extends EventKey>(
    ...args: GameEvents[K] extends void ? [event: K] : [event: K, data: GameEvents[K]]
  ): void;
  emit(event: string, data?: any): void;
  emit(event: string, data?: any): void {
    if (!this.listeners[event]) return;
    const handlers = [...this.listeners[event]];
    for (const fn of handlers) {
      try {
        fn(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }

  clear(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }

  debug(): void {
    const summary: { [key: string]: number } = {};
    for (const [event, fns] of Object.entries(this.listeners)) {
      summary[event] = fns.length;
    }
    console.table(summary);
  }
}

export const globalBus = new EventBus();
