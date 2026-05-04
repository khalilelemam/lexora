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
 * 15-point calibration pattern focused on the top-anchored reading container (3x5 grid).
 * This increases spatial density to better capture nonlinearities in the mapping.
 *
 * New Area of Interest (AOI) Bounding Box:
 *   - X columns: [0.2, 0.35, 0.5, 0.65, 0.8] (60% horizontal spread, perfectly centered)
 *   - Y bounding box is shifted to the top 10% - 65% of the screen.
 *     This leaves the bottom third empty to prevent eyelid occlusion and accuracy drop-off.
 *
 *     The original relative grid logic (Y: 0.25, 0.5, 0.75) is strictly mapped into
 *     this new elevated container:
 *       Top    (0.0 relative to AOI) -> y = 0.10
 *       Middle (0.5 relative to AOI) -> y = 0.375
 *       Bottom (1.0 relative to AOI) -> y = 0.65
 */
export const CALIBRATION_POINTS = [
  // Row 1 (top: 10%)
  { x: 0.2, y: 0.1 },
  { x: 0.35, y: 0.1 },
  { x: 0.5, y: 0.1 },
  { x: 0.65, y: 0.1 },
  { x: 0.8, y: 0.1 },
  // Row 2 (middle: 37.5%)
  { x: 0.2, y: 0.375 },
  { x: 0.35, y: 0.375 },
  { x: 0.5, y: 0.375 },
  { x: 0.65, y: 0.375 },
  { x: 0.8, y: 0.375 },
  // Row 3 (bottom: 65%)
  { x: 0.2, y: 0.65 },
  { x: 0.35, y: 0.65 },
  { x: 0.5, y: 0.65 },
  { x: 0.65, y: 0.65 },
  { x: 0.8, y: 0.65 },
] as const;

/** Gaze AOI Y bounds (screen-normalized). Reading content lives in top: 10% → bottom: 65%. */
export const AOI_Y_BOUNDS = { min: 0.1, max: 0.65 } as const;

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
  { key: 'device-check', label: 'Device' },
  { key: 'calibrating', label: 'Calibration' },
  { key: 'task-syllables', label: 'Syllables' },
  { key: 'task-pseudo-words', label: 'Pseudo-words' },
  { key: 'task-meaningful-text', label: 'Text' },
  { key: 'results', label: 'Results' },
] as const;

/** Webcam steps for the StepIndicator */
export const WEBCAM_STEPS = [
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
