// ============================================================
// handlerRegistry.ts — Event/Watch Handler Registry
// ============================================================
// Handlers register themselves by id. useGameLoop reads
// handler_map.json and wires up bus.on / watch calls.
// ============================================================

import type { ApplyDeps } from './applyResolveResult';

export interface HandlerContext {
    deps: ApplyDeps;
}

export type HandlerFn<T = unknown> = (data: T, ctx: HandlerContext) => void;
export type WatchHandlerFn<T = unknown> = (newVal: T, oldVal: T, ctx: HandlerContext) => void;

const eventHandlers = new Map<string, HandlerFn>();
const watchHandlers = new Map<string, WatchHandlerFn>();

export function registerEventHandler<T>(id: string, fn: HandlerFn<T>): void {
    if (eventHandlers.has(id)) {
        throw new Error(`Duplicate event handler id: ${id}`);
    }
    eventHandlers.set(id, fn as HandlerFn);
}

export function registerWatchHandler<T>(id: string, fn: WatchHandlerFn<T>): void {
    if (watchHandlers.has(id)) {
        throw new Error(`Duplicate watch handler id: ${id}`);
    }
    watchHandlers.set(id, fn as WatchHandlerFn);
}

export function getEventHandler(id: string): HandlerFn | undefined {
    return eventHandlers.get(id);
}

export function getWatchHandler(id: string): WatchHandlerFn | undefined {
    return watchHandlers.get(id);
}

export function getRegisteredEventIds(): string[] {
    return [...eventHandlers.keys()];
}

export function getRegisteredWatchIds(): string[] {
    return [...watchHandlers.keys()];
}
