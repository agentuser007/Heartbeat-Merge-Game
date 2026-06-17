// ============================================================
// useGameLoop.ts — Cross-Store Communication for Game Loop
// ============================================================
// Wires reactive watchers and event bus listeners based on
// handler_map.json configuration and handlerRegistry registrations.
// All handler logic lives in src/composables/handlers/*.ts
// ============================================================

import { watch } from 'vue';
import { useBossStore } from '@/stores/bossStore';
import { useEventBus } from './useEventBus';
import { useApplyDeps } from '@/composables/useApplyDeps';
import { getEventHandler, getWatchHandler } from './handlerRegistry';
import type { HandlerContext } from './handlerRegistry';
import type { ApplyDeps } from './applyResolveResult';

// Import all handler modules to trigger registration side effects
import './handlers/boardCollectionHandlers';
import './handlers/bossLoopHandlers';
import './handlers/economyHandlers';
import './handlers/affectionGachaHandlers';
import './handlers/uiBridgeHandlers';

// Re-export for backward compatibility
export { applyResolveResult } from './applyResolveResult';
export type { ApplyResolveResultDeps, ApplyDeps } from './applyResolveResult';

// ============================================================
// Handler map JSON type
// ============================================================

interface HandlerMapEntry {
    id: string;
    source: {
        type: 'event' | 'watch';
        name?: string;
        store?: string;
        getter?: string;
    };
    enabled: boolean;
    order: number;
}

interface HandlerMap {
    handlers: HandlerMapEntry[];
}

// Static import — resolved at build time, zero timing issues
import handlerMap from '@/config/handler_map.json';

const typedHandlerMap = handlerMap as unknown as HandlerMap;

// ============================================================
// useGameLoop — main composable
// ============================================================

export function useGameLoop() {
    const applyDeps: ApplyDeps = useApplyDeps();
    const ctx: HandlerContext = { deps: applyDeps };
    const bus = useEventBus();

    const eventHandlerMap = new Map<string, Array<{ id: string; order: number }>>();
    const watchEntries: Array<{ id: string; order: number }> = [];

    for (const entry of typedHandlerMap.handlers) {
        if (!entry.enabled) continue;
        if (entry.source.type === 'event' && entry.source.name) {
            const list = eventHandlerMap.get(entry.source.name) || [];
            list.push({ id: entry.id, order: entry.order });
            eventHandlerMap.set(entry.source.name, list);
        } else if (entry.source.type === 'watch') {
            watchEntries.push({ id: entry.id, order: entry.order });
        }
    }

    for (const [eventName, entries] of eventHandlerMap) {
        entries.sort((a, b) => a.order - b.order);
        bus.on(eventName, (data: unknown) => {
            for (const { id } of entries) {
                const fn = getEventHandler(id);
                if (fn) fn(data, ctx);
            }
        });
    }

    for (const entry of watchEntries) {
        const fn = getWatchHandler(entry.id);
        if (fn) {
            if (entry.id === 'boss-fsm-defeated-watch') {
                const bossStore = useBossStore();
                watch(() => bossStore.fsmState, (newVal, oldVal) => {
                    fn(newVal, oldVal, ctx);
                });
            }
        }
    }
}
