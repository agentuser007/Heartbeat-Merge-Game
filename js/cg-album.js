// ============================================================
// cg-album.js — CG Album and Story System
// ============================================================

class CGAlbumSystem {
    constructor(game) {
        this.game = game;
        this.cgData = {};
        this._initCGData();
    }

    _initCGData() {
        if (typeof CG_STORIES === 'undefined') return;
        for (var ssrId in CG_STORIES) {
            var cg = CG_STORIES[ssrId];
            var cgId = cg.cgId;
            if (!this.cgData[cgId]) {
                this.cgData[cgId] = {
                    unlocked: [],
                    memoryFragments: 0,
                    title: cg.title,
                    maleLead: cg.maleLead,
                    ssrId: ssrId
                };
            }
        }
    }

    // Repair cgData entries that are missing ssrId/title/maleLead (from old saves)
    // Reverse lookup: find ssrId from CG_STORIES by cgId
    _findSsrIdByCgId(cgId) {
        if (typeof CG_STORIES === 'undefined') return null;
        for (var ssrId in CG_STORIES) {
            if (CG_STORIES[ssrId].cgId === cgId) return ssrId;
        }
        return null;
    }

    _repairCGData() {
        if (typeof CG_STORIES === 'undefined') return;
        // Build reverse lookup: cgId -> ssrId
        var cgIdToSsr = {};
        for (var ssrId in CG_STORIES) {
            var cg = CG_STORIES[ssrId];
            cgIdToSsr[cg.cgId] = ssrId;
        }
        // Fix each cgData entry
        for (var cgId in this.cgData) {
            var data = this.cgData[cgId];
            if (!data) continue;
            var ssrId = data.ssrId || cgIdToSsr[cgId];
            if (ssrId && CG_STORIES[ssrId]) {
                if (!data.ssrId) data.ssrId = ssrId;
                if (!data.title) data.title = CG_STORIES[ssrId].title;
                if (!data.maleLead) data.maleLead = CG_STORIES[ssrId].maleLead;
            }
        }
    }

    unlockStory(cgId, storyIndex) {
        if (!this.cgData[cgId]) {
            this.cgData[cgId] = { unlocked: [], memoryFragments: 0, title: '', maleLead: '', ssrId: '' };
            this._repairCGData();
        }
        if (this.cgData[cgId].unlocked.indexOf(storyIndex) === -1) {
            this.cgData[cgId].unlocked.push(storyIndex);
            if (this.game.save) this.game.save.saveAll();
            return true;
        }
        return false;
    }

    tryUnlockNext(cgId) {
        if (!this.cgData[cgId]) return false;
        var data = this.cgData[cgId];
        var ssrId = data.ssrId;
        if (!ssrId || !CG_STORIES[ssrId]) return false;
        var totalStories = CG_STORIES[ssrId].stories.length;
        var nextIndex = data.unlocked.length;
        if (nextIndex >= totalStories) return false;
        if ((data.memoryFragments || 0) < FRAGMENT_TO_STORY) return false;
        data.memoryFragments -= FRAGMENT_TO_STORY;
        // No sync needed — fragmentSystem.memoryFragments is now a compatibility
        // getter that reads directly from cgAlbum.cgData (single source of truth)
        data.unlocked.push(nextIndex);
        var fx = this.game.effects;
        var story = CG_STORIES[ssrId].stories[nextIndex];
        if (fx) fx.showToast(I18n.t('cgUnlockStory', {title: story.title}), 'ssr');
        if (this.game.save) this.game.save.saveAll();
        return true;
    }

    addMemoryFragments(cgId, count) {
        if (!this.cgData[cgId]) {
            this.cgData[cgId] = { unlocked: [], memoryFragments: 0, title: '', maleLead: '', ssrId: '' };
            this._repairCGData();
        }
        this.cgData[cgId].memoryFragments = (this.cgData[cgId].memoryFragments || 0) + count;
        // No sync needed — fragmentSystem.memoryFragments is now a compatibility
        // getter that reads directly from cgAlbum.cgData (single source of truth)
        // No auto-unlock: user must manually unlock stories from the CG album
        if (this.game.save) this.game.save.saveAll();
        return false;
    }

    getUnlockedStories(cgId) {
        if (!this.cgData[cgId]) return [];
        return this.cgData[cgId].unlocked || [];
    }

