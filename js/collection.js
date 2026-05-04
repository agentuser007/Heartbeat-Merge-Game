// ============================================================
// collection.js — Item Collection Album (图鉴) + Gacha Card Album + Fragment Tab
// ============================================================

class CollectionSystem {
    constructor(game) {
        this.game = game;
        this.discovered = new Set(); // Set of itemIds discovered
        this.gachaCollected = new Set(); // Set of gacha card IDs collected
        this.panelEl = document.getElementById('collection-sheet');
        this.listEl = document.getElementById('collection-list');
        this.pctEl = document.getElementById('collection-pct');
        this.gachaListEl = document.getElementById('gacha-collection-list');
        this.fragmentListEl = document.getElementById('fragment-collection-list');
        this.activeTab = 'items'; // 'items', 'gacha', or 'fragments'

        // Setup tab switching
        this.setupTabs();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.collection-tab');
        tabs.forEach(tab => {
            // Use both click and touchend for mobile compatibility
            const handler = (e) => {
                e.stopPropagation();
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                this.switchTab();
            };
            tab.addEventListener('click', handler);
            tab.addEventListener('touchend', handler, { passive: false });
        });
    }

    switchTab(tabName) {
        if (tabName) {
            this.activeTab = tabName;
            document.querySelectorAll('.collection-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tabName);
            });
        }
        const itemList = document.getElementById('collection-list');
        const gachaList = document.getElementById('gacha-collection-list');
        const fragmentList = document.getElementById('fragment-collection-list');

        itemList.style.display = 'none';
        gachaList.style.display = 'none';
        fragmentList.style.display = 'none';

        if (this.activeTab === 'items') {
            itemList.style.display = '';
            this.renderCollection();
        } else if (this.activeTab === 'gacha') {
            gachaList.style.display = '';
            this.renderGachaCollection();
        } else if (this.activeTab === 'fragments') {
            fragmentList.style.display = '';
            this.renderFragmentCollection();
        }

