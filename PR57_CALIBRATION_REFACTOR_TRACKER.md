# PR57 Calibration Review Tracker

Temporary working note. Delete this once the PR57 calibration cleanup/refactor is finished.

## What Is Already Fixed

### From PR57 Analysis Part 4

| Topic | Status | Notes |
|---|---|---|
| 20-point static grid | Keep | The 4x5 grid is the right direction for vertical coverage. No action except validation with real sessions. |
| Static + pursuit/reading-anchor calibration | Keep | The concept matches the actual reading task better than static-only calibration. |
| 130ms pursuit lag compensation | Keep | Reasonable default. Needs real-session validation before tuning. |
| Separate X/Y feature builders | Keep | Good feature selection. Y excludes yaw/yaw*ix, which reduces spurious vertical coupling. |
| Weighted ridge regression | Fixed/keep | Solver supports sample weights, and selector MSE now uses `w * residual^2 / sum(w)` instead of accidental `w^2`. |
| Adaptive Kalman smoothing | Keep | Replaced stale EMA docs/env references so the code and docs agree. |
| IQR outlier filtering | Fixed/keep | Kept the approach and fixed the small-bucket floor edge case. |
| IDW fallback | Keep for now | It is heavier than ideal, but it is now isolated behind `fitIdwModel()`. Evaluate with real sessions before replacing it. |
| Complexity increase | In progress | Model types, feature builders, ridge math, metrics, diagnostics, IDW, and polynomial ridge fitting are now behind focused modules while the public facade stays stable. |
| Hardcoded magic numbers | Defer | Keep defaults hardcoded until we have data. Expose only operational debug envs for now. |
| Missing empirical validation | Still needed | Needs before/after session metrics. This is not a code-only task. |

### From PR57 Analysis Part 5 / Copilot Review

| # | Copilot item | Status | Notes |
|---|---|---|---|
| 1 | Debug overlay hardcoded true | Fixed | `NEXT_PUBLIC_DEBUG_GAZE_OVERLAY` controls visual overlay only. |
| 2 | Compiled JS artifact in `web/tmp` | Fixed | Files removed and `web/tmp/` ignored. |
| 3 | IDW centroid phase/log mismatch | Fixed | IDW intentionally uses STATIC centroids only. Logging now reports `staticCentroids` plus `readingCentroids=0`, and the IDW module documents why reading anchors are excluded. |
| 4 | `BASE_POINT_INDEX = 15` collision | Fixed | Pursuit anchor indices now use `readingAnchorPointIndex(lineIndex, gridPointCount)`. |
| 5 | Stale AOI comment | Fixed earlier | Current docs/constants now say AOI is x 0.20-0.80, y 0.15-0.60. |
| 6 | Stale bottom-bound/TODO note | Fixed earlier | No remaining matching TODO/comment found in `task-display.tsx`. |
| 7 | `MIN_RETAINED` floor not enforced | Fixed | Buckets below 8 samples now skip IQR filtering. |
| 8 | Weighted MSE uses `w^2` | Fixed | Uses weighted MSE directly. |
| 9 | Y feature docstring says 13 not 12 | Fixed | Current docs and `NUM_FEATURES_Y` both say 12. |
| 10 | rAF loop runs while disabled | Fixed | Webcam detection loop starts only when enabled, camera-ready, and model-ready. |
| 11 | Unused `READING_ANCHOR_COLLECT_MS` import | Fixed | Removed from active imports. |
| 12 | Unused `fixationProgress` prop | Fixed | Removed from `ReadingAnchorPhase`. |
| 13 | Production console logging | Fixed | Verbose logs go through `calibrationLogger`; production requires `NEXT_PUBLIC_DEBUG_CALIBRATION_LOG=true`. |

## What Remains

## Refactor Work Completed This Pass

1. Started splitting `calibration-models.ts`.
   - Added `web/src/features/test/lib/calibration-models/types.ts`.
   - Added `web/src/features/test/lib/calibration-models/feature-builders.ts`.
   - Added `web/src/features/test/lib/calibration-models/ridge-regression.ts`.
   - Added `web/src/features/test/lib/calibration-models/metrics.ts`.
   - Added `web/src/features/test/lib/calibration-models/diagnostics.ts`.
   - Added `web/src/features/test/lib/calibration-models/idw-model.ts`.
   - Added `web/src/features/test/lib/calibration-models/polynomial-ridge-model.ts`.
   - Kept `web/src/features/test/lib/calibration-models.ts` as the public facade, so existing imports stay stable.

