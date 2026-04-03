# AOI vs Paragraph Display Area Analysis

## ✅ CONFIRMED: AOI and Paragraph Areas Are DIFFERENT

### Calibration Area of Interest (AOI)
**Location**: `CALIBRATION_POINTS` in `constants.ts`

```
X-Axis: 0.2 to 0.8 (60% of screen width, horizontally centered)
Y-Axis: 0.1 to 0.65 (10% to 65% of screen height)

Grid Points: 3x5 (15 total)
- X columns: [0.2, 0.35, 0.5, 0.65, 0.8]
- Y rows: [0.1, 0.375, 0.65]
```

**Visual Layout (1920×1080 screen):**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  0% ────────────────────────────────────────────┤
│                                                 │
│  10% ●─────●─────●─────●─────●  (Row 1)      │
│      │           │           │                 │
│      │   CALIBRATION AOI    │                 │
│      │    (X: 20%-80%)      │                 │
│      │                       │                 │
│ 37.5%●─────●─────●─────●─────●  (Row 2)      │
│      │                       │                 │
│  65%●─────●─────●─────●─────●  (Row 3)      │
│                                                 │
│      ← 384px → ← Center → ← 384px →           │
│      (on 1920px wide screen)                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### Paragraph Display Area
**Location**: `task-display.tsx` (lines 385-400)

```
Container: 
  - Position: Full screen (inset-0, z-40)
  - X Padding: px-8, sm:px-16, md:px-24, lg:px-32
  - Y Start: pt-[15vh] = 150px (on 1080px height)

Content:
  - Max width: max-w-5xl = 64rem = ~1024px
  - Centered horizontally
  - Flexible width with padding
```

**Visual Layout (1920×1080 screen):**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  0% ────────────────────────────────────────────┤
│                                                 │
│  10% [CALIBRATION AOI only here]               │
│                                                 │
│ 13.9% (150px)  ┌──────────────────────┐        │
│                │ PARAGRAPH           │        │
│                │ (max-w-5xl)          │        │
│                │ Extends to bottom    │        │
│                │ of screen            │        │
│                │                      │        │
│ 60%+ ────────────                      │        │
│                │                      │        │
│ 100%────────────┴──────────────────────┴        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## The Coordinate Space Problem

### During Calibration
Gaze points are recorded while user looks at calibration dots:
- **Dots positioned**: X ∈ [0.2, 0.8], Y ∈ [0.1, 0.65]
- **Calibration learns**: How screen position → eye tracking data

### During Paragraph Reading
Gaze points are recorded while user reads text:
- **Text positioned**: 
  - X: Flexible (depends on padding/responsiveness)
  - Y: Starts at ~0.14 (15vh), extends to bottom
- **Problem**: Text may extend BELOW the AOI's Y-max of 0.65

### What Happens in Between
1. **Calibration**: Trains mapping from eye-tracking → screen position [0.1, 0.65]
2. **Reading**: Text extends beyond this range (especially below 0.65)
3. **Gaze Recording**: Eye tracker records positions > 0.65
4. **Calibration Application**: Uses learned mapping on out-of-range data
5. **Result**: Extrapolation errors, inaccurate Y-positioning

---

## Specific Coordinate Space Mismatch

### X-Axis
| Aspect | Calibration | Paragraph |
|--------|-----------|-----------|
| Range | 0.2 - 0.8 | 0.15 - 0.85* |
| Width | 60% screen | ~53% screen (1024px on 1920px)** |
| Centered | ✓ Yes | ✓ Yes |
| Issue | AOI mapping applies horizontally | May be narrower than AOI |

*Estimated based on max-w-5xl centering with padding
**At large breakpoints (lg:px-32)

### Y-Axis
| Aspect | Calibration | Paragraph |
|--------|-----------|-----------|
| Range | 0.1 - 0.65 | 0.14 - 1.0 |
| Height | 55% screen | ~86% screen |
| Issue | **Text extends far below calibration area** | **Extrapolation happens here** |

