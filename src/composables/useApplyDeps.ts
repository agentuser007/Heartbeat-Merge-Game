// ============================================================
// useApplyDeps.ts — Centralized ApplyDeps construction
// ============================================================
// Single source of truth for building the ApplyDeps object
// used by applyResolveResult. All UI components and composables
// should use this instead of manually constructing ApplyDeps.
// ============================================================

import { useCurrencyStore } from '@/stores/currencyStore';
import { useEnergyStore } from '@/stores/energyStore';
import { useBoardStore } from '@/stores/boardStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useAchievementStore } from '@/stores/achievementStore';
import { useAffectionStore } from '@/stores/affectionStore';
import { useGachaStore } from '@/stores/gachaStore';
import { useLoopStore } from '@/stores/loopStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { useDailyOrderStore } from '@/stores/dailyOrderStore';
import { useSaveStore } from '@/stores/saveStore';
import { useAdStore } from '@/stores/adStore';
import { useTouchInteractionStore } from '@/stores/touchInteractionStore';
import { useDailyBuffStore } from '@/stores/dailyBuffStore';
import { useFragmentStore } from '@/stores/fragmentStore';
import { useCGAlbumStore } from '@/stores/cgAlbumStore';
import { useEffects } from '@/composables/useEffects';
import { useI18nStore } from '@/stores/i18nStore';
import { useHeroineStore } from '@/stores/heroineStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useBossStore } from '@/stores/bossStore';
import { useVNReaderStore } from '@/stores/vnReaderStore';
import { useEventBus } from '@/composables/useEventBus';
import { useConfigStore } from '@/stores/configStore';
import type { ApplyDeps } from '@/composables/applyResolveResult';

export function useApplyDeps(): ApplyDeps {
    return {
        currencyStore: useCurrencyStore(),
        energyStore: useEnergyStore(),
        boardStore: useBoardStore(),
        inventoryStore: useInventoryStore(),
        achievementStore: useAchievementStore(),
        affectionStore: useAffectionStore(),
        gachaStore: useGachaStore(),
        loopStore: useLoopStore(),
        collectionStore: useCollectionStore(),
        dailyOrderStore: useDailyOrderStore(),
        saveStore: useSaveStore(),
        adStore: useAdStore(),
        dailyBuffStore: useDailyBuffStore(),
        touchInteractionStore: useTouchInteractionStore(),
        fragmentStore: useFragmentStore(),
        cgAlbumStore: useCGAlbumStore(),
        bossStore: useBossStore(),
        heroineStore: useHeroineStore(),
        dialogueStore: useDialogueStore(),
        vnReaderStore: useVNReaderStore(),
        effects: useEffects(),
        i18nStore: useI18nStore(),
        bus: useEventBus(),
        configStore: useConfigStore(),
    };
}
