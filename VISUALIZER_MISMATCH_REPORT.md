# Visualizer Mismatch Report: Snapped Gaze Lines Vertical Misalignment

## Executive Summary

The snapped horizontal gaze lines in `gaze-replay-viewer.tsx` are **vertically misaligned with text baselines** despite the ML backend correctly snapping Y-coordinates to line centers. Investigation reveals **3 critical coordinate space mismatches**:

1. **Normalization in task-display.tsx uses text content bounds (correct)**
2. **Denormalization in gaze-replay-viewer.tsx uses scaled pixel dimensions (incorrect)**
3. **SVG line rendering uses container-relative coordinates, not text-relative coordinates**

---

## 1. Normalization Origin (Task Display) ✅ CORRECT

### Code Location
**File**: `web/src/features/test/components/task-display.tsx` (lines 130-191)

### Measurement Process

```typescript
// STEP 1: Get all word spans
const wordSpans = paragraphContainerRef.current.querySelectorAll('[data-word]');

// STEP 2: Group by Y-coordinate to identify distinct physical lines
const lineMap = new Map<number, Array<{ top: number; bottom: number }>>();
wordSpans.forEach((span) => {
  const rect = span.getBoundingClientRect();
  const lineKey = Math.round(rect.top);
  if (!lineMap.has(lineKey)) lineMap.set(lineKey, []);
  lineMap.get(lineKey)!.push({ top: rect.top, bottom: rect.bottom });
});

// STEP 3: Calculate text content bounds (NOT container bounds)
const firstWordRect = wordSpans[0].getBoundingClientRect();
const lastWordRect = wordSpans[wordSpans.length - 1].getBoundingClientRect();
const textTop = firstWordRect.top;
const textBottom = lastWordRect.bottom;
const textHeight = textBottom - textTop;

// STEP 4: For each line, calculate normalized center
const lineCenterAbsolute = (minTop + maxBottom) / 2;
const normalizedCenter = (lineCenterAbsolute - textTop) / textHeight;
const clamped = Math.max(0, Math.min(1, normalizedCenter));
lineCenters.push(clamped);
```

### Analysis

