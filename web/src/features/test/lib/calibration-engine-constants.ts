/**
 * Core calibration engine constants.
 *
 * These values control the timing and thresholds for the calibration
 * collection & validation pipeline. Changes here directly affect
 * gaze-mapping accuracy and user experience.
 *
 * These values are hardcoded intentionally. They describe the tested
 * calibration behavior for the current UX rather than deployment config.
 *
 * References:
 * - Rayner (2009): Fixation durations during reading
 * - Holmqvist & Andersson (2017): Eye Tracking – A comprehensive guide
 * - Nyström & Holmqvist (2010): Adaptive algorithm for fixation detection
 */

/**
 * Seconds of countdown before collection starts.
 * 5 seconds gives children adequate time to read instructions
 * and mentally prepare. 3 seconds is too rushed for ages 7-10.
 */
export const COUNTDOWN_SECONDS = 5;

/**
 * Minimum stable fixation duration (ms) before accepting a sample.
 *
 * Research consensus (Rayner 2009, Holmqvist 2017) recommends 250-350ms
 * for reliable fixation detection. 200ms is too short — allows samples
 * during microsaccades. 300ms filters these while remaining responsive.
 */
export const STABLE_FIXATION_MS = 300;

/**
 * Maximum velocity (normalized to screen diagonal per second) at which
 * gaze is still considered "stable". Values below this threshold qualify
 * as fixation; above indicates saccade movement.
 *
 * 0.55 = movement < 55% of screen diagonal per second.
 */
export const STABLE_VELOCITY_NORM_PER_SEC = 0.55;

/**
 * Minimum cooldown (ms) between successive sample captures.
 * Prevents over-sampling during a single fixation.
 */
export const CAPTURE_COOLDOWN_MS = 45;

/**
 * Time (ms) to let gaze settle before measuring a validation point.
 */
export const VALIDATION_SETTLE_MS = 450;

/**
 * Duration (ms) to hold fixation during validation measurement.
 */
export const VALIDATION_HOLD_MS = 1200;

/**
 * Validation accuracy threshold expressed as a fraction of screen
 * diagonal. A distance <= this fraction scores 100%; distances beyond
 * this score 0%.
 */
export const VALIDATION_THRESHOLD_SCREEN_DIAGONAL = 0.12;

/** Minimum gaze samples required per validation point for a valid score. */
export const VALIDATION_MIN_SAMPLES_PER_POINT = 10;

/**
 * Indices into CALIBRATION_POINTS used for quick validation.
 * Center + nearby inner-edge points for the 20-point (4x5) grid.
 *
 * CALIBRATION_POINTS order:
 * 0:(0.2,0.15)   1:(0.35,0.15)  2:(0.5,0.15)   3:(0.65,0.15)  4:(0.8,0.15)
 * 5:(0.2,0.30)   6:(0.35,0.30)  7:(0.5,0.30)   8:(0.65,0.30)  9:(0.8,0.30)
 * 10:(0.2,0.45) 11:(0.35,0.45) 12:(0.5,0.45) 13:(0.65,0.45) 14:(0.8,0.45)
 * 15:(0.2,0.60) 16:(0.35,0.60) 17:(0.5,0.60) 18:(0.65,0.60) 19:(0.8,0.60)
 *
 * IMPORTANT: The order is randomized at runtime (Fisher-Yates shuffle)
 * to prevent anticipatory saccades; subjects can learn fixed sequences.
 */
export const VALIDATION_POINT_INDICES = [12, 8, 6, 16, 18];

/**
 * Shuffle an array in-place using Fisher–Yates algorithm.
 * Returns a new shuffled copy (does not mutate input).
 */
export function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ── Utility functions ──────────────────────────────────── */

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function nextAnimationFrame(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

/* ── Screen info ────────────────────────────────────────── */

export interface ScreenInfo {
  width: number;
  height: number;
  diagonal: number;
}

export function getScreenInfo(): ScreenInfo {
  if (typeof window === 'undefined') {
    return { width: 1920, height: 1080, diagonal: Math.hypot(1920, 1080) };
  }
  const width = window.screen.width;
  const height = window.screen.height;
  return { width, height, diagonal: Math.hypot(width, height) };
}
