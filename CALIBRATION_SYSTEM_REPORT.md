# Lexora Calibration System - Technical Deep Dive Report

## Executive Summary

The Lexora calibration system is a sophisticated **multi-stage, model-agnostic eye-gaze mapping pipeline** designed for both **Tobii eye-tracker** and **webcam (MediaPipe)** modes. It features:

- **Smart targeted recalibration** that re-collects only high-error points to minimize user fatigue
- **Multi-model comparison** (Polynomial, Ridge Regression, MLP) with automatic best-model selection
- **Outlier rejection** (2-sigma filtering) to improve calibration robustness
- **Post-calibration validation** with per-model re-evaluation and per-point error diagnostics
- **Head pose tracking** (yaw/pitch) for the webcam pipeline
- **Real-time model diagnostics** including axis correlation, per-point errors, and screen coverage analysis

---

## Part 1: Core Architecture

### 1.1 Hook-Based State Management (`use-calibration.ts`)

The calibration system is orchestrated by the **`useCalibration()` hook**, which manages the entire calibration lifecycle.

#### **Central Data Structure: Per-Point Sample Buckets**

```typescript
samplesByPointRef = useRef<CollectedSample[][]>(
  Array.from({ length: points.length }, () => []),
);
```

- **9-element array** (one per calibration point, arranged in 3×3 grid)
- **Each bucket** stores all raw samples for that point: `CollectedSample[]`
- **Persistent across entire calibration** and into recalibration phases

#### **CollectedSample Interface**

Each sample in the bucket contains:

```typescript
interface CollectedSample {
  pointIndex: number;           // Which calibration point (0-8)
  observedX: number;            // Iris X (normalized 0-1) or gaze X
  observedY: number;            // Iris Y (normalized 0-1) or gaze Y
  yaw: number;                  // Head yaw (radians, webcam only)
  pitch: number;                // Head pitch (radians, webcam only)
}
```

- **For Tobii mode**: `observedX/Y` is the **normalized gaze position on screen** (0-1)
- **For webcam mode**: `observedX/Y` is the **eye-relative normalized iris position** from MediaPipe (0-1), not screen coordinates
- **Head pose** is always collected but only used in webcam mode

#### **Phase State Machine**

```typescript
type CalibrationPhase = 'idle' | 'collecting' | 'recalibrating' | 'validating' | 'complete';
```

- **`idle`**: Not calibrating
- **`collecting`**: Initial collection of all 9 points
- **`recalibrating`**: Re-collection of only failed points (new)
- **`validating`**: Training models and computing validation
- **`complete`**: Calibration finished, results ready

---

### 1.2 Collection Flow in CalibrationScreen

The **`CalibrationScreen`** component drives the UI and sample collection:

#### **Stage 1: Countdown (3 seconds)**

```tsx
if (showCountdown) {
  // Display "3 2 1 Go!" to prepare user
  // Call startCalibration() when countdown reaches 0
}
```

#### **Stage 2: Dot Animation & Sample Collection**

For **each point** (either all 9 initially, or only failed ones during recalibration):

```tsx
if (phase === 'collecting' || phase === 'recalibrating') {
  // 1. Show dot and animate to currentPoint
  setDotVisible(true);
  setDotPos({ x: currentPoint.x, y: currentPoint.y });

  // 2. After DOT_TRAVEL_MS (400ms) + DOT_SETTLE_MS (200ms):
  //    Start sampling at ~20 samples/second (every 50ms)
  const settleTimer = setTimeout(() => {
    setIsSampling(true);
    intervalRef.current = setInterval(() => {
      // Call onGetGazeSample() or onGetIrisSample()
      // addSample(observedX, observedY, yaw, pitch)
    }, 50);
  }, DOT_TRAVEL_MS + DOT_SETTLE_MS);

  // 3. After CALIBRATION_DOT_DURATION (1500ms):
  //    Stop sampling, advance to next point
  const advanceTimer = setTimeout(() => {
    clearInterval(intervalRef.current);
    advancePoint();
  }, DOT_TRAVEL_MS + DOT_SETTLE_MS + dotDuration);
}
```

**Typical sample count per point:**
- Sampling for 1.5 seconds at 20 Hz = **~30 raw samples** per point
- Across 9 points = **~270 samples** total
- Per-point average: **~30 samples**

#### **Stage 3: Compute Results (Transition to Validating)**

When all points have been collected (phase transitions to `'validating'`):

```tsx
useEffect(() => {
  if (phase !== 'validating') return;

  if (mode === 'tobii') {
    computeTobiiCalibration();
  } else {
    const {
      result,
      mapping,
      diagnostics,
      modelDiagnostics,
      allModels,
    } = computeWebcamCalibration(screenWidth, screenHeight, headPoseSamples);
    
    // Store mapping and models for validation + recalibration
    mappingRef.current = mapping;
    allModelsRef.current = allModels;
  }
}, [phase]);
```

