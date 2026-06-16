/**
 * Pure math/statistics utilities for the calibration pipeline.
 *
 * Extracted from use-calibration.ts to keep the hook focused on
 * state management and the math functions testable in isolation.
 */

import type { CalibrationResult, CalibrationQuality } from '../types';
import { CALIBRATION_THRESHOLDS } from './constants';
import type { CollectedSample } from './calibration-samples';

/* ── Grid traversal ─────────────────────────────────────── */

/**
 * Build a serpentine (boustrophedon) traversal order for a grid.
 * Even rows go left→right, odd rows go right→left.
 * This minimizes large saccades between consecutive calibration points.
 *
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
 * IQR-based outlier rejection — filters samples using median + IQR
 * robust statistics. Unlike mean+stddev (or even MAD), the IQR-derived
 * threshold is truly unaffected by the outliers being removed, so blink
 * artifacts and tracking losses are reliably rejected.
 *
 * @param samples  Collected samples from ONE calibration point
 * @param kSigma   Rejection multiplier (default 2.5). Equivalent to ~2σ
 *                 for Gaussian data but robust to contamination.
 * @returns        Filtered subset, or the original samples when there are
 *                 too few points to enforce the MIN_RETAINED floor.
 */
export function filterOutliers(samples: CollectedSample[], kSigma = 2.5): CollectedSample[] {
  const MIN_RETAINED = 8; // Hard floor — must keep at least the minSamples threshold

  // Below the retained floor we cannot reject samples without undercutting the
  // minimum data needed by downstream calibration fitting.
  if (samples.length < MIN_RETAINED) return samples;

  const xs = samples.map((s) => s.observedX);
  const ys = samples.map((s) => s.observedY);

  // Compute median and IQR-derived sigma for each axis
  const medianX = median(xs);
  const medianY = median(ys);

  const sigmaX = iqrToSigma(xs);
  const sigmaY = iqrToSigma(ys);

  // Thresholds: if sigma is near-zero (all samples identical), keep everything
  const threshX = sigmaX > 1e-6 ? kSigma * sigmaX : Infinity;
  const threshY = sigmaY > 1e-6 ? kSigma * sigmaY : Infinity;

  // Filter: keep samples within thresholds on both axes
  const filtered = samples.filter(
    (s) => Math.abs(s.observedX - medianX) <= threshX && Math.abs(s.observedY - medianY) <= threshY,
  );

  // Safety floor: if filter is too aggressive, fall back to closest-to-median
  if (filtered.length < MIN_RETAINED) {
    return samples
      .slice()
      .sort((a, b) => {
        const dA = Math.hypot(a.observedX - medianX, a.observedY - medianY);
        const dB = Math.hypot(b.observedX - medianX, b.observedY - medianY);
        return dA - dB;
      })
      .slice(0, MIN_RETAINED);
  }

  return filtered;
}

/**
 * Convert IQR (Interquartile Range) to σ-equivalent (standard deviation).
 * For normal distributions: IQR = 1.349σ, so σ = IQR / 1.349
 *
 * This allows thresholds like 2.5σ to be directly computed from quartiles,
 * which are unaffected by the outliers we want to remove.
 */
function iqrToSigma(values: number[]): number {
  if (values.length < 4) return 1; // Not enough for quartiles

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // Q1 ≈ value at 25th percentile, Q3 ≈ value at 75th percentile
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];

  // 1.349 converts IQR to σ for Gaussian distributions
  return (q3 - q1) / 1.349;
}

/* ── Error computation ──────────────────────────────────── */

/**
 * Compute normalized Euclidean error for a single sample
 * against a prediction function.
 */
export function normalizedError(
  sample: CollectedSample,
  predict: (
    ix: number,
    iy: number,
    yaw: number,
    pitch: number,
  ) => { x: number; y: number },
  screenWidth: number,
  screenHeight: number,
): number {
  const pred = predict(
    sample.observedX,
    sample.observedY,
    sample.yaw,
    sample.pitch,
  );
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
