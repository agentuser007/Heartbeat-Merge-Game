// ============================================================
// bossLoopHandlers.ts
// Boss FSM, Loop event handlers
// ============================================================

import { registerEventHandler, registerWatchHandler } from '../handlerRegistry';
import type { GameEvents } from '@/types/game';
import type { ResolveResult } from '@/services/ServiceResultTypes';
import { AffectionService } from '@/services/AffectionService';
import { applyResolveResult } from '../applyResolveResult';

registerWatchHandler<string>(
    'boss-fsm-defeated-watch',
    (newVal, oldVal, ctx) => {
        if (newVal === 'DEFEATED' && oldVal !== 'DEFEATED') {
            const rr = ctx.deps.bossStore.resolveDefeatTransition();
            applyResolveResult(rr, ctx.deps);
        }
    },
);

registerEventHandler<Pick<GameEvents, 'boss:defeated'>['boss:defeated']>(
    'boss-defeated-unlock-cells',
    (data, ctx) => {
        const indices = ctx.deps.configStore.unlockPerBoss[data.levelIdx];
        if (indices?.length) {
            ctx.deps.boardStore.unlockCells(indices);
        }
    },
);

registerEventHandler<Pick<GameEvents, 'boss:defeated'>['boss:defeated']>(
    'boss-defeated-loop-event',
    (data, ctx) => {
        const key = `${data.loopIndex}_${data.levelIdx}`;
        const event = ctx.deps.configStore.loopEvents[key];
        if (!event) return;

        ctx.deps.dialogueStore.show(
            event.npcName, '', event.text, event.playerText,
            {
                onClose: () => {
                    const rr: ResolveResult = { applyTo: {} };
                    if (event.goldReward != null) rr.applyTo.currency = { ...rr.applyTo.currency, addGold: event.goldReward };
                    if (event.diamondReward != null) rr.applyTo.currency = { ...rr.applyTo.currency, addDiamonds: event.diamondReward };
                    if (event.energyReward != null) rr.applyTo.energy = { add: event.energyReward };
                    applyResolveResult(rr, ctx.deps);
                },
            },
        );
    },
);

registerEventHandler<Pick<GameEvents, 'bossfsm:stateChanged'>['bossfsm:stateChanged']>(
    'bossfsm-defeated-achievement-affection',
    (data, ctx) => {
        if (data && data.to === 'DEFEATED') {
            const result = AffectionService.resolveBossDefeat({
                bossToCharacter: ctx.deps.configStore.affectionConfig.bossToCharacter,
                bossDefeat: ctx.deps.configStore.affectionConfig.sources.bossDefeat,
                bossLevelIdx: ctx.deps.bossStore.currentLevelIdx,
                loopIndex: ctx.deps.loopStore.loopIndex,
                getAddAffectionDeps: (characterId: string) => ({
                    currentPoints: ctx.deps.affectionStore.getPoints(characterId),
                    levels: ctx.deps.configStore.affectionConfig.levels,
                    earnRate: ctx.deps.configStore.affectionConfig.affectionCoins.earnRate,
                    levelUpBonuses: ctx.deps.configStore.affectionConfig.affectionCoins.levelUpBonuses,
                }),
            });
            applyResolveResult(result, ctx.deps);
        }
    },
);

registerEventHandler<Pick<GameEvents, 'loop:shouldComplete'>['loop:shouldComplete']>(
    'loop-should-complete',
    () => {
        // Handled in GameView.vue → completeCurrentLoop()
    },
);

registerEventHandler<Pick<GameEvents, 'loop:metaUpgradePurchased'>['loop:metaUpgradePurchased']>(
    'loop-meta-upgrade-save',
    (_data, ctx) => {
        ctx.deps.saveStore.saveMeta();
    },
);
