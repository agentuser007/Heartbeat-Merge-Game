// ============================================================
// main.js — Game Init & Wiring
// ============================================================

class Game {
    constructor() {
        this.energy = null;
        this.board = null;
        this.boss = null;
        this.dialogue = null;
    }

    async init() {
        await loadGameData();

        this.dialogue = new DialogueSystem();
        this.energy = new EnergySystem();
        this.board = new Board(this);
        this.boss = new BossSystem(this);

        // Wire up generators
        // wait for data to load before wiring up so GENERATORS exists
        const genBtnA = document.getElementById('gen-a-btn');
        const genBtnB = document.getElementById('gen-b-btn');

        // Populate generator buttons dynamically from data
        genBtnA.querySelector('.gen-emoji').textContent = GENERATORS.gen_a.emoji;
        genBtnA.querySelector('.gen-name').textContent = GENERATORS.gen_a.name;

        genBtnB.querySelector('.gen-emoji').textContent = GENERATORS.gen_b.emoji;
        genBtnB.querySelector('.gen-name').textContent = GENERATORS.gen_b.name;

        genBtnA.addEventListener('click', () => this.onGeneratorClick('gen_a'));
        genBtnB.addEventListener('click', () => this.onGeneratorClick('gen_b'));

        // Populate game complete overlay dynamically
        document.querySelector('.complete-emoji').textContent = UI_TEXT.game_complete.emoji;
        document.querySelector('.complete-title').textContent = UI_TEXT.game_complete.title;
        document.querySelector('.complete-subtitle').textContent = UI_TEXT.game_complete.subtitle;
        document.querySelector('.restart-btn').textContent = UI_TEXT.game_complete.button;

        // Render board
        this.board.renderAll();

        // Load first level
        this.boss.loadLevel(0);

        // Show intro
        this.showIntro();
    }

    async showIntro() {
        await this.dialogue.show(
            UI_TEXT.intro.npc,
            UI_TEXT.intro.emoji,
            UI_TEXT.intro.text,
            UI_TEXT.intro.player
        );
    }

    onGeneratorClick(genId) {
        if (!this.energy.canSpend()) {
            this.shakeElement(document.getElementById('energy-bar'));
            return;
        }
        if (!this.board.hasEmptySpace()) {
            this.shakeElement(document.getElementById('game-grid'));
            return;
        }

        this.energy.spend();

        // Pick item based on probabilities
        const gen = GENERATORS[genId];
        const totalWeight = gen.spawns.reduce((s, sp) => s + sp.weight, 0);
        let roll = Math.random() * totalWeight;
        let chosen = gen.spawns[0].itemId;
        for (const sp of gen.spawns) {
            roll -= sp.weight;
            if (roll <= 0) {
                chosen = sp.itemId;
                break;
            }
        }

        this.board.spawnItem(chosen);

        // Animate generator button
        const btn = document.getElementById(genId === 'gen_a' ? 'gen-a-btn' : 'gen-b-btn');
        btn.classList.add('gen-click');
        setTimeout(() => btn.classList.remove('gen-click'), 300);
    }

    checkOrderCompletion() {
        if (this.boss) {
            this.boss.updateOrderHighlights();
        }
    }

    shakeElement(el) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 400);
    }
}

// ---- Start ----
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
