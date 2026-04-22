# Lexora Web — Dyslexia Screening Platform

Lexora is a web-based dyslexia screening tool that uses eye tracking to detect reading difficulty indicators. It supports two modes:

- **Webcam Mode** — Uses MediaPipe FaceLandmarker to track iris position via a standard webcam. No special hardware needed.
- **Tobii Mode** — Connects to a Tobii eye tracker through a local helper service for research-grade accuracy.

Both modes guide the user through **calibration → reading task → review → ML analysis → results**.

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local

# Start the ML service (in a separate terminal)
cd ../ml-service
python server.py

# Start the web app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a Chromium-based browser (Chrome/Edge recommended for WebGL + MediaPipe support).

## How It Works

### Test Flow

1. **Camera / Device Setup** — Webcam feed is initialized or Tobii connection verified.
2. **Calibration** — A 15-point grid maps iris position → screen coordinates. Uses a regression model per-session.
3. **Validation** — 5 quick-check points verify calibration quality. Poor results prompt recalibration.
4. **Reading Task** — Text is displayed in a controlled reading zone (20%–80% horizontal, 10%–95% vertical). Gaze data is collected in real-time.
5. **Review** — Post-task screen shows data quality. A "View Gaze Trail" button replays the raw gaze path over the text for quality verification.
6. **Submission** — Gaze data is sent to the ML service for fixation detection, feature extraction, and dyslexia risk prediction.
7. **Results** — Risk level (low/medium/high) with probability score, recommendations, and an ML-analyzed gaze replay with fixation bubbles + saccade lines.

### Calibration Modes

The calibration engine supports three visual modes, selectable via URL query parameter (`?calibrationMode=`):

| Mode | Description | Best For |
|---|---|---|
| `dot` | Static dot with shrink animation | Older children / adults |
| `animated` | Animated character with sound effects | Young children (ages 5–8) |
| `auto` | Chooses based on `?age=` parameter | Default — uses age to pick |

### Gaze Data Pipeline

```
Webcam Frame → MediaPipe FaceLandmarker → Iris Landmarks
  → EMA Smoothing (α = 0.3)
  → Calibration Model (screen mapping)
  → Gaze Point { x, y, timestamp }
  → Collected during reading task
  → Sent to ML Service
  → Fixation Detection + Feature Extraction
  → Dyslexia Risk Prediction
```

## Environment Variables

Copy `.env.example` to `.env.local`. All `NEXT_PUBLIC_` variables are exposed to the browser.

### Backend Services

| Variable | Default | Description |
|---|---|---|
| `ML_SERVICE_URL` | `http://localhost:8001` | ML prediction service URL (server-side only, not exposed to browser) |
| `NEXT_PUBLIC_TOBII_SERVICE_URL` | `http://localhost:28980` | Tobii helper app WebSocket URL |
| `NEXT_PUBLIC_TOBII_STATUS_TIMEOUT_MS` | `3000` | Timeout (ms) for Tobii connection check |

### Calibration Engine

These control the calibration collection and validation pipeline. Tweak these to balance accuracy vs. user experience.

| Variable | Default | Range | What It Does |
|---|---|---|---|
| `NEXT_PUBLIC_CALIBRATION_COUNTDOWN_SECONDS` | `5` | 3–10 | Countdown before calibration starts. 5s gives children time to read instructions. |
| `NEXT_PUBLIC_STABLE_FIXATION_MS` | `300` | 100–500 | Minimum fixation duration (ms) before accepting a calibration sample. **Lower = more samples but noisier**. **Higher = fewer, cleaner samples**. Research recommends 250–350ms (Rayner 2009). |
| `NEXT_PUBLIC_STABLE_VELOCITY_THRESHOLD` | `0.55` | 0.2–1.0 | Max gaze velocity (fraction of screen diagonal/sec) for fixation detection. Below this = fixation, above = saccade. **Lower = stricter** (rejects more). |
| `NEXT_PUBLIC_CAPTURE_COOLDOWN_MS` | `45` | 20–200 | Minimum gap between successive sample captures. Prevents over-sampling during a single fixation. |
| `NEXT_PUBLIC_VALIDATION_SETTLE_MS` | `450` | 200–1000 | Time to let gaze settle before measuring each validation point. |
| `NEXT_PUBLIC_VALIDATION_HOLD_MS` | `1200` | 500–3000 | Duration to hold fixation during validation measurement. |
| `NEXT_PUBLIC_VALIDATION_THRESHOLD` | `0.12` | 0.05–0.25 | Accuracy threshold as fraction of screen diagonal. Distance ≤ this = 100% score. **Smaller = stricter**. |

