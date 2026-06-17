import { okResult, failResult, type ServiceResult } from './ServiceResultTypes';

export interface ExchangeDeps {
    fragmentId: string;
    count: number;
    currentFragments: Record<string, number>;
}

export function resolveExchange(deps: ExchangeDeps): ServiceResult {
    if (!deps.fragmentId) throw new Error('[FragmentService] fragmentId is required');
    if (!deps.count || deps.count <= 0) throw new Error('[FragmentService] count must be > 0');

    const available = deps.currentFragments[deps.fragmentId] || 0;
    if (available < deps.count) {
        return failResult('insufficient_fragments');
    }

    return okResult({
        applyTo: {
            fragment: {
                removeFragment: { fragmentId: deps.fragmentId, count: deps.count },
            },
        },
        events: [{
            name: 'fragment:exchanged',
            data: {
                fragmentId: deps.fragmentId,
                count: deps.count,
                remaining: available - deps.count,
            },
        }],
    });
}