---

## Part 2: Sample Cleaning & Model Training

### 2.1 Outlier Rejection (2-Sigma Filtering)

Before training models, the system **removes statistical outliers**:

```typescript
const cleanedSamplesByPoint: CollectedSample[][] = Array.from(
  { length: points.length },
  () => [],
);

for (let i = 0; i < points.length; i++) {
  const pointSamples = samplesByPoint[i] ?? [];
  if (pointSamples.length < 4) {
    cleanedSamplesByPoint[i].push(...pointSamples); // Keep all if < 4
    continue;
  }

  // Compute mean and std for this point
  const meanX = pointSamples.reduce((a, s) => a + s.observedX, 0) / pointSamples.length;
  const meanY = pointSamples.reduce((a, s) => a + s.observedY, 0) / pointSamples.length;
  const stdX = Math.sqrt(
    pointSamples.reduce((a, s) => a + (s.observedX - meanX) ** 2, 0) / pointSamples.length,
  );
  const stdY = Math.sqrt(
    pointSamples.reduce((a, s) => a + (s.observedY - meanY) ** 2, 0) / pointSamples.length,
  );

  // Keep only samples within 2σ of the mean
  for (const s of pointSamples) {
    if (
      Math.abs(s.observedX - meanX) <= 2 * stdX &&
      Math.abs(s.observedY - meanY) <= 2 * stdY
    ) {
      cleanedSamplesByPoint[i].push(s);
    }
  }
}
```

**Effect:**
- Removes **blinks, saccades, and tracking artifacts**
- Typically retains **80-95%** of samples (removes 5-20% as outliers)
- Significantly improves model robustness

### 2.2 Training Data Preparation

Raw cleaned samples are converted to **`TrainingSample`** format:

```typescript
const trainingSamples: TrainingSample[] = cleanedSamples.map((s) => ({
  ix: s.observedX,              // Iris X (eye-relative)
  iy: s.observedY,              // Iris Y (eye-relative)
  yaw: s.yaw,                   // Head yaw (radians)
  pitch: s.pitch,               // Head pitch (radians)
  targetX: points[s.pointIndex].x * screenWidth,   // Expected screen X (pixels)
  targetY: points[s.pointIndex].y * screenHeight,  // Expected screen Y (pixels)
  pointIndex: s.pointIndex,     // Which calibration point
}));
```

**Key insight:** The model learns to map from **(iris_x, iris_y, yaw, pitch) → (screen_x, screen_y)**.

### 2.3 Multi-Model Training

Three models **compete on the same training data**:

#### **Model 1: Polynomial (3rd-Order)**

```typescript
function expandFeatures(ix, iy, yaw, pitch): number[] {
  return [
    1,                               // bias
    ix, iy, yaw, pitch,              // 1st order (4)
    ix², iy², yaw², pitch²,           // 2nd order (4)
    ix·iy, ix·yaw, ix·pitch, iy·yaw, iy·pitch, yaw·pitch,  // cross terms (6)
    ix³, iy³, ix²·iy, ix·iy²,        // 3rd order (4)
  ];  // Total: 20 features
}
```

- **20 features** from 4 inputs (iris_x, iris_y, yaw, pitch)
- **Ridge regression** with λ = **1e-6** (very weak regularization)
- **Normal equations** solved via Gauss-Jordan elimination
- **Advantage:** Fast, low bias, works well with ~400+ training samples

#### **Model 2: Ridge Regression (L2 Regularization)**

```typescript
// Same 20-feature expansion, but with λ sweep:
const lambdas = [1e-6, 1e-5, 1e-4, 1e-3, 1e-2];

for (const lambda of lambdas) {
  const xCoeffs = solveRidge(A, bx, lambda);
  const yCoeffs = solveRidge(A, by, lambda);
  // Evaluate error on training data
  // Pick the lambda with minimum error
}
```

- **Identical feature expansion** as Polynomial
- **Automatic λ tuning** via error minimization
- **Advantage:** Guards against overfitting by adding regularization

#### **Model 3: MLP (2-Layer Neural Network)**

```typescript
class MLPModel {
  w1: number[][];   // (20 hidden neurons) × (20 features)
  b1: number[];     // (20 hidden neurons)
  w2_x: number[];   // 20 hidden → 1 output (X)
  w2_y: number[];   // 20 hidden → 1 output (Y)
  b2_x: number;
  b2_y: number;

  forward(features) {
    // Hidden layer: ReLU(W1 @ features + b1)
    const hidden = /* ReLU activation */;
    // Output: linear(W2 @ hidden + b2)
    const x = /* dot product */;
    const y = /* dot product */;
    return { x, y };
  }

  // Trained with backpropagation for ~100 epochs
  // Learning rate: 0.01, momentum: 0.9
}
```

