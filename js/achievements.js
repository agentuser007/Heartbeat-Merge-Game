// ============================================================
// achievements.js — Achievement / Milestone System
// ============================================================

class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.unlocked = new Set(); // Achievements unlocked but reward NOT yet claimed
        this.completed = new Set(); // Achievements unlocked AND reward claimed
        this.newlyUnlocked = new Set(); // Achievements unlocked since last sheet open (for toast tracking)
        this.stats = {
            merges: 0,
            bossDefeats: 0,
            maxLevelItems: 0,
            totalGoldEarned: 0,
            recycled: 0,
            gachaPulls: 0,
            cellsUnlocked: 0,
            dailyCompleted: 0
        };

        this.panelEl = document.getElementById('achievement-sheet');
        this.listEl = document.getElementById('achievement-list');
        this.badgeEl = document.getElementById('achievement-badge');
    }

    openSheet() {
        if (this.panelEl) {
            this.panelEl.classList.add('open');
            this.newlyUnlocked.clear();
            this.updateBadge();
            this.renderAchievements();
        }
    }

    closeSheet() {
        if (this.panelEl) { this.panelEl.classList.remove('open'); }
    }

    // Increment a stat and check achievements
    increment(statName, amount = 1) {
        if (this.stats[statName] !== undefined) {
            this.stats[statName] += amount;
            this.checkAll();
        }
    }

    // Check all achievements
    checkAll() {
        if (!ACHIEVEMENT_DATA || !ACHIEVEMENT_DATA.length) return;

        for (const ach of ACHIEVEMENT_DATA) {
            // Skip if already unlocked (pending claim) or already completed (claimed)
            if (this.unlocked.has(ach.id) || this.completed.has(ach.id)) continue;

            let currentValue = 0;
            if (ach.condition === 'collectionPct') {
                currentValue = this.game.collection ? this.game.collection.getCompletionPercent() : 0;
            } else {
                currentValue = this.stats[ach.condition] || 0;
            }

            if (currentValue >= ach.target) {
                this.unlockAchievement(ach);
            }
        }
    }

    unlockAchievement(ach) {
        this.unlocked.add(ach.id);
        this.newlyUnlocked.add(ach.id);

        // Do NOT grant reward here — player must claim manually

        // Play task complete sound
        AudioManager.playSound('task_complete');

        // Show toast (notify unlock, prompt to claim)
        this.showAchievementToast(ach);

        // Update badge
        this.updateBadge();

        // Auto-save
        if (this.game.save) this.game.save.saveAll();
    }

    // Manually claim the reward for an unlocked achievement
    claimReward(achId) {
        if (!this.unlocked.has(achId)) return;

        const ach = ACHIEVEMENT_DATA.find(a => a.id === achId);
        if (!ach) return;

        // Move from unlocked → completed
        this.unlocked.delete(achId);
        this.completed.add(achId);

        // Grant reward
        if (ach.reward.gold) {
            this.game.currency.addGold(ach.reward.gold);
        }
        if (ach.reward.diamonds) {
            this.game.currency.addDiamonds(ach.reward.diamonds);
        }

        // Show claim feedback toast
        this.showClaimToast(ach);

        // Update badge
        this.updateBadge();

        // Re-render the list
        this.renderAchievements();

        // Auto-save
        if (this.game.save) this.game.save.saveAll();
    }

    showAchievementToast(ach) {
        const toast = document.createElement('div');
        toast.className = 'achievement-toast';

        let rewardText = '';
        if (ach.reward.gold) rewardText = `${I18n.emoji('coin')} +${ach.reward.gold}`;
        if (ach.reward.diamonds) rewardText = `${I18n.emoji('diamond')} +${ach.reward.diamonds}`;

        toast.innerHTML = `
            <div class="achievement-toast-icon">${ach.icon}</div>
            <div class="achievement-toast-info">
                <div class="achievement-toast-title">${I18n.t('achievement.unlocked')}</div>
                <div class="achievement-toast-name">${ach.name}</div>
                <div class="achievement-toast-reward">${rewardText}</div>
            </div>
        `;

        (document.getElementById('toast-root') || document.body).appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), I18n.config('timers.achievementToastFadeOut'));
        }, I18n.config('timers.achievementToastDisplay'));
    }

    showClaimToast(ach) {
        const toast = document.createElement('div');
        toast.className = 'achievement-toast';

        let rewardText = '';
        if (ach.reward.gold) rewardText = `${I18n.emoji('coin')} +${ach.reward.gold}`;
        if (ach.reward.diamonds) rewardText = `${I18n.emoji('diamond')} +${ach.reward.diamonds}`;

        toast.innerHTML = `
            <div class="achievement-toast-icon">${ach.icon}</div>
            <div class="achievement-toast-info">
                <div class="achievement-toast-title">${I18n.t('achievement.claimed')}</div>
                <div class="achievement-toast-name">${ach.name}</div>
                <div class="achievement-toast-reward">${rewardText}</div>
            </div>
        `;

        (document.getElementById('toast-root') || document.body).appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), I18n.config('timers.achievementToastFadeOut'));
        }, I18n.config('timers.achievementToastDisplay'));
    }

    updateBadge() {
        if (!this.badgeEl) return;
        const count = this.unlocked.size;
        if (count > 0) {
            this.badgeEl.textContent = count;
            this.badgeEl.style.display = 'flex';
        } else {
            this.badgeEl.style.display = 'none';
        }
    }

    renderAchievements() {
        if (!this.listEl || !ACHIEVEMENT_DATA) return;
        this.listEl.innerHTML = '';

        const completedCount = this.completed.size + this.unlocked.size;
        const totalCount = ACHIEVEMENT_DATA.length;

        // Progress header
        const progress = document.createElement('div');
        progress.className = 'achievement-progress';
        progress.innerHTML = `
            <div class="achievement-progress-bar">
                <div class="achievement-progress-fill" style="width: ${(completedCount / totalCount) * 100}%"></div>
            </div>
            <span>${completedCount} / ${totalCount}</span>
        `;
        this.listEl.appendChild(progress);

        // Render each achievement
        for (const ach of ACHIEVEMENT_DATA) {
            const isCompleted = this.completed.has(ach.id);
            const isUnlocked = this.unlocked.has(ach.id);
            const isClaimable = isUnlocked && !isCompleted;

            let currentValue = 0;

            if (ach.condition === 'collectionPct') {
                currentValue = this.game.collection ? this.game.collection.getCompletionPercent() : 0;
            } else {
                currentValue = this.stats[ach.condition] || 0;
            }

            const pct = isCompleted || isUnlocked ? 100 : Math.min(100, Math.round((currentValue / ach.target) * 100));

            const card = document.createElement('div');
            card.className = 'achievement-card' + (isCompleted ? ' completed' : '') + (isClaimable ? ' claimable' : '');

            let rewardText = '';
            if (ach.reward.gold) rewardText = `${I18n.emoji('coin')} ${ach.reward.gold}`;
            if (ach.reward.diamonds) rewardText = `${I18n.emoji('diamond')} ${ach.reward.diamonds}`;

            // Right side: claimable → claim button; completed → claimed label; else → reward preview
            let rightHtml = '';
            if (isClaimable) {
                rightHtml = `<button class="achievement-claim-btn" data-ach-id="${ach.id}">${I18n.t('achievement.claim')}</button>`;
            } else if (isCompleted) {
                rightHtml = `<div class="achievement-card-reward claimed">${I18n.t('achievement.claimed')}</div>`;
            } else {
                rightHtml = `<div class="achievement-card-reward">${rewardText}</div>`;
            }

            card.innerHTML = `
                <div class="achievement-card-icon">${(isCompleted || isClaimable) ? I18n.emoji('check') : ach.icon}</div>
                <div class="achievement-card-info">
                    <div class="achievement-card-name">${ach.name}</div>
                    <div class="achievement-card-desc">${ach.description}</div>
                    <div class="achievement-card-bar">
                        <div class="achievement-card-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
                ${rightHtml}
            `;

            // Bind claim button click
            if (isClaimable) {
                const claimBtn = card.querySelector('.achievement-claim-btn');
                if (claimBtn) {
                    claimBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.claimReward(ach.id);
                    });
                }
            }

            this.listEl.appendChild(card);
        }
    }
}