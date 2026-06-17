// ============================================================
// boardCollectionHandlers.ts
// Board, Collection, Fragment, Gacha event handlers
// ============================================================

import { registerEventHandler } from '../handlerRegistry';
import type { GameEvents, GameItem } from '@/types/game';

registerEventHandler<Pick<GameEvents, 'collection:itemDiscovered'>['collection:itemDiscovered']>(
    'collection-discover-check-achievements',
    (_data, ctx) => {
        ctx.deps.achievementStore.checkAll();
    },
);

registerEventHandler<Pick<GameEvents, 'board:produced'>['board:produced']>(
    'board-produced-discover',
    (data, ctx) => {
        if (data && data.producedItemId) {
            ctx.deps.collectionStore.discover(data.producedItemId);
        }
    },
);

registerEventHandler<Pick<GameEvents, 'board:merged'>['board:merged']>(
    'board-merged-discover',
    (data, ctx) => {
        if (data && data.result && data.result.nextId) {
            ctx.deps.collectionStore.discover(data.result.nextId);
        }
    },
);

registerEventHandler<Pick<GameEvents, 'board:itemPlaced'>['board:itemPlaced']>(
    'board-item-placed-discover',
    (data, ctx) => {
        if (data && data.itemId) {
            ctx.deps.collectionStore.discover(data.itemId);
        }
    },
);

registerEventHandler<Pick<GameEvents, 'board:cellsUnlocked'>['board:cellsUnlocked']>(
    'board-cells-unlocked-achievement',
    (data, ctx) => {
        if (data && data.indices) {
            ctx.deps.achievementStore.incrementStat('cellsUnlocked', data.indices.length);
        }
        ctx.deps.achievementStore.checkAll();
    },
);

registerEventHandler<Pick<GameEvents, 'board:merged'>['board:merged']>(
    'board-merged-achievement-stats',
    (data, ctx) => {
        ctx.deps.achievementStore.incrementStat('merges');
        if (data && data.result && data.result.nextId) {
            const items = ctx.deps.configStore.items as Record<string, GameItem>;
            const nextItem = items[data.result.nextId];
            if (nextItem && !nextItem.nextId) {
                ctx.deps.achievementStore.incrementStat('maxLevelItems');
            }
        }
        ctx.deps.achievementStore.checkAll();
    },
);

registerEventHandler<Pick<GameEvents, 'board:itemConsumed'>['board:itemConsumed']>(
    'board-item-consumed-achievement',
    (_data, ctx) => {
        ctx.deps.achievementStore.incrementStat('recycled');
        ctx.deps.achievementStore.checkAll();
    },
);

registerEventHandler<Pick<GameEvents, 'gacha:pulled'>['gacha:pulled']>(
    'gacha-pulled-achievement-collection',
    (data, ctx) => {
        if (data && data.results) {
            ctx.deps.achievementStore.incrementStat('gachaPulls', data.results.length);
            for (const card of data.results) {
                if (card.id) {
                    ctx.deps.collectionStore.collectGacha(card.id);
                }
            }
        }
        ctx.deps.achievementStore.checkAll();
    },
);

registerEventHandler<Pick<GameEvents, 'fragment:added'>['fragment:added']>(
    'fragment-added-discover',
    (data, ctx) => {
        if (data && data.fragmentId) {
            ctx.deps.collectionStore.discover(data.fragmentId);
        }
    },
);
