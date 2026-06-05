# Mobile Aspect Ratio Fix Plan

## Problem Analysis

The current game container (`#game-container`) is stretching to fit the entire screen, causing deformation issues:

- Width and height set to 100% causing horizontal stretching
- Bottom grid cells become rectangular instead of square
- Top UI elements scatter across the screen

## Solution Overview

Lock the game container to a fixed mobile aspect ratio (430px × 932px) while maintaining responsive behavior across different screen sizes.

## Implementation Steps

### 1. Modify CSS for #game-container

Replace the current CSS rules for `#game-container` with the following:

```css
#game-container {
  /* Fixed mobile dimensions with aspect ratio locking */
  width: 430px;
  height: 932px;
  aspect-ratio: 430 / 932;

  /* Screen centering with responsive scaling */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%)
    scale(min(1, calc(100vw / 430), calc(100vh / 932)));
  transform-origin: center center;

  /* Maintain existing styles */
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(
      180deg,
      rgba(255, 225, 204, 0.1) 0%,
      rgba(255, 204, 172, 0.15) 50%,
      rgba(221, 170, 139, 0.2) 100%
    ),
    url("../assets/bg/overlay.png") center/cover no-repeat;
  background-color: #9f9e8b;
  border-radius: 64px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  box-sizing: border-box;
  transition: background 0.8s ease;

  /* Ensure container doesn't exceed viewport */
  max-width: 100vw;
  max-height: 100vh;
}
```

### 2. Explanation of Key Properties

- `width: 430px; height: 932px;`: Sets fixed mobile dimensions
- `aspect-ratio: 430 / 932;`: Maintains aspect ratio when scaled
- `position: absolute; top: 50%; left: 50%;`: Centers container absolutely
- `transform: translate(-50%, -50%) scale(...)`: Centers and scales responsively
- `scale(min(1, calc(100vw / 430), calc(100vh / 932)))`: Scales container to fit screen while maintaining aspect ratio
- `max-width: 100vw; max-height: 100vh;`: Prevents container from exceeding viewport

## Benefits of This Solution

1. **Fixed Aspect Ratio**: Container maintains perfect mobile proportions (430:932)
2. **Responsive Scaling**: Automatically scales to fit any screen size
3. **Centered Display**: Always appears centered on screen
4. **Preserves Square Grid**: Grid cells maintain their square shape due to `aspect-ratio: 1`
5. **No Deformation**: Eliminates stretching issues on larger screens

## Testing Considerations

1. Verify behavior on various screen sizes (mobile, tablet, desktop)
2. Check that grid cells remain square
3. Confirm UI elements are properly positioned
4. Test landscape and portrait orientations
5. Validate touch interactions still work correctly

## Files to Modify

- `css/style.css`: Update the `#game-container` CSS rules

## Implementation Notes

- Preserve all existing visual styles (backgrounds, borders, shadows)
- Maintain existing padding and box-sizing properties
- Keep transition effects for background changes
- Ensure safe area insets are still respected
