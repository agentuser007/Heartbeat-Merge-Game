import type { ResolveResult } from './ServiceResultTypes';
import type { BoardSnapshot, LoopStatus } from '../types/game';
import type {
    LoopSerializeData,
    HeroineSerializeData,
    GachaSerializeData,
    FragmentSerializeData,
    CGAlbumSerializeData,
    CollectionSerializeData,
    AchievementSerializeData,
    AdSerializeData,
    DailyBuffSerializeData,
    AffectionSerializeData,
    TouchSerializeData,
    EnergySerializeData,
    BossSerializeData,
    BoardSerializedData,
    InventorySerializeData,
    DailyOrderSerializeData,
    VNReaderSerializeData,
    AudioSerializeData,
} from '../types/serialize';

// ============================================================
// SaveService.ts — Pure serialization & deserialization logic
// ============================================================
// No Vue dependency. All functions are pure — deps injected as plain objects.
// saveStore calls these and handles localStorage I/O + reactive state.
// ============================================================

export const CURRENT_VERSION = 5;

// --- Serialization (pure read) ---

export interface SerializeMetaDeps {
    loop: { serialize(): LoopSerializeData };
    heroine: { serialize(): HeroineSerializeData };
    gacha: { serialize(): GachaSerializeData };
    fragments: { serialize(): FragmentSerializeData };
    cgAlbum: { serialize(): CGAlbumSerializeData };
    collection: { serialize(): CollectionSerializeData };
    achievements: { serialize(): AchievementSerializeData };
    diamonds: number;
    ad: { serialize(): AdSerializeData };
    dailyBuff: { serialize(): DailyBuffSerializeData };
    affection: { serialize(): AffectionSerializeData };
    touchData: { serialize(): TouchSerializeData };
    audio: { getState(): AudioSerializeData };
}

export function serializeMeta(deps: SerializeMetaDeps): Record<string, unknown> {
    return {
        version: CURRENT_VERSION,
        timestamp: Date.now(),
        loop: deps.loop.serialize(),
        heroine: deps.heroine.serialize(),
        gacha: deps.gacha.serialize(),
        fragments: deps.fragments.serialize(),
        cgAlbum: deps.cgAlbum.serialize(),
        collection: deps.collection.serialize(),
        achievements: deps.achievements.serialize(),
        diamonds: deps.diamonds,
        ad: deps.ad.serialize(),
        dailyBuff: deps.dailyBuff.serialize(),
        affection: deps.affection.serialize(),
        touchData: deps.touchData.serialize(),
        audio: deps.audio.getState(),
    };
}

export interface SerializeRunDeps {
    gold: number;
    energy: { serialize(): EnergySerializeData };
    boss: { serialize(): BossSerializeData };
    board: { serialize(): BoardSerializedData };
    inventory: { serialize(): InventorySerializeData };
    dailyOrders: { serialize(): DailyOrderSerializeData };
    boardRegistry: Map<number, BoardSnapshot>;
    activeBoardLoop: number;
    loopStatus: string;
    vnReader: { serialize(): VNReaderSerializeData };
}

export function serializeRun(deps: SerializeRunDeps): Record<string, unknown> {
    return {
        version: CURRENT_VERSION,
        timestamp: Date.now(),
        currency: { gold: deps.gold },
        energy: deps.energy.serialize(),
        boss: deps.boss.serialize(),
        board: deps.board.serialize(),
        inventory: deps.inventory.serialize(),
        dailyOrders: deps.dailyOrders.serialize(),
        boardRegistry: Array.from(deps.boardRegistry.entries()),
        activeBoardLoop: deps.activeBoardLoop,
        loopStatus: deps.loopStatus,
        vnReader: deps.vnReader.serialize(),
    };
}

// --- Deserialization resolution (pure, returns structured applyTo) ---

export interface ApplyMetaDataDeps {
    currentGold: number;
    getMemoryFragments: (cgId: string) => number;
}

export interface MetaApplyResult {
    loop?: LoopSerializeData;
    heroine?: HeroineSerializeData;
    gacha?: GachaSerializeData;
    fragments?: FragmentSerializeData;
    cgAlbum?: CGAlbumSerializeData;
    legacyFragmentMigration?: Record<string, number>;
    collection?: CollectionSerializeData;
    achievements?: AchievementSerializeData;
    diamonds?: number;
    ad?: AdSerializeData;
    dailyBuff?: DailyBuffSerializeData;
    affection?: AffectionSerializeData;
    touchData?: TouchSerializeData;
    audio?: AudioSerializeData;
}