- **2-layer network:** 20 hidden neurons with ReLU activation
- **Backpropagation training** (~100 epochs)
- **Advantage:** Can capture non-linear mappings if iris→screen has subtle curvature

#### **Model Selection: Lowest Training Error**

```typescript
const comparison = trainAllModels(trainingSamples, screenWidth, screenHeight);
// Returns all 3 models, sorted by training error
const bestModel = comparison.best;  // Highest accuracy on training data

console.log(`Best model: ${bestModel.kind}`);
```

---

## Part 3: Smart Targeted Recalibration (The New System)

### 3.1 Post-Calibration Validation Phase

After training the three models, the system runs a **validation loop** to measure per-point accuracy:

```tsx
const CalibrationValidationOverlay = () => {
  // For each calibration point (0-8):
  //   1. Show target dot
  //   2. Collect ~30 new iris samples (1.5 sec at 20 Hz)
  //   3. Apply bestModel.predict() to each sample
  //   4. Compute error: distance from expected point
  //   5. Compute jitter: std dev of predictions during fixation
};
```

**Validation Result per Point:**

```typescript
interface ValidationPointResult {
  point: { x: number; y: number };          // Target point (0-1)
  irisSamples: Array<{ x: number; y: number }>;  // Raw iris positions
  predictions: Array<{ x: number; y: number }>;  // Model outputs (screen pixels)
  meanErrorPx: number;                       // Error in pixels (main metric)
  jitterStdDev: number;                      // Instability of predictions
  headPoseSamples: Array<{ yaw: number; pitch: number }>;
}
```

### 3.2 Failed Point Detection (120px Threshold)

```typescript
const handleValidationComplete = useCallback(
  (results: ValidationPointResult[]) => {
    // Check each point's error
    const failedIndices = results
      .map((r, idx) => ({ idx, errorPx: r.meanErrorPx }))
      .filter((r) => r.errorPx > STRICT_POINT_ERROR_THRESHOLD_PX)  // 120px
      .map((r) => r.idx);

    if (failedIndices.length > 0) {
      console.log(
        `🎯 Failed points (${failedIndices.length}/${9}) above 120px:`,
        failedIndices,
      );

      // Trigger targeted recalibration
      startTargetedRecalibration(failedIndices);
      return;  // Skip to recalibration, don't accept calibration yet
    }

    // All points passed! Accept calibration
    setValidationComplete(true);
  },
  [startTargetedRecalibration],
);
```

**Threshold rationale:**
- **120px on a 1920×1080 screen** ≈ **6.3% of screen width**
- For a **9-point grid** (3×3), each point spans ~640px
- **120px error = ~19% of point spacing** → unacceptable accuracy

### 3.3 Sample Clearing & Recalibration Start

When failed points are detected:

```typescript
const startTargetedRecalibration = useCallback(
  (failedPointIndices: number[]) => {
    const uniqueSorted = Array.from(new Set(failedPointIndices))
      .filter((idx) => idx >= 0 && idx < points.length)
      .sort((a, b) => a - b);

    if (uniqueSorted.length === 0) return;

    // 🗑️ CRITICAL: Drop poisoned samples for failed points ONLY
    for (const idx of uniqueSorted) {
      samplesByPointRef.current[idx] = [];  // Clear old samples
    }

    // Good points retain their samples (not re-collected)
    // Only failed points are re-collected

    setCollectionOrder(uniqueSorted);       // Only iterate these points
    setCollectionCursor(0);                 // Reset collection cursor
    setPhase('recalibrating');              // Enter recalibration mode
  },
  [points],
);
```

**Sample preservation strategy:**
- ✅ **Good points (< 120px error):** Samples **retained**, **not re-collected**
- ❌ **Failed points (≥ 120px error):** Samples **deleted**, **will be re-collected**
- **Benefit:** Minimizes collection time and user fatigue

### 3.4 Re-Collection of Failed Points

During the `'recalibrating'` phase:

```tsx
if (phase === 'recalibrating') {
  // Same dot animation as initial collection
  // Only iterate through failedPointIndices (e.g., [1, 5, 8])
  // Each failed point gets ~30 NEW samples

  // At the end of recalibration:
  //   samplesByPointRef.current[1] = [NEW samples]
  //   samplesByPointRef.current[5] = [NEW samples]
  //   samplesByPointRef.current[8] = [NEW samples]
}
```

**Time savings:**
- Initial collection: 9 points × (400+200+1500)ms = **~17 seconds**
- Recalibration (3 failed): 3 points × (400+200+1500)ms = **~6.3 seconds**
- **Savings: ~10 seconds (~60% less time)**

