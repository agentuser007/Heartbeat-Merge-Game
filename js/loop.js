// ============================================================
// loop.js — Loop (New Game+) Logic System
// ============================================================
// Manages multi-loop progression: difficulty scaling, rewards,
// meta upgrades, and loop-to-loop transitions.
// ============================================================

class LoopLogic {
    constructor() {
        this.loopIndex = 1;           // Current loop number (1-based)
        this.loopTokens = 0;          // Permanent currency: 学园声望
        this.metaUpgrades = {         // Meta upgrade levels
            startingGold: 0,          // Each level: +50 starting gold
            startingDiamonds: 0,      // Each level: +5 starting diamonds
            startingEnergy: 0,        // Each level: +20 starting energy
            dailyBonus: 0             // Each level: +5% daily order reward
        };
        this.currentLoopConfig = null; // Current loop's configuration snapshot
        this.unlockedNarrativeFlags = []; // Narrative flags unlocked across loops
    }

    // ---- Loop Configuration ----

    /**
     * Build the configuration for a given loop index.
     * This is the "rule snapshot" that makes each loop feel different.
     */
    buildLoopConfig(loopIndex) {
        return {
            loopIndex,
            title: this.getLoopTitle(loopIndex),
            hpMultiplier: this.getHpMultiplier(loopIndex),
            rewardMultiplier: this.getRewardMultiplier(loopIndex),
            timeMultiplier: this.getTimeMultiplier(loopIndex),
            specialRules: this.getSpecialRules(loopIndex),
            narrativePackId: this.getNarrativePackId(loopIndex),
            loopTokenReward: this.getLoopTokenReward(loopIndex)
        };
    }

    /**
     * Apply a loop config as the current active configuration.
     */
    applyLoopConfig(config) {
        this.currentLoopConfig = config;
        this.loopIndex = config.loopIndex;
    }

    // ---- Difficulty Multipliers ----

    getHpMultiplier(loopIndex) {
        if (loopIndex <= 0) return 1.0;
        if (loopIndex <= 8) {
            const table = [0, 1.00, 1.20, 1.40, 1.65, 1.95, 2.30, 2.70, 3.15];
            return table[loopIndex];
        }
        return 3.15 * (1 + 0.16 * (loopIndex - 8));
    }

    getRewardMultiplier(loopIndex) {
        if (loopIndex <= 0) return 1.0;
        if (loopIndex <= 8) {
            const table = [0, 1.00, 1.10, 1.20, 1.30, 1.40, 1.55, 1.70, 1.85];
            return table[loopIndex];
        }
        return Math.min(3.0, 1.85 + 0.12 * (loopIndex - 8));
    }

    getTimeMultiplier(loopIndex) {
        if (loopIndex <= 0) return 1.0;
        if (loopIndex <= 8) {
            const table = [0, 1.00, 0.95, 0.90, 0.88, 0.85, 0.82, 0.80, 0.78];
            return table[loopIndex];
        }
        return 0.78;
    }

    getLoopTokenReward(loopIndex) {
        if (loopIndex <= 0) return 0;
        if (loopIndex <= 8) {
            const table = [0, 10, 15, 20, 25, 30, 36, 42, 50];
            return table[loopIndex];
        }
        return 50 + 5 * (loopIndex - 8);
    }

    // ---- Loop Meta Info ----

    getLoopTitle(loopIndex) {
        if (typeof LOOP_RULES !== 'undefined' && LOOP_RULES[String(loopIndex)]) {
            return LOOP_RULES[String(loopIndex)].title || I18n.t('loop.titleDefault', {index: loopIndex});
        }
        const titleKey = 'loop.title' + loopIndex;
        const title = I18n.t(titleKey);
        return (title !== titleKey) ? title : I18n.t('loop.titleDefault', {index: loopIndex});
    }

    getSpecialRules(loopIndex) {
        if (typeof LOOP_RULES !== 'undefined' && LOOP_RULES[String(loopIndex)]) {
            return LOOP_RULES[String(loopIndex)].specialRules || [];
        }
        return [];
    }

    getNarrativePackId(loopIndex) {
        return `loop_${loopIndex}`;
    }

    // ---- Loop Completion & Rewards ----

    /**
     * Calculate rewards for completing a loop.
     * @param {object} summary - Run summary data (bosses defeated, orders completed, etc.)
     * @returns {object} Reward breakdown
     */
    calculateLoopRewards(loopIndex, summary) {
        const baseReward = this.getLoopTokenReward(loopIndex);
        let bonusTokens = 0;

        // Collection incremental bonus: +1 token per new item discovered this loop
        if (summary && summary.newDiscoveries) {
            bonusTokens += summary.newDiscoveries;
        }

        // Achievement bonus
        if (summary && summary.achievementsUnlocked) {
            bonusTokens += summary.achievementsUnlocked * 2;
        }

        return {
            loopTokens: baseReward + bonusTokens,
            baseTokens: baseReward,
            bonusTokens
        };
    }

