// ============================================================
// serialize.ts — Save data type definitions
// ============================================================
// These types describe the serialized (disk) form of each store's data.
// They must be kept in sync with each store's serialize() implementation.
// When modifying a store's serialize(), update the corresponding type here.
// ============================================================

import type { LoopStatus, MetaUpgrade, GeneratorState, BoardSnapshot, DailyOrderState } from './game';

// --- Meta stores (persist across loops) ---

export interface LoopSerializeData {
    loopIndex: number;
    loopTokens: number;
    loopStatus: LoopStatus;
    metaUpgrades: MetaUpgrade;
    currentLoopConfig: Record<string, unknown> | null;
    unlockedNarrativeFlags: string[];
}

export interface HeroineSerializeData {
    upgrades: Record<string, number>;
}

export interface GachaSerializeData {
    ssrOwned: Record<string, boolean>;
    freePullsLeft: number;
    lastFreePullDate: string;
}

export interface FragmentSerializeData {
    fragments: Record<string, number>;
}

export interface CGAlbumSerializeData {
    cgData: Record<string, unknown>;
    unlockedCGs: string[];
}

export interface CollectionSerializeData {
    discovered: string[];
    discoveredThisLoop: string[];
    gachaCollected: string[];
    completedChains: string[];
    activeTab: 'items' | 'gacha' | 'fragments';
}

export interface AchievementSerializeData {
    unlocked: string[];
    unlockedThisLoop: string[];
    completed: string[];
    stats: Record<string, number>;
}

export interface AdSerializeData {
    dailyAdCounts: Record<string, number>;
    lastWatchTime: Record<string, number>;
    lastResetDate: string;
}

export interface DailyBuffSerializeData {
    activeBuffs: Array<{ id: string; icon: string; nameKey: string; descKey: string; activatedAt?: number }>;
    lastRollDate: string;
    buffFlags: Record<string, boolean>;
    pendingBuff: { id: string; icon: string; nameKey: string; descKey: string; activatedAt?: number } | null;
}

export interface AffectionSerializeData {
    affection: Record<string, number>;
    affectionCoins: number;
    shopPurchaseHistory: Record<string, { totalPurchased: number; lastPurchaseDate: string }>;
    giftHistory: Record<string, Record<string, number>>;
    lastTouchTime: Record<string, Record<string, number>>;
}

export interface TouchSerializeData {
    activeCharacterId: string | null;
    touchCooldowns: Record<string, Record<string, number>>;
    dailyTouchCount: Record<string, number>;
    lastDailyReset: number;
}

// --- Run stores (reset per loop) ---

export interface CurrencySerializeData {
    gold: number;
    diamonds: number;
}

export interface EnergySerializeData {
    current: number;
    max: number;
    regenCap: number;
    regenInterval: number;
    state: string;
}

export interface BossSerializeData {
    levelIdx: number;
    orderIdx: number;
    hp: number;
    totalHp: number;
    state: string;
    timerRemaining: number;
    bossName: string;
    bossAvatar: string;
}

export interface BoardSerializedData {
    cells: (string | null)[];
    locked: number[];
    generatorStates: Record<string, GeneratorState>;
    cellsUnlocked: number;
    doubleGenTurns: number;
    boardRegistry: Array<[number, BoardSnapshot]>;
    activeBoardLoop: number;
}

export interface InventorySerializeData {
    slots: Record<string, number>;
    maxSlots: number;
    itemMetadata: Record<string, { effect?: string; value?: unknown; gachaId?: string }>;
}

export interface DailyOrderSerializeData {
    activeOrders: DailyOrderState[];
    completedCount: number;
    lastRollDate: string;
    loopIndex: number;
    frozenOrders: DailyOrderState[] | null;
}

export interface VNReaderSerializeData {
    isOpen: boolean;
    ssrId: string;
    storyIndex: number;
    currentIndex: number;
    autoMode: boolean;
    skipMode: boolean;
    ended: boolean;
    showingHistory: boolean;
    currentSpeaker: string | null;
    history: Array<{ speaker: string; speakerId: string | null; text: string }>;
}

export interface DialogueSerializeData {
    isOpen: boolean;
    npcName: string;
    npcText: string;
    playerText: string;
    portraitUrl: string;
    portraitEmoji: string;
    dialogueQueue: Array<{ npcName: string; npcText: string; playerText: string; portraitUrl?: string; portraitEmoji?: string }>;
}

export interface AudioSerializeData {
    masterVolume: number;
    bgmVolume: number;
    sfxVolume: number;
    muted: boolean;
}
