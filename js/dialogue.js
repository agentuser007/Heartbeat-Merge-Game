// ============================================================
// dialogue.js — Dialogue Popup System
// ============================================================

class DialogueSystem {
    constructor() {
        this.overlay = document.getElementById('dialogue-overlay');
        this.npcTextEl = document.getElementById('dialogue-npc-text');
        this.playerTextEl = document.getElementById('dialogue-player-text');
        this.npcNameEl = document.getElementById('dialogue-npc-name');
        this.portraitEl = document.getElementById('dialogue-portrait');
        this.isOpen = false;
        this._resolveClose = null;

        document.getElementById('dialogue-close-btn').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }

    // Returns a promise that resolves when dialogue is dismissed
    show(npcName, avatarOrEmoji, npcText, playerText) {
        return new Promise((resolve) => {
            this._resolveClose = resolve;
            this.npcNameEl.textContent = npcName;

            if (avatarOrEmoji && avatarOrEmoji.includes('/')) {
                this.portraitEl.textContent = '';
                this.portraitEl.style.backgroundImage = `url('${avatarOrEmoji}')`;
                this.portraitEl.style.backgroundSize = 'cover';
                this.portraitEl.style.backgroundPosition = 'center top';
            } else {
                this.portraitEl.style.backgroundImage = 'none';
                this.portraitEl.textContent = avatarOrEmoji || '';
            }

            this.npcTextEl.textContent = '';
            this.playerTextEl.textContent = '';
            this.playerTextEl.style.display = 'none';
            this.overlay.classList.add('active');
            this.isOpen = true;

            // Typewriter effect for NPC text
            this._typewrite(this.npcTextEl, npcText, 30).then(() => {
                if (playerText) {
                    this.playerTextEl.style.display = 'block';
                    this._typewrite(this.playerTextEl, '💭 ' + playerText, 25);
                }
            });
        });
    }

    close() {
        this.overlay.classList.remove('active');
        this.isOpen = false;
        if (this._resolveClose) {
            this._resolveClose();
            this._resolveClose = null;
        }
    }

    async _typewrite(el, text, speed) {
        el.textContent = '';
        for (let i = 0; i < text.length; i++) {
            if (!this.isOpen) break;
            el.textContent += text[i];
            await new Promise(r => setTimeout(r, speed));
        }
    }
}
