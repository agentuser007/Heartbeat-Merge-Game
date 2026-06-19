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
  energyRecover?: number;
  type?: ItemType;
  sellable?: boolean;
  description?: string;
}

// Extended item data used by BoardLogic with optional type field
export interface BoardItemData extends GameItem {
  type?: ItemType;
  sellable?: boolean;
}

export type ItemType = 'GENERATOR' | 'JOKER' | 'SCISSOR' | 'NORMAL' | 'ENERGY_POTION' | 'SPECIAL' | 'SURPRISE_BOX';

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
  speakerId: string | null;
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
  maleLeadId: string;
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
  characterId: string;
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
  level?: number | `random_${number}_${number}`;
  genChain?: string;
  cgId?: string | null;
  energy?: number;
  amount?: number;
  count?: number;
  turns?: number;
  genLevel?: number;
  energyPerItem?: number;
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
  itemId?: string;
  description?: string;
}

export interface GachaPoolData {
  rarityConfig: Record<string, GachaRarityConfig>;
  gachaCost: GachaCostConfig;
  subWeights: GachaSubWeights;
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
// Loop status & board snapshot types
// ============================================================

export type LoopStatus = 'active' | 'settling' | 'completed'

export interface BoardSnapshot {
  loopIndex:       number
  status:          LoopStatus
  cells:           (string | null)[] | null
  locked:          number[]
  generatorStates: Record<string, GeneratorState> | null
  cellsUnlocked:   number
  frozenDailyOrders: DailyOrderState[] | null
  rankTitle:       string
  characterId:     string
  completedAt?:    number
}

export interface MapNode {
  loopIndex:    number
  status:       LoopStatus
  rankTitle:    string
  characterId:  string
  completedAt?: number
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
  reward?: {
    gold?: number;
    diamonds?: number;
    energy?: number;
  };
  minLoop: number;
  dialogue: string;
  npcAvatar?: string;
}

export interface DailyOrderState extends DailyOrder {
  fulfilled: boolean;
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
  ENERGY_REGEN_DOWN_MULTIPLIER: number;
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
  interactiveTransition: number;
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

export interface UITimerConfig {
  achievementToastDisplay: number;
  achievementToastFadeOut: number;
  unlockConfirmAutoClose: number;
  unlockConfirmCloseDelay: number;
  unlockAnimation: number;
  bossDefeatAnim: number;
  dialogueAutoAdvance: number;
  orderTimerInterval: number;
  energyRegenInterval: number;
  particleLifespan: number;
  paradeStepInterval: number;
  gachaRevealDelay: number;
  gachaCardFlipDuration: number;
  toastFadeOut: number;
  bgmFadeIn: number;
  bgmResumeFade: number;
  affectionToastDisplay: number;
  affectionLevelUpToastDisplay: number;
  touchDialogueDisplay: number;
  vnTitleDisplay: number;
  bgmSwitchDelay: number;
  itemUseDelay: number;
  sparkleStartDelay: number;
}

export interface UIColorThemeConfig {
  hpGradientHigh: string;
  hpGradientMid: string;
  hpGradientLow: string;
  hpHighThreshold: number;
  hpMidThreshold: number;
  energyHighThreshold: number;
  energyLowThreshold: number;
  energyGradientHigh: string;
  energyGradientMid: string;
  energyGradientLow: string;
}

export interface AudioRegistryEntry {
  file: string;
  volume: number;
  enabled?: boolean;
  triggerEvent?: string;
}

export interface AudioConfig {
  defaults: {
    masterVolume: number;
    bgmVolume: number;
    sfxVolume: number;
  };
  fade: {
    bgmFadeIn: number;
    bgmFadeOut: number;
    bgmResumeFade: number;
    bgmCrossfade: number;
    bgmSwitchDelay: number;
  };
  sfxRegistry: Record<string, AudioRegistryEntry>;
  bgmRegistry: Record<string, Omit<AudioRegistryEntry, 'triggerEvent' | 'enabled'>>;
}

export interface UILayoutConfig {
  unlockPopupMinOffset: number;
  unlockParticleCount: number;
  recycleParticleCount: number;
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
  UI_TIMERS: UITimerConfig;
  UI_COLOR_THEME: UIColorThemeConfig;
  UI_LAYOUT: UILayoutConfig;
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
  icon: string;
  cost: number;
  effect: ShopEffect;
  value: Record<string, unknown>;
  i18nName: string;
  i18nDesc: string;
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
  value: unknown;
  rarity: string;
}

export interface InventoryItemMeta {
  effect?: string;
  value?: GachaPoolItemValue;
  gachaId?: string;
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
  CurrencySerializeData,
  EnergySerializeData,
  BossSerializeData,
  BoardSerializedData,
  InventorySerializeData,
  DailyOrderSerializeData,
  VNReaderSerializeData,
} from './serialize';

export interface MetaSaveData {
  version: number;
  timestamp: number;
  loop: LoopSerializeData;
  heroine: HeroineSerializeData;
  gacha: GachaSerializeData;
  fragments: FragmentSerializeData;
  cgAlbum: CGAlbumSerializeData;
  collection: CollectionSerializeData;
  achievements: AchievementSerializeData;
  diamonds: number;
  ad: AdSerializeData;
  dailyBuff: DailyBuffSerializeData;
  affection: AffectionSerializeData;
  touchData: TouchSerializeData;
}

export interface RunSaveData {
  version: number;
  timestamp: number;
  currency: {
    gold: number;
  };
  energy: EnergySerializeData;
  boss: BossSerializeData;
  board: BoardSerializedData;
  inventory: InventorySerializeData;
  dailyOrders: DailyOrderSerializeData;
  boardRegistry: Array<[number, BoardSnapshot]>;
  activeBoardLoop: number;
  loopStatus: LoopStatus;
  vnReader: VNReaderSerializeData;
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
  data?: unknown;
}

export interface GameEvents {
  // --- Boss ---
  'boss:defeated': { levelIdx: number; bossId: string; loopIndex: number };
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
    order: {
      required: Array<{ itemId: string; count: number }>;
      damage: number;
      isTimed?: boolean;
      timeLimit?: number;
      diamondReward?: number;
      affectionReward?: number;
    };
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
  'board:merged': { sourceIndex: number; targetIndex: number; result: MergeResult };
  'board:produced': { generatorIndex: number; targetIndex: number; producedItemId: string };
  'board:itemConsumed': { index: number; itemId: string };
  'board:itemPlaced': { index: number; itemId: string };
  'board:sold': { cellIndex: number; itemId: string; gold: number; energy: number };

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
  'dailyBuff:expired': { buff: { id: string; icon: string; nameKey: string; descKey: string } };

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
  'heroine:upgradePurchased': { upgradeId: string; level: number; value: number };
  'heroine:effectApplied': { upgradeId: string; level: number; value: number };

