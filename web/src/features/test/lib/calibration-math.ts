/**
 * Pure math/statistics utilities for the calibration pipeline.
 *
 * Extracted from use-calibration.ts to keep the hook focused on
 * state management and the math functions testable in isolation.
 */

import type { CalibrationResult, CalibrationQuality } from '../types';
import { CALIBRATION_THRESHOLDS } from './constants';

/* ── Collected sample shape ─────────────────────────────── */

export interface CollectedSample {
  pointIndex: number;
  observedX: number;
  observedY: number;
  targetX: number;
  targetY: number;
  yaw: number;
  pitch: number;
}

/* ── Grid traversal ─────────────────────────────────────── */

/**
 * Build a serpentine (boustrophedon) traversal order for a grid.
 * Even rows go left→right, odd rows go right→left.
 * This minimizes large saccades between consecutive calibration points.
 */
export function buildSerpentineOrder(total: number, columns: number): number[] {
  const order: number[] = [];
  const rows = Math.ceil(total / columns);

  for (let row = 0; row < rows; row++) {
    const start = row * columns;
    const end = Math.min(total, start + columns);
    const rowIndices = Array.from({ length: end - start }, (_, i) => start + i);
    if (row % 2 === 1) rowIndices.reverse();
    order.push(...rowIndices);
  }

  return order;
}

/* ── Train / held-out split ─────────────────────────────── */

/** Holdout stride: every Nth sample goes to the held-out set. */
const HOLDOUT_STRIDE = 5;

/**
 * Deterministic train/held-out split by index stride.
 * Every `HOLDOUT_STRIDE`-th sample is held out for validation.
 */
export function splitDeterministic<T>(samples: T[]) {
  if (samples.length <= 1) return { train: [...samples], held: [...samples] };

  const train: T[] = [];
  const held: T[] = [];

  samples.forEach((sample, index) => {
    if (index % HOLDOUT_STRIDE === 0) held.push(sample);
    else train.push(sample);
  });

  if (train.length === 0 && held.length > 0) train.push(held[held.length - 1]);
  if (held.length === 0 && train.length > 0) held.push(train[train.length - 1]);

  return { train, held };
}

/* ── Basic statistics ───────────────────────────────────── */

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/* ── Outlier filtering ──────────────────────────────────── */

/**
 * MAD-based outlier rejection — filters samples whose z-score
 * (computed via Median Absolute Deviation) exceeds the threshold.
 *
 * MAD is preferred over standard deviation here because it is
 * robust to the very outliers we want to remove.
 */
const OUTLIER_Z_THRESHOLD = 3;

export function filterOutliers(samples: CollectedSample[]): CollectedSample[] {
  if (samples.length < 8) return samples;

  const xs = samples.map((s) => s.observedX);
  const ys = samples.map((s) => s.observedY);

  const mx = median(xs);
  const my = median(ys);

  const madX = median(xs.map((x) => Math.abs(x - mx))) * 1.4826 + 1e-6;
  const madY = median(ys.map((y) => Math.abs(y - my))) * 1.4826 + 1e-6;

  return samples.filter((s) => {
    const zx = Math.abs(s.observedX - mx) / madX;
    const zy = Math.abs(s.observedY - my) / madY;
    return zx <= OUTLIER_Z_THRESHOLD && zy <= OUTLIER_Z_THRESHOLD;
  });
}

/* ── Error computation ──────────────────────────────────── */

/**
 * Compute normalized Euclidean error for a single sample
 * against a prediction function.
 */
export function normalizedError(
  sample: CollectedSample,
  predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number },
  screenWidth: number,
  screenHeight: number,
): number {
  const pred = predict(sample.observedX, sample.observedY, sample.yaw, sample.pitch);
  const targetX = sample.targetX * screenWidth;
  const targetY = sample.targetY * screenHeight;
  const dx = (pred.x - targetX) / screenWidth;
  const dy = (pred.y - targetY) / screenHeight;
  return Math.hypot(dx, dy);
}

/* ── Quality classification ─────────────────────────────── */

/**
 * Classify a calibration result's quality based on average error.
 */
export function classifyCalibrationQuality(averageError: number): CalibrationQuality {
  if (averageError < CALIBRATION_THRESHOLDS.good) return 'good';
  if (averageError < CALIBRATION_THRESHOLDS.acceptable) return 'acceptable';
  return 'poor';
}

/* ── Result builder ─────────────────────────────────────── */

/**
 * Build a CalibrationResult from per-point accuracies.
 */
export function buildCalibrationResult(pointAccuracies: number[]): CalibrationResult {
  const averageError = mean(pointAccuracies);
  return {
    quality: classifyCalibrationQuality(averageError),
    pointAccuracies,
    averageError,
  };
}

/* ── Recalibration thresholds ───────────────────────────── */

export const TARGETED_RECALIBRATION_MAX_ROUNDS = 1;
export const TARGETED_RECALIBRATION_MAX_POINTS = 6;
export const TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD = 0.09;

/* ── Webcam sample requirements ─────────────────────────── */

export const MIN_WEBCAM_SAMPLES = 30;
export const MIN_WEBCAM_POINTS_WITH_SAMPLES = 8;
export const MIN_WEBCAM_SAMPLES_PER_POINT = 2;

/** Number of columns in the calibration grid (for serpentine order). */
export const GRID_COLUMNS = 5;
