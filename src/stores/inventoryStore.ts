// ============================================================
// inventoryStore.ts — Inventory Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';

export interface InventoryItem {
    id: string;
    name: string;
    icon: string;
    description: string;
    effect: string;
    value: any;
    rarity: string;
}

export const useInventoryStore = defineStore('inventory', () => {
    // --- State ---
    const slots = ref<Record<string, number>>({}); // item_id -> count
    const maxSlots = ref(20); // Default max slots

    // --- Computed ---
    const totalItems = computed(() => {
        return Object.keys(slots.value).filter(id => slots.value[id] > 0).length;
    });
    
    const uniqueItems = computed(() => {
        return Object.keys(slots.value).filter(id => slots.value[id] > 0);
    });
    
    const isFull = computed(() => {
        return totalItems.value >= maxSlots.value;
    });
    
    const availableSlots = computed(() => {
        return Math.max(0, maxSlots.value - totalItems.value);
    });
    
    const isEmpty = computed(() => {
        return totalItems.value === 0;
    });

    // --- Actions ---
    function addItem(item: InventoryItem | string, count: number = 1): boolean {
        const itemId = typeof item === 'string' ? item : item.id;
        const isNewSlot = !slots.value[itemId] || slots.value[itemId] <= 0;
        const slotsNeeded = isNewSlot ? 1 : 0;
        if (totalItems.value + slotsNeeded > maxSlots.value) {
            globalBus.emit('inventory:full', {
                availableSlots: availableSlots.value
            });
            return false;
        }
        
        slots.value[itemId] = (slots.value[itemId] || 0) + count;
        
        // Emit event for UI updates
        globalBus.emit('inventory:itemAdded', {
            itemId,
            count,
            total: slots.value[itemId]
        });
        
        return true;
    }

    function removeItem(itemId: string, count: number = 1): boolean {
        if (!slots.value[itemId] || slots.value[itemId] < count) {
            return false;
        }
        
        slots.value[itemId] -= count;
        if (slots.value[itemId] <= 0) {
            delete slots.value[itemId];
        }
        
        // Emit event for UI updates
        globalBus.emit('inventory:itemRemoved', {
            itemId,
            count,
            remaining: slots.value[itemId] || 0
        });
        
        return true;
    }

    function useItem(itemId: string, targetCellIndex: number | null = null): boolean {
        if (!hasItem(itemId)) {
            return false;
        }
        
        // Remove one item
        removeItem(itemId, 1);
        
        // Emit event for item usage
        globalBus.emit('inventory:itemUsed', {
            itemId,
            targetCellIndex
        });
        
        return true;
    }

    function hasItem(itemId: string): boolean {
        return !!slots.value[itemId] && slots.value[itemId] > 0;
    }

    function getCount(itemId: string): number {
        return slots.value[itemId] || 0;
    }

    function clear() {
        slots.value = {};
        
        // Emit event for UI updates
        globalBus.emit('inventory:cleared');
    }

    function expandSlots(additionalSlots: number): boolean {
        // In a real implementation, we would check if the player can afford this
        maxSlots.value += additionalSlots;
        
        // Emit event for UI updates
        globalBus.emit('inventory:expanded', {
            maxSlots: maxSlots.value,
            additionalSlots
        });
        
        return true;
    }

    function getItemIds(): string[] {
        return Object.keys(slots.value).filter(id => slots.value[id] > 0);
    }

    function getItems(): Array<{ id: string; count: number }> {
        return Object.entries(slots.value)
            .filter(([_, count]) => count > 0)
            .map(([id, count]) => ({ id, count }));
    }

    // --- Serialization ---
    function serialize() {
        return {
            slots: { ...slots.value },
            maxSlots: maxSlots.value
        };
    }

    function deserialize(data: any) {
        if (!data) return;
        
        slots.value = data.slots || {};
        maxSlots.value = data.maxSlots || 20;
    }

    return {
        // State
        slots,
        maxSlots,
        
        // Computed
        totalItems,
        uniqueItems,
        isFull,
        availableSlots,
        isEmpty,
        
        // Actions
        addItem,
        removeItem,
        useItem,
        hasItem,
        getCount,
        clear,
        expandSlots,
        getItemIds,
        getItems,
        
        // Serialization
        serialize,
        deserialize
    };
});