    readStory(cgId, index) {
        // Ensure cgData exists for this cgId
        if (!this.cgData[cgId]) {
            this.cgData[cgId] = { unlocked: [], memoryFragments: 0, title: '', maleLead: '', ssrId: '' };
            this._repairCGData();
        }
        var ssrId = this.cgData[cgId] ? this.cgData[cgId].ssrId : null;
        // Fallback: reverse lookup ssrId from CG_STORIES if not found in cgData
        if (!ssrId || !CG_STORIES[ssrId]) {
            ssrId = this._findSsrIdByCgId(cgId);
            // Repair cgData if we found the ssrId
            if (ssrId && this.cgData[cgId] && !this.cgData[cgId].ssrId) {
                this.cgData[cgId].ssrId = ssrId;
                this._repairCGData();
            }
        }
        if (!ssrId || !CG_STORIES[ssrId]) {
            var errFx = this.game.effects;
            if (errFx) errFx.showToast(I18n.t('cg.storyDataNotFound'), 'info');
            return;
        }
        // Use immersive VN reader
        if (typeof VNReader !== 'undefined') {
            var vn = new VNReader(this.game);
            vn.open(ssrId, index);
            return;
        }
        // Fallback: legacy reader
        var story = CG_STORIES[ssrId].stories[index];
        if (!story) return;
        var cg = CG_STORIES[ssrId];
        var cardName = cg.title;
        if (typeof GACHA_POOL_V2 !== 'undefined') {
            for (var gi = 0; gi < GACHA_POOL_V2.length; gi++) {
                if (GACHA_POOL_V2[gi].id === ssrId) { cardName = GACHA_POOL_V2[gi].name; break; }
            }
        }
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'cg-reader-overlay';
        overlay.innerHTML = '<div class="cg-reader-card">' +
            '<div class="cg-reader-header">' +
            '<span class="cg-reader-title">' + cardName + '</span>' +
            '<span class="cg-reader-lead">' + cg.maleLead + '</span></div>' +
            '<div class="cg-reader-story-title">' + story.title + '</div>' +
            '<div class="cg-reader-text">' + story.text + '</div>' +
            '<div class="cg-reader-actions">' +
            (index > 0 ? '<button class="cg-btn cg-btn-prev" data-dir="prev">' + I18n.t('cg.prevStory') + '</button>' : '') +
            '<button class="cg-btn cg-btn-close" data-dir="close">' + I18n.t('cgClose') + '</button>' +
            (index < cg.stories.length - 1 && this.cgData[cgId].unlocked.indexOf(index + 1) !== -1 ?
                '<button class="cg-btn cg-btn-next" data-dir="next">' + I18n.t('cg.nextStory') + '</button>' : '') +
            '</div></div>';
        overlay.addEventListener('click', function(e) {
            var dir = e.target.dataset.dir;
            if (dir === 'close') { overlay.remove(); }
            else if (dir === 'prev') { overlay.remove(); self.readStory(cgId, index - 1); }
            else if (dir === 'next') { overlay.remove(); self.readStory(cgId, index + 1); }
        });
        document.body.appendChild(overlay);
    }

    getCompletionRate() {
        var total = 0, unlocked = 0;
        for (var ssrId in CG_STORIES) {
            var cg = CG_STORIES[ssrId];
            total += cg.stories.length;
            if (this.cgData[cg.cgId]) unlocked += (this.cgData[cg.cgId].unlocked || []).length;
        }
        return { total: total, unlocked: unlocked, rate: total > 0 ? unlocked / total : 0 };
    }

    open() {
        var panel = document.getElementById('cg-album-sheet');
        if (panel) { panel.classList.add('open'); this.render(); }
    }

    // Open the dedicated CG memory panel for a specific cgId (used from card detail)
    openStoryForCG(cgId) {
        this.openCGMemoryPanel(cgId);
    }

