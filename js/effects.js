// ============================================================
// effects.js — Animations & Particles
// ============================================================

const Effects = {
    // Toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'daily-toast';
        toast.textContent = message;
        if (type === 'ssr') { toast.style.background = 'linear-gradient(135deg, rgba(241,196,15,0.9), rgba(255,87,34,0.9))'; AudioManager.playSound('pop'); }
        else if (type === 'sr') { toast.style.background = 'linear-gradient(135deg, rgba(155,89,182,0.9), rgba(142,68,173,0.9))'; AudioManager.playSound('pop'); }
        else toast.style.background = 'rgba(0,0,0,0.8)';
        (document.getElementById('toast-root') || document.body).appendChild(toast);
        requestAnimationFrame(() => { toast.classList.add('show'); });
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    // Merge pop: scale bounce + particles on grid cell
    mergePopAt(cellEl) {
        cellEl.classList.add('merge-pop');
        this.spawnParticles(cellEl, 8, I18n.emoji('sparkle'));
        setTimeout(() => cellEl.classList.remove('merge-pop'), 500);
    },

    // Spawn floating particles around an element
    spawnParticles(anchorEl, count, emoji) {
        const rect = anchorEl.getBoundingClientRect();
        const container = document.getElementById('particle-layer');
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.textContent = emoji;
            const angle = (Math.PI * 2 * i) / count;
            const dist = 30 + Math.random() * 30;
            p.style.left = (rect.left + rect.width / 2) + 'px';
            p.style.top = (rect.top + rect.height / 2) + 'px';
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            container.appendChild(p);
            setTimeout(() => p.remove(), 700);
        }
    },

    // Heart projectile from source to boss portrait
    heartFlyTo(sourceEl) {
        const container = document.getElementById('particle-layer');
        const srcRect = sourceEl.getBoundingClientRect();
        const bossEl = document.getElementById('boss-portrait');
        const tgtRect = bossEl.getBoundingClientRect();

        const heart = document.createElement('div');
        heart.className = 'heart-projectile';
        heart.textContent = I18n.emoji('heart');
        heart.style.left = srcRect.left + srcRect.width / 2 + 'px';
        heart.style.top = srcRect.top + 'px';

        const dx = (tgtRect.left + tgtRect.width / 2) - (srcRect.left + srcRect.width / 2);
        const dy = (tgtRect.top + tgtRect.height / 2) - (srcRect.top);
        heart.style.setProperty('--fly-x', dx + 'px');
        heart.style.setProperty('--fly-y', dy + 'px');

        container.appendChild(heart);
        setTimeout(() => {
            heart.remove();
            Effects.bossHit();
        }, 600);
    },

    // Boss shake + blush
    bossHit() {
        const bossEl = document.getElementById('boss-portrait');
        bossEl.classList.add('boss-shake');
        // Show blush
        const blush = document.getElementById('boss-blush');
        if (blush) blush.style.opacity = '1';
        setTimeout(() => {
            bossEl.classList.remove('boss-shake');
            if (blush) blush.style.opacity = '0';
        }, 600);
    },

    // M-3: Damage popup on boss portrait (Figma spec: rgba(0,0,0,0.62) r:6, white text)
    showDamagePopup(damage, diamondReward) {
        const bossEl = document.getElementById('boss-portrait');
        if (!bossEl) return;
        const container = document.getElementById('particle-layer');
        const rect = bossEl.getBoundingClientRect();

        const popup = document.createElement('div');
        popup.className = 'damage-popup';
        let html = `<span class="damage-number">-${damage}</span>`;
        if (diamondReward > 0) {
            html += `<span class="damage-reward">💎 +${diamondReward}</span>`;
        }
        popup.innerHTML = html;
        popup.style.left = (rect.left + rect.width / 2) + 'px';
        popup.style.top = (rect.top + rect.height / 2) + 'px';

        container.appendChild(popup);
        setTimeout(() => { if (popup.parentNode) popup.remove(); }, 1500);
    },

    // Timer warning flash
    startTimerWarning(orderEl) {
        orderEl.classList.add('timer-warning');
    },
    stopTimerWarning(orderEl) {
        orderEl.classList.remove('timer-warning');
    },

    // Spawn celebration
    celebrate() {
        const container = document.getElementById('particle-layer');
        const emojis = I18n.t('effects.celebrateEmojis').split(',');
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = 'celebrate-particle';
                p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                p.style.left = Math.random() * window.innerWidth + 'px';
                p.style.top = '-30px';
                p.style.setProperty('--fall-x', (Math.random() - 0.5) * 200 + 'px');
                container.appendChild(p);
                setTimeout(() => p.remove(), 2000);
            }, i * 80);
        }
    },

    // Level transition flash
    levelTransition(callback) {
        const overlay = document.getElementById('transition-overlay');
        overlay.classList.add('active');
        setTimeout(() => {
            if (callback) callback();
            setTimeout(() => overlay.classList.remove('active'), 500);
        }, 500);
    },

    // Item spawn pop
    spawnPop(cellEl) {
        cellEl.classList.add('spawn-pop');
        setTimeout(() => cellEl.classList.remove('spawn-pop'), 400);
    },

    // Chain tooltip: show full merge chain for an item
    showChainTooltip(anchorEl, itemId) {
        // Remove existing tooltip
        const existing = document.querySelector('.chain-tooltip');
        if (existing) existing.remove();

        const item = ITEMS[itemId];
        if (!item) return;

        // Find the chain start by walking backwards
        const chain = item.chain;
        let startItem = item;
        // Find root: look for items in same chain where no other item's nextId points to them
        for (const key in ITEMS) {
            if (ITEMS[key].chain === chain) {
                // Check if any item points to this one as next
                let isRoot = true;
                for (const k2 in ITEMS) {
                    if (ITEMS[k2].chain === chain && ITEMS[k2].nextId === ITEMS[key].id) {
                        isRoot = false;
                        break;
                    }
                }
                if (isRoot && ITEMS[key].level < startItem.level) {
                    startItem = ITEMS[key];
                }
            }
        }

        // Build chain from start to end
        const chainItems = [];
        let current = startItem;
        while (current) {
            chainItems.push(current);
            if (current.nextId && ITEMS[current.nextId]) {
                current = ITEMS[current.nextId];
            } else {
                break;
            }
        }

        // Build tooltip HTML
        const tooltip = document.createElement('div');
        tooltip.className = 'chain-tooltip';

        chainItems.forEach((ci, idx) => {
            const step = document.createElement('div');
            step.className = 'chain-step' + (ci.id === itemId ? ' chain-step-target' : '');
            step.innerHTML = `<span class="chain-step-emoji">${ci.emoji}</span><span class="chain-step-name">${ci.name}</span>`;
            tooltip.appendChild(step);
            if (idx < chainItems.length - 1) {
                const arrow = document.createElement('span');
                arrow.className = 'chain-arrow';
                arrow.textContent = '→';
                tooltip.appendChild(arrow);
            }
        });

        // Position near anchor
        const rect = anchorEl.getBoundingClientRect();
        const container = document.getElementById('game-container');
        const containerRect = container.getBoundingClientRect();
        tooltip.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.bottom - containerRect.top + 6) + 'px';

        container.appendChild(tooltip);

        // Close on click outside
        const closeHandler = (e) => {
            if (!tooltip.contains(e.target) && e.target !== anchorEl) {
                tooltip.remove();
                document.removeEventListener('click', closeHandler);
                document.removeEventListener('touchstart', closeHandler);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
            document.addEventListener('touchstart', closeHandler);
        }, 50);
    },

    // ---- Audio Mute/Unmute (for SDK ad integration) ----

    _audioMuted: false,

    muteAudio() {
        if (this._audioMuted) return;
        this._audioMuted = true;
        // Sync with AudioManager
        if (typeof AudioManager !== 'undefined') AudioManager.mute();
        // Mute any game audio. If using AudioContext, store reference in window._gameAudioContext
        if (window._gameAudioContext && window._gameAudioContext.state === 'running') {
            window._gameAudioContext.suspend();
        }
        // Mute any <audio> or <video> elements
        document.querySelectorAll('audio, video').forEach(el => {
            el._savedVolume = el.volume;
            el.volume = 0;
        });
    },

    unmuteAudio() {
        if (!this._audioMuted) return;
        this._audioMuted = false;
        // Sync with AudioManager
        if (typeof AudioManager !== 'undefined') AudioManager.unmute();
        // Resume AudioContext
        if (window._gameAudioContext && window._gameAudioContext.state === 'suspended') {
            window._gameAudioContext.resume();
        }
        // Restore audio/video volume
        document.querySelectorAll('audio, video').forEach(el => {
            if (el._savedVolume !== undefined) {
                el.volume = el._savedVolume;
                delete el._savedVolume;
            } else {
                el.volume = 1;
            }
        });
    },

    // Energy recycle: fly energy text from cell to energy bar
    energyRecycle(cellEl, amount) {
        const container = document.getElementById('particle-layer');
        const srcRect = cellEl.getBoundingClientRect();
        const energyBar = document.getElementById('energy-bar');
        const tgtRect = energyBar.getBoundingClientRect();

        // Poof particles
        this.spawnParticles(cellEl, 5, I18n.emoji('energy'));

        // Flying energy text
        const flyEl = document.createElement('div');
        flyEl.className = 'energy-fly';
        flyEl.textContent = `+${amount}${I18n.emoji('energy')}`;
        flyEl.style.left = (srcRect.left + srcRect.width / 2) + 'px';
        flyEl.style.top = (srcRect.top + srcRect.height / 2) + 'px';

        const dx = (tgtRect.left + tgtRect.width / 2) - (srcRect.left + srcRect.width / 2);
        const dy = (tgtRect.top + tgtRect.height / 2) - (srcRect.top + srcRect.height / 2);
        flyEl.style.setProperty('--fly-x', dx + 'px');
        flyEl.style.setProperty('--fly-y', dy + 'px');

        container.appendChild(flyEl);

        setTimeout(() => {
            flyEl.remove();
            // Flash the energy bar
            energyBar.classList.add('energy-pulse');
            setTimeout(() => energyBar.classList.remove('energy-pulse'), 400);
        }, 600);
    },
};
