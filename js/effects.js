// ============================================================
// effects.js — Animations & Particles
// ============================================================

const Effects = {
    // Merge pop: scale bounce + particles on grid cell
    mergePopAt(cellEl) {
        cellEl.classList.add('merge-pop');
        this.spawnParticles(cellEl, 8, '✨');
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
        heart.textContent = '💖';
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
        const emojis = ['🎉', '🥳', '💖', '✨', '🌟', '🎊'];
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
};
