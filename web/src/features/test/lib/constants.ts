/**
 * Constants for the test system — calibration, gaze, and thresholds.
 */

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
  { x: 0.2, y: 0.10 },
  { x: 0.35, y: 0.10 },
  { x: 0.5, y: 0.10 },
  { x: 0.65, y: 0.10 },
  { x: 0.8, y: 0.10 },
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

/** How long to show each calibration dot (ms) */
export const CALIBRATION_DOT_DURATION = 2500;

/** Gaze points to collect per calibration dot */
export const CALIBRATION_SAMPLES_PER_POINT = 60;

/**
 * Calibration quality thresholds (normalized error).
 * Webcam iris tracking is noisier than dedicated hardware, so thresholds
 * are appropriate for that level of precision.
 */
export const CALIBRATION_THRESHOLDS = {
  good: 0.04,       // < 4% screen size
  acceptable: 0.08, // 4-8% screen size
  // > 8% = poor
} as const;

/** Minimum gaze points required per task (ML service minimum) */
export const MIN_GAZE_POINTS = 20;

/**
 * EMA smoothing factor for webcam gaze coordinates.
 * Lower α = heavier smoothing. The ML service velocity-threshold fixation
 * detector (0.5 norm-units/s) is very sensitive to jitter — at 60 fps any
 * frame-to-frame noise > ~16 px on a 1920-wide screen counts as a saccade.
 * Pre-smoothing with α ≈ 0.3 reduces jitter to ~30 % of raw, so combined
 * with the ML service's own EMA (α = 0.5) the effective noise drops to ~15 %.
 */
export const WEBCAM_GAZE_EMA_ALPHA = 0.3;

/** Recommended minimum webcam gaze points */
export const RECOMMENDED_WEBCAM_POINTS = 2000;

/** Estimated reading speed for children / dyslexia screening (words per minute) */
export const ESTIMATED_READING_WPM = 60;

/** Minimum seconds before auto-detect dialog can appear */
export const MIN_AUTO_DETECT_SECONDS = 8;

/**
 * Cross-proximity detection: max distance (in px) from the fixation cross
 * center for the gaze to count as "looking at the cross". ~13% of a 1920 screen.
 * Generously sized because webcam iris tracking is noisy.
 */
export const CROSS_PROXIMITY_PX = 250;

/** How long gaze must stay near the fixation cross to trigger dialog (ms) */
export const CROSS_DWELL_MS = 1000;

/**
 * Number of consecutive out-of-zone checks allowed before resetting the dwell
 * timer. Absorbs brief gaze jitter without losing progress.
 * At 200ms check interval, 3 misses = 600ms tolerance.
 */
export const CROSS_JITTER_TOLERANCE = 3;

/** ML service timeout (ms) */
export const ML_PREDICTION_TIMEOUT = 15_000;

/** ML service retry config */
export const ML_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
} as const;

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
