// ============================================================
// game.d.ts — Central TypeScript type definitions for the game
// ============================================================
// Mirrors the JSON data structures in assets/data/ and the
// runtime types used across stores, logic, and components.
// ============================================================

// ---- Rarity ----

export type Rarity = 'R' | 'SR' | 'SSR';

// ---- Chain identifiers ----

export type ChainId = 'lips' | 'perfume' | 'study' | 'food' | 'gen_makeup' | 'gen_study' | 'special';

// ============================================================
// Item types  (assets/data/items.json)
// ============================================================

export interface GameItem {
  id: string;
  name: string;
  level: number;
  chain: ChainId;
  nextId: string | null;
  sellPrice: number;
  emoji: string;
  color: string;
}

// Extended item data used by BoardLogic with optional type field
export interface BoardItemData extends GameItem {
  type?: ItemType;
  sellable?: boolean;
}

export type ItemType = 'GENERATOR' | 'JOKER' | 'SCISSOR' | 'NORMAL' | 'ENERGY_POTION';

// ============================================================
// Generator types  (assets/data/generators.json)
// ============================================================

export interface GeneratorDropPoolEntry {
  itemId: string;
  weight: number;
}

export interface GeneratorSpecialDrop {
  chance: number;
  items: GeneratorDropPoolEntry[];
}

export interface GeneratorLevelConfig {
  drop_pool: GeneratorDropPoolEntry[];
  free_production_chance: number;
  capacity: number;
  cooldown: number;
  special_drop: GeneratorSpecialDrop | null;
}

export interface GeneratorConfig {
  id: string;
  name: string;
  emoji: string;
  chains: ChainId[];
  levels: Record<string, GeneratorLevelConfig>;
}

// Runtime generator state on the board
export interface GeneratorState {
  currentClicks: number;
  cooldownUntil: number;
  maxClicks: number;
}

// ============================================================
// CG / Story types  (assets/data/cg_stories.json)
// ============================================================

export interface StoryLine {
  speaker: string | null;
  expression?: string;
  text: string;
}

export interface StoryChapter {
  title: string;
  lines: StoryLine[];
}

export interface CGStory {
  cgId: string;
  title: string;
  maleLead: string;
  stories: StoryChapter[];
}

// ============================================================
// Level / Boss types  (assets/data/levels.json)
// ============================================================

export interface OrderRequirement {
  itemId: string;
  count: number;
}

export interface OrderDialogue {
  npc: string;
  player: string;
}

export interface LevelOrder {
  id: string;
  name: string;
  required: OrderRequirement[];
  isTimed: boolean;
  damage: number;
  diamondReward: number;
  dialogue: OrderDialogue;
  timeLimit?: number;
  failText?: string;
}

export interface LevelData {
  id: number;
  bossName: string;
  bossTitle: string;
  bossAvatar: string;
  bossColor: string;
  bgGradient: string;
  totalHp: number;
  orders: LevelOrder[];
}

// ============================================================
// Gacha types  (assets/data/gacha_pool.json)
// ============================================================

export interface GachaRarityConfig {
  probability: number;
  color: string;
  glow: string;
}

export interface GachaCostConfig {
  singleCost: number;
  tenCost: number;
}

export interface GachaSubWeights {
  [rarity: string]: Record<string, number>;
}

export interface GachaPoolItemValue {
  chain?: ChainId | 'random';
  level: number | `random_${number}_${number}`;
  genChain?: string;
  cgId?: string | null;
  energy?: number;
}

export interface GachaPoolItem {
  id: string;
  rarity: Rarity;
  subCategory: string;
  weight: number;
  icon: string;
  name: string;
  effect: string;
  value: GachaPoolItemValue;
}

export interface GachaPoolData {
  rarityConfig: Record<string, GachaRarityConfig>;
  gachaCost: GachaCostConfig;
  subWeights: GachaSubWeights;
  recycleEnergy: Record<string, number>;
  fragmentToGenerator: number;
  fragmentToStory: number;
  chains: ChainId[];
  chainNames: Record<ChainId, string>;
  chainIcons: Record<ChainId, string>;
  chainToGen: Record<ChainId, string>;
  chainItemPrefix: Record<ChainId, string>;
  gachaPoolV2: GachaPoolItem[];
}

