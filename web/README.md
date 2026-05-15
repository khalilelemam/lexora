# Lexora Web — Dyslexia Screening Platform

Lexora is a web-based dyslexia screening tool that uses eye tracking to detect reading difficulty indicators. It supports two modes:

- **Webcam Mode** — Uses MediaPipe FaceLandmarker to track iris position via a standard webcam. No special hardware needed.
- **Tobii Mode** — Connects to a Tobii eye tracker through a local helper service for research-grade accuracy.

Both modes guide the user through **calibration → reading task → review → ML analysis → results**.
For authenticated users, successful submissions can also persist attempt metadata in Postgres and
store raw/derived JSON artifacts in Azure Blob Storage.

## Getting Started

### Option A — Docker (recommended for quick start)

This is the fastest way to get a working local setup. No Neon account or remote database required.
It starts both PostgreSQL and Azurite so you can exercise the full web persistence flow locally.

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Set the Docker DATABASE_URL in .env.local
#    DATABASE_URL=postgresql://lexora:lexora_dev@localhost:5433/lexora
#    (DATABASE_ADAPTER will auto-detect as "pg")

# 4. Start the local PostgreSQL database + Azurite
docker compose up -d

# 4.5. For full local persistence, keep these defaults in .env.local:
#      AZURE_BLOB_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
#      AZURE_BLOB_STORAGE_CONTAINER=test-attempts

# 5. Run database migrations
npx prisma migrate dev

# 6. Start the ML service (in a separate terminal)
cd ../ml-service
python server.py

# 7. Start the web app
npm run dev
```

### Option B — Neon (production-style)

```bash
# Install dependencies
npm install

# Copy environment file and configure with your Neon DATABASE_URL
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Start the ML service (in a separate terminal)
cd ../ml-service
python server.py

# Start the web app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a Chromium-based browser (Chrome/Edge recommended for WebGL + MediaPipe support).

### Local Blob Storage

The local Docker stack includes Azurite, the Azure Storage emulator.

- Recommended local connection string: `UseDevelopmentStorage=true`
- Recommended local container: `test-attempts`

The app creates the container automatically on first successful persisted submission.

### Export Azurite Blobs

If you want to inspect the persisted JSON files locally, use the helper script after Azurite is running:

```bash
npm run blobs:export -- --output ./tmp/azurite-test-attempts
```

That command:

- reads `AZURE_BLOB_STORAGE_CONNECTION_STRING` from `.env.local` and falls back to `UseDevelopmentStorage=true`
- reads `AZURE_BLOB_STORAGE_CONTAINER` from `.env.local` and falls back to `test-attempts`
- downloads blobs into a normal folder so you can inspect `raw/` and `derived/` files directly

Optional overrides:

```bash
node scripts/export-azurite-blobs.mjs --container test-attempts --output ./tmp/azurite-export
```

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

| Mode       | Status                 | Description                                                         | Selection Behavior                                   |
| ---------- | ---------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `grid`     | Active                 | Follow a simple dot across 15 calibration points. Fast and precise. | Default fallback mode; also used for age 10+         |
| `star`     | Active                 | Follow a friendly star that appears at each calibration point.      | Preferred for ages 7–9                               |
| `stickman` | Coming soon (disabled) | Ninja stickman mode is currently disabled for stability hardening.  | If requested explicitly, engine falls back to `grid` |

Age-based mode resolution currently behaves as follows:

- `age` 7–9 resolves to `star`
- `age` >= 10 resolves to `grid`
- `stickman` requests are intentionally remapped to `grid`

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

### Database & Auth

| Variable                | Required | Default                           | Description                                                                                                                    |
| ----------------------- | -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | **Yes**  | —                                 | PostgreSQL connection string. Neon (production) or local Docker.                                                               |
| `DATABASE_URL_UNPOOLED` | No       | Falls back to `DATABASE_URL`      | Direct / non-pooled PostgreSQL connection string used for production Prisma migrations. Local Docker can reuse `DATABASE_URL`. |
| `DATABASE_ADAPTER`      | No       | Auto-detected from `DATABASE_URL` | `neon` (serverless WebSocket) or `pg` (standard TCP). Set explicitly if auto-detection doesn't match your setup.               |
| `BETTER_AUTH_SECRET`    | **Yes**  | —                                 | Secret key for Better Auth (min 32 chars). Generate: `openssl rand -base64 32`                                                 |
| `BETTER_AUTH_URL`       | No       | `http://localhost:3000`           | Base URL of the app (used for OAuth callbacks, magic link URLs).                                                               |
| `GOOGLE_CLIENT_ID`      | **Yes**  | —                                 | Google OAuth client ID (from Google Cloud Console).                                                                            |
| `GOOGLE_CLIENT_SECRET`  | **Yes**  | —                                 | Google OAuth client secret.                                                                                                    |
| `RESEND_API_KEY`        | **Yes**  | —                                 | Resend API key for sending magic link emails.                                                                                  |
| `EMAIL_FROM`            | No       | `Lexora <noreply@lexora.page>`    | Email sender address for magic links.                                                                                          |