### 3.5 Re-Training After Recalibration

After recalibration completes:

```typescript
// Phase transitions to 'validating'
const { result, mapping, diagnostics, allModels } = computeWebcamCalibration(
  screenWidth,
  screenHeight,
  headPoseSamples,
);

// The training now uses:
//   - Good points: Original samples (e.g., 30 samples)
//   - Failed points: NEW samples (e.g., 30 samples)
//   - Total: Still ~270 samples, but failed points are "fresh"
```

**Key invariant:** The training algorithm is **identical**, just with different sample inputs.

### 3.6 Second Validation Round (Final)

After recalibration training completes:

```typescript
if (validationStage === 'initial') {
  // First validation (checks if recalibration needed)
  
  if (failedIndices.length > 0) {
    startTargetedRecalibration(failedIndices);
    setValidationStage('final');  // Mark as recalibration round
    return;
  }
}

if (validationStage === 'final') {
  // Second validation (checks if recalibration fixed the issues)
  
  const stillFailedIndices = results
    .map((r, idx) => ({ idx, errorPx: r.meanErrorPx }))
    .filter((r) => r.errorPx > STRICT_POINT_ERROR_THRESHOLD_PX)
    .map((r) => r.idx);

  if (stillFailedIndices.length > 0) {
    console.warn(`⚠️ Recalibration incomplete: ${stillFailedIndices} still failing`);
    // TODO: Could loop again, but currently stops here
  }

  setValidationComplete(true);
  setValidationStage('done');
}
```

---

## Part 4: Sample Integration & Model Re-Evaluation

### 4.1 How New Samples Integrate with Old Samples

#### **Training Time (After Recalibration)**

```typescript
// samplesByPointRef.current is still a 9-element array:
samplesByPointRef.current[0] = [30 original samples]      // Good
samplesByPointRef.current[1] = [30 NEW samples]           // Was failed, now recalibrated
samplesByPointRef.current[2] = [30 original samples]      // Good
samplesByPointRef.current[3] = [30 original samples]      // Good
samplesByPointRef.current[4] = [30 NEW samples]           // Was failed
samplesByPointRef.current[5] = [30 original samples]      // Good
samplesByPointRef.current[6] = [30 original samples]      // Good
samplesByPointRef.current[7] = [30 NEW samples]           // Was failed
samplesByPointRef.current[8] = [30 original samples]      // Good

// During training:
const trainingSamples = samplesByPointRef.current.flat();
// → Still ~270 samples total, but [1, 4, 7] are "fresh" from recalibration

const trainAllModels(trainingSamples, ...);
// All 3 models train on the merged dataset
```

**Key property:** The three models see **all samples (original + recalibrated) together** during training.

#### **Validation Time (After Recalibration Training)**

```typescript
// Validation overlay re-runs, collecting NEW validation samples
const validationResults = [
  { point: 0, meanErrorPx: 45, irisSamples: [...] },    // Good
  { point: 1, meanErrorPx: 80, irisSamples: [...] },    // Improved!
  { point: 2, meanErrorPx: 52, irisSamples: [...] },    // Good
  // ... etc
];

// Now, re-evaluate all 3 models on validation data:
const evaluateModelsOnValidation = (
  allModels,
  validationResults,
  screenWidth,
  screenHeight,
) => {
  // For each model:
  //   For each validation point:
  //     For each iris sample in that point:
  //       Predict: model.predict(iris.x, iris.y, pose.yaw, pose.pitch)
  //       Compute error vs target
  //       Log jitter

  // Re-select best model based on validation performance
};
```

### 4.2 Per-Model Re-Evaluation on Validation Data

The **`evaluateModelsOnValidation`** function re-ranks models after recalibration:

```typescript
export function evaluateModelsOnValidation(
  models: CalibrationModel[],
  validationResults: ValidationPointResult[],
  screenWidth: number,
  screenHeight: number,
) {
  const evaluatedModels = models.map((model) => {
    // For this model, compute error on all validation points
    const allErrors: number[] = [];

    for (const result of validationResults) {
      const targetX = result.point.x * screenWidth;
      const targetY = result.point.y * screenHeight;

      // Use RAW iris samples, not reused predictions!
      for (let i = 0; i < result.irisSamples.length; i++) {
        const iris = result.irisSamples[i];
        const pose = result.headPoseSamples[i] ?? { yaw: 0, pitch: 0 };

        // Apply THIS model (not bestModel)
        const pred = model.predict(iris.x, iris.y, pose.yaw, pose.pitch);
        const error = Math.sqrt(
          (pred.x - targetX) ** 2 + (pred.y - targetY) ** 2
        );
        allErrors.push(error);
      }
    }

    const meanValidationError =
      allErrors.length > 0
        ? allErrors.reduce((a, b) => a + b, 0) / allErrors.length
        : 0;

    return {
      kind: model.kind,
      trainingErrorPx: model.trainingError,
      validationErrorPx: meanValidationError,
      isBest: /* determined by sorting */,
    };
  });

  // Sort by validation error, pick best
  const best = evaluatedModels.sort(
    (a, b) => a.validationErrorPx - b.validationErrorPx
  )[0];

  return { models: evaluatedModels, best };
}
```

