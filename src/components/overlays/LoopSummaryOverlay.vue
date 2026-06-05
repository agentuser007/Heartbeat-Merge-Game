<!-- ============================================================
     LoopSummaryOverlay.vue — Loop Completion Summary Overlay
     Replaces #loop-summary-overlay from index.html lines 358-398
     ============================================================ -->
<template>
  <Transition name="fade">
    <div v-if="visible" id="loop-summary-overlay">
      <div class="loop-summary-card">
        <div class="summary-loop-num">
          {{ i18nStore.t('loop.loopComplete', { index: loopStore.loopIndex }) }}
        </div>
        <div class="summary-outro">{{ i18nStore.t('loop.congratsClear') }}</div>
        <div class="summary-tokens">
          {{ i18nStore.t('loop.tokensEarned', { count: rewards.loopTokens }) }}
        </div>
        <div class="summary-token-detail">
          {{ i18nStore.t('loop.tokenDetail', { base: rewards.baseTokens, bonus: rewards.bonusTokens }) }}
        </div>
        <div class="summary-token-balance">
          {{ i18nStore.t('loop.tokenBalance', { balance: loopStore.loopTokens }) }}
        </div>
        <div class="summary-shop-title">
          🏪 {{ i18nStore.t('loop.shopTitle') }}
        </div>
        <div class="meta-shop-list">
          <div
            v-for="upgrade in metaUpgradeItems"
            :key="upgrade.id"
            class="meta-shop-item"
            :class="{ 'meta-shop-item--maxed': upgrade.isMaxed, 'meta-shop-item--affordable': upgrade.canAfford && !upgrade.isMaxed }"
            @click="purchaseUpgrade(upgrade)"
          >
            <span class="meta-shop-item-name">{{ upgrade.name }}</span>
            <span class="meta-shop-item-cost">{{ upgrade.cost }} 🏫</span>
            <span class="meta-shop-item-level">Lv.{{ upgrade.level }}</span>
          </div>
        </div>
        <div class="summary-next">
          {{ i18nStore.t('loop.nextLoop', { index: loopStore.loopIndex + 1, title: nextLoopTitle, hp: loopStore.getHpMultiplier(loopStore.loopIndex + 1), reward: loopStore.getRewardMultiplier(loopStore.loopIndex + 1) }) }}
        </div>
        <button class="summary-next-btn" @click="nextLoop">
          {{ i18nStore.t('loop.nextBtn') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLoopStore, MetaUpgrade } from '../../stores/loopStore';
import { useI18nStore } from '../../stores/i18nStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useAchievementStore } from '../../stores/achievementStore';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'next-loop'): void;
}>();

const loopStore = useLoopStore();
const i18nStore = useI18nStore();
const collectionStore = useCollectionStore();
const achievementStore = useAchievementStore();

// --- Rewards data (set externally or computed) ---
const rewards = ref({
  loopTokens: 0,
  baseTokens: 0,
  bonusTokens: 0,
});

// --- Meta upgrade display items ---
interface MetaUpgradeItem {
  id: keyof MetaUpgrade;
  name: string;
  cost: number;
  level: number;
  isMaxed: boolean;
  canAfford: boolean;
}

const metaUpgradeItems = computed<MetaUpgradeItem[]>(() => {
  const upgradeDefs: Array<{ id: keyof MetaUpgrade; nameKey: string }> = [
    { id: 'startingGold', nameKey: 'loop.upgradeStartingGold' },
    { id: 'startingDiamonds', nameKey: 'loop.upgradeStartingDiamonds' },
    { id: 'startingEnergy', nameKey: 'loop.upgradeStartingEnergy' },
    { id: 'dailyBonus', nameKey: 'loop.upgradeDailyBonus' },
  ];

  return upgradeDefs.map((def) => {
    const level = loopStore.metaUpgrades[def.id] || 0;
    const cost = loopStore.getMetaUpgradeCost(def.id, level);
    const maxLevel = loopStore.getMetaUpgradeMaxLevel(def.id);
    return {
      id: def.id,
      name: i18nStore.t(def.nameKey),
      cost,
      level,
      isMaxed: level >= maxLevel,
      canAfford: loopStore.loopTokens >= cost,
    };
  });
});

