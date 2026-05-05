// ============================================================
// vn-reader.js — Immersive Visual Novel Reader (AVG/Otome Style)
// ============================================================

var VNReader = (function() {
    var CHARACTER_MAP = {
        '林墨白': { avatar: 'assets/avatar/morven.webp', color: '#7B68EE', background: 'assets/avatar/morven_bg.webp' },
        'Morven': { avatar: 'assets/avatar/morven.webp', color: '#7B68EE', background: 'assets/avatar/morven_bg.webp' },
        'Daniel':  { avatar: 'assets/avatar/daniel.webp', color: '#4169E1', background: 'assets/avatar/daniel_bg.webp' },
        '司徒渊': { avatar: 'assets/avatar/vincent.webp', color: '#483D8B', background: 'assets/avatar/vincent_bg.webp' },
        'Vincent': { avatar: 'assets/avatar/vincent.webp', color: '#483D8B', background: 'assets/avatar/vincent_bg.webp' },
        '陆之昂': { avatar: 'assets/avatar/leo.webp', color: '#FF6347', background: 'assets/avatar/leo_bg.webp' },
        'Leo': { avatar: 'assets/avatar/leo.webp', color: '#FF6347', background: 'assets/avatar/leo_bg.webp' }
    };

    function VR(game) {
        this.game = game; this.overlay = null; this.lines = [];
        this.currentIndex = 0; this.isTyping = false; this.typeTimer = null;
        this.autoMode = false; this.autoTimer = null; this.autoDelay = 3000;
        this.skipMode = false; this.skipTimer = null;
        this.history = []; this.showingHistory = false; this.currentSpeaker = null;
        this.typingSpeed = 45; this.ended = false;
        this._fullText = ''; this._typeCallback = null; this._typeElement = null;
    }

    VR.prototype.open = function(ssrId, storyIndex) {
        if (typeof CG_STORIES === 'undefined' || !CG_STORIES[ssrId]) return;
        var cg = CG_STORIES[ssrId], story = cg.stories[storyIndex];
        if (!story) return;
        this.lines = story.lines && story.lines.length ? story.lines : (story.text ? [{speaker:null,text:story.text}] : []);
        this.currentIndex = 0; this.autoMode = false; this.skipMode = false; this.ended = false;
        this.history = []; this.showingHistory = false; this.currentSpeaker = null;
        this._createUI(cg, story); this._showLine();

        // Switch to story BGM
        AudioManager.playBGM('story_bgm', 800);
    };

    VR.prototype._createUI = function(cg, story) {
        var self = this; this.close();
        var o = document.createElement('div'); o.className = 'vn-overlay'; o.id = 'vn-reader-overlay';
        o.innerHTML = '<div class="vn-background"></div>' +
            '<div class="vn-character-layer"><div class="vn-character-sprite" id="vn-character-sprite"></div></div>' +
            '<div class="vn-controls">' +
            '<button class="vn-btn-back" id="vn-btn-back">←</button>' +
            '<button class="vn-btn-review" id="vn-btn-review">' + I18n.t('vn_reader.review') + '</button></div>' +
            '<div class="vn-dialogue-box" id="vn-dialogue-box">' +
            '<div class="vn-name-tag" id="vn-name-tag"></div>' +
            '<div class="vn-text-content" id="vn-text-content"></div>' +
            '<div class="vn-continue-indicator" id="vn-continue-indicator">▼</div></div>' +
            '<div class="vn-bottom-controls">' +
            '<button class="vn-btn-control vn-btn-skip" id="vn-btn-skip">' + I18n.t('vn_reader.skip') + '</button>' +
            '<button class="vn-btn-control vn-btn-auto" id="vn-btn-auto">' + I18n.t('vn_reader.auto') + '</button></div>' +
            '<div class="vn-history-panel" id="vn-history-panel" style="display:none">' +
            '<div class="vn-history-title">' + I18n.t('vn_reader.dialogueReview') + ' <span class="vn-history-close" id="vn-history-close">✕</span></div>' +
            '<div class="vn-history-list" id="vn-history-list"></div></div>' +
            '<div class="vn-title-overlay" id="vn-title-overlay">' +
            '<div class="vn-title-chapter">' + story.title + '</div>' +
            '<div class="vn-title-cg">' + cg.title + '</div></div>';
        var ci = CHARACTER_MAP[cg.maleLead];
        // Set background portrait instead of small avatar sprite
        if (ci && ci.background) {
            var bg = o.querySelector('.vn-background');
            if (bg) {
                bg.style.setProperty('background-image', "url('" + ci.background + "')", 'important');
            }
        }
        o.querySelector('#vn-btn-back').addEventListener('click', function(e) { e.stopPropagation(); self.close(); });
        o.querySelector('#vn-btn-review').addEventListener('click', function(e) { e.stopPropagation(); self._toggleHistory(); });
        o.querySelector('#vn-btn-skip').addEventListener('click', function(e) { e.stopPropagation(); self._toggleSkip(); });
        o.querySelector('#vn-btn-auto').addEventListener('click', function(e) { e.stopPropagation(); self._toggleAuto(); });
        o.querySelector('#vn-history-close').addEventListener('click', function(e) { e.stopPropagation(); self._toggleHistory(); });
        o.addEventListener('click', function(e) { if (self.showingHistory || e.target.closest('button')) return; if (self.ended) return; self._advance(); });
        document.body.appendChild(o); this.overlay = o;
        requestAnimationFrame(function() { o.classList.add('vn-active'); });
        setTimeout(function() { var t = document.getElementById('vn-title-overlay'); if (t) { t.classList.add('vn-title-fade'); setTimeout(function() { t.style.display = 'none'; }, 800); } }, 2000);
    };

    VR.prototype._showLine = function() {
        if (this.currentIndex >= this.lines.length) { this._showEnd(); return; }
        var line = this.lines[this.currentIndex];
        var nt = document.getElementById('vn-name-tag'), tc = document.getElementById('vn-text-content');
        var ci = document.getElementById('vn-continue-indicator');
        if (!nt || !tc) return;
        if (line.speaker) {
            var charInfo = CHARACTER_MAP[line.speaker];
            // Update background portrait when speaker changes
            if (charInfo && this.currentSpeaker !== line.speaker) {
                var bg = document.querySelector('.vn-background');
                if (bg && charInfo.background) {
                    bg.style.setProperty('background-image', "url('" + charInfo.background + "')", 'important');
                }
                this.currentSpeaker = line.speaker;
            }
            nt.textContent = line.speaker; nt.style.display = 'block';
            nt.classList.remove('vn-narrator');
            if (charInfo) nt.style.background = charInfo.color;
            tc.classList.remove('vn-narrator-text');
        } else {
            nt.textContent = I18n.t('vn_reader.narrator'); nt.style.display = 'block';
            nt.classList.add('vn-narrator');
            nt.style.background = '';
            tc.classList.add('vn-narrator-text');
        }
        ci.style.display = 'none';
        var self = this;
        this._typeText(tc, line.text, function() {
            ci.style.display = 'block';
            if (self.autoMode) self.autoTimer = setTimeout(function() { self._advance(); }, self.autoDelay);
            if (self.skipMode) self.skipTimer = setTimeout(function() { self._advance(); }, 80);
        });
        this.history.push({ speaker: line.speaker || I18n.t('vn_reader.narrator'), text: line.text });
    };

    VR.prototype._typeText = function(el, text, cb) {
        var self = this; this.isTyping = true; el.textContent = ''; var i = 0;
        this._fullText = text; this._typeCallback = cb; this._typeElement = el;
        (function next() { if (i < text.length) { el.textContent += text[i++]; self.typeTimer = setTimeout(next, self.typingSpeed); } else { self.isTyping = false; if (cb) cb(); } })();
    };

    VR.prototype._skipTyping = function() {
        clearTimeout(this.typeTimer);
        if (this._typeElement && this._fullText) this._typeElement.textContent = this._fullText;
        this.isTyping = false; var cb = this._typeCallback; this._typeCallback = null; if (cb) cb();
    };

    VR.prototype._advance = function() {
        if (this.showingHistory) return;
        if (this.isTyping) { this._skipTyping(); return; }
        clearTimeout(this.autoTimer); clearTimeout(this.skipTimer);
        this.currentIndex++; this._showLine();
    };

    VR.prototype._toggleAuto = function() {
        this.autoMode = !this.autoMode; this.skipMode = false;
        var a = document.getElementById('vn-btn-auto'), s = document.getElementById('vn-btn-skip');
        if (this.autoMode) { a.classList.add('vn-btn-active'); a.innerHTML = I18n.t('vn_reader.autoActive'); s.classList.remove('vn-btn-active'); s.innerHTML = I18n.t('vn_reader.skip'); if (!this.isTyping) { var self = this; this.autoTimer = setTimeout(function() { self._advance(); }, this.autoDelay); } }
        else { a.classList.remove('vn-btn-active'); a.innerHTML = I18n.t('vn_reader.auto'); clearTimeout(this.autoTimer); }
    };

    VR.prototype._toggleSkip = function() {
        this.skipMode = !this.skipMode; this.autoMode = false;
        var s = document.getElementById('vn-btn-skip'), a = document.getElementById('vn-btn-auto');
        if (this.skipMode) { s.classList.add('vn-btn-active'); s.innerHTML = I18n.t('vn_reader.skipActive'); a.classList.remove('vn-btn-active'); a.innerHTML = I18n.t('vn_reader.auto'); if (!this.isTyping) { var self = this; this.skipTimer = setTimeout(function() { self._advance(); }, 80); } }
        else { s.classList.remove('vn-btn-active'); s.innerHTML = I18n.t('vn_reader.skip'); clearTimeout(this.skipTimer); }
    };

    VR.prototype._toggleHistory = function() {
        var p = document.getElementById('vn-history-panel'); if (!p) return;
        this.showingHistory = !this.showingHistory;
        if (this.showingHistory) {
            p.style.display = 'flex'; var list = document.getElementById('vn-history-list'); list.innerHTML = '';
            for (var i = 0; i < this.history.length; i++) { var h = this.history[i]; var chi = CHARACTER_MAP[h.speaker]; var c = chi ? chi.color : '#888'; var item = document.createElement('div'); item.className = 'vn-history-item'; item.innerHTML = '<span class="vn-history-speaker" style="color:'+c+'">'+h.speaker+'</span><span class="vn-history-text">'+h.text+'</span>'; list.appendChild(item); }
            list.scrollTop = list.scrollHeight;
        } else { p.style.display = 'none'; }
    };

    VR.prototype._showEnd = function() {
        var tc = document.getElementById('vn-text-content'), nt = document.getElementById('vn-name-tag'), ci = document.getElementById('vn-continue-indicator');
        if (nt) { nt.textContent = I18n.t('vn_reader.end'); nt.style.background = 'rgba(100,100,120,0.85)'; }
        if (tc) tc.textContent = I18n.t('vn_reader.chapterEnded');
        if (ci) ci.style.display = 'none';
        this.autoMode = false; this.skipMode = false; this.ended = true; clearTimeout(this.autoTimer); clearTimeout(this.skipTimer);
        var self = this;
        var handler = function() { self.overlay.removeEventListener('click', handler); self.close(); };
        this.overlay.addEventListener('click', handler);
    };

    VR.prototype.close = function() {
        clearTimeout(this.typeTimer); clearTimeout(this.autoTimer); clearTimeout(this.skipTimer);
        if (this.overlay) { this.overlay.classList.remove('vn-active'); var el = this.overlay; setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 300); this.overlay = null; }

        // Switch back to game BGM (use playBGM instead of stopBGM+resumeBGM)
        setTimeout(function() {
            AudioManager.playBGM('game_bgm', 800);
        }, 50);
    };

    return VR;
})();