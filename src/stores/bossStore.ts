// ============================================================
// bossStore.ts — Boss Game State Store
// ============================================================
// Manages boss level, HP, FSM, and orders.
// Iron rule #5: Store only does apply + emit.
// All business logic in BossLogic (class) / BossService.
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { BossLogic, OrderData } from '../logic/BossLogic';
import { BossService } from '../services/BossService';
import { useConfigStore } from './configStore';
import { useLoopStore } from './loopStore';
import { getHpMultiplier } from '../logic/LoopLogic';
import type { ServiceResult } from '../services/ServiceResultTypes';
import type { ResolveResult } from '../services/ServiceResultTypes';
import type { BossSerializeData } from '../types/serialize';

export const useBossStore = defineStore('boss', () => {
    const currentLevelIdx = ref(0);
    const currentHp = ref(0);
    const totalHp = ref(0);
    const bossName = ref('');
    const bossAvatar = ref('');
    const fsmState = ref('');
    const orders = ref<OrderData[]>([]);
    const currentOrderIdx = ref(0);

    const logic = new BossLogic();

    currentLevelIdx.value = logic.currentLevelIdx;
    currentHp.value = logic.currentHp;
    totalHp.value = logic.totalHp;
    currentOrderIdx.value = logic.currentOrderIdx;
    fsmState.value = logic.fsm.getState();

    globalBus.on('bossfsm:stateChanged', (data) => {
        if (data) {
            fsmState.value = data.to;
        }
    });

    const hpPercentage = computed(() => {
        return totalHp.value > 0 ? Math.max(0, ((totalHp.value - currentHp.value) / totalHp.value) * 100) : 0;
    });

    const isDefeated = computed(() => currentHp.value <= 0);

    function _bossServiceDeps() {
        const configStore = useConfigStore();
        const loopStore = useLoopStore();
        const loopIdx = loopStore.loopIndex;
        const hpMult = getHpMultiplier(loopIdx, {
            table: configStore.loopMultipliers.hpMultiplier.table,
            overflowBase: configStore.loopMultipliers.hpMultiplier.overflowBase!,
            overflowGrowth: configStore.loopMultipliers.hpMultiplier.overflowGrowth!,
        });
        return {
            logic,
            levels: configStore.levels as unknown as Parameters<typeof logic.loadLevel>[1],
            bossProgression: configStore.bossProgression,
            loopIndex: loopIdx,
            hpMultiplier: hpMult,
            items: configStore.items,
            hasTimedOrdersUp: loopStore.hasRule('timedOrdersUp'),
            timedOrdersUpConfig: configStore.bossProgression?.timedOrdersUp ?? { defaultTimeLimit: 30, timeMultiplier: 0.7 },
        };
    }

    // ============================================================
    // Actions — return ResolveResult, caller applies
    // ============================================================

    function resolveLoadLevel(levelIdx: number): ResolveResult {
        return BossService.resolveLoadLevel(levelIdx, _bossServiceDeps());
    }

    function resolveLoadOrder(orderIdx: number): ResolveResult {
        return BossService.resolveLoadOrder(orderIdx, _bossServiceDeps());
    }

    function resolveSubmitOrder(damage: number): ServiceResult {
        return BossService.resolveSubmitOrder(damage, _bossServiceDeps());
    }

    function resolveDamageBoss(damage: number): ResolveResult {
        return BossService.resolveDamageBoss(damage, { logic });
    }

    function resolveNextLevel(): ResolveResult {
        const nextLevelIdx = currentLevelIdx.value + 1;
        return BossService.resolveLoadLevel(nextLevelIdx, _bossServiceDeps());
    }

    function resolveDefeatTransition(): ResolveResult {
        return BossService.resolveDefeatTransition({
            ..._bossServiceDeps(),
            currentLevelIdx: currentLevelIdx.value,
        });
    }

    function resolveReset(): ResolveResult {
        logic.currentLevelIdx = -1;
        logic.currentOrderIdx = 0;
        logic.currentHp = 0;
        logic.totalHp = 0;
        logic.timerRemaining = 0;
        logic.fsm.reset('IDLE');
        return BossService.resolveReset();
    }

    // ============================================================
    // Thin mutations — called by applyResolveResult only
    // ============================================================

    function setLevelIdx(idx: number): void { currentLevelIdx.value = idx; }
    function setHp(hp: number): void { currentHp.value = hp; }
    function setTotalHp(hp: number): void { totalHp.value = hp; }
    function setBossNameField(name: string): void { bossName.value = name; }
    function setBossAvatarField(avatar: string): void { bossAvatar.value = avatar; }
    function setFsmStateField(state: string): void {
        logic.fsm.reset(state);
        fsmState.value = state;
    }
    function setOrdersField(ordersData: OrderData[]): void { orders.value = ordersData; }
    function setCurrentOrderIdxField(idx: number): void { currentOrderIdx.value = idx; }
    function setTimerRemainingField(remaining: number): void { logic.timerRemaining = remaining; }

    // ============================================================
    // Persistence
    // ============================================================

    function serialize() {
        return {
            levelIdx: currentLevelIdx.value,
            orderIdx: currentOrderIdx.value,
            hp: currentHp.value,
            totalHp: totalHp.value,
            state: fsmState.value,
            timerRemaining: logic.timerRemaining,
            bossName: bossName.value,
            bossAvatar: bossAvatar.value
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as BossSerializeData;
        logic.currentLevelIdx = d.levelIdx ?? 0;
        logic.currentOrderIdx = d.orderIdx ?? 0;
        logic.currentHp = d.hp ?? 0;
        logic.totalHp = d.totalHp ?? 0;
        logic.timerRemaining = d.timerRemaining ?? 0;

        if (d.bossName) bossName.value = d.bossName;
        if (d.bossAvatar) bossAvatar.value = d.bossAvatar;

        if (d.state) {
            const validStates = ['IDLE', 'BATTLE', 'SUBMITTING', 'DEFEATED', 'COMPLETE'];
            const targetState = d.state === 'SUBMITTING' ? 'BATTLE' : d.state;
            logic.fsm.reset(validStates.includes(targetState) ? targetState : 'IDLE');
        }

        currentLevelIdx.value = logic.currentLevelIdx;
        currentOrderIdx.value = logic.currentOrderIdx;
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        fsmState.value = logic.fsm.getState();

        if (logic.currentLevelIdx >= 0) {
            const rr = resolveLoadOrder(logic.currentOrderIdx);
            _applyBossResolveResult(rr);
        }
    }

    // @deserialize-only — 故意不 emit events，避免在 Store 初始化阶段
    // 触发依赖其他 Store 就绪的 handler。gameplay 路径请使用 applyResolveResult。
    function _applyBossResolveResult(result: ResolveResult): void {
        const b = result.applyTo.boss;
        if (!b) return;
        if (b.setCurrentLevelIdx !== undefined) setLevelIdx(b.setCurrentLevelIdx);
        if (b.setCurrentHp !== undefined) setHp(b.setCurrentHp);
        if (b.setTotalHp !== undefined) setTotalHp(b.setTotalHp);
        if (b.setBossName !== undefined) setBossNameField(b.setBossName);
        if (b.setBossAvatar !== undefined) setBossAvatarField(b.setBossAvatar);
        if (b.setFsmState !== undefined) setFsmStateField(b.setFsmState);
        if (b.setOrders !== undefined) setOrdersField(b.setOrders);
        if (b.setCurrentOrderIdx !== undefined) setCurrentOrderIdxField(b.setCurrentOrderIdx);
        if (b.setTimerRemaining !== undefined) setTimerRemainingField(b.setTimerRemaining);
    }

    return {
        currentLevelIdx,
        currentHp,
        totalHp,
        bossName,
        bossAvatar,
        fsmState,
        orders,
        currentOrderIdx,
        hpPercentage,
        isDefeated,

        resolveLoadLevel,
        resolveLoadOrder,
        resolveSubmitOrder,
        resolveDamageBoss,
        resolveNextLevel,
        resolveDefeatTransition,
        resolveReset,

        setLevelIdx,
        setHp,
        setTotalHp,
        setBossNameField,
        setBossAvatarField,
        setFsmStateField,
        setOrdersField,
        setCurrentOrderIdxField,
        setTimerRemainingField,

        serialize,
        deserialize
    };
});
