// ============================================================
// board.js — 7×9 Grid: Rendering, Drag-Drop, Merge, Generators
// Integrates BoardLogic for game rules; handles all DOM/UX
// ============================================================

class Board {
    constructor(game) {
        this.game = game;
        this.logic = new BoardLogic(GAME_CONFIG.BOARD_COLS, GAME_CONFIG.BOARD_ROWS);
        this.gridEl = document.getElementById('game-grid');
        this.dragSource = null;
        this.dragGhost = null;
        this._isDragging = false;
        this._dragThreshold = 8;
        this.buildGrid();
    }

    // Proxy properties to logic for backward compat (save system etc.)
    get cols() { return this.logic.cols; }
    get rows() { return this.logic.rows; }
    get cells() { return this.logic.cells; }
    set cells(v) { this.logic.cells = v; }
    get locked() { return this.logic.locked; }
    set locked(v) { this.logic.locked = v; }
    get cellsUnlocked() { return this.logic.cellsUnlocked; }
    set cellsUnlocked(v) { this.logic.cellsUnlocked = v; }
    get generatorStates() { return this.logic.generatorStates; }
    set generatorStates(v) { this.logic.generatorStates = v; }

    buildGrid() {
        this.gridEl.innerHTML = '';
        this.gridEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        this.gridEl.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;
        for (let i = 0; i < this.cols * this.rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = i;
            if (this.locked.has(i)) cell.classList.add('locked');
            cell.addEventListener('pointerdown', (e) => this.onPointerDown(e, i));
            this.gridEl.appendChild(cell);
        }
    }

    getCellEl(index) { return this.gridEl.children[index]; }

    renderCell(index) {
        const cellEl = this.getCellEl(index);
        if (!cellEl) return;
        const existing = cellEl.querySelector('.item');
        if (existing) existing.remove();
        if (this.locked.has(index)) { cellEl.classList.add('locked'); return; }
        cellEl.classList.remove('locked');
        const itemId = this.cells[index];
        if (!itemId) return;
        const itemData = ITEMS[itemId];
        if (!itemData) return;

        const itemEl = document.createElement('div');
        itemEl.className = 'item';
        itemEl.dataset.level = itemData.level;
        itemEl.dataset.chain = itemData.chain;
        if (itemData.type === 'GENERATOR') { itemEl.classList.add('generator'); itemEl.dataset.level = itemData.level; }
        if (itemData.type === 'JOKER') itemEl.classList.add('joker-item');
        if (itemData.type === 'SCISSOR') itemEl.classList.add('scissor-item');

        const emojiEl = document.createElement('span');
        emojiEl.className = 'item-emoji';
        emojiEl.textContent = itemData.emoji;
        const lvEl = document.createElement('span');
        lvEl.className = 'item-level';
        lvEl.textContent = itemData.level;
        itemEl.appendChild(emojiEl);
        itemEl.appendChild(lvEl);
        itemEl.style.setProperty('--item-color', itemData.color);
        cellEl.appendChild(itemEl);
    }

    renderAll() { for (let i = 0; i < this.cells.length; i++) this.renderCell(i); }

    // ============================================================
    // POINTER EVENTS — Unified tap & drag
    // ============================================================

