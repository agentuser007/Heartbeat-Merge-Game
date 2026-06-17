// ============================================================
// affectionGachaHandlers.ts
// Affection, VN event handlers
// ============================================================

import { registerEventHandler } from '../handlerRegistry';
import type { GameEvents } from '@/types/game';
import { AffectionService } from '@/services/AffectionService';
import { applyResolveResult } from '../applyResolveResult';

registerEventHandler<Pick<GameEvents, 'affection:vnCompleted'>['affection:vnCompleted']>(
    'affection-vn-completed',
    (data, ctx) => {
        const result = AffectionService.resolveVnCompleted(data, {
            vnStorySSR: ctx.deps.configStore.affectionConfig.sources.vnStorySSR,
            vnStorySR: ctx.deps.configStore.affectionConfig.sources.vnStorySR,
            getAddAffectionDeps: (characterId: string) => ({
                currentPoints: ctx.deps.affectionStore.getPoints(characterId),
                levels: ctx.deps.configStore.affectionConfig.levels,
                earnRate: ctx.deps.configStore.affectionConfig.affectionCoins.earnRate,
                levelUpBonuses: ctx.deps.configStore.affectionConfig.affectionCoins.levelUpBonuses,
            }),
        });
        applyResolveResult(result, ctx.deps);
    },
);

registerEventHandler<Pick<GameEvents, 'affection:shopEffect'>['affection:shopEffect']>(
    'affection-shop-effect-bridge',
    (data, ctx) => {
        if (!data || !data.effect) return;
        const effect = data.effect;
        switch (effect.type) {
            case 'merge_double':
                ctx.deps.effects.showToast('⚡ 合并加速已激活！', 'info');
                break;
            case 'gacha_ssr_boost':
                ctx.deps.effects.showToast(`🍀 SSR概率+${effect.value}%！`, 'info');
                break;
            case 'boss_damage_shield':
                ctx.deps.effects.showToast('🛡️ 护盾已激活！', 'info');
                break;
            case 'fragment_double':
                ctx.deps.effects.showToast('💎 碎片双倍已激活！', 'info');
                break;
        }
    },
);
