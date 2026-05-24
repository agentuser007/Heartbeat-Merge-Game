# Plan: Remove Donut Slot & Move Reward Preview into Main Quest Card

## Changes Required

### 1. Remove `#standalone-donut-slot` from HTML & CSS

**Current** in [`index.html`](index.html:144):

```html
<div id="standalone-donut-slot" class="standalone-item-slot">
  <span class="donut-emoji">🍩</span>
</div>
```

This sits in `.quest-row` between the portrait area and `#quest-carousel`. No JS references it (search returned 0 results). Safe to remove entirely.

**CSS to remove** in [`css/style.css`](css/style.css:3681):

- `.standalone-item-slot` rule (lines 3682–3698)
- `.standalone-item-slot .donut-emoji` rule (lines 3700–3704)

### 2. Move `order-reward-preview` from `#boss-portrait` to `#main-quest-card`

**Current behavior** in [`js/boss.js`](js/boss.js:127):

- `_renderRewardPreview()` appends `.order-reward-preview` to `#boss-portrait`
- This is inconsistent with daily cards which append it to the card itself

**Daily card pattern** in [`js/daily-orders.js`](js/daily-orders.js:169):

```js
card.style.position = "relative";
card.appendChild(preview);
```

**Change in [`js/boss.js`](js/boss.js:128)**: Replace portrait mount with card mount:

```js
// Before:
const portrait = document.getElementById("boss-portrait");
portrait.style.position = "relative";
portrait.appendChild(preview);

// After:
const card = document.getElementById("main-quest-card");
card.appendChild(preview);
```

**CSS adjustment** in [`css/style.css`](css/style.css:3707): The `.order-reward-preview` currently uses `top: 22cqw; left: 30cqw` relative to the portrait. Inside `#main-quest-card` (which has `padding-left: 23cqw` and is `65cqw` wide), the positioning needs adjustment:

- `top` should position near the top of the card details area
- `left` should align with the right side of the card content

New values: `top: 2cqw; right: 2cqw;` (anchored to top-right of the card, similar to how daily cards show it).

---

## Files Modified

| File                                  | Change                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`index.html`](index.html:144)        | Remove `#standalone-donut-slot` element                                                     |
| [`css/style.css`](css/style.css:3681) | Remove `.standalone-item-slot` and `.standalone-item-slot .donut-emoji` rules               |
| [`css/style.css`](css/style.css:3707) | Adjust `.order-reward-preview` positioning for `#main-quest-card` context                   |
| [`js/boss.js`](js/boss.js:128)        | Change `_renderRewardPreview()` to append to `#main-quest-card` instead of `#boss-portrait` |
