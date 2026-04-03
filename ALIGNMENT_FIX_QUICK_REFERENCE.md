# Visualizer Alignment - Quick Reference

## Problem Statement
Snapped horizontal gaze lines in `gaze-replay-viewer.tsx` were **vertically misaligned** with text baselines despite correct snapping in the ML backend.

## Root Cause
The visualizer's denormalization used `contentRect.getBoundingClientRect().height` (includes line-height padding: ~180px) instead of actual text bounds (first-to-last word: ~160px), creating a **2.5-5px per-line vertical offset** that accumulated down the page.

## Solution: 4-Point Fix

### 1. Measure Actual Text Bounds
```typescript
// Get word spans (same elements task-display uses)
const allWords = contentRef.current.querySelectorAll('[data-word]');

// Find min/max of all word positions
let textTop = Infinity, textBottom = -Infinity;
allWords.forEach(word => {
  const rect = word.getBoundingClientRect();
  textTop = Math.min(textTop, rect.top);
  textBottom = Math.max(textBottom, rect.bottom);
});

// Actual content height (no padding)
const textHeight = textBottom - textTop;  // ~160px (not 180px)
```

### 2. Calculate Text Position Within Container
```typescript
const containerRect = containerRef.current.getBoundingClientRect();
const offsetY = textTop - containerRect.top;  // Where text starts relative to container
const offsetX = textLeft - containerRect.left;

setTextOffset({ x: offsetX, y: offsetY });
```

### 3. Position Bubbles With Offset
```typescript
// Normalize within text bounds, then add offset
const bubbleTop = textOffset.y + (f.fixationY * textHeight);
const bubbleLeft = textOffset.x + (mappedX * textWidth);
```

### 4. Position SVG Lines With Offset
```typescript
const prevTop = textOffset.y + (prev.fixationY * textHeight);
const prevLeft = textOffset.x + (prevMappedX * textWidth);
// ... same for curr
```

## Mathematical Verification

**Normalization** (task-display.tsx):
```
normalizedY = (absolutePixelY - textTop) / textHeight
```

**Denormalization** (gaze-replay-viewer.tsx, corrected):
```
pixelY = textOffset.y + (normalizedY * textHeight)
       = (textTop - containerTop) + (normalizedY * textHeight)
       = textTop - containerTop + (absolutePixelY - textTop)
       = absolutePixelY - containerTop  ✓ CORRECT
```

## Files Changed
- `web/src/features/test/components/gaze-replay-viewer.tsx` (4 fixes)

## Result
✅ Snapped lines now align **exactly** with text baselines  
✅ No vertical offset or drift  
✅ Perfectly reciprocal coordinate transformation