// ============================================================
// Loop types  (assets/data/loop_rules.json, loop_events.json, loop_narratives.json)
// ============================================================

export type LoopSpecialRule = 'dailyGoldUp' | 'perfumeBoost' | 'timedOrdersUp' | 'energyRegenDown';

export interface LoopRule {
  title: string;
  specialRules: LoopSpecialRule[];
}

export interface LoopEvent {
  npcName: string;
  text: string;
  playerText: string;
  goldReward?: number;
  diamondReward?: number;
  energyReward?: number;
}

export interface LoopBossNarrative {
  intro: string | null;
  defeatOutro: string | null;
}

export interface LoopNarrative {
  loopIntro: string;
  loopOutro: string;
  boss_0: LoopBossNarrative;
  boss_1: LoopBossNarrative;
  boss_2: LoopBossNarrative;
  boss_3: LoopBossNarrative;
}

// Runtime loop config built by loopStore
export interface LoopConfig {
  loopIndex: number;
  title: string;
  hpMultiplier: number;
  rewardMultiplier: number;
  timeMultiplier: number;
  specialRules: LoopSpecialRule[];
  narrativePackId: string;
  loopTokenReward: number;
}

// ============================================================
// Daily order types  (assets/data/daily_orders.json)
// ============================================================

export interface DailyOrder {
  id: string;
  name: string;
  required: OrderRequirement[];
  goldReward: number;
  minLoop: number;
  dialogue: string;
}

export interface DailyOrderPoolData {
  orderPool: DailyOrder[];
}

// ============================================================
// Achievement types  (assets/data/achievements.json)
// ============================================================

export type AchievementCondition =
  | 'merges'
  | 'bossDefeats'
  | 'collectionPct'
  | 'maxLevelItems'
  | 'loops'
  | 'gachaPulls'
  | 'dailyOrders'
  | 'energyUsed'
  | 'totalGoldEarned'
  | 'recycled'
  | 'cellsUnlocked'
  | 'dailyCompleted'
  | 'loopReached';

export interface AchievementReward {
  diamonds?: number;
  energy?: number;
  gold?: number;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: AchievementCondition;
  target: number;
  reward: AchievementReward;
}

export interface AchievementData {
  achievements: Achievement[];
}

// ============================================================
// Settings types  (assets/data/settings.json)
// ============================================================

export interface GameSettingsConfig {
  BOARD_COLS: number;
  BOARD_ROWS: number;
  MAX_ENERGY: number;
  ENERGY_REGEN_CAP: number;
  ENERGY_REGEN_INTERVAL: number;
  ENERGY_REGEN_AMOUNT: number;
  ENERGY_COST_PER_SPAWN: number;
  STARTING_GOLD: number;
}

export interface HeroineUpgradeLevel {
  cost: number;
  value: number;
  label: string;
}

export interface HeroineUpgrade {
  id: string;
  name: string;
  icon: string;
  description: string;
  levels: HeroineUpgradeLevel[];
}

export interface UIAnimationConfig {
  flashDuration: number;
  mergePopDuration: number;
  spawnPopDuration: number;
  transitionDuration: number;
  energyPulseDuration: number;
  genClickDuration: number;
  shakeDuration: number;
  particleDistance: number;
  particleFallStartY: number;
  particleFallDriftX: number;
  diamondParticleCount: number;
  confettiCount: number;
  heartFlyDuration: number;
  defeatBossDelay: number;
  paradeToCompleteDelay: number;
  autoSaveInterval: number;
  swipeCloseThreshold: number;
  swipeHandleArea: number;
  timerWarningThreshold: number;
}

export interface UIColorsConfig {
  toastSSR: string;
  toastSR: string;
  toastDefault: string;
}

export interface DialogueConfig {
  typewriterSpeedNormal: number;
  typewriterSpeedFast: number;
}

export interface UIDialogueText {
  npc: string;
  emoji?: string;
  text: string;
  player: string;
}

export interface UITextConfig {
  intro: UIDialogueText;
  game_complete: {
    title: string;
    subtitle: string;
    emoji: string;
    button: string;
  };
  default_fail: {
    text: string;
    player: string;
  };
}

