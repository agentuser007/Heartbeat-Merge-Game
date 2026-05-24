# Fix Plan: Locked Cell UI Shift + Unlock Popup + Boss Background

## Issue Analysis

### Issue 1 & 2: Clicking locked cell causes UI upward shift AND unlock popup is missing/invisible

**Root Cause: CSS specificity conflict**

In [`css/style.css`](css/style.css:163), there is a rule:

```css
#game-container > * {
  position: relative;
  z-index: 1;
}
```

This rule uses an ID selector (`#game-container`) which has **higher specificity** than the class selector `.unlock-confirm` at [line 1587](css/style.css:1587):

```css
.unlock-confirm {
  position: absolute; z-index: 250;
  transform: translate(-50%, -100%);
  ...
}
```

When [`handleLockedCellClick()`](js/board.js:317) appends the popup to `#game-container` at [line 338](js/board.js:338):

```js
document.getElementById("game-container").appendChild(popup);
```

The `#game-container > *` rule **overrides** `.unlock-confirm`'s `position: absolute` with `position: relative`. This causes:

- **UI shift**: The popup becomes `position: relative`, taking up flow space in the flex column layout of `#game-container`, pushing all content upward
- **Missing popup**: The popup is rendered at the bottom of the container (in flow) instead of floating near the clicked cell, and the `transform: translate(-50%, -100%)` moves it off-screen or to an unexpected position

### Issue 3: Warm brown background on boss area

**Root Cause: Board-frame background bleeds through transparent boss-header**

The HTML structure in [`index.html`](index.html:134) is:

```html
<div class="board-frame">
  <!-- background: #FFCCAC (warm salmon) -->
  <div id="boss-header">
    <!-- background: transparent -->
    <div id="boss-info-row">
      <!-- no background -->
      <div id="boss-portrait">
        <!-- has own background image -->
        <div id="boss-info">
          <!-- no background -->
          <div id="boss-header-name">
            <!-- purple pill background -->
            <div class="hp-bar-container"><!-- has own background --></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

The [`#boss-header`](css/style.css:335) has `background: transparent`, so the parent [`.board-frame`](css/style.css:621)'s `--board-frame-bg: #FFCCAC` (warm salmon/brown) shows through behind the boss name and HP bar area. The user wants this warm brown background removed from the boss area.

---

## Fix Plan

### Fix 1 & 2: Resolve unlock popup specificity conflict

**Approach: Append popup to `document.body` instead of `#game-container`, and use `position: fixed`**

This avoids the `#game-container > *` specificity conflict entirely and makes the viewport coordinates from `getBoundingClientRect()` work correctly without adjustment.

**Changes in [`js/board.js`](js/board.js:317-347):**

1. Change `document.getElementById('game-container').appendChild(popup)` to `document.body.appendChild(popup)` at [line 338](js/board.js:338)
2. No JS coordinate changes needed — `rect.left`/`rect.top` from `getBoundingClientRect()` are already viewport-relative, which works with `position: fixed`

**Changes in [`css/style.css`](css/style.css:1586-1615):**

1. Change `.unlock-confirm` from `position: absolute` to `position: fixed` at [line 1588](css/style.css:1588)
2. Update the `@keyframes popup-in` animation to use `translate(-50%, -100%)` with `scale()` without the position prefix, since `fixed` positioning doesn't need the same transform origin

### Fix 3: Remove warm brown background from boss area

**Approach: Move `#boss-header` outside `.board-frame` in HTML**

This cleanly separates the boss header from the board frame's warm background, without hacky background overrides.

**Changes in [`index.html`](index.html:134-181):**

Restructure from:

```html
<div class="grid-container">
  <div class="board-frame">
    <div id="boss-header">...</div>
    <div id="game-grid">...</div>
  </div>
</div>
```

To:

```html
<div class="grid-container">
  <div id="boss-header">...</div>
  <div class="board-frame">
    <div id="game-grid">...</div>
  </div>
</div>
```

**Changes in [`css/style.css`](css/style.css):**

1. The `.board-frame` already has `border-radius` on all corners ([line 3164](css/style.css:3164): `border-radius: 2.99cqw`), so the top corners will now be visible — this is correct and desired
2. The `#game-grid` already has bottom-only rounding ([line 3184](css/style.css:3184): `border-radius: 0 0 20px 20px`), which remains correct
3. Verify `.board-frame` padding is adjusted — the top padding previously accommodated the boss-header; now it only wraps the grid, so top padding may need a small increase
4. The `#boss-header` already has `background: transparent` — now it will show the `#game-container` background instead of the board-frame salmon, which is the desired result

---

## File Change Summary

| File                             | Change                                                                    | Lines      |
| -------------------------------- | ------------------------------------------------------------------------- | ---------- |
| [`js/board.js`](js/board.js)     | Append unlock popup to `document.body` instead of `#game-container`       | ~338       |
| [`css/style.css`](css/style.css) | Change `.unlock-confirm` to `position: fixed`                             | ~1588      |
| [`css/style.css`](css/style.css) | Update `@keyframes popup-in` for fixed positioning                        | ~1596-1599 |
| [`index.html`](index.html)       | Move `#boss-header` outside `.board-frame`                                | ~134-181   |
| [`css/style.css`](css/style.css) | Adjust `.board-frame` padding/top-radius if needed after boss-header move | ~3155-3171 |

---

## Risk Assessment

- **Low risk**: The unlock popup fix is self-contained — changing append target and position type
- **Medium risk**: Moving `#boss-header` outside `.board-frame` changes the DOM structure. Any JS that uses `.board-frame` as a positioning context for boss-header elements could break. However, `boss.js` only references elements by ID, not by parent relationship, so this should be safe
- **Testing needed**: Verify on mobile viewport that the boss header still aligns visually with the board frame edge, and that the unlock popup appears near the clicked locked cell
