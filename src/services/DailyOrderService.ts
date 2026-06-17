import { okResult, failResult, type ServiceResult, type ResolveResult } from './ServiceResultTypes';
import type { DailyOrderState, DailyOrder } from '@/types/game';
import { fisherYatesShuffle } from '../utils/shuffle';

export interface CheckOrderDeps {
    orderIndex: number;
    orders: DailyOrderState[];
    itemCounts: Record<string, number>;
}

export function resolveCheckOrder(deps: CheckOrderDeps): ServiceResult {
    if (deps.orderIndex < 0 || deps.orderIndex >= deps.orders.length) {
        return failResult('order_not_found');
    }

    const order = deps.orders[deps.orderIndex];
    if (order.fulfilled) {
        return failResult('order_already_fulfilled');
    }

    for (const req of order.required) {
        const available = deps.itemCounts[req.itemId] || 0;
        if (available < req.count) {
            return failResult('items_insufficient');
        }
    }

    return okResult({ applyTo: {} });
}

export interface RollOrdersDeps<T extends DailyOrder> {
    orderPool: T[];
    loopIndex: number;
    maxActive: number;
    random: () => number;
}

export function resolveRollOrders<T extends DailyOrder>(deps: RollOrdersDeps<T>): ResolveResult {
    const { orderPool, loopIndex, maxActive, random } = deps;
    const available = orderPool.filter(order => (order.minLoop || 1) <= loopIndex);
    const shuffled = fisherYatesShuffle(available, random);
    const selected = shuffled.slice(0, maxActive).map(order => ({
        ...order,
        fulfilled: false,
    }));

    return {
        applyTo: {
            dailyOrders: {
                setActiveOrders: selected,
                setCompletedCount: 0,
            },
        },
        events: [{ name: 'dailyOrders:updated', data: { orders: selected } }],
    };
}