export interface SettingsData {
  GAME_CONFIG: GameSettingsConfig;
  RECYCLE_ENERGY_TABLE: Record<string, number>;
  DAILY_ORDER_CONFIG: {
    MAX_ACTIVE: number;
    REFRESH_COST: number;
  };
  CELL_UNLOCK_COSTS: number[];
  HEROINE_UPGRADES: HeroineUpgrade[];
  LOCKED_CELLS_INITIAL: number[];
  UNLOCK_PER_BOSS: number[][];
  UI_ANIMATION: UIAnimationConfig;
  UI_COLORS: UIColorsConfig;
  DIALOGUE_CONFIG: DialogueConfig;
  UI_TEXT: UITextConfig;
}

// ============================================================
// Shop types  (embedded in configStore.ts)
// ============================================================

export type ShopEffect =
  | 'add_energy_item'
  | 'add_joker'
  | 'add_scissor'
  | 'clear_lv1'
  | 'add_gold'
  | 'add_diamonds'
  | 'heal_energy'
  | 'double_production'
  | 'unlock_cell'
  | 'add_sr_item'
  | 'add_r_item'
  | 'free_pull'
  | 'add_fragment'
  | string;

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  effect: ShopEffect;
  value: Record<string, any>;
  i18nName?: string;
  i18nDesc?: string;
}

// ============================================================
// Inventory types  (inventoryStore.ts)
// ============================================================

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  effect: string;
  value: any;
  rarity: string;
}

// ============================================================
// Board logic result types  (BoardLogic.ts)
// ============================================================

export interface MergeResult {
  action: 'move' | 'joker' | 'merge' | 'swap';
  nextId?: string;
  srcIdx?: number;
  tgtIdx?: number;
  isGenerator?: boolean;
}

export interface ScissorResult {
  success: boolean;
  reason?: string;
  resultItems?: string[];
  targetIdx?: number;
  emptyIdx?: number;
}

export interface UnlockResult {
  indices: number[];
}

// ============================================================
// Loop meta-upgrade types  (loopStore.ts)
// ============================================================

export interface MetaUpgrade {
  startingGold: number;
  startingDiamonds: number;
  startingEnergy: number;
  dailyBonus: number;
}

// ============================================================
// Save data types  (saveStore.ts)
// ============================================================

export interface MetaSaveData {
  version: number;
  timestamp: number;
  loop: unknown;
  heroine: unknown;
  gacha: unknown;
  fragments: unknown;
  cgAlbum: unknown;
  collection: unknown;
  achievements: unknown;
  diamonds: number;
  ad: unknown;
  dailyBuff: unknown;
}

export interface RunSaveData {
  version: number;
  timestamp: number;
  currency: {
    gold: number;
  };
  energy: unknown;
  boss: unknown;
  board: unknown;
  inventory: unknown;
  dailyOrders: unknown;
}

// ============================================================
// Gacha event types  (GachaLogic.ts)
// ============================================================

export interface GachaPulledEvent {
  results: GachaPoolItem[];
}

export interface GachaSSRObtainedEvent {
  item: GachaPoolItem;
  isFirst: boolean;
}

export interface GachaNewSSRsObtainedEvent {
  items: GachaPoolItem[];
}

// ============================================================
// EventBus — Strongly-typed event protocol
// ============================================================

export interface FSMStateChangedEvent {
  from: string | null;
  to: string;
  event: string;
  data?: any;
}

export interface GameEvents {
  // --- Boss ---
  'boss:defeated': { levelIdx: number };
  'boss:gameComplete': void;
  'boss:hpChanged': { currentHp: number; totalHp: number; pct: number };
  'boss:levelLoaded': {
    levelIdx: number;
    bossName: string;
    bossTitle: string;
    bossAvatar: string;
    bossColor: string;
    bgGradient: string;
    currentHp: number;
    totalHp: number;
  };
  'boss:orderComplete': { nextOrderIdx: number };
  'boss:orderFailed': { orderIdx: number; nextOrderIdx: number };
  'boss:orderLoaded': {
    orderIdx: number;
    order: any;
    isTimed: boolean;
    timeLimit: number;
  };
  'boss:timerTick': { remaining: number };

