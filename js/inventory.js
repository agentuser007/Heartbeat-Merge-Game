// ============================================================
// inventory.js — Backpack / Item Inventory
// All gacha results go here; player uses items manually.
// ============================================================

class InventorySystem {
    constructor(game) {
        this.game = game;
        this.items = {};
        this.panelEl = document.getElementById('inventory-sheet');
        this.listEl = document.getElementById('inventory-list');
        this.badgeEl = document.getElementById('inventory-badge');
    }

    openSheet() {
        if (this.panelEl) { this.panelEl.classList.add('open'); this.renderItems(); }
    }

    closeSheet() {
        if (this.panelEl) { this.panelEl.classList.remove('open'); }
    }

    addItem(gachaItem) {
        const id = gachaItem.id;
        this.items[id] = (this.items[id] || 0) + 1;
        this.updateBadge();
        if (this.panelEl && this.panelEl.classList.contains('open')) {
            this.renderItems();
        }
    }

    removeItem(id) {
        if (!this.items[id] || this.items[id] <= 0) return false;
        this.items[id]--;
        if (this.items[id] <= 0) delete this.items[id];
        this.updateBadge();
        return true;
    }

    refundItem(id) {
        this.items[id] = (this.items[id] || 0) + 1;
        this.updateBadge();
    }

    updateBadge() {
        const total = this.getTotalCount();
        if (this.badgeEl) {
            this.badgeEl.textContent = total;
            this.badgeEl.style.display = total > 0 ? 'flex' : 'none';
        }
    }

    getTotalCount() {
        return Object.values(this.items).reduce((s, n) => s + n, 0);
    }

    findPoolItem(id) {
        return GACHA_POOL_V2.find(g => g.id === id) 
            || GACHA_POOL.find(g => g.id === id) 
            || SHOP_ITEMS.find(g => g.id === id);
    }