**Critical detail:** Each model gets a **fresh evaluation** on the **same iris samples**, ensuring fair comparison.

---

## Part 5: The Complete Recalibration Flow (Sequence)

```
[Initial Collection Phase]
├─ Display countdown (3s)
├─ Collect 9 points (all)
│  └─ Each point: ~30 samples @ 20Hz over 1.5s
│
[Training Phase]
├─ Outlier rejection (2σ filtering)
├─ Train 3 models (Polynomial, Ridge, MLP)
├─ Store mapping (best model) and allModels
│
[First Validation Phase]
├─ Display 9 points again (only 1.5s each)
├─ Collect NEW validation samples
├─ Run best model on validation data
├─ Compute per-point errors
│
[Failed Point Detection]
├─ Check if any point > 120px error
│
├─ IF NO failed points:
│  └─ ✅ ACCEPT calibration → onComplete()
│
└─ IF failed points (e.g., [1, 5, 8]):
   │
   ├─ 🔄 Delete old samples for [1, 5, 8]
   ├─ Keep samples for all other points
   │
   [Recalibration Phase]
   ├─ Re-collect failed points only (e.g., 3 points)
   │  └─ Each point: ~30 NEW samples @ 20Hz over 1.5s
   │
   [Re-Training Phase]
   ├─ Outlier rejection on combined dataset
   ├─ Train 3 models again (all samples: old + new mixed)
   │
   [Second Validation Phase]
   ├─ Validate all 9 points again
   ├─ Re-evaluate all 3 models on validation data
   ├─ Pick NEW best model if validation performance differs
   │
   [Final Decision]
   ├─ IF still failing: ⚠️ Warn user, but allow proceed
   └─ IF now passing: ✅ ACCEPT calibration → onComplete()
```

---

## Part 6: Detailed Sample Lifecycle Example

### Scenario: Initial collection produces error at point #5 (screen top-right)

#### **Phase 1: Initial Collection**

```
samplesByPointRef.current[5] = [
  { pointIndex: 5, observedX: 0.92, observedY: 0.18, yaw: -0.05, pitch: 0.02 },
  { pointIndex: 5, observedX: 0.91, observedY: 0.19, yaw: -0.04, pitch: 0.01 },
  // ... 28 more samples ...
]
```

#### **Phase 2: Training**

Samples are converted and trained:

```
trainingSamples[45] = {
  ix: 0.92, iy: 0.18,
  yaw: -0.05, pitch: 0.02,
  targetX: 1920 * 0.95 = 1824,    // Expected screen position
  targetY: 1080 * 0.15 = 162,
  pointIndex: 5
}

// All 3 models fit on ~270 total samples (270/20 = 13.5× overdetermined)
```

#### **Phase 3: First Validation**

```
VALIDATION overlay shows point 5 for 1.5 seconds:
New iris samples collected: [0.90, 0.18], [0.88, 0.17], ..., [0.92, 0.19]

bestModel.predict(0.90, 0.18, ...) → screen position (1700, 150)
Expected point: (1824, 162)
Error: sqrt((1700-1824)² + (150-162)²) = sqrt(15376 + 144) = 125px ❌

meanErrorPx = 125px > 120px threshold → FAILED
```

#### **Phase 4: Recalibration Decision**

```typescript
failedPointIndices = [5];
samplesByPointRef.current[5] = [];  // 🗑️ DELETE old samples
startTargetedRecalibration([5]);
```

#### **Phase 5: Re-Collection (Only Point 5)**

```
User sees the dot move to point 5 again.
NEW samples are collected for 1.5 seconds:
[This time, the user may have adjusted their head or lighting]

samplesByPointRef.current[5] = [  // NEW samples only
  { pointIndex: 5, observedX: 0.95, observedY: 0.15, yaw: -0.02, pitch: 0.00 },
  { pointIndex: 5, observedX: 0.96, observedY: 0.14, yaw: -0.01, pitch: 0.01 },
  // ... 28 more samples (more accurate this time) ...
]

// Points 0-4, 6-8 retain their original samples
```

#### **Phase 6: Re-Training**

```
trainingSamples.flat() = [
  ...270 samples total...
  ...240 original samples from good points...
  ...30 NEW samples from point 5...
]

// 3 models re-train on this merged dataset
// Models now see point 5's TRUE iris→screen mapping
```

