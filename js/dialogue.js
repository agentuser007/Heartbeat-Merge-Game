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
        this._dialogueId = 0;
        this._typingTimer = null;
        this._typingResolve = null;
        this._skipRequested = false;
        this._currentTypingEl = null;
        this._currentFullText = null;

        document.getElementById('dialogue-close-btn').addEventListener('click', () => this.close());

        // Skip button: skip typewriter and show full text immediately
        const skipBtn = document.getElementById('dialogue-skip-btn');
        if (skipBtn) skipBtn.addEventListener('click', () => this._skipTyping());

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }

    // Returns a promise that resolves when dialogue is dismissed
    // options: { skipBGM: true } — don't switch BGM (for boss order submission dialogue)
    show(npcName, avatarOrEmoji, npcText, playerText, options = {}) {
        return new Promise((resolve) => {
            this._resolveClose = resolve;
            this._skippedBGM = !!options.skipBGM;
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

            // Switch to story BGM (unless skipBGM is set)
            if (!this._skippedBGM) {
                if (AudioManager.getCurrentBGM() === 'game_bgm') {
                    AudioManager.pauseBGM(500);
                }
                AudioManager.playBGM('story_bgm', 800);
            }

            // Show skip button
            const skipBtn = document.getElementById('dialogue-skip-btn');
            if (skipBtn) skipBtn.style.display = 'inline-block';

            // Unique ID for this show() call — prevents stale .then() callbacks
            const id = ++this._dialogueId;

            // Typewriter effect for NPC text
            this._typewrite(this.npcTextEl, npcText, 30).then(() => {
                if (id !== this._dialogueId) return;
                if (playerText) {
                    this.playerTextEl.style.display = 'block';
                    this._typewrite(this.playerTextEl, I18n.emoji('thought') + ' ' + playerText, 25);
                } else {
                    if (skipBtn) skipBtn.style.display = 'none';
                }
            });
        });
    }

    close() {
        this.overlay.classList.remove('active');
        this.isOpen = false;

        // Switch back to game BGM (only if we switched it in show())
        if (!this._skippedBGM) {
            if (AudioManager.getCurrentBGM() === 'story_bgm') {
                AudioManager.stopBGM(500);
            }
            // Use playBGM instead of resumeBGM because pauseBGM + playBGM(story_bgm)
            // destroys the game_bgm element, so there's nothing to resume.
            AudioManager.playBGM('game_bgm', 800);
        }
        this._skippedBGM = false;

        // Resolve pending typewriter Promise so the loop can break cleanly
        if (this._typingResolve) { this._typingResolve(); this._typingResolve = null; }
        if (this._typingTimer) { clearTimeout(this._typingTimer); this._typingTimer = null; }
        this._skipRequested = false;
        const skipBtn = document.getElementById('dialogue-skip-btn');
        if (skipBtn) skipBtn.style.display = 'none';
        if (this._resolveClose) {
            this._resolveClose();
            this._resolveClose = null;
        }
    }

    _skipTyping() {
        // Set flag so _typewrite loop will break naturally and resolve its Promise
        this._skipRequested = true;

        // Resolve the pending await inside _typewrite so the loop can check the flag
        if (this._typingResolve) { this._typingResolve(); this._typingResolve = null; }

        // Clear timer to prevent stale callbacks
        if (this._typingTimer) { clearTimeout(this._typingTimer); this._typingTimer = null; }

        // If player text hasn't been shown yet, keep skip visible for player text
        if (this.playerTextEl.style.display === 'none' && this.playerTextEl.textContent === '') {
            // Player text still pending — skip remains visible
        } else {
            const skipBtn = document.getElementById('dialogue-skip-btn');
            if (skipBtn) skipBtn.style.display = 'none';
        }
    }

    async _typewrite(el, text, speed) {
        el.textContent = '';
        this._currentTypingEl = el;
        this._currentFullText = text;
        for (let i = 0; i < text.length; i++) {
            if (!this.isOpen) break;
            if (this._skipRequested) {
                // Skip requested — show full text and exit loop naturally
                el.textContent = text;
                break;
            }
            if (el.textContent !== text.substring(0, i)) break;
            el.textContent += text[i];
            await new Promise(r => {
                this._typingResolve = r;
                this._typingTimer = setTimeout(() => {
                    this._typingResolve = null;
                    r();
                }, speed);
            });
        }
        // Clear skip flag after this typewriter finishes
        this._skipRequested = false;
        if (this._currentTypingEl === el) {
            this._currentTypingEl = null;
            this._currentFullText = null;
        }
    }
}