---

## Why This Causes Misalignment

### Problem Sequence
1. Gaze recorded in eye-tracking space (e.g., [400, 600] in camera frame)
2. Calibration learned: `screen_y = a·camera_y + b` using Y ∈ [0.1, 0.65]
3. During reading, user looks at text at Y = 0.8 (below AOI)
4. Eye tracker records camera coordinates for that position
5. Calibration formula extrapolates: `screen_y = a·camera_y + b`
6. Linear extrapolation may be **inaccurate** at Y > 0.65
7. **Result**: Reported Y-position doesn't match actual visual position

### Numerical Example
```
Calibration learned: screen_y = 0.75 * camera_y + 0.05
Valid range: camera_y ∈ [100, 600] (corresponds to screen 0.1-0.65)

Reading at Y = 0.8 (below AOI):
- Actual position: 0.8
- User looks there: camera_y ≈ 666
- Calibration calculates: 0.75 * 666 + 0.05 = 499.5 (extrapolated!)
- Result: Reported Y might be 0.75, but actual is 0.8
- Error: 5% downward bias
```

---

## Solution Options

### Option A: Expand Calibration AOI to Match Reading Area
**Move calibration points to cover the full reading range**

Change in `constants.ts`:
```typescript
// Current
{ x: 0.2, y: 0.65 },  // Bottom row at 65%

// Proposed
{ x: 0.2, y: 0.85 },  // Move to 85% to cover full text area
```

**Pros:**
- Calibration learned over actual data range
- Better accuracy below 0.65
- No extrapolation needed

**Cons:**
- May hit eyelid occlusion issues at bottom of screen
- Longer calibration time (more points)

### Option B: Restrict Reading Content to Calibration AOI
**Keep paragraph within Y ∈ [0.1, 0.65]**

Change in `task-display.tsx`:
```typescript
// Current
'pt-[15vh]'  // 150px = 13.9% on 1080px

// Proposed
'pt-[10vh] pb-[35vh]'  // Fit within AOI bounds
```

**Pros:**
- No calibration changes needed
- Stays within validated range
- Prevents extrapolation

**Cons:**
- Less reading space
- Text may be too cramped
- Might reduce engagement

### Option C: Apply Coordinate Space Remapping
**Account for AOI bounds in gaze pipeline**

In `gaze-replay-viewer.tsx` or backend:
```typescript
// Remap gaze from full-screen [0, 1] to actual text bounds
const aoi_y_min = 0.1;
const aoi_y_max = 0.65;
const text_y_min = 0.14;
const text_y_max = 1.0;

// If gaze is outside calibration range, remap
if (gazey > aoi_y_max) {
  remappedY = text_y_min + (gazey - aoi_y_min) * 
              (text_y_max - text_y_min) / (aoi_y_max - aoi_y_min);
}
```

**Pros:**
- No changes to calibration or layout
- Can be applied retroactively

**Cons:**
- Requires knowing exact text bounds
- May introduce additional errors
- Less accurate than expanding AOI

---

## Recommendation

**Option A (Expand Calibration AOI)** is best because:
1. ✓ Solves extrapolation problem at source
2. ✓ Provides accurate calibration over full range
3. ✓ No coordinate space remapping needed
4. ✓ Y-axis line snapping then works perfectly
5. ✓ Reading experience not constrained

**Next Step**: Modify `CALIBRATION_POINTS` Y-values to [0.1, 0.375, 0.8] instead of [0.1, 0.375, 0.65], and adjust calibration component positioning accordingly.

---

## Current Status

**Issue**: ✅ **CONFIRMED REAL**

The AOI used for calibration (Y: 0.1-0.65) is smaller than the paragraph reading area (Y: 0.14-1.0). This causes:
- Gaze recorded outside calibration range (Y > 0.65)
- Linear calibration extrapolates with potential error
- Y-axis snapping receives inaccurate coordinates
- Bubbles misaligned, especially in lower paragraphs