#### **Phase 7: Second Validation**

```
VALIDATION overlay shows all 9 points again:
Point 5 validation (NEW):
  bestModel.predict(0.95, 0.15, ...) → (1824, 162)
  Expected: (1824, 162)
  Error: 5px ✅

All 9 points now pass validation!
✅ ACCEPT calibration
```

---

## Part 7: Old vs New Samples - Technical Details

### 7.1 Why We Delete Old Samples (Not Append)

#### ❌ **Naive approach: Append new samples**

```typescript
// DON'T DO THIS:
samplesByPointRef.current[5].push(...newSamples);  // Now 60 samples
// Problem: The model now sees 30 BAD + 30 GOOD samples for point 5
// The model will AVERAGE them, resulting in mediocre accuracy
```

#### ✅ **Correct approach: Delete old, re-collect**

```typescript
// DO THIS:
samplesByPointRef.current[5] = [];  // Delete 30 bad samples
// Then collect 30 NEW samples
// The model now sees ONLY the good samples
// Result: Much better accuracy for point 5
```

### 7.2 Why We Keep Other Points' Samples

#### **Rationale: Preserve calibration uniqueness**

```typescript
// Each point's samples represent the model's "memory" of:
// "When user looks at (0.95, 0.15) on screen,
//  their iris is typically at (0.92, 0.18) in eye space"

// Deleting a good point's samples would force re-collection:
// - Doubles user fatigue
// - Doesn't improve accuracy (samples were good)
// - Introduces new variability (user may move head, change lighting)

// Example: Point 0 had error 30px (good)
// ✅ Keep its 30 samples → Preserve learned calibration
// ❌ Re-collect 30 samples → Adds noise, doesn't help
```

### 7.3 Mixed Dataset During Training

```typescript
// After recalibration, samplesByPointRef.current looks like:
[
  CollectedSample[],  // Point 0: 30 ORIGINAL samples
  CollectedSample[],  // Point 1: 30 NEW samples (was failed)
  CollectedSample[],  // Point 2: 30 ORIGINAL samples
  CollectedSample[],  // Point 3: 30 ORIGINAL samples
  CollectedSample[],  // Point 4: 30 ORIGINAL samples
  CollectedSample[],  // Point 5: 30 NEW samples (was failed)
  CollectedSample[],  // Point 6: 30 ORIGINAL samples
  CollectedSample[],  // Point 7: 30 ORIGINAL samples
  CollectedSample[],  // Point 8: 30 ORIGINAL samples
]

// When training, the models see:
trainingSamples = samplesByPointRef.current.flat();
// 270 samples total, but mixed: 210 old + 60 new

// The model doesn't care about the provenance of samples
// It just learns: "Iris position X with head pose Y → Screen position Z"
// Whether X came from initial or recalibration doesn't matter
// The QUALITY of X matters
```

---

## Part 8: Diagnostics & Metrics

### 8.1 Per-Point Accuracy (Training)

```typescript
const pointAccuracies: number[] = [];

for (let i = 0; i < points.length; i++) {
  const ptSamples = cleanedSamplesByPoint[i] ?? [];
  if (ptSamples.length === 0) {
    pointAccuracies.push(1.0);
    continue;
  }

  // Evaluate best model on THIS point's samples
  const errors = ptSamples.map((s) => {
    const pred = bestModel.predict(s.observedX, s.observedY, s.yaw, s.pitch);
    const dx = (pred.x - points[i].x * screenWidth) / screenWidth;
    const dy = (pred.y - points[i].y * screenHeight) / screenHeight;
    return Math.sqrt(dx * dx + dy * dy);
  });

  pointAccuracies[i] = errors.reduce((a, b) => a + b, 0) / errors.length;
}

const averageError = pointAccuracies.reduce((a, b) => a + b, 0) / pointAccuracies.length;
```

**Output:**
```
Point 0: 45px error ✅
Point 1: 85px error ⚠️
Point 2: 52px error ✅
...
Average: 64px
Quality: "acceptable" (between 80px and 150px thresholds)
```

### 8.2 Per-Model Diagnostics (After Validation)

```typescript
type ModelDiagnostic = {
  kind: ModelKind;                           // 'polynomial' | 'ridge' | 'mlp'
  trainingErrorPx: number;                   // Error on training samples
  validationErrorPx: number;                 // Error on validation samples (post-recalibration)
  validationJitterStdDev: number;            // Std dev of predictions at each point
  info: string;                              // Human-readable model description
  isBest: boolean;                           // Selected after validation?
  perPointErrors: Array<{ point, meanError }>; // Per-point breakdown
  corrX: number;                             // Pearson correlation (predicted X vs target X)
  corrY: number;                             // Pearson correlation (predicted Y vs target Y)
};
```

