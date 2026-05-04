#!/usr/bin/env python3
with open('css/style.css', 'r') as f:
    c = f.read()
c = c.replace(
  'background: rgba(0, 0, 0, 0.08); color: rgba(0, 0, 0, 0.3);\n}\n.daily-carousel-submit-btn:disabled',
  'background: rgba(0, 0, 0, 0.08); color: rgba(0, 0, 0, 0.3);\n  pointer-events: auto; position: relative; z-index: 10;\n  -webkit-tap-highlight-color: transparent;\n  touch-action: manipulation;\n}\n.daily-carousel-submit-btn:disabled'
)
c = c.replace(
  'color: white; box-shadow: 0 2px 8px rgba(255, 179, 0, 0.3); opacity: 1;\n}\n.daily-carousel-submit-btn.ready:active',
  'color: white; box-shadow: 0 2px 8px rgba(255, 179, 0, 0.3); opacity: 1;\n  pointer-events: auto;\n}\n.daily-carousel-submit-btn.ready:active'
)
c = c.replace(
  'background: rgba(0, 0, 0, 0.08); color: rgba(0, 0, 0, 0.3);\n}\n.daily-submit-btn:disabled',
  'background: rgba(0, 0, 0, 0.08); color: rgba(0, 0, 0, 0.3);\n  pointer-events: auto; position: relative; z-index: 10;\n  -webkit-tap-highlight-color: transparent;\n  touch-action: manipulation;\n}\n.daily-submit-btn:disabled'
)
with open('css/style.css', 'w') as f:
    f.write(c)
print('CSS fixes applied')