export function resolveApplyMetaData(data: Record<string, unknown>, deps: ApplyMetaDataDeps): MetaApplyResult {
    if (!data) return {};

    const result: MetaApplyResult = {};

    if (data.loop) result.loop = data.loop as LoopSerializeData;
    if (data.heroine) result.heroine = data.heroine as HeroineSerializeData;
    if (data.gacha) result.gacha = data.gacha as GachaSerializeData;

    if (data.fragments) {
        result.fragments = data.fragments as FragmentSerializeData;
        const fragData = data.fragments as Record<string, unknown>;
        if (fragData.memoryFragments) {
            const memFrags = fragData.memoryFragments as Record<string, number>;
            const needsMigration: Record<string, number> = {};
            for (const cgId in memFrags) {
                const count = memFrags[cgId] || 0;
                if (count > 0 && deps.getMemoryFragments(cgId) === 0) {
                    needsMigration[cgId] = count;
                }
            }
            if (Object.keys(needsMigration).length > 0) {
                result.legacyFragmentMigration = needsMigration;
            }
        }
    }

    if (data.cgAlbum) result.cgAlbum = data.cgAlbum as CGAlbumSerializeData;
    if (data.collection) result.collection = data.collection as CollectionSerializeData;
    if (data.achievements) result.achievements = data.achievements as AchievementSerializeData;
    if (data.diamonds !== undefined) result.diamonds = data.diamonds as number;
    if (data.ad) result.ad = data.ad as AdSerializeData;
    if (data.dailyBuff) result.dailyBuff = data.dailyBuff as DailyBuffSerializeData;
    if (data.affection) result.affection = data.affection as AffectionSerializeData;
    if (data.touchData) result.touchData = data.touchData as TouchSerializeData;
    if (data.audio) result.audio = data.audio as AudioSerializeData;

    return result;
}

export interface RunApplyResult {
    currency?: { gold: number; diamonds: number };
    energy?: EnergySerializeData;
    energyTimestamp?: number;
    board?: BoardSerializedData;
    boss?: BossSerializeData;
    inventory?: InventorySerializeData;
    dailyOrders?: DailyOrderSerializeData;
    boardRegistry?: Array<[number, BoardSnapshot]>;
    activeBoardLoop?: number;
    loopStatus?: string;
    vnReader?: VNReaderSerializeData;
    timestamp?: number;
}

export interface ApplyRunDataDeps {
    currentDiamonds: number;
}

export function resolveApplyRunData(data: Record<string, unknown>, deps: ApplyRunDataDeps): RunApplyResult {
    if (!data) return {};

    const result: RunApplyResult = {};

    if (data.currency) {
        const cur = data.currency as Record<string, unknown>;
        result.currency = {
            gold: (cur.gold as number) ?? 0,
            diamonds: deps.currentDiamonds,
        };
    }

    if (data.energy) {
        result.energy = data.energy as EnergySerializeData;
        result.energyTimestamp = data.timestamp as number;
    }

    if (data.board) result.board = data.board as BoardSerializedData;
    if (data.boss) result.boss = data.boss as BossSerializeData;
    if (data.inventory) result.inventory = data.inventory as InventorySerializeData;
    if (data.dailyOrders) result.dailyOrders = data.dailyOrders as DailyOrderSerializeData;
    if (data.boardRegistry) result.boardRegistry = data.boardRegistry as Array<[number, BoardSnapshot]>;
    if (data.activeBoardLoop !== undefined) result.activeBoardLoop = data.activeBoardLoop as number;
    if (data.loopStatus !== undefined) result.loopStatus = data.loopStatus as string;
    if (data.vnReader) result.vnReader = data.vnReader as VNReaderSerializeData;
    if (data.timestamp) result.timestamp = data.timestamp as number;

    return result;
}

// --- applySaveResult helpers ---