  // --- Inventory ---
  'inventory:itemAdded': { itemId: string; count: number; total: number };
  'inventory:itemRemoved': { itemId: string; count: number; remaining: number };
  'inventory:itemUsed': { itemId: string; targetCellIndex: number | null };
  'inventory:cleared': void;

  // --- Loop ---
  'loop:completed': { loopIndex: number };
  'loop:settling': { loopIndex: number };
  'loop:metaUpgradePurchased': { upgradeId: string; level: number; cost: number };
  'loop:narrativeFlagUnlocked': { flag: string };
  'loop:shouldComplete': void;
  'loop:uiUpdated': { loopIndex: number; config: LoopConfig };

  // --- Board (multi-board) ---
  'board:switched': { loopIndex: number; status: LoopStatus };

  // --- Shop ---
  'shop:itemPurchased': { item: { id: string; cost: number; effect: string; value: GachaPoolItemValue } };

  // --- VN Reader ---
  'vn:opened': { ssrId: string; storyIndex: number };
  'vn:closed': void;

  // --- Affection ---
  'affection:changed': { characterId: string; delta: number; source: string };
  'affection:levelUp': { characterId: string; newLevel: number; oldLevel: number };
  'affection:bossDefeated': { bossId: string; loopIndex: number };
  'affection:vnCompleted': { cgId: string; maleLeadId: string };
  'affection:giftGiven': { characterId: string; giftId: string; affectionGained: number };
  'affection:touchPerformed': { characterId: string; zoneId: string; affectionGained: number };
  'affection:coinsEarned': { amount: number; source: string };
  'affection:shopPurchased': { itemId: string; coinsSpent: number };
  'affection:shopEffect': { item: AffectionShopItem; effect: { type: string; value?: number; [key: string]: unknown } };

