import type { CalibrationPoint } from '../types';

/**
 * Core calibration engine constants.
 *
 * These values control the timing and thresholds for the calibration
 * collection & validation pipeline. Changes here directly affect
 * gaze-mapping accuracy and user experience.
 *
 * References:
 * - Rayner (2009): Fixation durations during reading
 * - Holmqvist & Andersson (2017): Eye Tracking – A comprehensive guide
 */

/** Seconds of countdown before collection starts. */
export const COUNTDOWN_SECONDS = 3;

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

/** Time (ms) to let gaze settle before measuring a validation point. */
export const VALIDATION_SETTLE_MS = 450;

/** Duration (ms) to hold fixation during validation measurement. */
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
 * These 5 points span corners + center for representative coverage.
 */
export const VALIDATION_POINT_INDICES = [0, 4, 7, 10, 14];

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
