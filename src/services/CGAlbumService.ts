import { okResultWithData, failResultWithData, type ServiceResultWithData } from './ServiceResultTypes';

export interface TryUnlockNextDeps {
    cgId: string;
    memoryFragments: number;
    unlockedStories: number[];
    fragmentToStory: number;
    totalStories: number;
}

export interface TryUnlockNextData {
    nextIndex: number;
}

export function resolveTryUnlockNext(deps: TryUnlockNextDeps): ServiceResultWithData<TryUnlockNextData> {
    if (!deps.cgId) throw new Error('[CGAlbumService] cgId is required');

    if (deps.memoryFragments < deps.fragmentToStory) {
        return failResultWithData('insufficient_fragments');
    }

    const nextIndex = deps.unlockedStories.length;
    if (nextIndex >= deps.totalStories) {
        return failResultWithData('all_unlocked');
    }

    if (deps.unlockedStories.includes(nextIndex)) {
        return failResultWithData('already_unlocked');
    }

    return okResultWithData(
        { nextIndex },
        {
            applyTo: {
                cgAlbum: {
                    unlockNextStory: { cgId: deps.cgId },
                    spendMemoryFragments: { cgId: deps.cgId, amount: deps.fragmentToStory },
                },
            },
            events: [{
                name: 'cg:nextUnlocked',
                data: { cgId: deps.cgId, storyIndex: nextIndex },
            }],
        },
    );
}
