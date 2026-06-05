// ============================================================
// currencyStore.ts — Currency Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { CurrencyLogic } from '../logic/CurrencyLogic';

export const useCurrencyStore = defineStore('currency', () => {
    // --- State ---
    const gold = ref(0);
    const diamonds = ref(0);

    // --- Logic instance ---
    const logic = new CurrencyLogic();

    // Initialize state from logic
    gold.value = logic.gold;
    diamonds.value = logic.diamonds;

    // --- Subscribe to logic events ---
    // HMR LIMITATION: globalBus.on() listeners registered here will stack on HMR updates.
    // EventBus.on() returns the handler ref (not an unsubscribe fn), so per-listener HMR cleanup
    // would require storing each handler ref and calling globalBus.off() with it on dispose.
    // For now, this is a known dev-only issue — full page reload clears it.
    globalBus.on('currency:changed', (data) => {
        if (data) {
            gold.value = data.gold;
            diamonds.value = data.diamonds;
        }
    });

    globalBus.on('currency:flash', (_data) => {
        // This event is for UI effects, no state changes needed
    });

    // --- Computed ---
    const totalBalance = computed(() => gold.value + diamonds.value);

    // --- Actions ---
    function addGold(amount: number): void {
        logic.addGold(amount);
        gold.value = logic.gold;
    }

    function setGold(value: number): void {
        logic.setGold(value);
        gold.value = logic.gold;
    }

    function spendGold(amount: number): boolean {
        const result = logic.spendGold(amount);
        gold.value = logic.gold;
        return result;
    }

    function canAffordGold(amount: number): boolean {
        return logic.canAffordGold(amount);
    }

    function addDiamonds(amount: number): void {
        logic.addDiamonds(amount);
        diamonds.value = logic.diamonds;
    }

    function spendDiamonds(amount: number): boolean {
        const result = logic.spendDiamonds(amount);
        diamonds.value = logic.diamonds;
        return result;
    }

    function canAffordDiamonds(amount: number): boolean {
        return logic.canAffordDiamonds(amount);
    }

    // Static helper method for formatting gold
    function formatGold(amount: number): string {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toString();
    }

    // --- Serialization ---
    function serialize() {
        return {
            gold: gold.value,
            diamonds: diamonds.value
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        logic.gold = data.gold ?? logic.gold;
        logic.diamonds = data.diamonds ?? logic.diamonds;
        
        gold.value = logic.gold;
        diamonds.value = logic.diamonds;
    }

    return {
        // State
        gold,
        diamonds,
        
        // Computed
        totalBalance,
        
        // Actions
        addGold,
        setGold,
        spendGold,
        canAffordGold,
        addDiamonds,
        spendDiamonds,
        canAffordDiamonds,
        formatGold,
        
        // Serialization
        serialize,
        deserialize
    };
});