### Backend Services

| Variable                               | Default                                     | Description                                                                                               |
| -------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `ML_SERVICE_URL`                       | Required (example: `http://localhost:8001`) | ML prediction service URL (server-side only, not exposed to browser). App throws `CONFIG_ERROR` if unset. |
| `AZURE_BLOB_STORAGE_CONNECTION_STRING` | `UseDevelopmentStorage=true` locally        | Azure Blob Storage connection string used to persist raw/derived test JSON artifacts.                     |
| `AZURE_BLOB_STORAGE_CONTAINER`         | `test-attempts` locally                     | Single Azure Blob container used for both `raw/{attemptId}.json` and `derived/{attemptId}.json`.          |
| `NEXT_PUBLIC_TOBII_SERVICE_URL`        | `http://localhost:28980`                    | Tobii helper app WebSocket URL                                                                            |
| `NEXT_PUBLIC_TOBII_STATUS_TIMEOUT_MS`  | `3000`                                      | Timeout (ms) for Tobii connection check                                                                   |

### Calibration Engine

These control the calibration collection and validation pipeline. Tweak these to balance accuracy vs. user experience.

| Variable                                    | Default | Range     | What It Does                                                                                                                                                                                  |
| ------------------------------------------- | ------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CALIBRATION_COUNTDOWN_SECONDS` | `5`     | 3–10      | Countdown before calibration starts. 5s gives children time to read instructions.                                                                                                             |
| `NEXT_PUBLIC_STABLE_FIXATION_MS`            | `300`   | 100–500   | Minimum fixation duration (ms) before accepting a calibration sample. **Lower = more samples but noisier**. **Higher = fewer, cleaner samples**. Research recommends 250–350ms (Rayner 2009). |
| `NEXT_PUBLIC_STABLE_VELOCITY_THRESHOLD`     | `0.55`  | 0.2–1.0   | Max gaze velocity (fraction of screen diagonal/sec) for fixation detection. Below this = fixation, above = saccade. **Lower = stricter** (rejects more).                                      |
| `NEXT_PUBLIC_CAPTURE_COOLDOWN_MS`           | `45`    | 20–200    | Minimum gap between successive sample captures. Prevents over-sampling during a single fixation.                                                                                              |
| `NEXT_PUBLIC_VALIDATION_SETTLE_MS`          | `450`   | 200–1000  | Time to let gaze settle before measuring each validation point.                                                                                                                               |
| `NEXT_PUBLIC_VALIDATION_HOLD_MS`            | `1200`  | 500–3000  | Duration to hold fixation during validation measurement.                                                                                                                                      |
| `NEXT_PUBLIC_VALIDATION_THRESHOLD`          | `0.12`  | 0.05–0.25 | Accuracy threshold as fraction of screen diagonal. Distance ≤ this = 100% score. **Smaller = stricter**.                                                                                      |

### Test Screen & Gaze

| Variable                                       | Default | What It Does                                                                                                                                                                                        |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CALIBRATION_THRESHOLD_GOOD`       | `0.04`  | Calibration error below this = "Excellent" quality                                                                                                                                                  |
| `NEXT_PUBLIC_CALIBRATION_THRESHOLD_ACCEPTABLE` | `0.08`  | Error below this = "Usable". Above = "Poor" (recalibration recommended)                                                                                                                             |
| `NEXT_PUBLIC_MIN_GAZE_POINTS`                  | `20`    | Minimum gaze points per task before submission is allowed. The ML service needs at least this many for feature extraction.                                                                          |
| `NEXT_PUBLIC_WEBCAM_EMA_ALPHA`                 | `0.3`   | EMA smoothing factor for webcam gaze (0–1). **Lower = heavier smoothing** (less jitter, more lag). **Higher = lighter smoothing** (responsive but noisier). 0.3 is a good balance for webcam noise. |

### MediaPipe / Webcam

| Variable                          | Default          | What It Does                                                                                        |
| --------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_MEDIAPIPE_VERSION`   | `0.10.32`        | MediaPipe tasks-vision package version. Must match an available version on npm/jsdelivr.            |
| `NEXT_PUBLIC_MEDIAPIPE_MODEL_URL` | _(Google Cloud)_ | FaceLandmarker model URL. Change to a self-hosted copy for offline/airgapped deployments.           |
| `NEXT_PUBLIC_WEBCAM_WIDTH`        | `640`            | Webcam capture width (px). Higher = more accurate iris tracking but more CPU. Min recommended: 640. |
| `NEXT_PUBLIC_WEBCAM_HEIGHT`       | `480`            | Webcam capture height (px).                                                                         |

### Debug

| Variable                         | Default | What It Does                                                                              |
| -------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DEBUG_GAZE_OVERLAY` | `false` | Set to `"true"` to show a real-time gaze dot on the reading screen + console diagnostics. |

