#!/usr/bin/env python3
import os

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'js', 'vn-reader.js')
with open(path, 'r') as f:
    c = f.read()

old = "o.addEventListener('click', function(e) { if (self.showingHistory || e.target.closest('button')) return; self._advance(); });\n        document.body.appendChild(o); this.overlay = o;"

new = "o.addEventListener('click', function(e) { if (self.showingHistory || e.target.closest('button') || e.target.closest('.vn-dialogue-box')) return; self._advance(); });\n        // C-03 fix: Ensure proper z-index and pointer-events for VN layers\n        var dialogueBox = o.querySelector('.vn-dialogue-box');\n        if (dialogueBox) { dialogueBox.style.zIndex = '10'; dialogueBox.style.pointerEvents = 'auto'; }\n        var charLayer = o.querySelector('.vn-character-layer');\n        if (charLayer) { charLayer.style.pointerEvents = 'none'; }\n        var bgLayer = o.querySelector('.vn-background');\n        if (bgLayer) { bgLayer.style.pointerEvents = 'none'; }\n        var controls = o.querySelector('.vn-controls');\n        if (controls) { controls.style.zIndex = '20'; controls.style.pointerEvents = 'auto'; }\n        var bottomControls = o.querySelector('.vn-bottom-controls');\n        if (bottomControls) { bottomControls.style.zIndex = '20'; bottomControls.style.pointerEvents = 'auto'; }\n        document.body.appendChild(o); this.overlay = o;"

if old in c:
    c = c.replace(old, new)
    with open(path, 'w') as f:
        f.write(c)
    print("SUCCESS: C-03 fix applied")
else:
    print("ERROR: target not found")