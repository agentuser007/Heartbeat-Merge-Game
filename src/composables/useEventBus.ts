// ============================================================
// useEventBus.ts — EventBus Composable for Vue Components
// ============================================================
// Provides auto-cleanup of event listeners when components unmount
// ============================================================

import { getCurrentInstance, onUnmounted } from 'vue';
import { globalBus } from '../core/EventBus';

import type { GameEvents } from '../types/game';
type EventKey = keyof GameEvents;

export function useEventBus() {
  const instance = getCurrentInstance();
  const listeners: Array<{ event: string; handler: Function }> = [];

  function on<K extends EventKey>(event: K, handler: GameEvents[K] extends void ? () => void : (data: GameEvents[K]) => void): Function;
  function on(event: string, handler: Function): Function;
  function on(event: string, handler: Function): Function {
    globalBus.on(event, handler);
    listeners.push({ event, handler });
    return handler;
  }

  function once<K extends EventKey>(event: K, handler: GameEvents[K] extends void ? () => void : (data: GameEvents[K]) => void): Function;
  function once(event: string, handler: Function): Function;
  function once(event: string, handler: Function): Function {
    const wrappedHandler = (...args: any[]) => {
      off(event, wrappedHandler);
      handler(...args);
    };
    globalBus.on(event, wrappedHandler);
    listeners.push({ event, handler: wrappedHandler });
    return wrappedHandler;
  }

  function off(event: string, handler: Function): void {
    globalBus.off(event, handler);
    const index = listeners.findIndex(l => l.event === event && l.handler === handler);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  function emit<K extends EventKey>(
    ...args: GameEvents[K] extends void ? [event: K] : [event: K, data: GameEvents[K]]
  ): void;
  function emit(event: string, data?: any): void;
  function emit(event: string, data?: any): void {
    globalBus.emit(event, data);
  }

  function cleanup(): void {
    for (const { event, handler } of listeners) {
      globalBus.off(event, handler);
    }
    listeners.length = 0;
  }

  if (instance) {
    onUnmounted(() => {
      cleanup();
    });
  }

  return {
    on,
    once,
    off,
    emit,
    cleanup,
    globalBus,
  };
}
