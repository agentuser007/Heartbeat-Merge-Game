#!/usr/bin/env python3
import os

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'js', 'main.js')
with open(path, 'r') as f:
    content = f.read()

old_text = '        // Energy: reset to base, then apply permanent upgrades + meta bonus\n        this.energy.max = GAME_CONFIG.MAX_ENERGY;'
new_text = '        // Energy: reset to base, then apply permanent upgrades + meta bonus\n        this.energy.stopRegen();\n        this.energy.max = GAME_CONFIG.MAX_ENERGY;'

if old_text in content:
    content = content.replace(old_text, new_text)
    with open(path, 'w') as f:
        f.write(content)
    print("SUCCESS: Added stopRegen before energy.max reset")
else:
    print("ERROR: Could not find the target text")
    idx = content.find('Energy: reset')
    if idx >= 0:
        print("Found 'Energy: reset' at index", idx)
        print("Context:", repr(content[idx-50:idx+150]))
    else:
        print("'Energy: reset' not found at all")