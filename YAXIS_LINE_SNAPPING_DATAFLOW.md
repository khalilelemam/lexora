# Y-Axis Line Snapping: Data Flow Diagram

## Frontend → Backend Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND: task-display.tsx                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Render paragraphs with word spans <span data-word={idx}>       │
│                                                                     │
│  2. useLayoutEffect triggers:                                       │
│     ├─ Query all word spans via querySelectorAll()                 │
│     ├─ Get getBoundingClientRect() for each span                   │
│     ├─ Group spans by .top → identify distinct lines               │
│     ├─ Calculate vertical center of each line                      │
│     ├─ Normalize to container coords (0.0-1.0)                     │
│     └─ Call onLineCentersReady([0.12, 0.25, 0.38, ...])           │
│                                                                     │
│  3. Parent component (tobii/page.tsx or webcam/page.tsx)           │
│     └─ Stores centers in lineCentersRef                            │
│                                                                     │
│  4. On submit:                                                      │
│     ├─ tobii: Pass lineCentersRef to submitTobiiTest()             │
│     └─ webcam: Pass lineCentersRef to submitWebcamTest()           │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP POST
                             │ + normalizedLineCenters array
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND: predict.py Router                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /eye-tracker/predict                                         │
│  ├─ Extract normalizedLineCenters from request.*.normalizedLineCenters
│  └─ Pass to feature processor                                       │
│                                                                     │
│  POST /webcam/predict                                               │
│  ├─ Extract normalizedLineCenters from request.normalizedLineCenters│
│  └─ Pass to feature processor                                       │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND: Feature Processors                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ EyeTrackerFeatureProcessor.process_gaze_points():                  │
│  1. Extract raw fixations (x, y, duration, ...)                    │
│  2. Filter by duration (80-1000ms)                                 │
│  3. IF normalized_line_centers provided:                            │
│     ├─ For each fixation centroid_y:                               │
│     ├─ Find nearest line center (argmin of distances)              │
│     └─ Snap: centroid_y = line_centers[nearest_idx]               │
│  4. Return snapped features in features_data                        │
│                                                                     │
│ WebcamFeatureProcessor.extract_features():                         │
│  1. Calculate raw centroid_x, centroid_y per fixation              │
│  2. IF normalized_line_centers provided:                            │
│     ├─ Find nearest line center                                    │
│     ├─ Assign line_id = argmin(distances)                          │
│     └─ Snap: centroid_y = line_centers[line_id]                   │
│  3. Determine regression using line_id:                             │
│     ├─ regression = (centroid_x < prev_x) AND (line_id == prev_line_id)
│     └─ return_sweep = (line_id > prev_line_id)                     │
│  4. Return features with snapped Y and flags                        │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP Response
                             │ + fixations with snapped fixation_y
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND: submit-test.ts                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Parse response.features (EyeTrackerFeatureRow or WebcamFeatureRow)│
│  ├─ features[i].fixationY = SNAPPED value (repeating values)       │
│  └─ Maintain as-is for visualization                               │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND: gaze-replay-viewer.tsx                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  For each fixation in features:                                     │
│  ├─ bubble.left = mapGazeX(fixation.fixationX) * 100%              │
│  └─ bubble.top = fixation.fixationY * 100%      ← SNAPPED Y!       │
│                                                                     │
│  RESULT: Perfect horizontal alignment of bubbles with text lines   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Snapping Algorithm Detail

```
For each fixation with centroid_y:

    raw_y = 0.35 (normalized screen coords)
    line_centers = [0.10, 0.22, 0.34, 0.46, 0.58]
    
    Calculate distances:
        |0.35 - 0.10| = 0.25
        |0.35 - 0.22| = 0.13
        |0.35 - 0.34| = 0.01  ← MINIMUM (nearest line)
        |0.35 - 0.46| = 0.11
        |0.35 - 0.58| = 0.23
    
    nearest_idx = argmin(distances) = 2
    
    Snapped fixation:
        centroid_y = line_centers[2] = 0.34
        line_id = 2 (the line index)
```

## Regression Detection: Before vs After

### BEFORE (Y-delta guessing):
```
Fixation 1: x=0.3, y=0.35  → line_id = 0 (guess based on starting point)
Fixation 2: x=0.5, y=0.36  → if (y_delta > 0.04) → line_id++ else keep
Fixation 3: x=0.4, y=0.37  → Ambiguous! Is this a regression or line change?
```

### AFTER (Explicit line_id):
```
Fixation 1: x=0.3, y=0.34 (snapped) → line_id = 2 (exact line center)
Fixation 2: x=0.5, y=0.34 (snapped) → line_id = 2 (same exact center)
           Regression check: x < prev_x AND line_id == prev_line_id? 
           0.5 < 0.3? NO → Not a regression ✓

Fixation 3: x=0.4, y=0.46 (snapped) → line_id = 3 (moved to line 3)
           line_id > prev_line_id? YES → Return sweep ✓
```

## Key Properties

1. **Deterministic**: Same input always produces same output
2. **Stable**: Small input changes don't cause large Y-value jumps
3. **Reversible**: Line_id can be reconstructed from snapped centroid_y
4. **Accurate**: Eliminates vertical calibration drift in hardware
5. **Backward-compatible**: Works with or without line centers
6. **Efficient**: O(n × m) where n ≈ 100 fixations, m ≈ 5-20 lines

---

## Example: Complete Workflow

### Input: Paragraph with 3 lines
```
Line 1: "The quick brown fox"
Line 2: "jumps over the lazy"  
Line 3: "dog on the screen"
```

### Step 1: Frontend Measures
```
Line 1 center: y = 150px (screen) → 0.14 (normalized)
Line 2 center: y = 280px (screen) → 0.27 (normalized)
Line 3 center: y = 410px (screen) → 0.39 (normalized)

Send: normalizedLineCenters = [0.14, 0.27, 0.39]
```

### Step 2: Backend Processes Fixations
```
Raw fixations from eye tracker:
  F1: x=0.12, y=0.136  (noisy, near line 1)
  F2: x=0.32, y=0.267  (noisy, near line 2)
  F3: x=0.28, y=0.265  (regression on line 2)
  F4: x=0.42, y=0.388  (near line 3)

Snapping:
  F1: nearest = 0.14   → x=0.12, y=0.14, line_id=0
  F2: nearest = 0.27   → x=0.32, y=0.27, line_id=1
  F3: nearest = 0.27   → x=0.28, y=0.27, line_id=1
      Regression: x < prev_x AND line_id == prev_line_id? YES ✓
  F4: nearest = 0.39   → x=0.42, y=0.39, line_id=2
      Return sweep: line_id > prev_line_id? YES ✓
```

### Step 3: Frontend Visualization
```
Bubble F1: left=12%, top=14%   ← Perfect alignment with Line 1
Bubble F2: left=32%, top=27%   ← Perfect alignment with Line 2
Bubble F3: left=28%, top=27%   ← Perfect alignment with Line 2 (red=regression)
Bubble F4: left=42%, top=39%   ← Perfect alignment with Line 3
```

Result: Perfectly horizontal gaze replay! 🎯
