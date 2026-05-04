// ============================================================
// fragment.js — Fragment and Memory Fragment System
// ============================================================

class FragmentSystem {
    constructor(game) {
        this.game = game;
        this.fragments = {};
        // memoryFragments is now a compatibility getter backed by cgAlbum.cgData
        // (single source of truth). Do NOT add a this.memoryFragments field here.
    }

    // Compatibility getter: builds a view from cgAlbum.cgData (the authority)
    get memoryFragments() {
        var result = {};
        if (this.game.cgAlbum) {
            var cgData = this.game.cgAlbum.cgData;
            for (var cgId in cgData) {
                if (cgData[cgId] && (cgData[cgId].memoryFragments || 0) > 0) {
                    result[cgId] = cgData[cgId].memoryFragments;
                }
            }
        }
        return result;
    }

    addFragment(chain, level, count) {
        var key = chain + '_' + level;
        this.fragments[key] = (this.fragments[key] || 0) + count;
        var fx = this.game.effects;
        var chainName = CHAIN_NAMES[chain] || chain;
        var icon = CHAIN_ICONS[chain] || '🧩';
        if (fx) fx.showToast(I18n.t('fragmentAdded', {icon, count, chain: chainName, level, current: this.fragments[key], max: FRAGMENT_TO_GENERATOR}), 'info');
        this.checkAndPrompt(key);
        if (this.game.save) this.game.save.saveAll();
    }

    addMemoryFragment(cgId, count) {
        // Delegate to cgAlbum (single source of truth)
        if (this.game.cgAlbum) {
            this.game.cgAlbum.addMemoryFragments(cgId, count);
        }
        var current = this.game.cgAlbum ? (this.game.cgAlbum.cgData[cgId] ? this.game.cgAlbum.cgData[cgId].memoryFragments : 0) : 0;
        var fx = this.game.effects;
        if (fx) fx.showToast(I18n.t('memoryFragmentAdded', {count, current: current, max: FRAGMENT_TO_STORY}), 'info');
        var unlocked = this.checkMemoryUnlock(cgId);
        // saveAll is already called by cgAlbum.addMemoryFragments, no need to double-save
        return unlocked;
    }

    checkAndPrompt(key) {
        var count = this.fragments[key] || 0;
        if (count >= FRAGMENT_TO_GENERATOR) {
            // Don't prompt if board is full — wait until there's space
            if (this.game.board && !this.game.board.hasEmptySpace()) {
                var fx = this.game.effects;
                if (fx) fx.showToast(I18n.t('fragmentFullBoardFull'), 'info');
                return;
            }
            var parts = key.split('_');
            var chain = parts[0];
            var level = parseInt(parts[1]);
            var chainName = CHAIN_NAMES[chain] || chain;
            var icon = CHAIN_ICONS[chain] || '🧩';
            this.showSynthesisPrompt(key, chain, level, icon, chainName);
        }
    }

    checkMemoryUnlock(cgId) {
        var count = (this.game.cgAlbum && this.game.cgAlbum.cgData[cgId]) ? (this.game.cgAlbum.cgData[cgId].memoryFragments || 0) : 0;
        if (count >= FRAGMENT_TO_STORY && this.game.cgAlbum) {
            return this.game.cgAlbum.tryUnlockNext(cgId);
        }
        return false;
    }

    synthesize(key) {
        var count = this.fragments[key] || 0;
        if (count < FRAGMENT_TO_GENERATOR) return false;
        var parts = key.split('_');
        var chain = parts[0];
        var level = parseInt(parts[1]);
        var genChain = CHAIN_TO_GEN[chain] || chain;
        var genId = genChain + '_' + level;
        if (typeof ITEMS !== 'undefined' && ITEMS[genId] && this.game.board) {
            if (!this.game.board.hasEmptySpace()) {
                var fx = this.game.effects;
                if (fx) fx.showToast(I18n.t('fragmentBoardFull'), 'info');
                return false;
            }
            this.fragments[key] -= FRAGMENT_TO_GENERATOR;
            if (this.fragments[key] <= 0) delete this.fragments[key];
            var placed = this.game.board.spawnItemById(genId);
            if (!placed) {
                this.fragments[key] = (this.fragments[key] || 0) + FRAGMENT_TO_GENERATOR;
                var fx = this.game.effects;
                if (fx) fx.showToast(I18n.t('fragmentBoardFull'), 'info');
                return false;
            }
            var fx = this.game.effects;
            if (fx) fx.showToast(I18n.t('fragmentSynthSuccess', {name: ITEMS[genId].name}), 'sr');
        } else {
            this.fragments[key] -= FRAGMENT_TO_GENERATOR;
            if (this.fragments[key] <= 0) delete this.fragments[key];
            if (this.game.currency) this.game.currency.addDiamonds(50);
            var fx = this.game.effects;
            if (fx) fx.showToast(I18n.t('fragmentConvertDiamond'), 'info');
        }
        if (this.game.save) this.game.save.saveAll();
        return true;
    }

