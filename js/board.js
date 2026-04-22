// ============================================================
// board.js — 7×9 Grid: State, Rendering, Drag-Drop, Merge
// ============================================================

class Board {
    constructor(game) {
        this.game = game;
        this.cols = GAME_CONFIG.BOARD_COLS;
        this.rows = GAME_CONFIG.BOARD_ROWS;
        this.cells = new Array(this.cols * this.rows).fill(null); // itemId or null
        this.locked = new Set(LOCKED_CELLS_INITIAL);
        this.gridEl = document.getElementById('game-grid');
        this.dragSource = null;
        this.dragGhost = null;
        this.goldEl = document.getElementById('gold-text');
        this.gold = 0;
        this.buildGrid();
    }

    buildGrid() {
        this.gridEl.innerHTML = '';
        this.gridEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        this.gridEl.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;

        for (let i = 0; i < this.cols * this.rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = i;

            if (this.locked.has(i)) {
                cell.classList.add('locked');
            }

            // Touch / mouse events for drag
            cell.addEventListener('pointerdown', (e) => this.onPointerDown(e, i));
            cell.addEventListener('pointerup', (e) => this.onPointerUp(e, i));
            // Double-tap to sell
            cell.addEventListener('dblclick', () => this.sellItem(i));

            this.gridEl.appendChild(cell);
        }
    }

    getCellEl(index) {
        return this.gridEl.children[index];
    }

    renderCell(index) {
        const cellEl = this.getCellEl(index);
        if (!cellEl) return;

        // Clear content
        const existing = cellEl.querySelector('.item');
        if (existing) existing.remove();

        if (this.locked.has(index)) {
            cellEl.classList.add('locked');
            return;
        }
        cellEl.classList.remove('locked');

        const itemId = this.cells[index];
        if (!itemId) return;

        const itemData = ITEMS[itemId];
        if (!itemData) return;

        const itemEl = document.createElement('div');
        itemEl.className = 'item';
        itemEl.dataset.level = itemData.level;
        itemEl.dataset.chain = itemData.chain;

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

    renderAll() {
        for (let i = 0; i < this.cells.length; i++) {
            this.renderCell(i);
        }
        this.renderGold();
    }

    renderGold() {
        if (this.goldEl) this.goldEl.textContent = `🪙 ${this.gold}`;
    }

    // ---- Drag & Drop ----
    onPointerDown(e, index) {
        if (this.locked.has(index) || !this.cells[index]) return;
        e.preventDefault();
        this.dragSource = index;
        const cellEl = this.getCellEl(index);
        cellEl.classList.add('dragging');

        // Create ghost
        const itemData = ITEMS[this.cells[index]];
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'drag-ghost';
        this.dragGhost.textContent = itemData.emoji;
        this.dragGhost.style.left = e.clientX + 'px';
        this.dragGhost.style.top = e.clientY + 'px';
        document.body.appendChild(this.dragGhost);

        const onMove = (ev) => {
            if (this.dragGhost) {
                this.dragGhost.style.left = ev.clientX + 'px';
                this.dragGhost.style.top = ev.clientY + 'px';
            }
            // Highlight potential target
            const target = document.elementFromPoint(ev.clientX, ev.clientY);
            document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));
            if (target && target.classList.contains('grid-cell') && target.dataset.index != this.dragSource) {
                target.classList.add('drop-target');
            }
        };

        const onUp = (ev) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            if (this.dragGhost) {
                this.dragGhost.remove();
                this.dragGhost = null;
            }
            cellEl.classList.remove('dragging');
            document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));

            const target = document.elementFromPoint(ev.clientX, ev.clientY);
            if (target && target.closest('.grid-cell')) {
                const targetCell = target.closest('.grid-cell');
                const targetIdx = parseInt(targetCell.dataset.index);
                if (targetIdx !== this.dragSource) {
                    this.tryMergeOrSwap(this.dragSource, targetIdx);
                }
            }
            this.dragSource = null;
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }

    onPointerUp(e, index) {
        // handled in onPointerDown's onUp
    }

    tryMergeOrSwap(srcIdx, tgtIdx) {
        if (this.locked.has(tgtIdx)) return;

        const srcItem = this.cells[srcIdx];
        const tgtItem = this.cells[tgtIdx];

        if (!srcItem) return;

        // If target is empty, just move
        if (!tgtItem) {
            this.cells[tgtIdx] = srcItem;
            this.cells[srcIdx] = null;
            this.renderCell(srcIdx);
            this.renderCell(tgtIdx);
            return;
        }

        // If same item, merge
        if (srcItem === tgtItem) {
            const itemData = ITEMS[srcItem];
            if (itemData.nextId) {
                this.cells[srcIdx] = null;
                this.cells[tgtIdx] = itemData.nextId;
                this.renderCell(srcIdx);
                this.renderCell(tgtIdx);
                Effects.mergePopAt(this.getCellEl(tgtIdx));
                // Check if this completes an order
                this.game.checkOrderCompletion();
                return;
            }
            // Max level, can't merge — swap instead
        }

        // Different items: swap
        this.cells[srcIdx] = tgtItem;
        this.cells[tgtIdx] = srcItem;
        this.renderCell(srcIdx);
        this.renderCell(tgtIdx);
    }

    // ---- Sell item ----
    sellItem(index) {
        if (this.locked.has(index) || !this.cells[index]) return;
        const itemData = ITEMS[this.cells[index]];
        this.gold += itemData.sellPrice;
        this.cells[index] = null;
        this.renderCell(index);
        this.renderGold();
        Effects.spawnParticles(this.getCellEl(index), 5, '🪙');
    }

    // ---- Spawn item ----
    spawnItem(itemId) {
        const emptyIdx = this.findEmptyCell();
        if (emptyIdx === -1) return false;
        this.cells[emptyIdx] = itemId;
        this.renderCell(emptyIdx);
        Effects.spawnPop(this.getCellEl(emptyIdx));
        return true;
    }

    findEmptyCell() {
        // Prefer center cells first
        const center = Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 2);
        const indices = [];
        for (let i = 0; i < this.cells.length; i++) indices.push(i);
        indices.sort((a, b) => {
            const da = Math.abs(a - center);
            const db = Math.abs(b - center);
            return da - db;
        });
        for (const idx of indices) {
            if (!this.locked.has(idx) && this.cells[idx] === null) return idx;
        }
        return -1;
    }

    // ---- Find items on board ----
    findItem(itemId) {
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i] === itemId) return i;
        }
        return -1;
    }

    findAllItems(itemId) {
        const result = [];
        for (let i = 0; i < this.cells.length; i++) {
            if (this.cells[i] === itemId) result.push(i);
        }
        return result;
    }

    removeItem(index) {
        this.cells[index] = null;
        this.renderCell(index);
    }

    // ---- Unlock cells ----
    unlockCells(indices) {
        for (const idx of indices) {
            this.locked.delete(idx);
            const cellEl = this.getCellEl(idx);
            cellEl.classList.remove('locked');
            cellEl.classList.add('unlock-anim');
            setTimeout(() => cellEl.classList.remove('unlock-anim'), 600);
        }
    }

    hasEmptySpace() {
        return this.findEmptyCell() !== -1;
    }
}