2. Removed unused `addSample` wrapper from `use-calibration.ts`.
   - Callers use `addSampleForPoint`; the wrapper did not provide useful depth.

3. Moved `resolveCalibrationMode()` into `web/src/features/test/lib/calibration-mode.ts`.
   - The hook still re-exports the type/function for compatibility.

4. Split the first webcam gaze responsibilities out of `use-webcam-gaze.ts`.
   - Added `web/src/features/test/lib/webcam-gaze/types.ts`.
   - Added `web/src/features/test/lib/webcam-gaze/landmarks.ts`.
   - Added `web/src/features/test/lib/webcam-gaze/mediapipe.ts`.
   - Added `web/src/features/test/lib/webcam-gaze/camera.ts`.
   - Kept the hook's public return shape stable.
   - Moved MediaPipe fallback/GPU fallback diagnostics through `calibrationLogger`.

5. Extracted shared calibration sample and recalibration policy modules.
   - Added `web/src/features/test/lib/calibration-samples.ts` for collected sample shape, bucket helpers, diagnostics summary, and training-sample conversion.
   - Added `web/src/features/test/lib/calibration-recalibration.ts` for point-error records and targeted recalibration candidate selection.
   - Reduced `use-calibration.ts` to lifecycle/state orchestration plus model-fit flow.

6. Extracted fixation stability evaluation from the calibration engine.
   - Added `web/src/features/test/lib/calibration-stability.ts`.
   - `use-calibration-engine.ts` still owns state transitions and sample ingestion, while the stability module owns velocity normalization, stable-duration tracking, progress, and capture readiness.

### Do Next

1. Consider extracting production model selection if more models or thresholds are added.
   - Files: `calibration-models.ts`, potential `lib/calibration-models/model-selection.ts`.
   - Why: Today the facade is small enough to keep selection visible. Split it only when the selection policy grows or needs direct unit tests.

2. Continue splitting `use-webcam-gaze.ts` only if the lifecycle code keeps changing.
   - Proposed next seam: a dedicated detection-loop hook that owns rAF scheduling and frame processing.
   - Why later: That seam has more React lifecycle risk than the pure landmark/camera/MediaPipe extractions completed here.

3. Consider extracting webcam model-fit orchestration from `use-calibration.ts` only if it needs direct tests.
   - Files: `use-calibration.ts`, potential `lib/calibration-fit-flow.ts`.
   - Why: Sample conversion and recalibration policy are now separate. The remaining flow still mutates React state, so extracting it now would create a shallow Interface unless we also move state ownership.

### Do Later

1. Revisit the remaining `use-webcam-gaze.ts` lifecycle code only when it starts changing again.
   - Completed now: camera adapter, MediaPipe adapter, landmark/head-pose extraction.
   - Possible next module: detection-loop hook that owns rAF scheduling and frame processing.

2. Extract stability detection from `use-calibration-engine.ts`.
   - Status: Done for the pure stability calculation. The engine still owns React state and lifecycle transitions.

3. Split calibration sample storage from model fitting in `use-calibration.ts`.
   - Status: Partially done. Sample shape/conversion and recalibration selection are now separate modules.
   - Why: Storage/order/recalibration and fitting are different responsibilities.

### Do Not Do Yet

1. Do not remove IDW fallback yet.
   - Reason: It may be carrying robustness for poor webcam sessions. First make it isolated, then compare model outcomes.

2. Do not expose every magic number as an env var.
   - Reason: `NEXT_PUBLIC_` tuning knobs are client-visible and easy to misuse. Add knobs only after repeated evidence that operators need them.

3. Do not change Y-axis lambda grid yet.
   - Reason: The concern is valid, but this needs calibration metrics. Refactor first so the lambda policy is easy to test.

4. Do not wire unused head pose fields into features just because they exist.
   - Reason: Current comments say they were excluded because they were near-constant/multicollinear. Either remove them from the model interface or validate a new feature set, but do not half-use them.

## Verification So Far

- `npm run lint` passed after the previous cleanup.
- `npm run build` passed after the previous cleanup.
- `npm run lint` passed after the calibration model refactor.
- `npm run build` passed after the calibration model refactor.
- `npm run lint` passed after the webcam gaze refactor.
- `npm run build` passed after the webcam gaze refactor.
