/**
 * Constants for the test system — calibration, gaze, and thresholds.
 *
 * Tunable values read from NEXT_PUBLIC_ env vars with sensible defaults.
 */

function envNumber(key: string, fallback: number): number {
  if (typeof process === 'undefined') return fallback;
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFloat(key: string, fallback: number): number {
  if (typeof process === 'undefined') return fallback;
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * 20-point calibration pattern focused on the top-anchored reading container (4x5 grid).
 *
 * Grid layout:
 *   - X columns: [0.2, 0.35, 0.5, 0.65, 0.8]
 *   - Y rows: [0.15, 0.30, 0.45, 0.60]
 *
 * Calibration AOI matches the static grid area exactly: x = 0.20..0.80,
 * y = 0.15..0.60.
 */
export const CALIBRATION_POINTS = [
  // Row 1 (top-inner: 15%)
  { x: 0.2, y: 0.15, phase: 'STATIC' as const },
  { x: 0.35, y: 0.15, phase: 'STATIC' as const },
  { x: 0.5, y: 0.15, phase: 'STATIC' as const },
  { x: 0.65, y: 0.15, phase: 'STATIC' as const },
  { x: 0.8, y: 0.15, phase: 'STATIC' as const },
  // Row 2 (upper-mid: 30%)
  { x: 0.2, y: 0.3, phase: 'STATIC' as const },
  { x: 0.35, y: 0.3, phase: 'STATIC' as const },
  { x: 0.5, y: 0.3, phase: 'STATIC' as const },
  { x: 0.65, y: 0.3, phase: 'STATIC' as const },
  { x: 0.8, y: 0.3, phase: 'STATIC' as const },
  // Row 3 (lower-mid: 45%)
  { x: 0.2, y: 0.45, phase: 'STATIC' as const },
  { x: 0.35, y: 0.45, phase: 'STATIC' as const },
  { x: 0.5, y: 0.45, phase: 'STATIC' as const },
  { x: 0.65, y: 0.45, phase: 'STATIC' as const },
  { x: 0.8, y: 0.45, phase: 'STATIC' as const },
  // Row 4 (bottom-inner: 60%)
  { x: 0.2, y: 0.6, phase: 'STATIC' as const },
  { x: 0.35, y: 0.6, phase: 'STATIC' as const },
  { x: 0.5, y: 0.6, phase: 'STATIC' as const },
  { x: 0.65, y: 0.6, phase: 'STATIC' as const },
  { x: 0.8, y: 0.6, phase: 'STATIC' as const },
] as const;

/** Gaze AOI X bounds (screen-normalized). Matches Phase 1 static-dot bounds. */
export const AOI_X_BOUNDS = { min: 0.2, max: 0.8 } as const;

/** Gaze AOI Y bounds (screen-normalized). Matches Phase 1 static-dot bounds. */
export const AOI_Y_BOUNDS = { min: 0.15, max: 0.6 } as const;

/**
 * Calibration quality thresholds (normalized error).
 * Webcam iris tracking is noisier than dedicated hardware, so thresholds
 * are appropriate for that level of precision.
 *
 * Env: NEXT_PUBLIC_CALIBRATION_THRESHOLD_GOOD (default: 0.04)
 * Env: NEXT_PUBLIC_CALIBRATION_THRESHOLD_ACCEPTABLE (default: 0.08)
 */
export const CALIBRATION_THRESHOLDS = {
  good: envFloat('NEXT_PUBLIC_CALIBRATION_THRESHOLD_GOOD', 0.04),
  acceptable: envFloat('NEXT_PUBLIC_CALIBRATION_THRESHOLD_ACCEPTABLE', 0.08),
} as const;

/**
 * Minimum gaze points required per task (ML service minimum).
 *
 * Env: NEXT_PUBLIC_MIN_GAZE_POINTS (default: 20)
 */
export const MIN_GAZE_POINTS = envNumber('NEXT_PUBLIC_MIN_GAZE_POINTS', 20);

/**
 * EMA smoothing factor for webcam gaze coordinates.
 * Lower α = heavier smoothing.
 *
 * Env: NEXT_PUBLIC_WEBCAM_EMA_ALPHA (default: 0.3)
 */
export const WEBCAM_GAZE_EMA_ALPHA = envFloat('NEXT_PUBLIC_WEBCAM_EMA_ALPHA', 0.3);

/** Estimated reading speed for children / dyslexia screening (words per minute) */
export const ESTIMATED_READING_WPM = 60;

/** Minimum seconds before auto-detect dialog can appear */
export const MIN_AUTO_DETECT_SECONDS = 8;

/** Tobii steps for the StepIndicator */
export const TOBII_STEPS = [
  { key: 'intake', label: 'Pre-test' },
  { key: 'device-check', label: 'Device' },
  { key: 'calibrating', label: 'Calibration' },
  { key: 'task-syllables', label: 'Syllables' },
  { key: 'task-pseudo-words', label: 'Pseudo-words' },
  { key: 'task-meaningful-text', label: 'Text' },
  { key: 'results', label: 'Results' },
] as const;

/** Webcam steps for the StepIndicator */
export const WEBCAM_STEPS = [
  { key: 'intake', label: 'Pre-test' },
  { key: 'camera-setup', label: 'Camera' },
  { key: 'calibrating', label: 'Calibration' },
  { key: 'task-paragraph', label: 'Reading' },
  { key: 'results', label: 'Results' },
] as const;

/** Map test states to the step key they belong to (for StepIndicator) */
export function getStepKeyForState(state: string): string {
  // Review states map to their parent task step
  if (state.startsWith('review-')) {
    return state.replace('review-', 'task-');
  }
  // Submitting maps to the last task step
  if (state === 'submitting') return 'results';
  return state;
}