// --- Next loop title ---
const nextLoopTitle = computed(() => {
  return loopStore.getLoopTitle(loopStore.loopIndex + 1);
});

// --- Compute rewards when overlay becomes visible ---
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      const calculated = loopStore.calculateLoopRewards(loopStore.loopIndex, {
        newDiscoveries: collectionStore.getNewDiscoveriesCountThisLoop(),
        achievementsUnlocked: achievementStore.getUnlockedCountThisLoop()
      });
      rewards.value = calculated;
    }
  },
);

// --- Actions ---
function purchaseUpgrade(upgrade: MetaUpgradeItem) {
  if (upgrade.isMaxed || !upgrade.canAfford) return;
  const success = loopStore.purchaseMetaUpgrade(upgrade.id);
  if (!success) {
    // Purchase failed — could show a toast in the future
    console.warn('[LoopSummaryOverlay] Purchase failed for', upgrade.id);
  }
}

function nextLoop() {
  emit('next-loop');
  emit('close');
}
</script>

<style scoped>
/* ===== Loop Summary Overlay ===== */
#loop-summary-overlay {
  position: fixed;
  inset: 0;
  z-index: 9800;
  background: rgba(0,0,0,0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  opacity: 1;
  pointer-events: auto;
}

.loop-summary-card {
  background: linear-gradient(145deg, #FFE1CC, #FFCCAC);
  border-radius: 20px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  text-align: center;
  border: 2px solid rgba(162,155,254,0.4);
  box-shadow: 0 0 40px rgba(108,92,231,0.3);
  animation: loopCardIn 0.5s ease-out;
}

.summary-loop-num {
  font-size: 20px;
  font-weight: 800;
  color: #a29bfe;
  margin-bottom: 8px;
  text-shadow: 0 0 10px rgba(162,155,254,0.5);
}

.summary-outro {
  font-size: 14px;
  color: #dfe6e9;
  margin-bottom: 16px;
  line-height: 1.5;
}

.summary-tokens {
  font-size: 18px;
  font-weight: 700;
  color: #ffeaa7;
  margin-bottom: 4px;
}

.summary-token-detail {
  font-size: 12px;
  color: #b2bec3;
  margin-bottom: 8px;
}

.summary-token-balance {
  font-size: 14px;
  font-weight: 600;
  color: #81ecec;
  margin-bottom: 16px;
  padding: 6px 12px;
  background: rgba(129,236,236,0.1);
  border-radius: 8px;
  display: inline-block;
}

.summary-shop-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffeaa7;
  margin: 12px 0 8px;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 12px;
}

.meta-shop-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 12px;
}

.meta-shop-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer;
  transition: border-color 0.2s, opacity 0.2s;
}

.meta-shop-item--maxed {
  opacity: 0.6;
  cursor: default;
  border-color: rgba(255,255,255,0.03);
}

.meta-shop-item--affordable {
  opacity: 1;
}

.meta-shop-item-name {
  flex: 1;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: #dfe6e9;
}

.meta-shop-item-cost {
  margin: 0 8px;
  font-size: 12px;
  color: #ffeaa7;
}

.meta-shop-item-level {
  font-size: 0.85rem;
  color: #81ecec;
}

.summary-next {
  font-size: 13px;
  color: #b2bec3;
  margin: 16px 0 12px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
}

.summary-next-btn {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #6c5ce7, #e17055);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(108,92,231,0.4);
}
.summary-next-btn:hover {
  filter: brightness(1.1);
  box-shadow: 0 6px 20px rgba(108,92,231,0.5);
}
.summary-next-btn:active {
  transform: scale(0.97);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