    renderItems() {
        if (!this.listEl) return;
        this.listEl.innerHTML = '';
        const itemIds = Object.keys(this.items);
        if (itemIds.length === 0) {
            this.listEl.innerHTML = '<div class="inventory-empty">' + I18n.emoji('backpack') + ' ' + I18n.t('inventory.empty') + '<br>' + I18n.t('inventory.emptyHint') + '</div>';
            return;
        }
        for (const id of itemIds) {
            const count = this.items[id];
            const poolItem = this.findPoolItem(id);
            if (!poolItem) continue;
            const card = document.createElement('div');
            const rarity = poolItem.rarity || 'R';
            card.className = 'inventory-card rarity-' + rarity.toLowerCase();
            const info = document.createElement('div');
            info.className = 'inventory-card-info';
            const desc = poolItem.description || this.getEffectDescription(poolItem);
            info.innerHTML = '<span class="inventory-icon">' + poolItem.icon + '</span>' +
                '<div class="inventory-text">' +
                '<div class="inventory-name">' + poolItem.name + ' ×' + count + '</div>' +
                '<div class="inventory-desc">' + desc + '</div>' +
                '</div>';
            const btn = document.createElement('button');
            btn.className = 'inventory-use-btn';
            btn.textContent = I18n.t('inventory.use');
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                this.useItem(id);
            }.bind(this));
            card.appendChild(info);
            card.appendChild(btn);
            this.listEl.appendChild(card);
        }
    }

    getEffectDescription(poolItem) {
        switch (poolItem.effect) {
            case 'add_fragment': return I18n.t('inventory.descAddFragment');
            case 'add_fragment_lucky': return I18n.t('inventory.descAddFragmentLucky');
            case 'add_energy_item': return I18n.t('inventory.descAddEnergyItem', {energy: (poolItem.value && poolItem.value.energy) || '?'});
            case 'spawn_board_item': return I18n.t('inventory.descSpawnBoardItem');
            case 'place_generator': return I18n.t('inventory.descPlaceGenerator');
            case 'ssr_generator': return I18n.t('inventory.descSSRGenerator');
            case 'add_joker': return I18n.t('inventory.descAddJoker');
            case 'add_scissor': return I18n.t('inventory.descAddScissor');
            case 'clear_lv1': return I18n.t('inventory.descClearLv1');
            case 'spawn_item': return I18n.t('inventory.descSpawnItem');
            case 'time_freeze': return I18n.t('inventory.descTimeFreeze');
            case 'lucky_coin': return I18n.t('inventory.descLuckyCoin');
            case 'double_gen': return I18n.t('inventory.descDoubleGen');
            case 'reroll': return I18n.t('inventory.descReroll');
            case 'gen_refresh': return I18n.t('inventory.descGenRefresh');
            case 'add_diamond': return I18n.t('inventory.descAddDiamond', {amount: (poolItem.value && poolItem.value.amount) || '?'});
            case 'add_gold': return I18n.t('inventory.descAddGold', {amount: (poolItem.value && poolItem.value.amount) || '?'});
            case 'space_clean': return I18n.t('inventory.descSpaceClean');
            case 'upgrade_item': return I18n.t('inventory.descUpgradeItem');
            default: return I18n.t('inventory.descDefault');
        }
    }

    useItem(id) {
        const poolItem = this.findPoolItem(id);
        if (!poolItem) return;
        if (this._needsBoardSpace(poolItem.effect)) {
            if (!this.game.board.hasEmptySpace()) {
                this.showUseToast(I18n.t('inventory.boardFullUse'));
                return;
            }
        }
        if (!this.removeItem(id)) return;
        let used = true;
        switch (poolItem.effect) {
            case 'add_fragment': used = this.effectAddFragment(poolItem.value); break;
            case 'add_fragment_lucky': used = this.effectAddFragmentLucky(poolItem.value); break;
            case 'add_energy_item': used = this.effectAddEnergy(poolItem.value); break;
            case 'spawn_board_item': used = this.effectSpawnBoardItem(poolItem.value); break;
            case 'place_generator': used = this.effectPlaceGenerator(poolItem.value); break;
            case 'ssr_generator': used = this.effectSSRGenerator(poolItem.value); break;
            case 'add_joker': used = this.effectPlaceJoker(); break;
            case 'add_scissor': used = this.effectScissorMode(id); break;
            case 'clear_lv1': used = this.effectClearLv1(); break;
            case 'spawn_item': used = this.effectSpawnItem(poolItem.value); break;
            case 'time_freeze': used = this.effectTimeFreeze(poolItem.value); break;
            case 'lucky_coin': used = this.effectLuckyCoin(poolItem.value); break;
            case 'double_gen': used = this.effectDoubleGen(poolItem.value); break;
            case 'reroll': used = this.effectReroll(poolItem.value); break;
            case 'gen_refresh': used = this.effectGenRefresh(); break;
            case 'add_diamond': used = this.effectAddDiamond(poolItem.value); break;
            case 'add_gold': used = this.effectAddGold(poolItem.value); break;
            case 'space_clean': used = this.effectSpaceClean(); break;
            case 'upgrade_item': used = this.effectUpgradeItem(poolItem.id); break;
            default: this.showUseToast(I18n.t('inventory.usedItem', {name: poolItem.name}));
        }
        if (!used) { this.refundItem(id); }
        this.renderItems();
        if (used && this.panelEl) Effects.spawnParticles(this.panelEl, 6, '✨');
        if (this.game.save) this.game.save.saveAll();
    }

    _needsBoardSpace(effect) {
        return ['spawn_board_item', 'place_generator', 'ssr_generator', 'add_joker'].includes(effect);
    }

    effectAddFragment(value) {
        if (this.game.fragmentSystem && value) {
            let chain = value.chain;
            if (chain === 'random' && typeof CHAINS !== 'undefined' && CHAINS.length > 0) {
                chain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
            }
            this.game.fragmentSystem.addFragment(chain, value.genLevel, value.count);
            this.showUseToast(I18n.t('inventory.fragmentAdded', {count: value.count}));
        } else {
            this.showUseToast(I18n.t('inventory.fragmentAdded', {count: (value && value.count) || 1}));
        }
        return true;
    }

    effectAddFragmentLucky(value) {
        if (this.game.fragmentSystem && value) {
            this.game.fragmentSystem.addFragment(value.chain, Math.random() < 0.7 ? 1 : 2, value.count);
            this.showUseToast(I18n.t('inventory.luckyFragmentAdded', {count: value.count}));
        } else {
            this.showUseToast(I18n.t('inventory.luckyFragmentAdded', {count: (value && value.count) || 1}));
        }
        return true;
    }

    effectAddEnergy(value) {
        if (value && value.energy) {
            this.game.energy.recover(value.energy);
            this.showUseToast(I18n.t('inventory.energyRecovered', {count: value.energy}));
        }
        return true;
    }

    effectSpawnBoardItem(value) {
        const board = this.game.board;
        if (!board.hasEmptySpace()) {
            this.showUseToast(I18n.t('inventory.boardFullPlace'));
            return false;
        }
        let chain = value.chain, level = value.level;
        if (chain === 'random') chain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
        if (typeof level === 'string') {
            if (level === 'random_1_2') level = Math.random() < 0.6 ? 1 : 2;
            else if (level === 'random_1_3') { const r = Math.random(); level = r < 0.4 ? 1 : r < 0.8 ? 2 : 3; }
            else if (level === 'random_3_4') level = Math.random() < 0.6 ? 3 : 4;
            else if (level === 'random_3_5') { const r = Math.random(); level = r < 0.5 ? 3 : r < 0.85 ? 4 : 5; }
            else level = 3;
        }
        const prefix = CHAIN_ITEM_PREFIX[chain];
        if (!prefix) return false;
        const itemId = prefix + '_' + level;
        board.spawnItemById(itemId);
        this.showUseToast(I18n.t('inventory.gotItem', {name: ITEMS[itemId] ? ITEMS[itemId].name : itemId}));
        this.closeSheet();
        return true;
    }

    effectPlaceGenerator(value) {
        const board = this.game.board;
        if (!board.hasEmptySpace()) {
            this.showUseToast(I18n.t('inventory.boardFullPlace'));
            return false;
        }
        const genId = value.genChain + '_' + value.level;
        if (ITEMS[genId]) {
            board.spawnItemById(genId);
            this.showUseToast(I18n.t('inventory.gotGenerator', {name: ITEMS[genId].name}));
            this.closeSheet();
            return true;
        }
        this.showUseToast(I18n.t('inventory.generatorError'));
        return false;
    }

    effectSSRGenerator(value) {
        const board = this.game.board;
        if (!board.hasEmptySpace()) {
            this.showUseToast(I18n.t('inventory.boardFullSSR'));
            return false;
        }
        const genId = value.genChain + '_' + value.level;
        if (ITEMS[genId]) {
            board.spawnItemById(genId);
            this.showUseToast(I18n.t('inventory.ssrPlaced', {name: ITEMS[genId].name}));
            this.closeSheet();
            return true;
        }
        this.showUseToast(I18n.t('inventory.ssrGeneratorError'));
        return false;
    }

    effectClearLv1() {
        const board = this.game.board;
        let cleared = 0;
        let totalEnergy = 0;
        for (let i = 0; i < board.cells.length; i++) {
            if (board.cells[i]) {
                const item = ITEMS[board.cells[i]];
                if (item && parseInt(item.level) === 1 && item.type !== 'GENERATOR' && item.type !== 'JOKER' && item.type !== 'SCISSOR') {
                    const energyAmt = board.logic.getRecycleEnergy(i);
                    totalEnergy += energyAmt;
                    board.removeItem(i);
                    Effects.spawnParticles(board.getCellEl(i), 2, '🧹');
                    cleared++;
                }
            }
        }
        if (cleared > 0) {
            this.game.energy.recover(totalEnergy);
            this.showUseToast(I18n.t('inventory.clearedLv1', {count: cleared}));
        } else {
            this.showUseToast(I18n.t('inventory.noLv1ToClear'));
        }
        return true;
    }

    effectSpawnItem(level) {
        if (!this.game.board.hasEmptySpace()) {
            this.showUseToast(I18n.t('inventory.boardFullUse2'));
            return false;
        }
        const candidates = Object.entries(ITEMS).filter(function(e) { return e[1].level === level; });
        if (candidates.length === 0) return false;
        const entry = candidates[Math.floor(Math.random() * candidates.length)];
        const itemId = entry[0];
        this.game.board.spawnItem(itemId);
        const itemData = ITEMS[itemId];
        this.showUseToast(I18n.t('inventory.gotSpawnItem', {emoji: itemData.emoji, name: itemData.name}));
        this.closeSheet();
        return true;
    }

    effectTimeFreeze(seconds) {
        this.game._timeFreezeBonus = (this.game._timeFreezeBonus || 0) + seconds;
        this.showUseToast(I18n.t('inventory.timeFreezeUsed', {seconds: seconds}));
        return true;
    }

    effectLuckyCoin(value) {
        const count = (typeof value === 'object' && value !== null) ? (value.count || 1) : (value || 1);
        this.game._luckyCoinsLeft = (this.game._luckyCoinsLeft || 0) + count;
        this.showUseToast(I18n.t('inventory.luckyCoinUsed', {count: count}));
        return true;
    }

    effectDoubleGen(value) {
        const turns = (value && value.turns) || 3;
        this.game._doubleGenTurns = (this.game._doubleGenTurns || 0) + turns;
        this.showUseToast(I18n.t('inventory.doubleGenUsed', {turns: turns}));
        return true;
    }

    effectReroll(value) {
        const board = this.game.board;
        const count = (value && value.count) || 3;
        const candidates = [];
        for (let i = 0; i < board.cells.length; i++) {
            if (board.cells[i]) {
                const item = ITEMS[board.cells[i]];
                if (item && item.type !== 'GENERATOR' && item.type !== 'JOKER' && item.type !== 'SCISSOR' && item.chain) {
                    candidates.push(i);
                }
            }
        }
        if (candidates.length === 0) {
            this.showUseToast(I18n.t('inventory.noRerollTarget'));
            return false;
        }
        const shuffled = candidates.sort(function() { return Math.random() - 0.5; });
        const toReroll = shuffled.slice(0, Math.min(count, shuffled.length));
        let rerolled = 0;
        for (const idx of toReroll) {
            const oldItem = ITEMS[board.cells[idx]];
            if (!oldItem || !oldItem.nextId) continue;
            const otherChains = CHAINS.filter(function(c) { return c !== oldItem.chain; });
            const newChain = otherChains[Math.floor(Math.random() * otherChains.length)];
            const prefix = CHAIN_ITEM_PREFIX[newChain];
            if (!prefix) continue;
            const newItemId = prefix + '_' + oldItem.level;
            if (ITEMS[newItemId]) {
                board.logic.setCell(idx, newItemId);
                board.renderCell(idx);
                Effects.spawnParticles(board.getCellEl(idx), 3, '🔄');
                rerolled++;
            }
        }
        if (rerolled > 0) {
            this.showUseToast(I18n.t('inventory.rerolled', {count: rerolled}));
            this.closeSheet();
            if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
        } else {
            this.showUseToast(I18n.t('inventory.noRerollItems'));
        }
        return true;
    }

    effectGenRefresh() {
        const board = this.game.board;
        let refreshed = 0;
        if (board.generatorStates) {
            for (const idx in board.generatorStates) {
                if (board.generatorStates[idx] && board.generatorStates[idx].cooldownUntil) {
                    board.generatorStates[idx].cooldownUntil = 0;
                    refreshed++;
                }
            }
        }
        if (refreshed > 0) {
            this.showUseToast(I18n.t('inventory.genRefreshed', {count: refreshed}));
        } else {
            this.showUseToast(I18n.t('inventory.noGenToRefresh'));
        }
        return true;
    }

    effectAddDiamond(value) {
        const amount = (value && value.amount) || 50;
        if (this.game.currency) {
            this.game.currency.addDiamonds(amount);
            this.showUseToast(I18n.t('inventory.diamondAdded', {count: amount}));
        } else {
            this.showUseToast(I18n.t('inventory.diamondAddedNoSystem', {count: amount}));
        }
        return true;
    }

    effectAddGold(value) {
        const amount = (value && value.amount) || 500;
        if (this.game.currency) {
            this.game.currency.addGold(amount);
            this.showUseToast(I18n.t('inventory.goldAdded', {count: amount}));
        } else {
            this.showUseToast(I18n.t('inventory.goldAddedNoSystem', {count: amount}));
        }
        return true;
    }

    effectSpaceClean() {
        const board = this.game.board;
        let cleared = 0;
        for (let i = 0; i < board.cells.length; i++) {
            if (board.cells[i]) {
                const item = ITEMS[board.cells[i]];
                if (item && (Number(item.level) === 1 || Number(item.level) === 2) && item.type !== 'GENERATOR' && item.type !== 'JOKER' && item.type !== 'SCISSOR') {
                    const energyAmt = board.logic.getRecycleEnergy(i);
                    board.removeItem(i);
                    if (energyAmt > 0) this.game.energy.recover(energyAmt);
                    cleared++;
                }
            }
        }
        if (cleared > 0) {
            this.showUseToast(I18n.t('inventory.spaceCleaned', {count: cleared}));
        } else {
            this.showUseToast(I18n.t('inventory.noSpaceToClean'));
        }
        return true;
    }

    effectUpgradeItem(itemId) {
        const board = this.game.board;
        let hasUpgradable = false;
        for (let i = 0; i < board.cells.length; i++) {
            if (board.cells[i]) {
                const item = ITEMS[board.cells[i]];
                if (item && item.nextId && item.type !== 'GENERATOR' && item.type !== 'JOKER' && item.type !== 'SCISSOR') {
                    hasUpgradable = true;
                    break;
                }
            }
        }
        if (!hasUpgradable) {
            this.showUseToast(I18n.t('inventory.noUpgradeTarget'));
            return false;
        }
        this.showUseToast(I18n.t('inventory.upgradeHint'));
        this.closeSheet();
        const gridEl = document.getElementById('game-grid');
        if (gridEl) gridEl.classList.add('scissor-active');
        const self = this;
        const handler = function(e) {
            const cell = e.target.closest('.grid-cell');
            if (!cell) return;
            const idx = parseInt(cell.dataset.index);
            const cellItemId = board.cells[idx];
            if (!cellItemId) return;
            const itemData = ITEMS[cellItemId];
            if (!itemData || !itemData.nextId || itemData.type === 'GENERATOR' || itemData.type === 'JOKER' || itemData.type === 'SCISSOR') {
                self.showUseToast(I18n.t('inventory.itemNotUpgradable'));
                self.refundItem(itemId);
                self.renderItems();
            } else {
                const nextItem = ITEMS[itemData.nextId];
                if (nextItem) {
                    board.logic.setCell(idx, itemData.nextId);
                    board.renderCell(idx);
                    Effects.mergePopAt(board.getCellEl(idx));
                    self.showUseToast(I18n.t('inventory.upgradeSuccess', {oldName: itemData.name, newName: nextItem.name}));
                    if (self.game.collection) self.game.collection.discoverItem(itemData.nextId);
                    if (self.game.dailyOrders) self.game.dailyOrders.updateHighlights();
                } else {
                    self.showUseToast(I18n.t('inventory.maxLevelReached'));
                    self.refundItem(itemId);
                    self.renderItems();
                }
            }
            if (gridEl) gridEl.classList.remove('scissor-active');
            document.removeEventListener('click', handler, true);
            if (self.game.save) self.game.save.saveAll();
        };
        setTimeout(function() { document.addEventListener('click', handler, true); }, 100);
        setTimeout(function() {
            if (gridEl && gridEl.classList.contains('scissor-active')) {
                gridEl.classList.remove('scissor-active');
                document.removeEventListener('click', handler, true);
                self.refundItem(itemId);
                self.renderItems();
                self.showUseToast(I18n.t('inventory.upgradeCancelled'));
            }
        }, 10000);
        return true;
    }

    effectPlaceJoker() {
        const board = this.game.board;
        if (!board.hasEmptySpace()) {
            this.showUseToast(I18n.t('inventory.boardFullJoker'));
            return false;
        }
        board.spawnItem('joker');
        this.showUseToast(I18n.t('inventory.jokerPlaced'));
        this.closeSheet();
        return true;
    }

    effectScissorMode(itemId) {
        const board = this.game.board;
        board.logic.scissorMode = true;
        this.showUseToast(I18n.t('inventory.scissorHint'));
        this.closeSheet();
        const gridEl = document.getElementById('game-grid');
        if (gridEl) gridEl.classList.add('scissor-active');
        const self = this;
        const handler = function(e) {
            const cell = e.target.closest('.grid-cell');
            if (!cell) return;
            const idx = parseInt(cell.dataset.index);
            const result = board.logic.useScissorOnItem(idx);
            if (result.success) {
                board.renderCell(result.targetIdx);
                board.renderCell(result.emptyIdx);
                Effects.mergePopAt(board.getCellEl(result.targetIdx));
                const prevData = ITEMS[result.resultItems[0]];
                self.showUseToast(I18n.t('inventory.scissorSuccess', {name: prevData ? prevData.name : ''}));
                if (self.game.collection) self.game.collection.discoverItem(result.resultItems[0]);
                if (self.game.dailyOrders) self.game.dailyOrders.updateHighlights();
            } else {
                const reasons = {
                    'empty': I18n.t('inventory.scissorFailEmpty'),
                    'too_low': I18n.t('inventory.scissorFailTooLow'),
                    'invalid_type': I18n.t('inventory.scissorFailInvalidType'),
                    'no_space': I18n.t('inventory.scissorFailNoSpace')
                };
                self.showUseToast('✂️ ' + (reasons[result.reason] || I18n.t('inventory.scissorFailDefault')));
                self.refundItem(itemId);
                self.renderItems();
            }
            board.logic.scissorMode = false;
            if (gridEl) gridEl.classList.remove('scissor-active');
            document.removeEventListener('click', handler, true);
            if (self.game.save) self.game.save.saveAll();
        };
        setTimeout(function() { document.addEventListener('click', handler, true); }, 100);
        setTimeout(function() {
            if (board.logic.scissorMode) {
                board.logic.scissorMode = false;
                if (gridEl) gridEl.classList.remove('scissor-active');
                document.removeEventListener('click', handler, true);
                self.refundItem(itemId);
                self.renderItems();
                self.showUseToast(I18n.t('inventory.scissorCancelled'));
            }
        }, 10000);
        return true;
    }

    showUseToast(text) {
        const toast = document.createElement('div');
        toast.className = 'daily-toast';
        toast.textContent = text;
        (document.getElementById('toast-root') || document.body).appendChild(toast);
        requestAnimationFrame(function() { toast.classList.add('show'); });
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 2500);
    }
}
