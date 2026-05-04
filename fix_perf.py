#!/usr/bin/env python3
with open('css/style.css', 'r') as f:
    c = f.read()
c = c.replace('  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);\n}\n.grid-cell:active', '  background: rgba(255,255,255,0.18);\n}\n.grid-cell:active')
c = c.replace('box-shadow: 0 0 8px rgba(255, 215, 0, 0.25), inset 0 0 6px rgba(255, 215, 0, 0.08);\n  animation: generator-breathe', 'box-shadow: 0 0 8px rgba(255, 215, 0, 0.25);\n  animation: generator-breathe')
c = c.replace('0%, 100% { box-shadow: 0 0 6px rgba(255, 215, 0, 0.2), inset 0 0 4px rgba(255, 215, 0, 0.05); }\n  50% { box-shadow: 0 0 14px rgba(255, 215, 0, 0.4), inset 0 0 8px rgba(255, 215, 0, 0.12); }', '0%, 100% { opacity: 0.8; }\n  50% { opacity: 1; }')
c = c.replace('0% { box-shadow: 0 0 10px rgba(241, 196, 15, 0.3); }\n  100% { box-shadow: 0 0 25px rgba(241, 196, 15, 0.6); }', '0% { opacity: 0.85; }\n  100% { opacity: 1; }')
c = c.replace('0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.04); }\n  50% { box-shadow: 0 2px 16px rgba(255, 152, 0, 0.25); }', '0%, 100% { opacity: 0.85; }\n  50% { opacity: 1; }')
c = c.replace('0% { box-shadow: 0 2px 8px rgba(255, 152, 0, 0.35); }\n  100% { box-shadow: 0 2px 16px rgba(255, 152, 0, 0.6); }', '0% { opacity: 0.8; }\n  100% { opacity: 1; }')
c = c.replace('0%, 100% { box-shadow: 0 0 6px rgba(255, 215, 0, 0.4); }\n  50% { box-shadow: 0 0 16px rgba(255, 215, 0, 0.8); }', '0%, 100% { opacity: 0.8; }\n  50% { opacity: 1; }')
c = c.replace('0%, 100% { box-shadow: 0 0 4px rgba(255, 215, 0, 0.4); }\n  50% { box-shadow: 0 0 12px rgba(255, 215, 0, 0.8); }', '0%, 100% { opacity: 0.8; transform: scale(1); }\n  50% { opacity: 1; transform: scale(1.1); }')
c = c.replace('0%, 100% { box-shadow: 0 0 4px rgba(241,196,15,0.4); }\n    50% { box-shadow: 0 0 12px rgba(241,196,15,0.8); }', '0%, 100% { opacity: 0.8; }\n    50% { opacity: 1; }')
c = c.replace('0%, 100% { border-color: rgba(255, 107, 157, 0.3); box-shadow: none; }\n  50% { border-color: #FF1744; box-shadow: 0 0 15px rgba(255, 23, 68, 0.3); }', '0%, 100% { border-color: rgba(255, 107, 157, 0.3); opacity: 0.8; }\n  50% { border-color: #FF1744; opacity: 1; }')
with open('css/style.css', 'w') as f:
    f.write(c)
print('CSS fixes done')