    onPointerDown(e, index) {
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;

        // Locked cell: tap to unlock
        if (this.locked.has(index)) {
            const onUp = (ev) => {
                document.removeEventListener('pointerup', onUp);
                if (Math.abs(ev.clientX - sx) < this._dragThreshold && Math.abs(ev.clientY - sy) < this._dragThreshold)
                    this.handleLockedCellClick(index);
            };
            document.addEventListener('pointerup', onUp);
            return;
        }

        // Empty cell: ignore
        if (!this.cells[index]) return;

        this._isDragging = false;
        this.dragSource = null;

        const onMove = (ev) => {
            if (!this._isDragging) {
                if (Math.abs(ev.clientX - sx) > this._dragThreshold || Math.abs(ev.clientY - sy) > this._dragThreshold) {
                    this._isDragging = true;
                    this.dragSource = index;
                    this.getCellEl(index).classList.add('dragging');
                    const d = ITEMS[this.cells[index]];
                    if (d) {
                        this.dragGhost = document.createElement('div');
                        this.dragGhost.className = 'drag-ghost';
                        this.dragGhost.textContent = d.emoji;
                        this.dragGhost.style.left = ev.clientX + 'px';
                        this.dragGhost.style.top = ev.clientY + 'px';
                        document.body.appendChild(this.dragGhost);
                    }
                }
            }
            if (this._isDragging && this.dragGhost) {
                this.dragGhost.style.left = ev.clientX + 'px';
                this.dragGhost.style.top = ev.clientY + 'px';
                const t = document.elementFromPoint(ev.clientX, ev.clientY);
                document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));
                document.querySelectorAll('.side-recycle-bin.drag-over').forEach(b => b.classList.remove('drag-over'));
                if (t) {
                    const gc = t.closest('.grid-cell');
                    const rb = t.closest('.side-recycle-bin');
                    if (gc && parseInt(gc.dataset.index) !== this.dragSource) gc.classList.add('drop-target');
                    else if (rb) rb.classList.add('drag-over');
                }
            }
        };

        const onUp = (ev) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            if (this._isDragging) {
                if (this.dragGhost) { this.dragGhost.remove(); this.dragGhost = null; }
                const cel = this.getCellEl(this.dragSource);
                if (cel) cel.classList.remove('dragging');
                document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));
                const t = document.elementFromPoint(ev.clientX, ev.clientY);
                if (t) {
                    const rb = t.closest('.side-recycle-bin');
                    const gc = t.closest('.grid-cell');
                    if (rb) {
                        this.handleRecycle(this.dragSource);
                        document.querySelectorAll('.side-recycle-bin').forEach(b => b.classList.remove('drag-over'));
                    } else if (gc) {
                        const ti = parseInt(gc.dataset.index);
                        if (ti !== this.dragSource) this.tryMergeOrSwap(this.dragSource, ti);
                    }
                }
                this.dragSource = null;
            } else if (Math.abs(ev.clientX - sx) < this._dragThreshold && Math.abs(ev.clientY - sy) < this._dragThreshold) {
                this.handleCellClick(index);
            }
            this._isDragging = false;
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }

    // ============================================================
    // CELL CLICK
    // ============================================================

    handleCellClick(index) {
        const itemId = this.cells[index];
        if (!itemId) return;
        const d = ITEMS[itemId];
        if (!d) return;
        if (this.logic.scissorMode) { this.useScissorOnCell(index); return; }
        if (d.type === 'GENERATOR') { this.handleGeneratorClick(index); return; }
        if (d.type === 'SCISSOR') { this.activateScissorMode(); return; }
    }

    // ============================================================
    // GENERATOR — Tap to Produce
    // ============================================================

    handleGeneratorClick(index) {
        const itemId = this.cells[index];
        const d = ITEMS[itemId];
        if (!d || d.type !== 'GENERATOR') return;
        if (this.logic.isGeneratorCoolingDown(index)) return;

        const cost = GAME_CONFIG.ENERGY_COST_PER_SPAWN || 5;
        if (!this.game.energy.canSpend(cost)) {
            this.game.shakeElement(document.getElementById('energy-bar'));
            return;
        }

        const dropId = this.logic.rollGeneratorDrop(itemId);
        if (!dropId) return;

        let ei = this.logic.findAdjacentEmptyCells(index)[0];
        if (ei === undefined) ei = this.logic.findEmptyCell();
        if (ei === -1) { this.game.shakeElement(this.gridEl); return; }

        const isFree = this.logic.isFreeProduction(itemId);
        if (!isFree) this.game.energy.spend(cost);
        this.logic.incrementGeneratorClicks(index);
        this.logic.setCell(ei, dropId);
        this.logic.initGeneratorState(ei, dropId);

        this.renderCell(ei);
        Effects.spawnPop(this.getCellEl(ei));
        AudioManager.playSound('pop');

        // ⚡ Double Gen bonus: produce a second item if active
        if (this.game._doubleGenTurns > 0) {
            const dropId2 = this.logic.rollGeneratorDrop(itemId);
            if (dropId2) {
                let ei2 = this.logic.findAdjacentEmptyCells(index)[0];
                if (ei2 === undefined) ei2 = this.logic.findEmptyCell();
                if (ei2 !== -1) {
                    this.logic.setCell(ei2, dropId2);
                    this.logic.initGeneratorState(ei2, dropId2);
                    this.renderCell(ei2);
                    Effects.spawnPop(this.getCellEl(ei2));
                    this.game._doubleGenTurns--;
                    Effects.showToast(I18n.t('inventory.doubleGenUsed', {turns: this.game._doubleGenTurns}));
                }
            }
        }

        const cel = this.getCellEl(index);
        cel.classList.add('gen-produce');
        setTimeout(() => cel.classList.remove('gen-produce'), 400);

        this.game.checkOrderCompletion();
        if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
        if (this.game.save) this.game.save.saveAll();
    }

    // ============================================================
    // MERGE / SWAP
    // ============================================================

    tryMergeOrSwap(srcIdx, tgtIdx) {
        if (this.locked.has(tgtIdx)) return;
        const result = this.logic.tryMergeOrSwap(srcIdx, tgtIdx);
        if (!result) return;
        this.renderCell(srcIdx);
        this.renderCell(tgtIdx);

        if (result.action === 'merge') {
            AudioManager.playSound('merge');
            Effects.mergePopAt(this.getCellEl(tgtIdx));
            if (this.game.collection) this.game.collection.discoverItem(result.nextId);
            this.game.checkOrderCompletion();
            if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
            const nd = ITEMS[result.nextId];
            if (nd && !nd.nextId) {
                this.showMaxLevelEffect(result.nextId);
                if (this.game.achievements) this.game.achievements.increment('maxLevelItems');
            }
            if (this.game.achievements) this.game.achievements.increment('merges');
        } else if (result.action === 'joker') {
            AudioManager.playSound('merge');
            Effects.mergePopAt(this.getCellEl(tgtIdx));
            this.game.checkOrderCompletion();
            if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
            if (this.game.achievements) this.game.achievements.increment('merges');
        }
        if (this.game.save) this.game.save.saveAll();
    }

    // ============================================================
    // RECYCLE — Drag to Side Bin
    // ============================================================

    handleRecycle(index) {
        if (this.locked.has(index) || !this.cells[index]) return;
        if (!this.logic.canSellItem(index)) { Effects.showToast(I18n.t('boardCantRecycle')); return; }

        const amt = this.logic.getRecycleEnergy(index);
        const cel = this.getCellEl(index);
        this.logic.clearCell(index);
        this.logic.clearGeneratorState(index);
        this.renderCell(index);

        if (amt > 0) { this.game.energy.recover(amt); Effects.energyRecycle(cel, amt); }
        if (this.game.achievements) this.game.achievements.increment('recycled');
        this.game.checkOrderCompletion();
        if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
        if (this.game.save) this.game.save.saveAll();
    }

    // ============================================================
    // LOCKED CELL — Click to Unlock
    // ============================================================

    handleLockedCellClick(index) {
        const cost = this.logic.getUnlockCost();
        const gold = this.game.currency ? this.game.currency.gold : 0;
        const canAfford = gold >= cost;
        const ex = document.querySelector('.unlock-confirm');
        if (ex) ex.remove();

        const cel = this.getCellEl(index);
        const rect = cel.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.className = 'unlock-confirm';
        popup.style.left = (rect.left + rect.width / 2) + 'px';
        popup.style.top = rect.top + 'px';
        popup.innerHTML =
            '<div class="unlock-confirm-text">' + I18n.t('boardUnlockCell') + '</div>' +
            '<div class="unlock-confirm-cost ' + (canAfford ? '' : 'too-expensive') + '">' + (typeof I18n !== 'undefined' ? I18n.emoji('coin') : '💰') + ' ' + cost + '</div>' +
            '<div class="unlock-confirm-buttons">' +
            '<button class="unlock-no">' + I18n.t('boardCancel') + '</button>' +
            '<button class="unlock-yes ' + (canAfford ? '' : 'disabled') + '" ' + (canAfford ? '' : 'disabled') + '>' + I18n.t('boardUnlock') + '</button>' +
            '</div>';

        document.getElementById('game-container').appendChild(popup);
        popup.querySelector('.unlock-no').addEventListener('click', () => popup.remove());
        popup.querySelector('.unlock-yes').addEventListener('click', () => {
            if (!canAfford) return;
            this.game.currency.spendGold(cost);
            this.unlockCells([index]);
            popup.remove();
        });
        setTimeout(() => { if (popup.parentNode) popup.remove(); }, 5000);
    }

    unlockCells(indices) {
        this.logic.unlockCells(indices);
        for (const idx of indices) {
            const cel = this.getCellEl(idx);
            cel.classList.remove('locked');
            cel.classList.add('unlock-anim');
            setTimeout(() => cel.classList.remove('unlock-anim'), 600);
        }
        if (this.game.achievements) this.game.achievements.increment('cellsUnlocked', indices.length);
        if (this.game.save) this.game.save.saveAll();
    }

    // ============================================================
    // SCISSOR MODE
    // ============================================================

    activateScissorMode() {
        this.logic.scissorMode = true;
        this.gridEl.classList.add('scissor-active');
        Effects.showToast(I18n.t('boardScissorTap'));
    }

    deactivateScissorMode() {
        this.logic.scissorMode = false;
        this.gridEl.classList.remove('scissor-active');
    }

    useScissorOnCell(index) {
        const result = this.logic.useScissorOnItem(index);
        this.deactivateScissorMode();
        if (!result.success) {
            const msgs = { empty: I18n.t('boardSplitFailEmpty'), no_data: I18n.t('boardSplitFailNoData'), too_low: I18n.t('boardSplitFailTooLow'), invalid_type: I18n.t('boardSplitFailInvalidType'), no_prev: I18n.t('boardSplitFailNoPrev'), no_space: I18n.t('boardSplitFailNoSpace') };
            Effects.showToast(msgs[result.reason] || I18n.t('boardSplitFailDefault'));
            return;
        }
        this.renderCell(result.targetIdx);
        this.renderCell(result.emptyIdx);
        Effects.mergePopAt(this.getCellEl(result.targetIdx));
        if (this.game.inventory) this.game.inventory.removeItem('scissor');
        this.game.checkOrderCompletion();
        if (this.game.dailyOrders) this.game.dailyOrders.updateHighlights();
        if (this.game.save) this.game.save.saveAll();
    }

    // ============================================================
    // PLACE INITIAL GENERATORS
    // ============================================================

    placeInitialGenerators() {
        this.logic.placeInitialGenerators();
        // Render the cells where generators were placed
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i]) this.renderCell(i);
        }
    }

    // ============================================================
    // FIND / REMOVE HELPERS (proxy to logic)
    // ============================================================

    findEmptyCell() { return this.logic.findEmptyCell(); }
    findItem(itemId) { return this.logic.findItem(itemId); }
    findAllItems(itemId) { return this.logic.findAllItems(itemId); }

    removeItem(index) {
        this.logic.clearCell(index);
        this.logic.clearGeneratorState(index);
        this.renderCell(index);
    }

    spawnItem(itemId) {
        const ei = this.logic.findEmptyCell();
        if (ei === -1) return false;
        this.logic.setCell(ei, itemId);
        this.logic.initGeneratorState(ei, itemId);
        this.renderCell(ei);
        Effects.spawnPop(this.getCellEl(ei));
        return true;
    }

    hasEmptySpace() { return this.logic.hasEmptySpace(); }

    spawnItemById(itemId) {
        return this.spawnItem(itemId);
    }

    // ============================================================
    // MAX LEVEL EFFECT
    // ============================================================

    showMaxLevelEffect(itemId) {
        const d = ITEMS[itemId];
        if (!d) return;
        const overlay = document.createElement('div');
        overlay.className = 'max-level-overlay';
        overlay.innerHTML =
            '<div class="max-level-card">' +
            '<div class="max-level-emoji">' + d.emoji + '</div>' +
            '<div class="max-level-title">MAX LEVEL!</div>' +
            '<div class="max-level-name">' + d.name + '</div>' +
            '<div class="max-level-sub">' + I18n.t('inventory.maxLevelReached') + '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => overlay.remove());
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 3000);
    }
}
