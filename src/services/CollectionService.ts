import { emptyResult, type ResolveResult } from './ServiceResultTypes';

export interface CheckChainCompletionDeps {
    chainId: string;
    items: Record<string, { chain: string }>;
    discovered: Set<string>;
    completedChains: Set<string>;
}

export function resolveCheckChainCompletion(deps: CheckChainCompletionDeps): ResolveResult {
    if (!deps.chainId) throw new Error('[CollectionService] chainId is required');
    if (deps.chainId === 'special') return emptyResult();
    if (deps.completedChains.has(deps.chainId)) return emptyResult();

    const chainItems = Object.entries(deps.items).filter(([, v]) => v.chain === deps.chainId);
    if (chainItems.length === 0) return emptyResult();

    const allDiscovered = chainItems.every(([id]) => deps.discovered.has(id));
    if (!allDiscovered) return emptyResult();

    return {
        applyTo: {
            collection: {
                markChainCompleted: deps.chainId,
            },
        },
        events: [{
            name: 'collection:chainCompleted',
            data: { chainId: deps.chainId },
        }],
    };
}