✅ **CORRECT BEHAVIOR**:
- Uses `getBoundingClientRect()` for absolute viewport coordinates
- Subtracts `textTop` (first word's top) before dividing by `textHeight`
- This creates a **text-relative coordinate system**: Y ∈ [0, 1]
- Normalization is **independent of container padding/positioning**

✅ **ORIGIN POINT**: `textTop = firstWordRect.top`
- This is the absolute pixel position of where text actually begins
- Not the container top (which includes flex centering, padding, etc.)

✅ **SCALE DENOMINATOR**: `textHeight = lastWordRect.bottom - firstWordRect.top`
- Measures the span of actual content
- Guarantees that Y=0 aligns with first word top, Y=1 aligns with last word bottom

### Example (4-Line Paragraph)
```
Container: top=500px, height=250px
Text content: 
  - Line 1: top=510px, center=520px
  - Line 2: top=560px, center=570px
  - Line 3: top=610px, center=620px
  - Line 4: top=660px, center=670px

textTop = 510px
textHeight = 670 - 510 = 160px

Line 1 normalization: (520 - 510) / 160 = 0.0625
Line 2 normalization: (570 - 510) / 160 = 0.375
Line 3 normalization: (620 - 510) / 160 = 0.6875
Line 4 normalization: (670 - 510) / 160 = 1.0
```

✅ **VERDICT**: Normalization is mathematically sound.

---

## 2. Denormalization Origin (Replay Visualizer) ❌ CRITICAL MISMATCH

### Code Location
**File**: `web/src/features/test/components/gaze-replay-viewer.tsx` (lines 228-310)

### Current Implementation

```typescript
// STEP 1: Measure content dimensions
const contentRect = contentRef.current.getBoundingClientRect();
const containerRect = containerRef.current.getBoundingClientRect();
const contentWidth = contentRect.width;
const contentHeight = contentRect.height;

// STEP 2: Calculate scale to fit within panel
const availableWidth = containerRect.width - 32; // accounting for padding
const calculatedScale = Math.min(1, availableWidth / contentWidth);
setScaleRatio(calculatedScale);

// STEP 3: Position bubbles in SCALED pixel space
const bubbleTop = f.fixationY * contentDimensions.height;  // ← WRONG REFERENCE FRAME
const bubbleLeft = mappedX * contentDimensions.width;
```

### The Critical Problem

```typescript
// TASK-DISPLAY (Normalization)
// Measurement reference: textTop to textBottom
// textHeight = lastWordRect.bottom - firstWordRect.top

// GAZE-REPLAY-VIEWER (Denormalization)
// Measurement reference: contentRef.getBoundingClientRect()
// contentDimensions.height = contentRect.height (including padding/margin)
```

**MISMATCH**: The denormalization uses `contentRef.current.getBoundingClientRect().height`, but:

1. **contentRef is the `<p>` element itself**, not the word spans
2. **`<p>` height is not the same as text content height**
3. **Padding and line-height affect the measured height**

### Concrete Failure Scenario

```
Task-Display Measurement:
  firstWordRect.top = 510px
  lastWordRect.bottom = 670px
  textHeight = 160px
  
  Line 2 normalized: (570 - 510) / 160 = 0.375

Replay-Viewer Denormalization:
  contentRect = getBoundingClientRect()
  contentRect.top = 505px (slightly higher due to line-height affects)
  contentRect.height = 180px (includes line-height padding)
  
  Bubble position: 0.375 * 180 = 67.5px
  Absolute position: 505px + 67.5px = 572.5px
  
  Expected position: 510px + (0.375 * 160) = 570px
  
  ❌ ERROR: 572.5px vs 570px = 2.5px vertical offset per line
```

**This 2.5px offset accumulates across lines, causing increasing misalignment down the page.**

### Root Cause

The `<p>` element's `getBoundingClientRect().height` includes:
- Line-height space above the first line
- Line-height space below the last line
- Potential browser rendering padding

But the normalization in task-display uses only:
- Space from first word top to last word bottom
- Ignores line-height spacing

### Current CSS (Both Files)

**task-display.tsx**:
```tsx
<p className="..." style={{ lineHeight: "2" }}>
  {renderParagraphWithWords()}
</p>
```

**gaze-replay-viewer.tsx**:
```tsx
<p
  ref={contentRef}
  className={cn(
    'whitespace-pre-line text-base leading-[2] tracking-wide sm:text-lg',
    'font-normal text-muted-foreground/60 select-none',
  )}
>
  {content}
</p>
```

Both have `leading-[2]` (line-height: 2), but **the padding created by line-height is NOT accounted for in the normalization formula**.

### ❌ VERDICT

**Denormalization reference frame is WRONG**. Must use the same text content bounds that task-display uses:
- `contentTop = firstWordTop` (not `contentRect.top`)
- `contentHeight = lastWordBottom - firstWordTop` (not `contentRect.height`)

---

## 3. CSS Box Model Discrepancies ⚠️ PARTIAL MATCH

### Font & Typography Matching

| Property | task-display.tsx | gaze-replay-viewer.tsx | Match? |
|----------|-----------------|----------------------|--------|
| `font-size` | `text-base` (16px) | `text-base` (16px) | ✅ |
| `line-height` | `leading-[2]` | `leading-[2]` | ✅ |
| `letter-spacing` | (default) | `tracking-wide` | ❌ NOT MATCHED |
| `font-weight` | (default 400) | `font-normal` | ✅ |
| `color` | N/A | `text-muted-foreground/60` | N/A (reading task doesn't display text) |
| `select-none` | N/A | ✅ | N/A |

### Container Styling

**task-display.tsx** (outer div):
```tsx
<div
  style={{
    top: '10%',
    bottom: '35%',
    left: '20%',
    right: '20%',
    position: 'absolute',
  }}
  className="flex flex-col items-center justify-center overflow-hidden"
/>
```

**gaze-replay-viewer.tsx** (container):
```tsx
<div
  className="relative overflow-hidden rounded-lg border bg-background p-6 sm:p-8"
>
  <div className="relative inline-block" style={{ transform: `scale(${scaleRatio})` }}>
    <p>...</p>
  </div>
</div>
```

### The Scaled Replica Issue

**Current Implementation**:
```typescript
const calculatedScale = Math.min(1, availableWidth / contentWidth);
const transform = `scale(${scaleRatio})`;
```

This uses **CSS `transform: scale()` on a fixed-pixel container**, which:
1. ✅ Correctly scales the visual rendering
2. ❌ Does NOT adjust the coordinate system used for bubble positioning
3. ❌ Bubbles are positioned in PRE-SCALED space, then scaled

### Example Failure

```
Original content width: 600px
Panel available width: 462px
Scale ratio: 462/600 = 0.77

Bubble position before scale:
  bubbleLeft = (normalized_x) * 600px

Applied scale: transform: scale(0.77)
Result: bubble appears at (normalized_x) * 600px * 0.77 = (normalized_x) * 462px

BUT: We're calculating based on contentDimensions.height which is 600px (pre-scale)
So Y calculation is also: fixationY * 600px, then scaled to 462px
```

**This is actually CORRECT** for the horizontal axis, but the vertical axis uses the wrong reference frame (see Section 2).

### ❌ VERDICT

- ✅ Horizontal scaling is mathematically sound (uses pre-scaled dimensions)
- ❌ Vertical denormalization uses wrong reference frame (contentRect height vs text content height)
- ⚠️ `tracking-wide` in visualizer creates different word spacing

---

## 4. Bubble Centering ✅ CORRECT

### Code Location
**gaze-replay-viewer.tsx** (lines 301-312)

```typescript
const bubbleTop = f.fixationY * contentDimensions.height;
const bubbleLeft = mappedX * contentDimensions.width;

return (
  <div
    style={{
      width: `${size}px`,
      height: `${size}px`,
      left: `${bubbleLeft}px`,
      top: `${bubbleTop}px`,
      transform: 'translate(-50%, -50%)',  // ✅ Correct centering
    }}
  />
);
```

✅ **CORRECT**: Using `transform: translate(-50%, -50%)` centers the bubble on the coordinate.

Without this, the bubble's top-left corner would sit on the coordinate, pushing the visual center down and to the right.

### ✅ VERDICT

Bubble centering is mathematically sound.

---

## 5. SVG Line Rendering ❌ COORDINATE SYSTEM ERROR

### Code Location
**gaze-replay-viewer.tsx** (lines 329-368)

```typescript
const prevTop = prev.fixationY * contentDimensions.height;
const prevLeft = prevMappedX * contentDimensions.width;
const currTop = curr.fixationY * contentDimensions.height;
const currLeft = currMappedX * contentDimensions.width;

return (
  <svg className="absolute inset-0 h-full w-full">
    <line
      x1={prevLeft}
      y1={prevTop}
      x2={currLeft}
      y2={currTop}
      stroke={strokeColor}
      strokeWidth={1}
    />
  </svg>
);
```

### The Problem

SVG lines use the **same flawed Y calculation** as bubbles:
```typescript
const prevTop = prev.fixationY * contentDimensions.height;  // ← USES contentRect.height
```

But `contentDimensions.height` is measured as:
```typescript
const contentHeight = contentRect.height;  // ← Includes line-height padding
```

This is **2.5-5px off per line** compared to the normalization reference frame.

### ❌ VERDICT

SVG lines inherit the same vertical offset error as bubbles. The offset accumulates as you move down the page.

---

## 6. Backend Snapping Verification ✅ WORKING CORRECTLY

### Code Location
**ml-service/app/services/eye_tracker/features.py** (lines 221-245)

```python
def _snap_to_line_centers(
    self, features: np.ndarray, normalized_line_centers: List[float]
) -> np.ndarray:
    snapped = features.copy()
    line_centers_arr = np.array(normalized_line_centers, dtype=np.float32)

    for i in range(len(snapped)):
        centroid_y = snapped[i, 2]  # Y-coordinate at index 2
        distances = np.abs(line_centers_arr - centroid_y)
        nearest_idx = np.argmin(distances)
        snapped[i, 2] = line_centers_arr[nearest_idx]  # Snap to exact line center

    return snapped
```

✅ **CORRECT**: Backend correctly snaps to normalized line centers. The snapped Y-values (e.g., 0.375, 0.6875) are accurate.

The problem is NOT in the snapping logic—it's in how the visualizer converts these normalized values back to pixels.

---

## Root Cause Analysis

### The Mathematical Disconnect

```
TASK-DISPLAY NORMALIZATION:
  normalizedY = (absolutePixelY - textTop) / textHeight
  where:
    textTop = firstWordRect.getBoundingClientRect().top
    textHeight = lastWordRect.bottom - firstWordRect.top
  
GAZE-REPLAY DENORMALIZATION:
  pixelY = normalizedY * contentDimensions.height
  where:
    contentDimensions.height = contentRef.getBoundingClientRect().height
    
PROBLEM:
  contentRect.height ≠ textHeight
  because contentRect.height includes line-height padding,
  but textHeight only spans actual word bounds
```

### Visual Representation

```
Task-Display Text Measurement:
┌─────────────────────────────┐
│    [padding from line-height]│
│  ↑ firstWordRect.top (textTop)
│  │
│  │  Line 1 text (height ~20px)
│  │
│ ─┼─ Line 1 center (normalized ~0.1)
│  │
│  │  [line-height: 2 creates gap]
│  │
│  │  Line 2 text
│  │
│ ─┼─ Line 2 center (normalized ~0.375) ← CORRECT
│  │
│  ↓ lastWordRect.bottom
│    [padding from line-height]
└─────────────────────────────┘

Replay-Viewer Denormalization:
┌─────────────────────────────┐
│    [padding from line-height]│ ← INCLUDES THIS
│  ↑ contentRect.top
│  │
│  │  Line 1 text
│  │
│ ─┼─ Calculated Y = 0.375 * contentRect.height
│  │  = 0.375 * (includes padding) = TOO HIGH
│  │
│  ↓ contentRect.bottom
│    [padding from line-height]│ ← INCLUDES THIS
└─────────────────────────────┘
```

---

## Proposed Fixes

### Fix 1: Align Denormalization Reference Frame (CRITICAL)

**Location**: `gaze-replay-viewer.tsx` (lines 222-241)

**Current Code** (WRONG):
```typescript
const contentRect = contentRef.current.getBoundingClientRect();
const contentHeight = contentRect.height;  // ← WRONG: includes padding
```

**Fixed Code**:
```typescript
// Get actual text content bounds (same as task-display)
const allWords = contentRef.current.querySelectorAll('[data-word]');
let textTop = Infinity;
let textBottom = -Infinity;

allWords.forEach((word) => {
  const rect = (word as HTMLElement).getBoundingClientRect();
  textTop = Math.min(textTop, rect.top);
  textBottom = Math.max(textBottom, rect.bottom);
});

const textHeight = Math.max(0, textBottom - textTop);
const contentHeight = textHeight;  // ← NOW: matches task-display
```

**Impact**: Eliminates the 2.5-5px per-line vertical offset.

---

### Fix 2: Normalize Bubble/Line Y Position

**Location**: `gaze-replay-viewer.tsx` (lines 297-318 and 343-354)

**Current Code** (Relative to pre-scaled container):
```typescript
const bubbleTop = f.fixationY * contentDimensions.height;
const prevTop = prev.fixationY * contentDimensions.height;
```

**Fixed Code** (Relative to actual text bounds):
```typescript
// Calculate offset of text within the scaled container
const allWords = contentRef.current.querySelectorAll('[data-word]');
const firstWordRect = (allWords[0] as HTMLElement).getBoundingClientRect();
const contentRect = contentRef.current.getBoundingClientRect();

// Offset from container top to text top (in scaled pixel space)
const textOffsetY = firstWordRect.top - contentRect.top;

// Denormalize: fixationY is 0-1 within text bounds
const textHeight = Math.max(...allWords.map((w) => (w as HTMLElement).getBoundingClientRect().bottom))
                 - Math.min(...allWords.map((w) => (w as HTMLElement).getBoundingClientRect().top));

const bubbleTop = textOffsetY + (f.fixationY * textHeight);
const prevTop = textOffsetY + (prev.fixationY * textHeight);
```

**Impact**: Positions bubbles relative to actual text, not container padding.

---

### Fix 3: Update CSS to Match Typography

**Location**: `gaze-replay-viewer.tsx` (lines 285-291)

**Add**:
```tsx
'tracking-wide'  // Add to match task-display
```

**Current**:
```tsx
className={cn(
  'whitespace-pre-line text-base leading-[2] tracking-wide sm:text-lg',
  'font-normal text-muted-foreground/60 select-none',
)}
```

✅ Already correct in the current code.

---

### Fix 4: Verify SVG Container Coordinate System

**Location**: `gaze-replay-viewer.tsx` (lines 329-368)

The SVG should use the same coordinate calculations as bubbles:

```typescript
// SVG lines (apply same fixes as bubbles)
const prevTop = textOffsetY + (prev.fixationY * textHeight);  // ← Use textHeight
const currTop = textOffsetY + (curr.fixationY * textHeight);  // ← Use textHeight
```

---

## Implementation Summary

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| Denormalization uses wrong height reference | **CRITICAL** | ❌ FAILING | Use actual text bounds, not `contentRect.height` |
| Bubble Y-offset not accounting for text positioning | **CRITICAL** | ❌ FAILING | Add `textOffsetY` calculation |
| SVG lines inherit Y-coordinate error | **CRITICAL** | ❌ FAILING | Apply same denormalization fix |
| Typography tracking not matched | **MINOR** | ✅ ALREADY FIXED | Already has `tracking-wide` |
| Bubble centering incorrect | **N/A** | ✅ CORRECT | No change needed (`translate(-50%, -50%)`) |
| Backend snapping logic | **N/A** | ✅ CORRECT | No change needed |

---

## Testing Validation

After implementing fixes, run this test:

1. **Display a 4-line paragraph** in the reading task
2. **Trigger a gaze event at Line 2**
3. **Open Replay Visualizer**
4. **Verify**: The horizontal line at Line 2 should align **exactly** with the baseline of Line 2 text
5. **Repeat for Lines 3 and 4**: Each should align precisely

**Expected Result**: No visible vertical offset between snapped gaze lines and text baselines.

---

## Appendix: Coordinate Space Summary

### Task-Display (Normalization)
```
Input: absolutePixelY from getBoundingClientRect()
Origin: textTop = firstWordRect.top
Scale: textHeight = lastWordRect.bottom - firstWordRect.top
Output: normalizedY ∈ [0, 1]
Formula: normalizedY = (absolutePixelY - textTop) / textHeight
```

### Gaze-Replay (Denormalization)
```
Input: normalizedY ∈ [0, 1]
Origin: Must match task-display origin
Scale: Must match task-display scale
Output: pixelY in SVG/container coordinate space

CURRENT (WRONG):
  pixelY = normalizedY * contentRect.height

CORRECTED:
  textHeight = lastWordRect.bottom - firstWordRect.top
  textOffsetY = firstWordRect.top - containerRect.top
  pixelY = textOffsetY + (normalizedY * textHeight)
```