## Production Config And Deploy

Production web runtime config is managed through the GitHub environment `web-production`.

The workflow in [`.github/workflows/web-vercel-deploy.yml`](../.github/workflows/web-vercel-deploy.yml) does four things on manual dispatch or release tags:

1. Reads the web runtime variables and secrets from the GitHub environment `web-production`
2. Applies Prisma migrations against the production database using `DATABASE_URL_UNPOOLED`
3. Syncs the approved runtime config into the Vercel production environment
4. Builds and deploys the web app to Vercel production

### Source Of Truth

For production web config, GitHub is the source of truth, not a checked-in `.env` file.

- Put web runtime variables in the GitHub environment `web-production`
- Put web runtime secrets there as environment secrets
- Keep the deploy secret `VERCEL_TOKEN` in the same environment
- Keep `VERCEL_PROJECT_ID` and `VERCEL_ORG_ID` as environment variables there

The workflow syncs these non-secret variables:

- `BETTER_AUTH_URL`
- `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`
- `ML_SERVICE_URL`
- `AZURE_BLOB_STORAGE_CONTAINER`
- any variable starting with `NEXT_PUBLIC_`

And these secrets:

- `AZURE_BLOB_STORAGE_CONNECTION_STRING`
- `BETTER_AUTH_SECRET`
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `GOOGLE_CLIENT_SECRET`
- `LEXORA_RELEASES_TOKEN`
- `RESEND_API_KEY`

### How To Change A Production Web Variable

1. Open the repository on GitHub
2. Go to `Settings -> Environments -> web-production`
3. Update or add the variable or secret there
4. If the change is a sensitive server-only value, store it as an environment secret instead
5. Run the `Web Deploy (Sync Env + Deploy)` workflow from GitHub Actions

This keeps Vercel production aligned with the GitHub environment.

### When To Edit `.env.local`

Use `.env.local` for local development only.

- Local `.env.local` changes affect your machine
- GitHub `web-production` changes affect deployed production
- `src/generated/prisma` is generated build output and should not be committed; `npm install` / `npm run build` regenerates it automatically

If a teammate wants to change production behavior, they should update `web-production` and then run the deploy workflow instead of editing local files and expecting production to change.

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

| Constant                           | Value                      | File                              | Purpose                                                               |
| ---------------------------------- | -------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| `CALIBRATION_POINTS`               | 15-point grid              | `constants.ts`                    | 3×5 grid at X: [0.2, 0.35, 0.5, 0.65, 0.8], Y: [0.10, 0.375, 0.65]    |
| `AOI_Y_BOUNDS`                     | `{ min: 0.10, max: 0.65 }` | `constants.ts`                    | Area of Interest Y-axis bounds for gaze replay mapping                |
| `ESTIMATED_READING_WPM`            | `60`                       | `constants.ts`                    | Used to estimate when to ask "are you done reading?"                  |
| `MIN_AUTO_DETECT_SECONDS`          | `8`                        | `constants.ts`                    | Minimum wait before the done-reading dialog can appear                |
| `VALIDATION_POINT_INDICES`         | `[0, 4, 7, 10, 14]`        | `calibration-engine-constants.ts` | Which of the 15 points to use for quick validation (corners + center) |
| `VALIDATION_MIN_SAMPLES_PER_POINT` | `10`                       | `calibration-engine-constants.ts` | Min gaze samples per validation point for a valid score               |

### Calibration Mode Timing Constants

These are defined in `calibration-constants.ts` and currently hardcoded per mode:

| Mode       | motionDurationMs | holdDurationMs | gridMinDwellMs | gridMaxDwellMs | gridForceAdvanceMs | gridMinSamplesWebcam | gridMinSamplesTobii |
| ---------- | ---------------: | -------------: | -------------: | -------------: | -----------------: | -------------------: | ------------------: |
| `grid`     |              420 |            900 |           1000 |           3200 |               5000 |                    8 |                   6 |
| `star`     |              550 |           1100 |           1400 |           4000 |               6000 |                    7 |                   5 |
| `stickman` |              600 |           1200 |           1500 |           4500 |               7000 |                    6 |                   5 |

### Additional Hardcoded Sampling Constants

| Constant                          | Value | File                       | Purpose                                                      |
| --------------------------------- | ----: | -------------------------- | ------------------------------------------------------------ |
| `SAMPLE_INTERVAL_MS`              |  `33` | `calibration-constants.ts` | Target sampling cadence during calibration collection        |
| `GRID_TIMEOUT_MIN_SAMPLES_WEBCAM` |   `2` | `calibration-constants.ts` | Minimum webcam samples required before timeout-based advance |
| `POINT_SAMPLES_GOAL_WEBCAM`       |   `3` | `calibration-constants.ts` | Per-point sample goal for webcam mode                        |
| `POINT_SAMPLES_GOAL_TOBII`        |   `3` | `calibration-constants.ts` | Per-point sample goal for Tobii mode                         |