  // --- Locale ---
  'locale:changed': { locale: string };

  // --- Toast ---
  'toast:show': { message: string; type: 'info' | 'error' | 'sr' | 'ssr' };
}

// ============================================================
// Item effects config  (assets/data/item_effects.json)
// ============================================================

export interface LuckyCoinConfig {
  defaultCount: number;
  goldChance: number;
  goldAmount: number;
  diamondAmount: number;
}

export interface FragmentConfig {
  defaultCount: number;
  defaultGenLevel: number;
}

export interface EnergyItemConfig {
  defaultRecover: number;
}

export interface DoubleGenConfig {
  defaultTurns: number;
}

export interface ClearLevelConfig {
  targetLevels: number[];
  energyPerItem: number;
}

export interface RerollConfig {
  defaultCount: number;
}

export interface ItemEffectsConfig {
  luckyCoin: LuckyCoinConfig;
  fragment: FragmentConfig;
  energyItem: EnergyItemConfig;
  doubleGen: DoubleGenConfig;
  clearLv1: ClearLevelConfig;
  spaceClean: ClearLevelConfig;
  reroll: RerollConfig;
  toolItems: Record<string, string>;
}

// ============================================================
// Board economy config  (assets/data/board_economy.json)
// ============================================================

export interface BoardEconomyConfig {
  sellPriceBoost: number;
  luckyMergeChance: number;
  dailyGoldBoost: number;
  achievementTokenBonus: number;
  energyDiscountFreeChance: number;
  perfumeBoostChains: string[];
}

// ============================================================
// Boss progression config  (assets/data/boss_progression.json)
// ============================================================

export interface BossProgressionTierEntry {
  maxLoop: number | null;
  boost: number;
}

export interface TimedOrdersUpConfig {
  defaultTimeLimit: number;
  timeMultiplier: number;
}

export interface BossProgressionConfig {
  orderTierBoost: BossProgressionTierEntry[];
  maxItemTier: number;
  timedOrdersUp: TimedOrdersUpConfig;
}

// ============================================================
// Gacha simple config  (assets/data/gacha_config.json)
// ============================================================

export interface GachaSimpleConfig {
  tenPullCount: number;
  freePullMaxRarity: Rarity;
}

// ============================================================
// Affection config  (assets/data/affection_config.json)
// ============================================================

export interface AffectionLevelDef {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
}

export interface AffectionCharacterDef {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  avatar: string;
  background: string;
}

export interface AffectionSourcesConfig {
  bossDefeat: { base: number; perLoop: number };
  vnStorySR: number;
  vnStorySSR: number;
  touchBase: { min: number; max: number };
  dailyOrderBonus: number;
  specialEvent: { min: number; max: number };
}

export interface AffectionConfig {
  levels: AffectionLevelDef[];
  characters: AffectionCharacterDef[];
  bossToCharacter: Record<string, string>;
  sources: AffectionSourcesConfig;
  touchCooldown: number;
  dailyTouchBonus: { threshold: number; bonus: number };
  giftPreferenceMultipliers?: { loved: number; liked: number };
  affectionCoins: {
    earnRate: number;
    levelUpBonuses: Record<string, number>;
  };
}

// ============================================================
// Character profiles  (assets/data/character_profiles.json)
// ============================================================

export interface SensorySignature {
  smell: string;
  touch: string;
  sound: string;
  taste: string;
}

export interface CharacterGifts {
  loved: string[];
  liked: string[];
  normal: string[];
}

export interface CharacterProfile {
  name: string;
  nameEn: string;
  color: string;
  avatar: string;
  background: string;
  birthday: string;
  title: string;
  likes: string[];
  dislikes: string[];
  sensorySignature: SensorySignature;
  gifts: CharacterGifts;
}

// ============================================================
// Touch interactions config  (assets/data/touch_interactions.json)
// ============================================================

export interface TouchZone {
  id: string;
  name: string;
  icon: string;
  unlockLevel: number;
}

export interface TouchResponse {
  affection: number;
  dialogue?: string;
  animation?: string;
  zoneId: string;
}

export interface TouchInteractionsConfig {
  zones: TouchZone[];
  responses: Record<string, unknown>;
}

// ============================================================
// Ad config  (assets/data/ad_config.json)
// ============================================================

export interface AdTypeWithReward {
  reward: number;
  dailyLimit: number | null;
  cooldownMs: number;
  emoji: string;
}

export interface AdTypeDiamonds extends AdTypeWithReward {
  betaBenefit: boolean;
}

export interface AdTypeFreePull {
  dailyLimit: number | null;
  cooldownMs: number;
  maxRarity: string;
  emoji: string;
}

export interface AdConfig {
  energy: AdTypeWithReward;
  gold: AdTypeWithReward;
  diamonds: AdTypeDiamonds;
  freePull: AdTypeFreePull;
}

// ============================================================
// Daily buff config  (assets/data/daily_buff_config.json)
// ============================================================

export interface DailyBuffTypeConfig {
  id: string;
  icon: string;
  nameKey: string;
  descKey: string;
}

export interface DailyBuffConfig {
  buffDurationMs: number;
  buffTypes: DailyBuffTypeConfig[];
}

// ============================================================
// Loop multipliers config  (assets/data/loop_multipliers.json)
// ============================================================

export interface LoopMultiplierTable {
  table: number[];
  overflowBase?: number;
  overflowGrowth?: number;
  cap?: number;
  overflowValue?: number;
}

export interface MetaUpgradeConfig {
  baseCost: number;
  costScale: number;
  effectPerLevel: number;
  maxLevel: number;
}

export interface LoopMultipliersConfig {
  hpMultiplier: LoopMultiplierTable;
  rewardMultiplier: LoopMultiplierTable;
  timeMultiplier: LoopMultiplierTable;
  tokenReward: LoopMultiplierTable;
  startingGoldBase: number;
  metaUpgrades: Record<string, MetaUpgradeConfig>;
}

// ============================================================
// Loop summary  (used by LoopLogic.calculateLoopRewards)
// ============================================================

export interface LoopSummary {
  newDiscoveries: number;
  achievementsUnlocked: number;
}

// ============================================================
// Affection shop config  (assets/data/affection_shop.json)
// ============================================================

export interface AffectionShopCategory {
  id: string;
  name: string;
  icon: string;
}

export interface AffectionShopItem {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  price: number;
  unlockLevel: number;
  dailyLimit: number | null;
  characterId: string | null;
  effect: Record<string, unknown>;
  thankDialogue?: string;
  giftPreference?: string;
}

export interface AffectionShopConfig {
  categories: AffectionShopCategory[];
  items: AffectionShopItem[];
}

// ============================================================
// Daily order config  (settings.json → DAILY_ORDER_CONFIG)
// ============================================================

export interface DailyOrderConfig {
  MAX_ACTIVE: number;
  REFRESH_COST: number;
}