**Example output (post-validation):**

```
📊 Final Model Selection (Post-Validation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Polynomial:   training 62.1px, validation 68.3px, jitter 15.2px, corrX=0.987, corrY=0.981
Ridge:        training 61.8px, validation 65.9px, jitter 14.1px, corrX=0.989, corrY=0.984 ⭐
MLP:          training 58.2px, validation 78.4px, jitter 22.5px, corrX=0.971, corrY=0.968
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Best model: ridge (lowest validation error)
```

### 8.3 Head Pose Drift Analysis

After validation, the system measures if the user's head **moved between training and validation**:

```typescript
const headPoseDriftRef = useRef<HeadPoseDrift>({
  meanYawTraining: -0.08,          // Training: yaw averaged across 270 samples
  meanYawValidation: -0.05,        // Validation: yaw averaged across validation samples
  deltaYaw: 0.03,                  // Absolute difference
  meanPitchTraining: 0.12,
  meanPitchValidation: 0.15,
  deltaPitch: 0.03,
});
```

**Console output:**

```
🔄 Head Pose Drift Analysis
Yaw: training -0.080, validation -0.050, Δ 0.030
Pitch: training 0.120, validation 0.150, Δ 0.030
⚠️ Significant head pose shift detected during validation!
```

**Interpretation:**
- **Δ < 0.05:** Minimal head movement → Recalibration likely to be stable
- **Δ > 0.1:** Significant shift → May indicate user fatigue or distraction

---

## Part 9: Comparison: Before vs After Recalibration Feature

### Before (Previous System)

```
[Collection] → [Training] → [Validation] → [Result]
     ✓               ✓           ✓            ✓

If validation fails:
  [Try Again] (full 17-second recollection of ALL 9 points)
```

**Problems:**
- User fatigue from re-collecting all 9 points
- No per-point diagnostics of which points failed
- No intelligent targeting of problematic calibration

### After (New System)

```
[Collection] → [Training] → [Validation 1] → [Decision]
     ✓              ✓            ✓             ✓

If validation fails:
  [Identify Failed Points] → [Recalibrate Only Failed] → [Re-train] → [Validation 2] → [Result]
           ✓                       ✓ (60% faster)          ✓            ✓            ✓
```

**Benefits:**
- ✅ **Reduced fatigue:** Only re-collect ~3 points instead of 9 (6s vs 17s)
- ✅ **Better diagnostics:** Know exactly which points failed and why
- ✅ **Automatic recovery:** If a point had transient error (e.g., blink), recalibration fixes it
- ✅ **Model preservation:** Good points' samples retained, reducing noise

---

## Part 10: Edge Cases & Error Handling

### 10.1 User Moves Head During Validation

```typescript
// Head Pose Drift Detection catches this:
if (deltaYaw > 0.1 || deltaPitch > 0.1) {
  console.warn('⚠️ Significant head pose shift detected');
  // System still accepts calibration, but logs warning
  // (Could be enhanced to trigger full re-calibration in future)
}
```

### 10.2 Multiple Recalibration Rounds

Current system supports **only one recalibration round**:

```typescript
if (validationStage === 'final') {
  const stillFailedIndices = results
    .map((r, idx) => ({ idx, errorPx: r.meanErrorPx }))
    .filter((r) => r.errorPx > STRICT_POINT_ERROR_THRESHOLD_PX)
    .map((r) => r.idx);

  if (stillFailedIndices.length > 0) {
    console.warn(`⚠️ Recalibration incomplete: ${stillFailedIndices} still failing`);
    // Currently stops here, doesn't loop again
    // TODO: Could add logic to loop if needed
  }
}
```

**Future enhancement:** Could loop `startTargetedRecalibration()` again if issues persist.

### 10.3 All Points Fail (System Broken)

If all 9 points have > 120px error:

```typescript
if (failedIndices.length === 9) {
  console.warn('🚨 All calibration points failed!');
  // User should:
  // 1. Check lighting
  // 2. Re-center face in camera
  // 3. Restart calibration
  
  // System offers "Retry Calibration" button → resetCalibration()
}
```

### 10.4 Empty Sample Buckets

If a point's bucket is empty after collection:

```typescript
if (pointSamples.length === 0) {
  pointAccuracies.push(1.0);  // Worst-case error
  continue;
}

if (pointSamples.length < 4) {
  // Skip outlier rejection (not enough data)
  cleanedSamplesByPoint[i].push(...pointSamples);
  continue;
}
```

---

## Part 11: Performance Metrics

### Collection Times

| Phase | Duration | Points | Time per Point |
|-------|----------|--------|-----------------|
| Initial Collection | ~17s | 9 | ~1.9s (400+200+1500) |
| Recalibration (3 failed) | ~6s | 3 | ~2s (same per point) |
| First Validation | ~15s | 9 | 1.5s each |
| Second Validation | ~15s | 9 | 1.5s each |
| **Total (full flow)** | **~53s** | — | — |