    // Open a dedicated CG memory panel for a specific SSR card
    openCGMemoryPanel(cgId) {
        // Ensure cgData exists and try to repair if needed
        if (!this.cgData[cgId]) {
            this.cgData[cgId] = { unlocked: [], memoryFragments: 0, title: '', maleLead: '', ssrId: '' };
            this._repairCGData();
        }
        var data = this.cgData[cgId];
        var ssrId = data ? data.ssrId : null;
        // Fallback: reverse lookup ssrId from CG_STORIES
        if (!ssrId || !CG_STORIES[ssrId]) {
            ssrId = this._findSsrIdByCgId(cgId);
            if (ssrId && data && !data.ssrId) {
                data.ssrId = ssrId;
                this._repairCGData();
            }
        }
        if (!ssrId || !CG_STORIES[ssrId]) {
            var fx = this.game.effects;
            if (fx) fx.showToast(I18n.t('cg.noMemoryDataAlt'), 'info');
            return;
        }
        var cg = CG_STORIES[ssrId];
        var totalStories = cg.stories.length;
        var unlockedStories = data ? (data.unlocked || []) : [];
        var unlockedCount = unlockedStories.length;
        var memFrag = data ? (data.memoryFragments || 0) : 0;
        var canUnlock = memFrag >= FRAGMENT_TO_STORY && unlockedCount < totalStories;
        var pctVal = Math.min(100, (memFrag / FRAGMENT_TO_STORY) * 100);
        var isComplete = unlockedCount >= totalStories;

        // Find card info from gacha pool
        var cardIcon = '📖';
        var cardName = cg.title;
        if (typeof GACHA_POOL_V2 !== 'undefined') {
            for (var gi = 0; gi < GACHA_POOL_V2.length; gi++) {
                if (GACHA_POOL_V2[gi].id === ssrId) {
                    cardIcon = GACHA_POOL_V2[gi].icon;
                    cardName = GACHA_POOL_V2[gi].name;
                    break;
                }
            }
        }

        // Build story dots HTML
        var dotsHtml = '<div class="cg-memory-dots">';
        for (var si = 0; si < totalStories; si++) {
            var isUnlocked = unlockedStories.indexOf(si) !== -1;
            var storyTitle = cg.stories[si] ? cg.stories[si].title : '';
            dotsHtml += '<span class="cg-memory-dot ' + (isUnlocked ? 'cg-memory-dot-on' : 'cg-memory-dot-off') + '" ' +
                'data-cgid="' + cgId + '" data-index="' + si + '" title="' + (isUnlocked ? storyTitle : I18n.t('cgLocked').replace('🔒 ','')) + '">' +
                (isUnlocked ? '●' : '○') + '</span>';
        }
        dotsHtml += '</div>';

        // Build story list (titles with unlock status)
        var listHtml = '<div class="cg-memory-story-list">';
        for (var li = 0; li < totalStories; li++) {
            var isUL = unlockedStories.indexOf(li) !== -1;
            var sTitle = cg.stories[li] ? cg.stories[li].title : '???';
            listHtml += '<div class="cg-memory-story-item ' + (isUL ? 'story-unlocked' : 'story-locked') + '" ' +
                'data-cgid="' + cgId + '" data-index="' + li + '">' +
                '<span class="story-item-dot">' + (isUL ? '●' : '○') + '</span>' +
                '<span class="story-item-title">' + (isUL ? sTitle : '???') + '</span>' +
                (isUL ? '<span class="story-item-read">' + I18n.t('cgRead') + '</span>' : '<span class="story-item-locked-label">' + I18n.t('cgLocked') + '</span>') +
                '</div>';
        }
        listHtml += '</div>';

        var html = '<div class="cg-memory-panel">' +
            '<div class="cg-memory-close" data-action="close">✕</div>' +
            '<div class="cg-memory-icon">' + cardIcon + '</div>' +
            '<div class="cg-memory-header">' +
            '<span class="cg-memory-title">' + cardName + '</span>' +
            '<span class="cg-memory-lead"> × ' + cg.maleLead + '</span>' +
            '</div>' +
            '<div class="cg-memory-subtitle">「' + cg.title + '」</div>' +
            dotsHtml +
            (isComplete ? '<div class="cg-memory-complete">' + I18n.t('cgAllUnlocked') + '</div>' :
                '<div class="cg-memory-fragment-section">' +
                '<div class="cg-memory-fragment-bar"><div class="cg-memory-fragment-fill" style="width:' + pctVal + '%"></div></div>' +
                '<div class="cg-memory-fragment-text">' + I18n.t('cgMemoryFragments', {current: memFrag, max: FRAGMENT_TO_STORY}) + '</div>' +
                '</div>') +
            listHtml +
            (canUnlock ? '<button class="cg-memory-unlock-btn" data-cgid="' + cgId + '">' + I18n.t('cgUnlockNext') + '</button>' : '') +
            (!isComplete && !canUnlock && unlockedCount > 0 ? '<div class="cg-memory-hint">' + I18n.t('cgDupSSRHint') + '</div>' : '') +
            (unlockedCount === 0 ? '<div class="cg-memory-hint">' + I18n.t('cgCollectHint') + '</div>' : '') +
            '</div>';

        var overlay = document.createElement('div');
        overlay.className = 'cg-memory-overlay';
        overlay.innerHTML = html;

        var self = this;
        // Close button
        overlay.addEventListener('click', function(e) {
            var action = e.target.dataset.action;
            if (action === 'close') {
                overlay.remove();
                return;
            }
            // Click on unlocked story dot
            if (e.target.classList.contains('cg-memory-dot-on')) {
                var idx = parseInt(e.target.dataset.index);
                var cgid = e.target.dataset.cgid;
                overlay.remove();
                self.readStory(cgid, idx);
                return;
            }
            // Click on unlocked story item
            if (e.target.closest('.cg-memory-story-item.story-unlocked')) {
                var item = e.target.closest('.cg-memory-story-item.story-unlocked');
                var itemIdx = parseInt(item.dataset.index);
                var itemCgid = item.dataset.cgid;
                overlay.remove();
                self.readStory(itemCgid, itemIdx);
                return;
            }
            // Unlock button
            if (e.target.classList.contains('cg-memory-unlock-btn')) {
                var unlockCgid = e.target.dataset.cgid;
                var unlocked = self.tryUnlockNext(unlockCgid);
                if (unlocked) {
                    overlay.remove();
                    self.openCGMemoryPanel(unlockCgid);
                }
                return;
            }
        });

        document.body.appendChild(overlay);
    }