    // ---- Meta Upgrades (学园声望 Shop) ----

    getMetaUpgradeCost(upgradeId, currentLevel) {
        const baseCosts = {
            startingGold: 10,
            startingDiamonds: 20,
            startingEnergy: 15,
            dailyBonus: 25
        };
        const base = baseCosts[upgradeId] || 10;
        return base + currentLevel * Math.ceil(base * 0.8); // Scaling cost
    }

    getMetaUpgradeEffect(upgradeId, level) {
        switch (upgradeId) {
            case 'startingGold': return level * 50;
            case 'startingDiamonds': return level * 5;
            case 'startingEnergy': return level * 20;
            case 'dailyBonus': return level * 0.05;
            default: return 0;
        }
    }

    getMetaUpgradeMaxLevel(upgradeId) {
        const maxLevels = {
            startingGold: 10,
            startingDiamonds: 5,
            startingEnergy: 8,
            dailyBonus: 10
        };
        return maxLevels[upgradeId] || 10;
    }

    getMetaUpgradeName(upgradeId) {
        const keyMap = {
            startingGold: 'loop.upgradeStartingGold',
            startingDiamonds: 'loop.upgradeStartingDiamonds',
            startingEnergy: 'loop.upgradeStartingEnergy',
            dailyBonus: 'loop.upgradeDailyBonus'
        };
        return keyMap[upgradeId] ? I18n.t(keyMap[upgradeId]) : upgradeId;
    }

    getMetaUpgradeDesc(upgradeId) {
        const keyMap = {
            startingGold: 'loop.upgradeDescStartingGold',
            startingDiamonds: 'loop.upgradeDescStartingDiamonds',
            startingEnergy: 'loop.upgradeDescStartingEnergy',
            dailyBonus: 'loop.upgradeDescDailyBonus'
        };
        return keyMap[upgradeId] ? I18n.t(keyMap[upgradeId]) : '';
    }

    getMetaUpgradeIcon(upgradeId) {
        const icons = {
            startingGold: '',
            startingDiamonds: '',
            startingEnergy: '',
            dailyBonus: ''
        };
        return icons[upgradeId] || '';
    }

    /**
     * Purchase a meta upgrade. Returns true if successful.
     */
    purchaseMetaUpgrade(upgradeId) {
        const currentLevel = this.metaUpgrades[upgradeId] || 0;
        const maxLevel = this.getMetaUpgradeMaxLevel(upgradeId);
        if (currentLevel >= maxLevel) return false;

        const cost = this.getMetaUpgradeCost(upgradeId, currentLevel);
        if (this.loopTokens < cost) return false;

        this.loopTokens -= cost;
        this.metaUpgrades[upgradeId] = currentLevel + 1;
        return true;
    }

    // ---- Starting Resources for New Loop ----

    getStartingGold() {
        return (this.currentLoopConfig ? this.currentLoopConfig.rewardMultiplier : 1.0) *
               (GAME_CONFIG.STARTING_GOLD || 0) +
               this.getMetaUpgradeEffect('startingGold', this.metaUpgrades.startingGold || 0);
    }

    getStartingDiamonds() {
        return this.getMetaUpgradeEffect('startingDiamonds', this.metaUpgrades.startingDiamonds || 0);
    }

    getStartingEnergyBonus() {
        return this.getMetaUpgradeEffect('startingEnergy', this.metaUpgrades.startingEnergy || 0);
    }

    getDailyBonusMultiplier() {
        return 1.0 + this.getMetaUpgradeEffect('dailyBonus', this.metaUpgrades.dailyBonus || 0);
    }

    // ---- Narrative Flags ----

    unlockNarrativeFlag(flag) {
        if (!this.unlockedNarrativeFlags.includes(flag)) {
            this.unlockedNarrativeFlags.push(flag);
        }
    }

    hasNarrativeFlag(flag) {
        return this.unlockedNarrativeFlags.includes(flag);
    }

    // ---- Serialization ----

    serialize() {
        return {
            loopIndex: this.loopIndex,
            loopTokens: this.loopTokens,
            metaUpgrades: { ...this.metaUpgrades },
            currentLoopConfig: this.currentLoopConfig ? { ...this.currentLoopConfig } : null,
            unlockedNarrativeFlags: [...this.unlockedNarrativeFlags]
        };
    }

    deserialize(data) {
        if (!data) return;
        this.loopIndex = data.loopIndex || 1;
        this.loopTokens = data.loopTokens || 0;
        this.metaUpgrades = data.metaUpgrades || {
            startingGold: 0, startingDiamonds: 0, startingEnergy: 0, dailyBonus: 0
        };
        this.currentLoopConfig = data.currentLoopConfig || null;
        this.unlockedNarrativeFlags = data.unlockedNarrativeFlags || [];
    }
}