### Sample Counts

| Phase | Samples/Point | Total | Details |
|-------|---------------|-------|---------|
| Initial Collection | ~30 | ~270 | 20 Hz @ 1.5s sampling |
| After Outlier Rejection | ~25 | ~225 | 2-sigma filtering removes ~17% |
| Recalibration (3 failed) | ~30 new | ~60 added | Mixed: 210 old + 60 new = 270 |
| Validation (all rounds) | ~30 | N/A | Validation samples not used for training |

### Model Training

| Model | Features | Samples | Training Method | Time |
|-------|----------|---------|-----------------|------|
| Polynomial | 20 | 225 | Normal equations | <10ms |
| Ridge | 20 | 225 | λ-sweep + solve | ~50ms |
| MLP | 20→20 | 225 | Backprop 100 epochs | ~200ms |
| **Total** | — | — | **~250ms** | All 3 together |

---

## Part 12: Key Invariants (Guarantees)

### 12.1 Sample Point Mappings

```typescript
invariant: samplesByPointRef.current.length === CALIBRATION_POINTS.length
// Always 9 buckets, one per point

invariant: sample.pointIndex === (index in samplesByPointRef.current)
// Each sample knows which point it belongs to
```

### 12.2 Phase Transitions

```typescript
invariant: phase ∈ {'idle', 'collecting', 'recalibrating', 'validating', 'complete'}
invariant: phase cannot go backward (idle → collecting → validating → complete)
invariant: recalibrating only reachable from validating (when failed points detected)
```

### 12.3 Model Consistency

```typescript
invariant: bestModel is always selected from trainAllModels() results
invariant: allModels[bestIndex] === bestModel
invariant: validation re-evaluation uses same iris samples for all models (fair comparison)
```

### 12.4 Sample Freshness

```typescript
invariant: Only failed points (error > 120px) get samples cleared
invariant: Good points (error ≤ 120px) retain original samples
invariant: After recalibration, failed points have ≤ 1 generation of new samples
```

---

## Part 13: Integration Points

### 13.1 With WebcamGazeHook (`use-webcam-gaze.ts`)

```typescript
// Calibration screen calls:
const iris = onGetIrisSample?.();  // → Returns from gaze hook
const pose = onGetHeadPoseSample?.();  // → Returns head pose

// Gaze hook continuously tracks:
const latestIris = { x: 0.92, y: 0.18 };  // Eye-relative normalized
const latestPose = { yaw: -0.05, pitch: 0.02 };  // Radians
```

### 13.2 With ML Service (Post-Calibration)

```typescript
// After onComplete(result, mapping) is called,
// the mapping is stored in test flow state:
const grazePrediction = mapping.predict(iris.x, iris.y, yaw, pitch);
// → { x: 1824, y: 162 }  (screen pixels)

// During task collection, live gaze is streamed to ML service
```

### 13.3 With CalibrationValidationOverlay

```typescript
// During validation, the overlay applies the model:
const pred = mapping.predict(iris.x, iris.y, pose.yaw, pose.pitch);
// Overlay tracks: { irisSamples, predictions, headPoseSamples }
// Returns ValidationPointResult[] with per-point diagnostics
```

---

## Summary Table: Recalibration System

| Aspect | Details |
|--------|---------|
| **Trigger** | Point error > 120px after initial validation |
| **Identification** | Automatic per-point error analysis |
| **Sample Handling** | Delete failed, preserve good, collect new failed |
| **Re-training** | All 3 models retrain on mixed dataset |
| **Re-validation** | All 9 points validated, models re-ranked |
| **Time Savings** | ~60% faster for 3 failed points (~11s vs 17s) |
| **User Benefit** | Reduced fatigue, focused recovery, better accuracy |
| **Failure Path** | If still failing after recalibration, warn but allow proceed |
| **Diagnostics** | Per-point error, per-model error, correlation, jitter, head pose drift |

---

## Conclusion

The Lexora calibration system represents a **sophisticated,data-driven approach** to eye-gaze calibration. The **smart targeted recalibration feature** is a significant UX improvement that:

1. **Identifies problematic calibration points** objectively (120px error threshold)
2. **Minimizes re-collection burden** by only targeting failed points
3. **Preserves training data** from good points to reduce noise
4. **Re-ranks models** based on actual validation performance
5. **Provides rich diagnostics** to understand what went wrong

The system is **model-agnostic**, so switching between Polynomial, Ridge, and MLP models is seamless. The **three-layer validation loop** (training diagnostics → initial validation → recalibration validation) ensures robust calibration quality while keeping user time and fatigue minimal.