    close() {
        var panel = document.getElementById('cg-album-sheet');
        if (panel) panel.classList.remove('open');
    }

    render() {
        var container = document.getElementById('cg-album-content');
        if (!container) return;
        var completion = this.getCompletionRate();
        var html = '<div class="cg-album-header">' +
            '<span class="cg-album-title">' + I18n.t('cg.albumTitle') + '</span>' +
            '<span class="cg-album-progress">' + completion.unlocked + '/' + completion.total + '</span></div>';
        html += '<div class="cg-album-grid">';
        for (var ssrId in CG_STORIES) {
            var cg = CG_STORIES[ssrId];
            var cgId = cg.cgId;
            var data = this.cgData[cgId] || { unlocked: [], memoryFragments: 0 };
            var storyCount = cg.stories.length;
            var unlockedCount = (data.unlocked || []).length;
            var memFrag = data.memoryFragments || 0;
            var isDiscovered = unlockedCount > 0 || memFrag > 0;
            var isComplete = unlockedCount >= storyCount;
            var canUnlock = !isComplete && memFrag >= FRAGMENT_TO_STORY;
            var pct = Math.min(100, (memFrag / FRAGMENT_TO_STORY) * 100);

            var cardIcon = '❓';
            var cardName = cg.title;
            if (typeof GACHA_POOL_V2 !== 'undefined') {
                for (var gi = 0; gi < GACHA_POOL_V2.length; gi++) {
                    if (GACHA_POOL_V2[gi].id === ssrId) { cardIcon = GACHA_POOL_V2[gi].icon; cardName = GACHA_POOL_V2[gi].name; break; }
                }
            }

            html += '<div class="cg-album-card ' + (isDiscovered ? 'cg-discovered' : 'cg-locked') + '" data-cgid="' + cgId + '">';
            html += '<div class="cg-card-icon">' + (isDiscovered ? cardIcon : '❓') + '</div>';
            html += '<div class="cg-card-title">' + (isDiscovered ? cardName : '???') + '</div>';
            html += '<div class="cg-card-lead">' + (isDiscovered ? cg.maleLead + ' · 「' + cg.title + '」' : '???') + '</div>';
            html += '<div class="cg-card-progress">';
            for (var si = 0; si < storyCount; si++) {
                var isUnlocked = (data.unlocked || []).indexOf(si) !== -1;
                html += '<span class="cg-story-dot ' + (isUnlocked ? 'cg-dot-unlocked' : 'cg-dot-locked') + '" ' +
                    'data-cgid="' + cgId + '" data-index="' + si + '">' + (isUnlocked ? '●' : '○') + '</span>';
            }
            html += '</div>';
            if (isDiscovered && !isComplete) {
                html += '<div class="cg-memory-bar"><div class="cg-memory-fill" style="width:' + pct + '%"></div></div>';
                html += '<div class="cg-memory-text">' + I18n.t('cgMemoryFragments', {current: memFrag, max: FRAGMENT_TO_STORY}) + '</div>';
            }
            if (canUnlock) {
                html += '<button class="cg-unlock-btn" data-cgid="' + cgId + '">' + I18n.t('cgUnlockNext') + '</button>';
            } else if (isComplete) {
                html += '<div class="cg-complete-badge">' + I18n.t('cgAllUnlocked') + '</div>';
            } else if (isDiscovered) {
                html += '<div class="cg-hint-text">' + I18n.t('cgDupSSRHint') + '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
        var self = this;
        container.querySelectorAll('.cg-dot-unlocked').forEach(function(dot) {
            dot.addEventListener('click', function() {
                self.readStory(dot.dataset.cgid, parseInt(dot.dataset.index));
            });
        });
        container.querySelectorAll('.cg-unlock-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var unlocked = self.tryUnlockNext(btn.dataset.cgid);
                if (unlocked) self.render();
            });
        });
    }
}