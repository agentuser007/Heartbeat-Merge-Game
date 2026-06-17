import { okResultWithData, failResultWithData, type ResolveResult, type ServiceResultWithData } from './ServiceResultTypes';
import type { TouchResponse } from '@/types/game';

export interface TouchInteractionServiceDeps {
    canTouch: (characterId: string, zoneId: string) => boolean;
    getTouchResponse: (characterId: string, zoneId: string) => TouchResponse | null;
}

export interface TouchData {
    dialogue?: string;
    affection: number;
    animation?: string;
    zoneId: string;
}

export const TouchInteractionService = {
    resolvePerformTouch(characterId: string, zoneId: string, deps: TouchInteractionServiceDeps): ServiceResultWithData<TouchData> {
        if (!deps.canTouch(characterId, zoneId)) {
            return failResultWithData<TouchData>('Cannot touch this zone');
        }

        const response = deps.getTouchResponse(characterId, zoneId);
        if (!response) {
            return failResultWithData<TouchData>('No touch response found');
        }

        const result: ResolveResult = {
            applyTo: {
                affection: { recordTouch: { characterId, zoneId } },
                touch: {
                    setTouchCooldown: { characterId, zoneId, timestamp: Date.now() },
                    incrementDailyTouchCount: characterId,
                },
            },
        };

        if (response.affection > 0) {
            result.applyTo.affection!.addAffections = [{ characterId, amount: response.affection, source: 'touch' }];
        }

        result.events = [{ name: 'affection:touchPerformed', data: { characterId, zoneId, affectionGained: response.affection } }];

        return okResultWithData({
            dialogue: response.dialogue,
            affection: response.affection,
            animation: response.animation,
            zoneId: response.zoneId,
        }, result);
    },
};
