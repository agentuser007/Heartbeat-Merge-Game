# Fix: Top Status Bar & Boss Header Layout

## Problem Summary

The top info bar and boss/quest area are visually broken due to multiple conflicting CSS override passes that were generated from Figma exports. The key visual bugs are:

1. **Tilted avatar** — `#avatar-btn` has `transform: rotate(28.93deg)` applied in two different CSS override passes
2. **Mysterious "0"** — The `#diamond-value` defaults to "0" and is absolutely positioned in a confusing spot; the `#rank-badge .rank-avatar` also shows a number that looks orphaned
3. **Boss portrait & quest carousel misaligned** — `#boss-header` uses `top: -45.02cqw` (negative offset pushing it upward), and `#main-quest-card` uses `left: -39.55cqw` (negative offset pushing it left), creating a completely broken layout

## Root Cause: CSS Override Chaos

The file [`css/style.css`](css/style.css) contains **5 overlapping layout passes** for the same elements, each overriding the previous:

| Pass                 | Lines     | Approach                                 | Issues                                     |
| -------------------- | --------- | ---------------------------------------- | ------------------------------------------ |
| Base styles          | 180–263   | Clean flexbox                            | Good, but overridden                       |
| Figma scale pass     | 3037–3210 | CSS Grid + absolute + `rotate(28.93deg)` | Avatar rotation, absolute chaos            |
| cqw correction       | 3599–3688 | Container query units                    | Still has rotation                         |
| Upper UI correction  | 3926–4073 | `display: block` + all children absolute | Different absolute positions               |
| Figma exact top-half | 4141–4401 | All absolute, negative offsets           | Boss header at `-45cqw`, quest at `-39cqw` |

**The last pass wins**, so the current rendered layout is controlled by the "Figma exact top-half layout pass" — which has the tilted avatar, orphaned number, and broken boss/quest positioning.

## Fix Strategy

### Step 1: Remove avatar rotation

Remove `transform: rotate(28.93deg)` from `#avatar-btn` in ALL override passes:

- Line 3067
- Line 4171

### Step 2: Redesign the top status bar layout

Replace the chaotic absolute positioning in the last two override passes with a clean **flexbox row** layout. The top bar should flow left-to-right:

```
[Avatar] [Energy⚡ value +] [Diamond💎 value +] [Gold💰] [Shop🛒] [Rank]
```

Key changes:

- `#top-status-bar`: Use `display: flex; align-items: center; gap: ...` instead of `display: block` + all-children-absolute
- Remove all `position: absolute` + `left/top` on individual status bar children
- Keep `#avatar-btn` as a normal flex child — no rotation, no special offset
- `#rank-badge`: Keep as `margin-left: auto` to push it to the right edge
- `#gold-label`: Normal flex child, not absolute
- `.status-value`: Normal flow next to their icon buttons, not absolute
- `.plus-btn`: Normal flow, not absolute

### Step 3: Fix the rank-badge design

The current rank badge shows "Rank" text + a circle with a number. This is confusing because:

- The number looks like an orphaned "0" or "1"
- It duplicates information that could be shown elsewhere

Redesign options:

- **Option A**: Simplify to just show the rank number inside a small badge/pill (e.g. `Lv.1` or `R1`), remove the separate circle avatar
- **Option B**: Replace the rank-avatar circle with the actual player avatar image, and show rank as a small subscript

I recommend **Option A** — a compact pill badge like `Lv.1` that fits neatly at the end of the status bar.

### Step 4: Fix boss header & quest carousel positioning

The boss header is currently positioned with `top: -45.02cqw` which pushes it above its parent. The quest carousel uses `left: -39.55cqw` which pushes it far left.

Fix approach:

- `#boss-header`: Remove negative `top` offset. Position it at the top of the board-frame using `position: relative` or a small positive offset
- `#boss-portrait`: Use normal flex flow within `#boss-info-row` instead of absolute positioning
- `#quest-carousel`: Use normal flex flow below the boss-info-row instead of absolute positioning with negative left
- `#main-quest-card`: Remove `left: -39.55cqw`, let it flow naturally in the carousel

### Step 5: Consolidate CSS override passes

After making the fixes above, the multiple override passes will still conflict. We need to:

- Keep the **base styles** (lines 180–263) as the canonical layout
- Keep the **cqw unit conversion** for responsive sizing
- **Delete** the conflicting absolute-positioning rules from the Figma scale pass, Upper UI correction, and Figma exact top-half pass
- Ensure only ONE set of layout rules exists for the top status bar and boss header

## Visual Target

```
┌──────────────────────────────────────────┐
│  [👤]  ⚡100 [+]  💎0 [+]  💰128k  🛒  R1 │  ← Clean flex row
├──────────────────────────────────────────┤
│  [Boss    ]  Boss Name ♥                 │
│  [Portrait]  ████████░░ HP               │
│  [        ]  [🍕🥤 ✓Submit] [🍩 ☑]      │  ← Quest cards in a row
├──────────────────────────────────────────┤
│                                          │
│           Game Grid                      │
│                                          │
└──────────────────────────────────────────┘
```

## Files to Modify

| File                               | Changes                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`css/style.css`](css/style.css)   | Remove avatar rotation, fix top bar layout, fix boss header positioning, consolidate override passes |
| [`index.html`](index.html:78-141)  | Simplify `#rank-badge` HTML to a compact pill format                                                 |
| [`index.html`](index.html:219-237) | Verify quest carousel HTML structure supports flex flow                                              |

## Implementation Order

1. Fix `#avatar-btn` rotation (quick win, immediate visual improvement)
2. Rewrite top status bar layout in the final override pass to use flexbox
3. Simplify `#rank-badge` in HTML + CSS
4. Fix `#boss-header` and `#quest-carousel` positioning
5. Clean up / remove conflicting CSS override rules from earlier passes
6. Test on iPhone 15 viewport (393×852)