export interface ApplySaveDeps {
    loopStore: { deserialize(data: unknown): void; syncLoopStatus(status: import('../types/game').LoopStatus): void };
    heroineStore: { deserialize(data: unknown): void };
    gachaStore: { deserialize(data: unknown): void };
    fragmentStore: { deserialize(data: unknown): void };
    cgAlbumStore: { deserialize(data: unknown): void; addMemoryFragments(cgId: string, count: number): void };
    collectionStore: { deserialize(data: unknown): void };
    achievementStore: { deserialize(data: unknown): void };
    currencyStore: { deserialize(data: unknown): void; serialize?: () => { gold: number } };
    adStore: { deserialize(data: unknown): void };
    dailyBuffStore: { deserialize(data: unknown): void };
    affectionStore: { deserialize(data: unknown): void };
    touchInteractionStore: { deserialize(data: unknown): void };
    energyStore: { deserialize(data: unknown, timestamp?: number): void };
    boardStore: { deserialize(data: unknown): void; boardRegistry: Map<number, BoardSnapshot>; activeBoardLoop: number; calculateOfflineProduction(timestamp: number): { itemCount: number; resolveResult: ResolveResult } };
    bossStore: { deserialize(data: unknown): void };
    inventoryStore: { deserialize(data: unknown): void; addItem(itemId: string, count: number): void };
    dailyOrderStore: { deserialize(data: unknown): void };
    vnReaderStore: { deserialize(data: unknown): void };
    showToast?: (message: string, type: string) => void;
    audioStore?: { restoreState(state: any): void };
}

export function applyMetaResult(result: MetaApplyResult, deps: ApplySaveDeps): void {
    if (result.loop) deps.loopStore.deserialize(result.loop);
    if (result.heroine) deps.heroineStore.deserialize(result.heroine);
    if (result.gacha) deps.gachaStore.deserialize(result.gacha);
    if (result.fragments) deps.fragmentStore.deserialize(result.fragments);
    if (result.legacyFragmentMigration) {
        for (const cgId in result.legacyFragmentMigration) {
            deps.cgAlbumStore.addMemoryFragments(cgId, result.legacyFragmentMigration[cgId]);
        }
    }
    if (result.cgAlbum) deps.cgAlbumStore.deserialize(result.cgAlbum);
    if (result.collection) deps.collectionStore.deserialize(result.collection);
    if (result.achievements) deps.achievementStore.deserialize(result.achievements);
    if (result.diamonds !== undefined) {
        deps.currencyStore.deserialize({ gold: deps.currencyStore.serialize?.()?.gold ?? 0, diamonds: result.diamonds });
    }
    if (result.ad) deps.adStore.deserialize(result.ad);
    if (result.dailyBuff) deps.dailyBuffStore.deserialize(result.dailyBuff);
    if (result.affection) deps.affectionStore.deserialize(result.affection);
    if (result.touchData) deps.touchInteractionStore.deserialize(result.touchData);
    if (result.audio && deps.audioStore) deps.audioStore.restoreState(result.audio);
}

export function applyRunResult(result: RunApplyResult, deps: ApplySaveDeps): void {
    if (result.currency) deps.currencyStore.deserialize(result.currency);
    if (result.energy) deps.energyStore.deserialize(result.energy, result.energyTimestamp);
    if (result.board) deps.boardStore.deserialize(result.board);
    if (result.boss) deps.bossStore.deserialize(result.boss);
    if (result.inventory) deps.inventoryStore.deserialize(result.inventory);
    if (result.dailyOrders) deps.dailyOrderStore.deserialize(result.dailyOrders);
    if (result.boardRegistry) deps.boardStore.boardRegistry = new Map(result.boardRegistry);
    if (result.activeBoardLoop !== undefined) deps.boardStore.activeBoardLoop = result.activeBoardLoop;
    if (result.loopStatus) deps.loopStore.syncLoopStatus(result.loopStatus as LoopStatus);
    if (result.vnReader) deps.vnReaderStore.deserialize(result.vnReader);
    if (result.timestamp && deps.boardStore) {
        const offlineResult = deps.boardStore.calculateOfflineProduction(result.timestamp);
        if (offlineResult.resolveResult?.applyTo?.inventory?.addItems) {
            for (const item of offlineResult.resolveResult.applyTo.inventory.addItems) {
                deps.inventoryStore.addItem(item.itemId, item.count);
            }
        }
        if (offlineResult.itemCount > 0 && deps.showToast) {
            deps.showToast(`离线产出：生成了 ${offlineResult.itemCount} 件物品，已存入背包`, 'info');
        }
    }
}

export const SaveService = {
    serializeMeta,
    serializeRun,
    resolveApplyMetaData,
    resolveApplyRunData,
    applyMetaResult,
    applyRunResult,
};
