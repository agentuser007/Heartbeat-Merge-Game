# Plan: Replace Boss Avatars with No-BG Versions & Remove Frames

## Summary

Replace all boss/male lead avatar images from the `_bg.webp` / `.webp` versions to the `_no_bg.png` transparent versions, and remove all decorative borders, border-radius, and box-shadows from avatar UI elements so only the raw image is displayed at a constrained size.

## Avatar Mapping

| Boss             | Current File                 | New File                          |
| ---------------- | ---------------------------- | --------------------------------- |
| Morven (林墨白)  | `assets/avatar/morven.webp`  | `assets/avatar/morven_no_bg.png`  |
| Leo (陆之昂)     | `assets/avatar/leo.webp`     | `assets/avatar/leo_no_bg.png`     |
| Daniel           | `assets/avatar/daniel.webp`  | `assets/avatar/daniel_no_bg.png`  |
| Vincent (司徒渊) | `assets/avatar/vincent.webp` | `assets/avatar/vincent_no_bg.png` |

---

## Changes by File

### 1. `assets/data/levels.json`

Replace `bossAvatar` paths for all 4 levels:

- Line 6: `"assets/avatar/morven.webp"` → `"assets/avatar/morven_no_bg.png"`
- Line 80: `"assets/avatar/leo.webp"` → `"assets/avatar/leo_no_bg.png"`
- Line 160: `"assets/avatar/daniel.webp"` → `"assets/avatar/daniel_no_bg.png"`
- Line 244: `"assets/avatar/vincent.webp"` → `"assets/avatar/vincent_no_bg.png"`

### 2. `js/vn-reader.js`

Update `CHARACTER_MAP` avatar paths (lines 7-13):

- `'assets/avatar/morven.webp'` → `'assets/avatar/morven_no_bg.png'`
- `'assets/avatar/daniel.webp'` → `'assets/avatar/daniel_no_bg.png'`
- `'assets/avatar/vincent.webp'` → `'assets/avatar/vincent_no_bg.png'`
- `'assets/avatar/leo.webp'` → `'assets/avatar/leo_no_bg.png'`

### 3. `index.html` — Parade Scene Carrier Avatars

Update inline `background-image` styles (lines 305-338):

- Line 308: `url("assets/avatar/vincent.webp")` → `url("assets/avatar/vincent_no_bg.png")`
- Line 317: `url("assets/avatar/leo.webp")` → `url("assets/avatar/leo_no_bg.png")`
- Line 326: `url("assets/avatar/daniel.webp")` → `url("assets/avatar/daniel_no_bg.png")`
- Line 336: `url("assets/avatar/morven.webp")` → `url("assets/avatar/morven_no_bg.png")`

### 4. `css/style.css` — Remove Avatar Frames/Borders

#### 4a. `#boss-portrait` — Main boss header portrait

**Primary definition (line ~3248-3258):**

```css
/* BEFORE */
#boss-portrait {
  width: 18cqw;
  height: 18cqw;
  border: 2px solid var(--caramel);
  border-radius: 2.5cqw;
  background: url('../assets/avatar/boss_bg.webp') center bottom / cover no-repeat;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.15);
  ...
}

/* AFTER */
#boss-portrait {
  width: 18cqw;
  height: 18cqw;
  border: none;
  border-radius: 0;
  background: none;
  box-shadow: none;
  ...
}
```

**Secondary definition (line ~359-364):**

```css
/* BEFORE */
#boss-portrait {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

/* AFTER — remove box-shadow transition since no shadow */
#boss-portrait {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  transition: transform 0.3s ease;
}
```

**`#boss-blush` (line ~366-370):**

```css
/* BEFORE */
#boss-blush {
  position: absolute; width: 100%; height: 100%; border-radius: 50%;
  ...
}

/* AFTER — remove border-radius to match non-circular portrait */
#boss-blush {
  position: absolute; width: 100%; height: 100%;
  ...
}
```

**`#boss-portrait::after` (line ~3260-3262):**
Already `display: none` — no change needed.

#### 4b. `#dialogue-portrait` — Dialogue popup portrait (line ~1481-1486)

```css
/* BEFORE */
#dialogue-portrait {
  width: 86px; height: 86px; border-radius: 50%;
  background: #4A90D9; ...
  border: 4px solid white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

/* AFTER */
#dialogue-portrait {
  width: 86px; height: 86px;
  border-radius: 0;
  background: transparent; ...
  border: none;
  box-shadow: none;
}
```

#### 4c. `.male-avatar` — Parade scene male avatars (line ~1546-1552)

```css
/* BEFORE */
.male-avatar {
  width: 65px; height: 65px; border-radius: 50%;
  background-size: cover; background-position: center top;
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  ...
}

/* AFTER */
.male-avatar {
  width: 65px; height: 65px;
  border-radius: 0;
  background-size: cover; background-position: center top;
  border: none;
  box-shadow: none;
  ...
}
```

#### 4d. Responsive media queries — Remove `border-width` overrides

These media query rules set `border-width` on `#boss-portrait` which is no longer needed:

- Line ~2683: remove `border-width: 2px;` from `#boss-portrait` rule
- Line ~2722: remove `border-width: 2px;` from `#boss-portrait` rule
- Line ~2758: remove `border-width: 2px;` from `#boss-portrait` rule
- Line ~2789: remove `border-width: 3px;` from `#boss-portrait` rule

### 5. `js/boss.js` — Remove Background Color

Line 54 in `_onLevelLoaded`:

```js
// BEFORE
this.bossPortraitEl.style.backgroundColor = data.bossColor;

// AFTER — remove this line entirely, transparent PNGs should have no bg color
```

---

## Files Modified (Summary)

| File                      | Type of Change                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/data/levels.json` | Replace 4 bossAvatar paths                                                                                                                         |
| `js/vn-reader.js`         | Replace 4 avatar paths in CHARACTER_MAP                                                                                                            |
| `index.html`              | Replace 4 inline background-image URLs                                                                                                             |
| `css/style.css`           | Remove borders, border-radius, box-shadow, bg from `#boss-portrait`, `#dialogue-portrait`, `.male-avatar`, `#boss-blush`, and responsive overrides |
| `js/boss.js`              | Remove `backgroundColor` assignment                                                                                                                |

## Visual Effect

- **Before**: Avatars shown in circular/rounded frames with colored borders, shadows, and background fills
- **After**: Avatars shown as raw transparent PNGs with only size constraints — no circular clipping, no borders, no shadows, no background colors
