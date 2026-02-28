/**
 * Constants for the test system — calibration, gaze, and thresholds.
 */

/**
 * 9-point calibration pattern (normalized 0-1 coords, 3×3 grid).
 * Gives 9 data points for a 6-coefficient polynomial — properly overdetermined
 * for least-squares fitting, which significantly improves calibration quality
 * compared to 5 points.
 */
export const CALIBRATION_POINTS = [
  { x: 0.5, y: 0.5 },  // center
  { x: 0.1, y: 0.1 },  // top-left
  { x: 0.5, y: 0.1 },  // top-center
  { x: 0.9, y: 0.1 },  // top-right
  { x: 0.1, y: 0.5 },  // middle-left
  { x: 0.9, y: 0.5 },  // middle-right
  { x: 0.1, y: 0.9 },  // bottom-left
  { x: 0.5, y: 0.9 },  // bottom-center
  { x: 0.9, y: 0.9 },  // bottom-right
] as const;

/** How long to show each calibration dot (ms) */
export const CALIBRATION_DOT_DURATION = 1500;

/** Gaze points to collect per calibration dot */
export const CALIBRATION_SAMPLES_PER_POINT = 30;

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