  // --- FSM state changes ---
  'bossfsm:stateChanged': FSMStateChangedEvent;
  'energyfsm:stateChanged': FSMStateChangedEvent;
  'gachafsm:stateChanged': FSMStateChangedEvent;

  // --- Board ---
  'board:cellsUnlocked': { indices: number[] };
  'board:merged': { sourceIndex: number; targetIndex: number; result: any };
  'board:produced': { generatorIndex: number; targetIndex: number; producedItemId: string };

  // --- Currency ---
  'currency:changed': { gold: number; diamonds: number };
  'currency:flash': { type: 'gold' | 'diamonds'; effect: 'add' | 'spend' };
  'currency:goldEarned': { amount: number };
  'currency:insufficient': { type: 'gold' | 'diamonds'; current: number; needed: number };

  // --- Energy ---
  'energy:changed': { current: number; max: number };

  // --- Dialogue ---
  'dialogue:opened': {
    npcName: string;
    npcText: string;
    playerText: string;
    portraitUrl: string;
    portraitEmoji: string;
  };
  'dialogue:closed': void;

  // --- Achievement ---
  'achievement:unlocked': { achievement: Achievement };
  'achievement:claimed': { achievement: Achievement; reward: AchievementReward };

  // --- Ad ---
  'ad:rewardGranted': { adType: string; reward: number };
  'ad:dailyReset': void;

  // --- CG / Story ---
  'cg:unlocked': { cgId: string; storyIndex: number };
  'cg:read': { cgId: string; storyIndex: number };
  'cg:readRequested': { cgId: string };
  'cg:memoryFragmentsAdded': { cgId: string; count: number; total: number };
  'cg:nextUnlocked': { cgId: string; storyIndex: number };

  // --- Collection ---
  'collection:itemDiscovered': { itemId: string };
  'collection:gachaCollected': { cardId: string };
  'collection:chainCompleted': { chainId: string };

  // --- Daily Buff ---
  'dailyBuff:rolled': { buff: { id: string; icon: string; nameKey: string; descKey: string } };
  'dailyBuff:activated': { buff: { id: string; icon: string; nameKey: string; descKey: string } };

  // --- Daily Orders ---
  'dailyOrders:updated': { orders: DailyOrder[] };
  'dailyOrders:fulfilled': { order: DailyOrder; index: number; goldReward: number };
  'dailyOrders:allCompleted': void;

  // --- Fragment ---
  'fragment:added': { fragmentId: string; count: number; total: number };
  'fragment:exchanged': { fragmentId: string; count: number; remaining: number };
  'fragment:cleared': { fragmentId: string };
  'fragment:clearedAll': void;

  // --- Gacha ---
  'gacha:pulled': { results: GachaPoolItem[] };
  'gacha:ssrObtained': { item: GachaPoolItem; isFirst: boolean };
  'gacha:newSSRsObtained': { items: GachaPoolItem[] };

  // --- Heroine ---
  'heroine:upgradePurchased': { upgradeId: string; level: number; value: any };
  'heroine:effectApplied': { upgradeId: string; level: number; value: any };

  // --- Inventory ---
  'inventory:full': { availableSlots: number };
  'inventory:itemAdded': { itemId: string; count: number; total: number };
  'inventory:itemRemoved': { itemId: string; count: number; remaining: number };
  'inventory:itemUsed': { itemId: string; targetCellIndex: number | null };
  'inventory:cleared': void;
  'inventory:expanded': { maxSlots: number; additionalSlots: number };

  // --- Loop ---
  'loop:completed': { loopIndex: number };
  'loop:metaUpgradePurchased': { upgradeId: string; level: number; cost: number };
  'loop:narrativeFlagUnlocked': { flag: string };
  'loop:shouldComplete': void;
  'loop:uiUpdated': { loopIndex: number; config: any };

  // --- Shop ---
  'shop:itemPurchased': { item: { id: string; cost: number; effect: string; value: any } };

  // --- VN Reader ---
  'vn:opened': { ssrId: string; storyIndex: number };
  'vn:closed': void;

  // --- Locale ---
  'localeChanged': { locale: string };
}