    getProgress(chain, level) {
        var key = chain + '_' + level;
        var current = this.fragments[key] || 0;
        return { current: current, max: FRAGMENT_TO_GENERATOR, progress: Math.min(1, current / FRAGMENT_TO_GENERATOR) };
    }

    getMemoryProgress(cgId) {
        var current = (this.game.cgAlbum && this.game.cgAlbum.cgData[cgId]) ? (this.game.cgAlbum.cgData[cgId].memoryFragments || 0) : 0;
        return { current: current, max: FRAGMENT_TO_STORY, progress: Math.min(1, current / FRAGMENT_TO_STORY) };
    }

    showSynthesisPrompt(key, chain, level, icon, chainName) {
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'fragment-synthesis-overlay';
        overlay.innerHTML = '<div class="fragment-synthesis-card">' +
            '<div class="fragment-synthesis-title">' + I18n.t('fragmentTitle') + '</div>' +
            '<div class="fragment-synthesis-body">' +
            '<p>' + I18n.t('fragmentFullNotice', {icon, chain: chainName, level, current: FRAGMENT_TO_GENERATOR, max: FRAGMENT_TO_GENERATOR}) + '</p>' +
            '<p>' + I18n.t('fragmentSynthQuestion') + '</p></div>' +
            '<div class="fragment-synthesis-actions">' +
            '<button class="fragment-btn fragment-btn-cancel" data-action="cancel">' + I18n.t('common.cancel') + '</button>' +
            '<button class="fragment-btn fragment-btn-confirm" data-action="confirm">' + I18n.t('fragmentSynthNow') + '</button>' +
            '</div></div>';
        overlay.addEventListener('click', function(e) {
            var action = e.target.dataset.action;
            if (action === 'confirm') {
                self.synthesize(key);
            }
            overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    render() {
        var container = document.getElementById('fragment-panel');
        if (!container) return;
        var self = this;
        var html = '<div class="fragment-grid">';
        for (var ci = 0; ci < CHAINS.length; ci++) {
            var chain = CHAINS[ci];
            var chainName = CHAIN_NAMES[chain] || chain;
            var icon = CHAIN_ICONS[chain] || '🧩';
            html += '<div class="fragment-chain-group"><div class="fragment-chain-header">' + icon + ' ' + chainName + '</div>';
            for (var level = 1; level <= 8; level++) {
                var key = chain + '_' + level;
                var current = this.fragments[key] || 0;
                if (current > 0) {
                    var pct = Math.min(100, (current / FRAGMENT_TO_GENERATOR) * 100);
                    var full = current >= FRAGMENT_TO_GENERATOR;
                    html += '<div class="fragment-item ' + (full ? 'fragment-full' : '') + '">' +
                        '<span class="fragment-level">Lv.' + level + '</span>' +
                        '<div class="fragment-bar-mini"><div class="fragment-fill-mini" style="width:' + pct + '%"></div></div>' +
                        '<span class="fragment-count">' + current + '/' + FRAGMENT_TO_GENERATOR + '</span>';
                    if (full) {
                        html += '<button class="fragment-synth-btn" data-key="' + key + '">' + I18n.t('fragmentSynthBtn') + '</button>';
                    }
                    html += '</div>';
                }
            }
            html += '</div>';
        }
        // Memory fragments
        var memKeys = Object.keys(this.memoryFragments).filter(function(k) {
            return (self.memoryFragments[k] || 0) > 0;
        });
        if (memKeys.length > 0) {
            html += '<div class="fragment-chain-group"><div class="fragment-chain-header">' + I18n.t('fragmentMemoryHeader') + '</div>';
            for (var mi = 0; mi < memKeys.length; mi++) {
                var cgId = memKeys[mi];
                var mc = this.memoryFragments[cgId];
                var mpct = Math.min(100, (mc / FRAGMENT_TO_STORY) * 100);
                html += '<div class="fragment-item">' +
                    '<span class="fragment-level">' + cgId + '</span>' +
                    '<div class="fragment-bar-mini"><div class="fragment-fill-mini" style="width:' + mpct + '%"></div></div>' +
                    '<span class="fragment-count">' + mc + '/' + FRAGMENT_TO_STORY + '</span></div>';
            }
            html += '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
        container.querySelectorAll('.fragment-synth-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                self.synthesize(btn.dataset.key);
                self.render();
            });
        });
    }
}