### Test Screen & Gaze

| Variable | Default | What It Does |
|---|---|---|
| `NEXT_PUBLIC_CALIBRATION_THRESHOLD_GOOD` | `0.04` | Calibration error below this = "Excellent" quality |
| `NEXT_PUBLIC_CALIBRATION_THRESHOLD_ACCEPTABLE` | `0.08` | Error below this = "Usable". Above = "Poor" (recalibration recommended) |
| `NEXT_PUBLIC_MIN_GAZE_POINTS` | `20` | Minimum gaze points per task before submission is allowed. The ML service needs at least this many for feature extraction. |
| `NEXT_PUBLIC_WEBCAM_EMA_ALPHA` | `0.3` | EMA smoothing factor for webcam gaze (0–1). **Lower = heavier smoothing** (less jitter, more lag). **Higher = lighter smoothing** (responsive but noisier). 0.3 is a good balance for webcam noise. |

### MediaPipe / Webcam

| Variable | Default | What It Does |
|---|---|---|
| `NEXT_PUBLIC_MEDIAPIPE_VERSION` | `0.10.32` | MediaPipe tasks-vision package version. Must match an available version on npm/jsdelivr. |
| `NEXT_PUBLIC_MEDIAPIPE_MODEL_URL` | *(Google Cloud)* | FaceLandmarker model URL. Change to a self-hosted copy for offline/airgapped deployments. |
| `NEXT_PUBLIC_WEBCAM_WIDTH` | `640` | Webcam capture width (px). Higher = more accurate iris tracking but more CPU. Min recommended: 640. |
| `NEXT_PUBLIC_WEBCAM_HEIGHT` | `480` | Webcam capture height (px). |

### Debug

| Variable | Default | What It Does |
|---|---|---|
| `NEXT_PUBLIC_DEBUG_GAZE_OVERLAY` | `false` | Set to `"true"` to show a real-time gaze dot on the reading screen + console diagnostics. |

## Tuning Guide

### "The calibration keeps failing"
- **Increase** `STABLE_FIXATION_MS` to 400–500ms if users can't hold still
- **Increase** `VALIDATION_THRESHOLD` to 0.15–0.20 to be more forgiving
- **Increase** `WEBCAM_EMA_ALPHA` to 0.4–0.5 for smoother (less jumpy) tracking

### "Not enough gaze points collected"
- **Decrease** `MIN_GAZE_POINTS` to 10–15 (but check with the ML service)
- **Decrease** `CAPTURE_COOLDOWN_MS` to 25–30ms for faster sampling

### "Gaze replay dots are misaligned"
- This usually means the calibration model quality was poor. Try stricter thresholds:
  - Set `CALIBRATION_THRESHOLD_GOOD` to 0.03
  - Set `CALIBRATION_THRESHOLD_ACCEPTABLE` to 0.06

### "Webcam tracking is too jittery"
- **Decrease** `WEBCAM_EMA_ALPHA` to 0.15–0.2 for heavier smoothing
- **Increase** `WEBCAM_WIDTH` / `WEBCAM_HEIGHT` to 1280×720 for higher-res iris tracking (costs more CPU)

## Hardcoded Constants

These live in the source code and are **not** configurable via env vars. They rarely need changing.

| Constant | Value | File | Purpose |
|---|---|---|---|
| `CALIBRATION_POINTS` | 15-point grid | `constants.ts` | 3×5 grid at X: [0.2, 0.35, 0.5, 0.65, 0.8], Y: [0.10, 0.375, 0.65] |
| `AOI_Y_BOUNDS` | `{ min: 0.10, max: 0.65 }` | `constants.ts` | Area of Interest Y-axis bounds for gaze replay mapping |
| `ESTIMATED_READING_WPM` | `60` | `constants.ts` | Used to estimate when to ask "are you done reading?" |
| `MIN_AUTO_DETECT_SECONDS` | `8` | `constants.ts` | Minimum wait before the done-reading dialog can appear |
| `VALIDATION_POINT_INDICES` | `[0, 4, 7, 10, 14]` | `calibration-engine-constants.ts` | Which of the 15 points to use for quick validation (corners + center) |
| `VALIDATION_MIN_SAMPLES_PER_POINT` | `10` | `calibration-engine-constants.ts` | Min gaze samples per validation point for a valid score |