        this.updatePctText();
    }

    updatePctText() {
        if (!this.pctEl) return;
        if (this.activeTab === 'items') {
            const pct = this.getCompletionPercent();
            this.pctEl.textContent = `${this.discovered.size}/${Object.keys(ITEMS).length} (${pct}%)`;
        } else if (this.activeTab === 'gacha') {
            const total = GACHA_POOL_V2 ? GACHA_POOL_V2.length : 0;
            const pct = total > 0 ? Math.round((this.gachaCollected.size / total) * 100) : 0;
            this.pctEl.textContent = I18n.t('collection.gachaCardPct', {collected: this.gachaCollected.size, total: total, pct: pct});
        } else if (this.activeTab === 'fragments') {
            const ssrCards = GACHA_POOL_V2 ? GACHA_POOL_V2.filter(c => c.rarity === 'SSR') : [];
            const collected = ssrCards.filter(c => this.gachaCollected.has(c.id)).length;
            this.pctEl.textContent = I18n.t('collectionSSRFragments', {collected, total: ssrCards.length});
        }
    }

    // Open collection bottom sheet (called from nav bar)
    openSheet() {
        if (this.panelEl) {
            this.panelEl.classList.add('open');
            if (this.activeTab === 'items') {
                this.renderCollection();
            } else if (this.activeTab === 'gacha') {
                this.renderGachaCollection();
            } else if (this.activeTab === 'fragments') {
                this.renderFragmentCollection();
            }
            this.updatePctText();
        }
    }

    closeSheet() {
        if (this.panelEl) {
            this.panelEl.classList.remove('open');
        }
    }

    // Call this whenever an item appears on the board
    discoverItem(itemId) {
        if (!this.discovered.has(itemId)) {
            this.discovered.add(itemId);

            // First-time highest level (Lv8) item discovery: reward 100 diamonds
            const itemData = ITEMS[itemId];
            if (itemData && itemData.level >= 8 && !itemData.nextId) {
                if (this.game.currency) {
                    this.game.currency.addDiamonds(100);
                    const fx = this.game.effects;
                    if (fx) fx.showToast(I18n.t('collectionFirstUltimate'), 'ssr');
                }
            }

            // Check achievements
            if (this.game.achievements) {
                this.game.achievements.checkAll();
            }
            return true; // new discovery
        }
        return false;
    }

    // Call this whenever a gacha card is obtained
    discoverGachaCard(cardId) {
        if (!this.gachaCollected.has(cardId)) {
            this.gachaCollected.add(cardId);
            return true; // new discovery
        }
        return false;
    }

    getCompletionPercent() {
        const totalItems = Object.keys(ITEMS).length;
        if (totalItems === 0) return 0;
        return Math.round((this.discovered.size / totalItems) * 100);
    }

    getGachaCompletionPercent() {
        const total = GACHA_POOL_V2 ? GACHA_POOL_V2.length : 0;
        if (total === 0) return 0;
        return Math.round((this.gachaCollected.size / total) * 100);
    }

    // Group items by chain for display
    getChainGroups() {
        const chains = {};
        for (const [id, item] of Object.entries(ITEMS)) {
            if (!chains[item.chain]) {
                chains[item.chain] = [];
            }
            chains[item.chain].push({ ...item, id, discovered: this.discovered.has(id) });
        }
        // Sort each chain by level
        for (const chain of Object.values(chains)) {
            chain.sort((a, b) => a.level - b.level);
        }
        return chains;
    }

    renderCollection() {
        if (!this.listEl) return;
        this.listEl.innerHTML = '';

        const pct = this.getCompletionPercent();
        if (this.pctEl) {
            this.pctEl.textContent = `${this.discovered.size}/${Object.keys(ITEMS).length} (${pct}%)`;
        }

        const chains = this.getChainGroups();
        const chainNames = {
            lips: I18n.emoji('lips') + ' ' + I18n.t('collection.chainLips'),
            perfume: I18n.emoji('perfume') + ' ' + I18n.t('collection.chainPerfume'),
            study: I18n.emoji('study') + ' ' + I18n.t('collection.chainStudy'),
            food: I18n.emoji('food') + ' ' + I18n.t('collection.chainFood'),
            gen_makeup: I18n.t('collectionGenMakeup'),
            gen_study: I18n.t('collection.genStudy')
        };

        for (const [chainId, items] of Object.entries(chains)) {
            const section = document.createElement('div');
            section.className = 'collection-chain';

            const header = document.createElement('div');
            header.className = 'collection-chain-header';
            const discoveredInChain = items.filter(i => i.discovered).length;
            header.innerHTML = `
                <span>${chainNames[chainId] || chainId}</span>
                <span class="collection-chain-count">${discoveredInChain}/${items.length}</span>
            `;

            const grid = document.createElement('div');
            grid.className = 'collection-grid';

            for (const item of items) {
                const cell = document.createElement('div');
                cell.className = 'collection-item' + (item.discovered ? ' discovered' : '');

                if (item.discovered) {
                    cell.innerHTML = `
                        <div class="collection-emoji">${item.emoji}</div>
                        <div class="collection-name">${item.name}</div>
                        <div class="collection-level">Lv.${item.level}</div>
                    `;
                    cell.style.borderColor = item.color;
                } else {
                    cell.innerHTML = `
                        <div class="collection-emoji">${I18n.emoji('question')}</div>
                        <div class="collection-name">???</div>
                        <div class="collection-level">Lv.${item.level}</div>
                    `;
                }

                grid.appendChild(cell);
            }

            section.appendChild(header);
            section.appendChild(grid);
            this.listEl.appendChild(section);
        }
    }

    // ---- SSR Fragment Collection Rendering ----
    renderFragmentCollection() {
        if (!this.fragmentListEl) {
            this.fragmentListEl = document.getElementById('fragment-collection-list');
        }
        if (!this.fragmentListEl) return;
        this.fragmentListEl.innerHTML = '';

        const ssrCards = GACHA_POOL_V2 ? GACHA_POOL_V2.filter(c => c.rarity === 'SSR') : [];
        if (ssrCards.length === 0) {
            this.fragmentListEl.innerHTML = '<div class="fragment-empty">' + I18n.t('collection.noFragmentData') + '</div>';
            return;
        }

        const cgAlbum = this.game.cgAlbum;
        var self = this;

        var header = document.createElement('div');
        header.className = 'fragment-section-header';
        header.innerHTML = '<span style="color:#f1c40f;font-weight:700;">' + I18n.t('collection.ssrMemoryFragments') + '</span>' +
            '<span class="fragment-section-sub">' + I18n.t('collection.ssrMemorySub') + '</span>';
        this.fragmentListEl.appendChild(header);

        var grid = document.createElement('div');
        grid.className = 'fragment-grid';

        for (var ci = 0; ci < ssrCards.length; ci++) {
            var card = ssrCards[ci];
            var isCollected = this.gachaCollected.has(card.id);
            var cgStory = CG_STORIES[card.id];
            var cgId = cgStory ? cgStory.cgId : null;
            var cell = document.createElement('div');
            cell.className = 'fragment-card' + (isCollected ? ' collected' : ' locked');

            if (isCollected && cgStory && cgId) {
                var memFrag = cgAlbum && cgAlbum.cgData[cgId] ? (cgAlbum.cgData[cgId].memoryFragments || 0) : 0;
                var unlockedStories = cgAlbum && cgAlbum.cgData[cgId] ? (cgAlbum.cgData[cgId].unlocked || []) : [];
                var totalStories = cgStory.stories.length;
                var unlockedCount = unlockedStories.length;
                var canUnlock = memFrag >= FRAGMENT_TO_STORY && unlockedCount < totalStories;
                var pctVal = Math.min(100, (memFrag / FRAGMENT_TO_STORY) * 100);

                var dotsHtml = '<div class="fragment-story-dots">';
                for (var si = 0; si < totalStories; si++) {
                    var isUnlocked = unlockedStories.indexOf(si) !== -1;
                    dotsHtml += '<span class="frag-dot ' + (isUnlocked ? 'frag-dot-on' : 'frag-dot-off') + '">' + (isUnlocked ? '●' : '○') + '</span>';
                }
                dotsHtml += '</div>';

                cell.innerHTML =
                    '<div class="fragment-card-icon">' + card.icon + '</div>' +
                    '<div class="fragment-card-title">' + card.name + '</div>' +
                    '<div class="fragment-card-lead">' + cgStory.maleLead + ' · ' + cgStory.title + '</div>' +
                    dotsHtml +
                    '<div class="fragment-progress-bar"><div class="fragment-progress-fill" style="width:' + pctVal + '%"></div></div>' +
                    '<div class="fragment-progress-text">' + I18n.t('cgMemoryFragments', {current: memFrag, max: FRAGMENT_TO_STORY}) + '</div>' +
                    (canUnlock ?
                        '<button class="fragment-unlock-btn" data-cgid="' + cgId + '">' + I18n.t('cgUnlockNext') + '</button>' :
                        (unlockedCount >= totalStories ?
                            '<div class="fragment-complete-badge">' + I18n.t('cgAllUnlocked') + '</div>' :
                            '<div class="fragment-hint-text">' + I18n.t('cgDupSSRHint') + '</div>'
                        )
                    );
                cell.style.borderColor = '#f1c40f';
                cell.style.boxShadow = '0 0 12px rgba(241,196,15,0.2)';
            } else if (isCollected) {
                cell.innerHTML =
                    '<div class="fragment-card-icon">' + card.icon + '</div>' +
                    '<div class="fragment-card-title">' + card.name + '</div>' +
                    '<div class="fragment-card-lead">' + I18n.t('collection.noMemoryData') + '</div>';
                cell.style.borderColor = '#f1c40f';
            } else {
                cell.innerHTML =
                    '<div class="fragment-card-icon">❓</div>' +
                    '<div class="fragment-card-title">???</div>' +
                    '<div class="fragment-card-lead">' + I18n.t('collection.notObtained') + '</div>';
            }

            grid.appendChild(cell);
        }

        this.fragmentListEl.appendChild(grid);

        // Bind unlock buttons
        this.fragmentListEl.querySelectorAll('.fragment-unlock-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var cgId = btn.dataset.cgid;
                if (cgAlbum) {
                    var unlocked = cgAlbum.tryUnlockNext(cgId);
                    if (unlocked) {
                        self.renderFragmentCollection();
                    }
                }
            });
        });
    }

    // ---- Gacha Card Collection Rendering ----
    renderGachaCollection() {
        if (!this.gachaListEl) return;
        this.gachaListEl.innerHTML = '';

        const total = GACHA_POOL_V2 ? GACHA_POOL_V2.length : 0;
        const pct = this.getGachaCompletionPercent();
        if (this.pctEl) {
            this.pctEl.textContent = I18n.t('collection.gachaCardPct', {collected: this.gachaCollected.size, total: total, pct: pct});
        }

        if (!GACHA_POOL_V2 || GACHA_POOL_V2.length === 0) {
            this.gachaListEl.innerHTML = '<div class="gacha-collection-empty">' + I18n.t('collection.noGachaData') + '</div>';
            return;
        }

        // Group by rarity: SSR → SR → R
        const rarityOrder = ['SSR', 'SR', 'R'];
        const rarityLabels = { SSR: I18n.t('collection.raritySSR'), SR: I18n.t('collection.raritySR'), R: I18n.t('collection.rarityR') };
        const rarityColors = {
            SSR: GACHA_RARITY_CONFIG.SSR.color,
            SR: GACHA_RARITY_CONFIG.SR.color,
            R: GACHA_RARITY_CONFIG.R.color
        };

        for (const rarity of rarityOrder) {
            const pool = GACHA_POOL_V2.filter(i => i.rarity === rarity);
            if (pool.length === 0) continue;
            const collected = pool.filter(i => this.gachaCollected.has(i.id)).length;
            const section = document.createElement('div');
            section.className = 'collection-chain gacha-collection-section';
            const header = document.createElement('div');
            header.className = 'collection-chain-header gacha-collection-header';
            header.innerHTML = '<span style="color:' + rarityColors[rarity] + ';font-weight:700;">' + rarityLabels[rarity] + '</span><span class="collection-chain-count" style="color:' + rarityColors[rarity] + '">' + collected + '/' + pool.length + '</span>';
            const grid = document.createElement('div');
            grid.className = 'gacha-collection-grid';
            for (const card of pool) {
                const isCollected = this.gachaCollected.has(card.id);
                const cell = document.createElement('div');
                cell.className = 'gacha-collection-card' + (isCollected ? ' collected' : '') + ' rarity-' + rarity.toLowerCase();
                cell.dataset.cardId = card.id;
                if (isCollected) {
                    cell.innerHTML = '<div class="gacha-card-icon">' + card.icon + '</div><div class="gacha-collection-card-name">' + card.name + '</div><div class="gacha-collection-card-rarity" style="color:' + rarityColors[rarity] + '">' + rarity + '</div>';
                    cell.style.borderColor = rarityColors[rarity];
                    if (rarity === 'SSR') cell.style.boxShadow = GACHA_RARITY_CONFIG.SSR.glow;
                    else if (rarity === 'SR') cell.style.boxShadow = GACHA_RARITY_CONFIG.SR.glow;
                } else {
                    cell.innerHTML = '<div class="gacha-card-icon">' + I18n.emoji('question') + '</div><div class="gacha-collection-card-name">???</div><div class="gacha-collection-card-rarity" style="color:' + rarityColors[rarity] + '">' + rarity + '</div>';
                }
                grid.appendChild(cell);
            }
            section.appendChild(header);
            section.appendChild(grid);
            this.gachaListEl.appendChild(section);
        }

        var self = this;
        this.gachaListEl.querySelectorAll('.gacha-collection-card.collected').forEach(function(cell) {
            cell.style.cursor = 'pointer';
            var handler = function(e) {
                e.stopPropagation(); e.preventDefault();
                var cardId = cell.dataset.cardId;
                var card = GACHA_POOL_V2.find(function(c) { return c.id === cardId; });
                if (card) self.showCardDetail(card);
            };
            cell.addEventListener('click', handler);
            cell.addEventListener('touchend', handler, { passive: false });
        });
    }

    showCardDetail(card) {
        const rarityColors = { SSR: GACHA_RARITY_CONFIG.SSR.color, SR: GACHA_RARITY_CONFIG.SR.color, R: GACHA_RARITY_CONFIG.R.color };
        const rarityLabels = { SSR: I18n.t('collection.raritySSR'), SR: I18n.t('collection.raritySR'), R: I18n.t('collection.rarityR') };
        const color = rarityColors[card.rarity] || '#999';
        const effectLabels = { 'spawn_board_item': I18n.t('collection.effectSpawnBoardItem'), 'place_generator': I18n.t('collection.effectPlaceGenerator'), 'ssr_generator': I18n.t('collection.effectSsrGenerator'), 'add_joker': I18n.t('collection.effectAddJoker'), 'add_scissor': I18n.t('collection.effectAddScissor'), 'add_energy_item': I18n.t('collection.effectAddEnergyItem') };
        const effectDesc = effectLabels[card.effect] || card.effect;
        let detailHTML = '<div class="gacha-card-detail-card"><div class="gacha-card-detail-close" data-action="close">✕</div><div class="gacha-card-detail-icon">' + card.icon + '</div><div class="gacha-card-detail-name" style="color:' + color + '">' + card.name + '</div><div class="gacha-card-detail-rarity" style="color:' + color + '">' + (rarityLabels[card.rarity] || card.rarity) + '</div><div class="gacha-card-detail-effect">✨ ' + effectDesc + '</div>';
        if (card.rarity === 'SSR') {
            // Look up cgId from CG_STORIES (authoritative source) or fall back to card.value.cgId
            var cgStory = typeof CG_STORIES !== 'undefined' ? CG_STORIES[card.id] : null;
            var cgId = cgStory ? cgStory.cgId : (card.value && card.value.cgId ? card.value.cgId : null);
            if (cgId) {
                detailHTML += '<button class="gacha-card-detail-cg-btn" data-action="viewCG" data-cgid="' + cgId + '">' + I18n.t('collection.viewCGMemory') + '</button>';
            }
        }
        detailHTML += '</div>';
        const overlay = document.createElement('div');
        overlay.className = 'gacha-card-detail-overlay';
        overlay.innerHTML = detailHTML;
        const self = this;
        overlay.addEventListener('click', function(e) {
            const action = e.target.dataset.action;
            if (action === 'close') { overlay.remove(); }
            else if (action === 'viewCG') {
                overlay.remove();
                self.closeSheet();
                var cgId = e.target.dataset.cgid;
                if (self.game.cgAlbum && cgId) { self.game.cgAlbum.openStoryForCG(cgId); }
                else if (self.game.cgAlbum) { self.game.cgAlbum.open(); }
            }
        });
        document.body.appendChild(overlay);
    }
}
