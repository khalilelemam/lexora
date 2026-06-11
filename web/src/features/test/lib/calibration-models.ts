import type { CalibrationPhaseType } from '../types';
import { calibrationLogger } from './debug-config';

export interface TrainingSample {
  ix: number;
  iy: number;
  yaw: number;
  pitch: number;
  roll: number;
  headX: number;
  headY: number;
  invHeadZ: number;
  targetX: number;
  targetY: number;
  pointIndex: number;
  sampleWeight: number;
  phase: CalibrationPhaseType;
}
export type ModelKind = 'idw' | 'polynomial-ridge';

/**
 * Number of features produced by expandFeatures().
 *
 * Current feature set (from original ix/iy/pitch block):
 *   1, ix, iy, pitch, ix², iy², ix*iy, ix³, iy³, ix²*iy, ix*iy²   = 11
 *
 * Added head-pose features that have non-zero variance during head-still calibration:
 *   yaw, yaw*ix, pitch*iy                                                = 3
 *
 * Total: 14 features.
 *
 * Design rationale:
 * - During head-still calibration, headZ, headY, headX are near-constant,
 *   making invHeadZ, headY*iy, invHeadZ*ix multicollinear with bias/ix/iy.
 *   These were empirically confirmed to receive zero coefficients in practice.
 * - yaw has meaningful variance from small head turns even when "still"
 * - pitch is already in the base feature set
 * - Separate X/Y feature builders prevent horizontal features (yaw, yaw*ix)
 *   from contaminating the Y-axis model
 * - Y-axis uses a higher default lambda (3.0) to suppress remaining noise
 */
export const NUM_FEATURES_X = 14;
export const NUM_FEATURES_Y = 12;

export interface CalibrationModel {
  kind: ModelKind;
  predict: (
    irisX: number,
    irisY: number,
    yaw: number,
    pitch: number,
    roll: number,
    headX: number,
    headY: number,
    invHeadZ: number,
  ) => { x: number; y: number };
  trainingError: number;
  maxCentroidErrorPx?: number;
  info: string;
}

interface FeatureScaler {
  means: number[];
  stds: number[];
}

interface CandidateModelFit {
  label: string;
  kind: ModelKind;
  lambdaX: number;
  lambdaY: number;
  error: number;
  trainingError: number;
  coeffsX: number[];
  coeffsY: number[];
  predict: (
    ix: number,
    iy: number,
    yaw: number,
    pitch: number,
    roll: number,
    headX: number,
    headY: number,
    invHeadZ: number,
  ) => { x: number; y: number };
}

interface Centroid {
  pointIndex: number;
  phase: CalibrationPhaseType;
  meanIx: number;
  meanIy: number;
  meanPitch: number;
  meanScreenX: number;
  meanScreenY: number;
  sampleCount: number;
}

function summarizeSamplesByPoint(samples: TrainingSample[]) {
  const byPoint = new Map<number, {
    count: number;
    totalWeight: number;
    phases: Record<string, number>;
  }>();

  for (const sample of samples) {
    const entry = byPoint.get(sample.pointIndex) ?? {
      count: 0,
      totalWeight: 0,
      phases: {},
    };
    entry.count += 1;
    entry.totalWeight += sample.sampleWeight ?? 1.0;
    entry.phases[sample.phase] = (entry.phases[sample.phase] ?? 0) + 1;
    byPoint.set(sample.pointIndex, entry);
  }

  return Array.from(byPoint.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([pointIndex, entry]) => ({
      pointIndex,
      count: entry.count,
      totalWeight: Number(entry.totalWeight.toFixed(2)),
      phases: entry.phases,
    }));
}

function logSampleSummary(label: string, samples: TrainingSample[]) {
  if (!calibrationLogger.enabled) return;

  const phaseCounts = samples.reduce((acc, sample) => {
    acc[sample.phase] = (acc[sample.phase] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  calibrationLogger.debug(`[CALIBRATION DATASET] ${label}`, {
    totalSamples: samples.length,
    uniquePoints: new Set(samples.map((sample) => sample.pointIndex)).size,
    phaseCounts,
    samplesByPoint: summarizeSamplesByPoint(samples),
  });
}

function logStaticIyDiagnostics(samples: TrainingSample[]) {
  if (!calibrationLogger.enabled) return;

  const staticSamples = samples.filter((sample) => sample.phase === 'STATIC');
  if (staticSamples.length === 0) {
    calibrationLogger.debug('[STATIC IY DIAG] No STATIC samples');
    return;
  }

  const byPoint = new Map<number, {
    sumIy: number;
    count: number;
    targetX: number;
    targetY: number;
  }>();

  for (const sample of staticSamples) {
    const entry = byPoint.get(sample.pointIndex) ?? {
      sumIy: 0,
      count: 0,
      targetX: sample.targetX,
      targetY: sample.targetY,
    };
    entry.sumIy += sample.iy;
    entry.count += 1;
    byPoint.set(sample.pointIndex, entry);
  }

  const perPoint = Array.from(byPoint.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([pointIndex, entry]) => ({
      pointIndex,
      targetX: Number(entry.targetX.toFixed(4)),
      targetY: Number(entry.targetY.toFixed(4)),
      meanIy: Number((entry.sumIy / entry.count).toFixed(5)),
      samples: entry.count,
    }));

  const byRow = new Map<number, { targetY: number; sumMeanIy: number; countPoints: number }>();
  for (const point of perPoint) {
    const rowKey = Number(point.targetY.toFixed(4));
    const entry = byRow.get(rowKey) ?? { targetY: point.targetY, sumMeanIy: 0, countPoints: 0 };
    entry.sumMeanIy += point.meanIy;
    entry.countPoints += 1;
    byRow.set(rowKey, entry);
  }

  const rows = Array.from(byRow.values())
    .sort((a, b) => a.targetY - b.targetY)
    .map((entry) => ({
      targetY: Number(entry.targetY.toFixed(4)),
      meanIy: Number((entry.sumMeanIy / entry.countPoints).toFixed(5)),
      points: entry.countPoints,
    }));

  const topRow = rows[0] ?? null;
  const midRow = rows.length >= 2 ? rows[1] : null;
  const topMidDiff = topRow && midRow ? Math.abs(topRow.meanIy - midRow.meanIy) : null;
  const saturated = topMidDiff !== null && topMidDiff < 0.01;

  calibrationLogger.debug('[STATIC IY DIAG] mean(iy) for static points', {
    perPoint,
    rows,
    topMidDiff: topMidDiff !== null ? Number(topMidDiff.toFixed(5)) : null,
    saturated,
    saturationNote: saturated
      ? 'Top vs mid mean(iy) differ < 0.01; iris Y likely saturated/compressed for vertical extremes. Model changes will not fix it.'
      : null,
  });
}

function logCoefficientSummary(label: string, axis: 'x' | 'y', coeffs: number[]) {
  if (!calibrationLogger.enabled) return;

  const formatted = coeffs.map((value, index) => ({
    feature: index,
    weight: Number(value.toFixed(5)),
    absWeight: Number(Math.abs(value).toFixed(5)),
  }));
  const topWeights = [...formatted]
    .sort((a, b) => b.absWeight - a.absWeight)
    .slice(0, Math.min(8, formatted.length));

  calibrationLogger.debug(`[RIDGE COEFFS] ${label} axis=${axis}`, {
    allWeights: formatted,
    topWeights,
  });
}

/**
 * Feature builder for the X-axis (horizontal) polynomial ridge model.
 *
 * 14 features total:
 *   [0]    1.0            (bias / intercept)
 *   [1]    ix             raw horizontal iris position
 *   [2]    iy             raw vertical iris position
 *   [3]    pitch          head pitch (vertical nod)
 *   [4]    ix²            quadratic iris X
 *   [5]    iy²            quadratic iris Y
 *   [6]    ix*iy          iris cross-term
 *   [7]    ix³            cubic iris X
 *   [8]    iy³            cubic iris Y
 *   [9]    ix²*iy         iris X²Y cross
 *   [10]   ix*iy²         iris XY² cross
 *   [11]   yaw            head yaw — horizontal correction
 *   [12]   yaw * ix       head turn × horizontal iris — horizontal gain
 *   [13]   pitch * iy     head nod × vertical iris — minor X cross-term
 *
 * Excluded: invHeadZ (constant during head-still), headY*iy (redundant
 *   with iy during head-still), invHeadZ*ix (redundant with ix)
 */
export function expandFeaturesX(
  ix: number,
  iy: number,
  yaw: number,
  pitch: number,
): number[] {
  const features = [
    1.0,
    ix,
    iy,
    pitch,
    ix * ix,
    iy * iy,
    ix * iy,
    ix * ix * ix,
    iy * iy * iy,
    ix * ix * iy,
    ix * iy * iy,
    yaw,
    yaw * ix,
    pitch * iy,
  ];

  console.assert(
    features.length === NUM_FEATURES_X,
    `expandFeaturesX() must output ${NUM_FEATURES_X} features, got ${features.length}`,
  );
  return features;
}

/**
 * Feature builder for the Y-axis (vertical) polynomial ridge model.
 *
 * 12 features total — excludes horizontal-only head features (yaw, yaw*ix)
 * to prevent spurious vertical predictions from horizontal head turns.
 *
 *   [0]    1.0            (bias / intercept)
 *   [1]    ix             raw horizontal iris position
 *   [2]    iy             raw vertical iris position
 *   [3]    pitch          head pitch — direct vertical correction
 *   [4]    ix²            quadratic iris X
 *   [5]    iy²            quadratic iris Y
 *   [6]    ix*iy          iris cross-term
 *   [7]    ix³            cubic iris X
 *   [8]    iy³            cubic iris Y
 *   [9]    ix²*iy         iris X²Y cross
 *   [10]   ix*iy²         iris XY² cross
 *   [11]   pitch * iy     head nod × vertical iris — KEY vertical feature
 * Note: No yaw or yaw*ix here — those are horizontal-only features.
 * Y-axis uses a higher default lambda (3.0) by default to suppress
 * noise from polynomial cross-terms that aren't vertically informative.
 */
export function expandFeaturesY(
  ix: number,
  iy: number,
  pitch: number,
): number[] {
  const features = [
    1.0,
    ix,
    iy,
    pitch,
    ix * ix,
    iy * iy,
    ix * iy,
    ix * ix * ix,
    iy * iy * iy,
    ix * ix * iy,
    ix * iy * iy,
    pitch * iy,
  ];

  console.assert(
    features.length === NUM_FEATURES_Y,
    `expandFeaturesY() must output ${NUM_FEATURES_Y} features, got ${features.length}`,
  );
  return features;
}

function fitScaler(matrix: number[][]): FeatureScaler {
  const cols = matrix[0]?.length ?? 0;
  if (cols === 0 || matrix.length === 0) {
    return { means: [], stds: [] };
  }

  const means = new Array(cols).fill(0);
  const stds = new Array(cols).fill(1);

  for (const row of matrix) {
    for (let col = 1; col < cols; col++) means[col] += row[col];
  }
  for (let col = 1; col < cols; col++) means[col] /= matrix.length;

  for (const row of matrix) {
    for (let col = 1; col < cols; col++) stds[col] += (row[col] - means[col]) ** 2;
  }
  for (let col = 1; col < cols; col++) {
    stds[col] = Math.max(1e-6, Math.sqrt(stds[col] / matrix.length));
  }

  calibrationLogger.debug('[STD CHECK] Near-zero std columns:', () =>
    stds
      .map((s, i) => ({ col: i, std: s }))
      .filter(({ std }) => std < 0.01),
  );

  return { means, stds };
}

function normalizeFeatures(matrix: number[][], scaler: FeatureScaler): number[][] {
  return matrix.map((row) => {
    return normalizeRow(row, scaler);
  });
}

function normalizeRow(row: number[], scaler: FeatureScaler): number[] {
  const normalized = [...row];
  for (let col = 1; col < row.length; col++) {
    const z = (row[col] - scaler.means[col]) / scaler.stds[col];
    normalized[col] = Math.max(-5, Math.min(5, z));
  }
  return normalized;
}

/**
 * Solves weighted Ridge regression: w = (AᵀWA + λI)⁻¹ AᵀWb
 * @param A       Feature matrix [n × p]
 * @param b       Target vector [n]
 * @param lambda  Ridge regularization strength
 * @param weights Per-sample weights [n]. Defaults to uniform 1.0.
 * @param unregularizedCols Number of leading columns to skip regularization (typically 1 for intercept)
 */
function solveRidgeWeighted(
  A: number[][],
  b: number[],
  lambda: number,
  weights: number[],
  unregularizedCols: number,
): number[] {
  const cols = A[0]?.length ?? 0;
  const n = A.length;
  if (cols === 0 || n === 0) return new Array(cols).fill(0);

  // AᵀWA: p×p matrix
  const AtWA: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  for (let i = 0; i < n; i++) {
    const wi = weights[i] ?? 1.0;
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < cols; k++) {
        AtWA[j][k] += wi * A[i][j] * A[i][k];
      }
    }
  }

  // Add λI to diagonal (skip unregularized columns)
  for (let j = unregularizedCols; j < cols; j++) {
    AtWA[j][j] += lambda;
  }

  // AᵀWb: p vector
  const AtWb: number[] = new Array(cols).fill(0);
  for (let i = 0; i < n; i++) {
    const wi = weights[i] ?? 1.0;
    for (let j = 0; j < cols; j++) {
      AtWb[j] += wi * A[i][j] * b[i];
    }
  }

  // Solve AtWA * coeffs = AtWb using Gaussian elimination
  const aug: number[][] = AtWA.map((row, i) => [...row, AtWb[i]]);
  for (let col = 0; col < cols; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < cols; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivotRow][col])) pivotRow = row;
    }
    [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let j = col; j <= cols; j++) aug[col][j] /= pivot;
    for (let row = 0; row < cols; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= cols; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((r) => r[cols]);
}

function predictLinear(coeffs: number[], features: number[]): number {
  let sum = 0;
  for (let i = 0; i < coeffs.length; i++) sum += coeffs[i] * features[i];
  return sum;
}

function meanEuclideanError(
  samples: TrainingSample[],
  predict: (s: TrainingSample) => { x: number; y: number },
): number {
  if (samples.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (const s of samples) {
    const p = predict(s);
    total += Math.hypot(p.x - s.targetX, p.y - s.targetY);
  }
  return total / samples.length;
}

function meanSquaredError(errors: number[]): number {
  if (errors.length === 0) return Number.POSITIVE_INFINITY;
  return errors.reduce((sum, value) => sum + value * value, 0) / errors.length;
}

function weightedMeanSquaredError(errors: number[], weights?: number[]): number {
  if (errors.length === 0) return Number.POSITIVE_INFINITY;
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < errors.length; i += 1) {
    const weight = weights?.[i] ?? 1.0;
    weightedSum += weight * errors[i] * errors[i];
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : Number.POSITIVE_INFINITY;
}

/**
 * Weighted leave-one-out cross-validation MSE.
 * @param features Feature matrix [n × p]
 * @param targets Target vector [n]
 * @param weights Per-sample weights [n]
 * @param lambda Ridge regularization
 */
function leaveOneOutMseWeighted(
  features: number[][],
  targets: number[],
  weights: number[],
  lambda: number,
): number {
  const n = features.length;
  if (n <= 1) return Number.POSITIVE_INFINITY;

  const residuals: number[] = [];

  for (let holdOut = 0; holdOut < n; holdOut++) {
    const trainRows: number[][] = [];
    const trainTargets: number[] = [];
    const trainWeights: number[] = [];

    for (let i = 0; i < n; i++) {
      if (i === holdOut) continue;
      trainRows.push(features[i]);
      trainTargets.push(targets[i]);
      trainWeights.push(weights[i] ?? 1.0);
    }

    const coeffs = solveRidgeWeighted(trainRows, trainTargets, lambda, trainWeights, 1);
    const predicted = predictLinear(coeffs, features[holdOut]);
    residuals.push(predicted - targets[holdOut]);
  }

  return meanSquaredError(residuals);
}

function selectBestAxisCoefficients(
  trainFeatures: number[][],
  trainTargets: number[],
  selectorFeatures: number[][],
  selectorTargets: number[],
  lambdas: number[],
  trainWeights?: number[],
  selectorWeights?: number[],
): { lambda: number; coeffs: number[] } {
  const useLeaveOneOut = trainFeatures.length >= 6;
  const weights = trainWeights ?? trainFeatures.map(() => 1.0);
  let best: { lambda: number; mse: number } | null = null;

  for (const lambda of lambdas) {
    const coeffs = solveRidgeWeighted(trainFeatures, trainTargets, lambda, weights, 1);
    const mse = useLeaveOneOut
      ? leaveOneOutMseWeighted(trainFeatures, trainTargets, weights, lambda)
      : weightedMeanSquaredError(
        selectorFeatures.map((row, index) => {
          const predicted = predictLinear(coeffs, row);
          const target = selectorTargets[index];
          return predicted - target;
        }),
        selectorWeights,
      );

    if (!best || mse < best.mse) {
      best = { lambda, mse };
    }
  }

  if (!best) {
    return { lambda: lambdas[0] ?? 1e-2, coeffs: new Array(trainFeatures[0]?.length ?? 0).fill(0) };
  }

  return {
    lambda: best.lambda,
    coeffs: solveRidgeWeighted(trainFeatures, trainTargets, best.lambda, weights, 1),
  };
}

function fitCandidateModel(
  train: TrainingSample[],
  selector: TrainingSample[],
  label: string,
): CandidateModelFit {
  // Build feature matrices for X and Y axes separately.
  // X-axis gets horizontal features (yaw, yaw*ix).
  // Y-axis gets only vertical-relevant features (no yaw).
  const trainFeaturesX = train.map((sample) =>
    expandFeaturesX(sample.ix, sample.iy, sample.yaw, sample.pitch),
  );
  const trainFeaturesY = train.map((sample) =>
    expandFeaturesY(sample.ix, sample.iy, sample.pitch),
  );

  const scalerX = fitScaler(trainFeaturesX);
  const scalerY = fitScaler(trainFeaturesY);
  const trainX = normalizeFeatures(trainFeaturesX, scalerX);
  const trainY = normalizeFeatures(trainFeaturesY, scalerY);

  const selectorX = normalizeFeatures(
    selector.map((sample) => expandFeaturesX(sample.ix, sample.iy, sample.yaw, sample.pitch)),
    scalerX,
  );
  const selectorY = normalizeFeatures(
    selector.map((sample) => expandFeaturesY(sample.ix, sample.iy, sample.pitch)),
    scalerY,
  );

  const trainTargetsX = train.map((sample) => sample.targetX);
  const trainTargetsY = train.map((sample) => sample.targetY);
  const selectorTargetsX = selector.map((sample) => sample.targetX);
  const selectorTargetsY = selector.map((sample) => sample.targetY);

  const trainWeights = train.map((sample) => sample.sampleWeight ?? 1.0);
  const selectorWeights = selector.map((sample) => sample.sampleWeight ?? 1.0);

  // Expanded lambda grid with low values for X (lets yaw signals through).
  // Y uses a separate, more conservative grid with a floor of 3.0 to prevent
  // polynomial cross-terms from overfitting vertical positions.
  const lambdasX = [0.05, 0.1, 0.25, 0.5, 1, 2, 3];
  const lambdasY = [2.0,3.0, 5, 10];

  const bestX = selectBestAxisCoefficients(
    trainX, trainTargetsX, selectorX, selectorTargetsX,
    lambdasX, trainWeights, selectorWeights,
  );
  const bestY = selectBestAxisCoefficients(
    trainY, trainTargetsY, selectorY, selectorTargetsY,
    lambdasY, trainWeights, selectorWeights,
  );

  logCoefficientSummary(label, 'x', bestX.coeffs);
  logCoefficientSummary(label, 'y', bestY.coeffs);

  const predict = (
    ix: number,
    iy: number,
    yaw: number,
    pitch: number,
    roll: number,
    headX: number,
    headY: number,
    invHeadZ: number,
  ) => {
    void roll;
    void headX;
    void headY;
    void invHeadZ;

    const standardizeFeatures = (
      rawFeatures: number[],
      scaler: FeatureScaler,
    ): number[] =>
      rawFeatures.map((val, col) => {
        if (col === 0) return 1;
        const std = scaler.stds[col];
        if (std < 1e-6) return 0;
        const z = (val - scaler.means[col]) / std;
        return Math.max(-5, Math.min(5, z));
      });

    const rawX = expandFeaturesX(ix, iy, yaw, pitch);
    const rawY = expandFeaturesY(ix, iy, pitch);
    const normX = standardizeFeatures(rawX, scalerX);
    const normY = standardizeFeatures(rawY, scalerY);

    return {
      x: predictLinear(bestX.coeffs, normX),
      y: predictLinear(bestY.coeffs, normY),
    };
  };

  const error = meanEuclideanError(selector, (sample) =>
    predict(
      sample.ix, sample.iy, sample.yaw, sample.pitch,
      sample.roll, sample.headX, sample.headY, sample.invHeadZ,
    ),
  );
  const trainingError = meanEuclideanError(train, (sample) =>
    predict(
      sample.ix, sample.iy, sample.yaw, sample.pitch,
      sample.roll, sample.headX, sample.headY, sample.invHeadZ,
    ),
  );

  return {
    label,
    kind: 'polynomial-ridge',
    lambdaX: bestX.lambda,
    lambdaY: bestY.lambda,
    error,
    trainingError,
    coeffsX: bestX.coeffs,
    coeffsY: bestY.coeffs,
    predict,
  };
}

function buildCentroids(trainSamples: TrainingSample[]): Centroid[] {
  const buckets = new Map<number, {
    ix: number;
    iy: number;
    pitch: number;
    sx: number;
    sy: number;
    count: number;
    phases: Record<CalibrationPhaseType, number>;
  }>();

  for (const sample of trainSamples) {
    const bucket = buckets.get(sample.pointIndex) ?? {
      ix: 0,
      iy: 0,
      pitch: 0,
      sx: 0,
      sy: 0,
      count: 0,
      phases: {} as Record<CalibrationPhaseType, number>,
    };

    bucket.ix += sample.ix;
    bucket.iy += sample.iy;
    bucket.pitch += sample.pitch;
    bucket.sx += sample.targetX;
    bucket.sy += sample.targetY;
    bucket.count += 1;
    bucket.phases[sample.phase] = (bucket.phases[sample.phase] ?? 0) + 1;
    buckets.set(sample.pointIndex, bucket);
  }

  return Array.from(buckets.entries())
    .map(([pointIndex, bucket]) => ({
      pointIndex,
      phase: Object.entries(bucket.phases).sort((a, b) => b[1] - a[1])[0]?.[0] as CalibrationPhaseType,
      meanIx: bucket.ix / bucket.count,
      meanIy: bucket.iy / bucket.count,
      meanPitch: bucket.pitch / bucket.count,
      meanScreenX: bucket.sx / bucket.count,
      meanScreenY: bucket.sy / bucket.count,
      sampleCount: bucket.count,
    }))
    .sort((a, b) => a.pointIndex - b.pointIndex);
}

const IDW_PITCH_SCALES = [2, 4, 6] as const;

function buildIdwPredictor(centroids: Centroid[], pitchScale: number) {
  return (
    ix: number,
    iy: number,
    yaw: number,
    pitch: number,
    roll: number,
    headX: number,
    headY: number,
    invHeadZ: number,
  ) => {
    void yaw;
    void roll;
    void headX;
    void headY;
    void invHeadZ;

    let weightedX = 0;
    let weightedY = 0;
    let totalWeight = 0;

    for (const centroid of centroids) {
      const dx = ix - centroid.meanIx;
      const dy = iy - centroid.meanIy;
      const dp = (pitch - centroid.meanPitch) * pitchScale;
      const d2 = dx * dx + dy * dy + dp * dp;
      const weight = 1 / (d2 + 1e-10);
      weightedX += weight * centroid.meanScreenX;
      weightedY += weight * centroid.meanScreenY;
      totalWeight += weight;
    }

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
    };
  };
}

function meanExtremeRowVerticalError(
  samples: TrainingSample[],
  predict: (
    ix: number,
    iy: number,
    yaw: number,
    pitch: number,
    roll: number,
    headX: number,
    headY: number,
    invHeadZ: number,
  ) => { x: number; y: number },
): number {
  if (samples.length === 0) return Number.POSITIVE_INFINITY;

  const targetYs = samples.map((sample) => sample.targetY);
  const minTargetY = Math.min(...targetYs);
  const maxTargetY = Math.max(...targetYs);
  const epsilon = 1e-6;

  const extremeSamples = samples.filter(
    (sample) =>
      Math.abs(sample.targetY - minTargetY) < epsilon ||
      Math.abs(sample.targetY - maxTargetY) < epsilon,
  );

  if (extremeSamples.length === 0) return Number.POSITIVE_INFINITY;

  let totalVerticalError = 0;
  for (const sample of extremeSamples) {
    const predicted = predict(
      sample.ix,
      sample.iy,
      sample.yaw,
      sample.pitch,
      sample.roll,
      sample.headX,
      sample.headY,
      sample.invHeadZ,
    );
    totalVerticalError += Math.abs(predicted.y - sample.targetY);
  }

  return totalVerticalError / extremeSamples.length;
}

export function fitIdwModel(
  trainSamples: TrainingSample[],
  selectorSamples: TrainingSample[],
  screenW: number,
  screenH: number,
): CalibrationModel {
  const centroids = buildCentroids(trainSamples.filter(s => s.phase === 'STATIC'));
  const n = centroids.length;

  if (n === 0) {
    return {
      kind: 'idw',
      predict: () => ({ x: screenW * 0.5, y: screenH * 0.5 }),
      trainingError: Number.POSITIVE_INFINITY,
      info: 'IDW (insufficient centroids)',
    };
  }

  const evaluationSamples = selectorSamples.length > 0 ? selectorSamples : trainSamples;
  const candidates = IDW_PITCH_SCALES.map((pitchScale) => {
    const predict = buildIdwPredictor(centroids, pitchScale);
    const topBottomVerticalError = meanExtremeRowVerticalError(evaluationSamples, predict);
    const selectorError = meanEuclideanError(evaluationSamples, (sample) =>
      predict(
        sample.ix,
        sample.iy,
        sample.yaw,
        sample.pitch,
        sample.roll,
        sample.headX,
        sample.headY,
        sample.invHeadZ,
      ),
    );
    const trainingError = meanEuclideanError(trainSamples, (sample) =>
      predict(
        sample.ix,
        sample.iy,
        sample.yaw,
        sample.pitch,
        sample.roll,
        sample.headX,
        sample.headY,
        sample.invHeadZ,
      ),
    );

    return {
      pitchScale,
      predict,
      topBottomVerticalError,
      selectorError,
      trainingError,
    };
  }).sort((a, b) => {
    if (a.topBottomVerticalError !== b.topBottomVerticalError) {
      return a.topBottomVerticalError - b.topBottomVerticalError;
    }
    if (a.selectorError !== b.selectorError) {
      return a.selectorError - b.selectorError;
    }
    return a.trainingError - b.trainingError;
  });

  const bestCandidate = candidates[0];
  const predict = bestCandidate.predict;

  const trainingError = bestCandidate.trainingError;
  const centroidErrors = centroids.map((centroid) => {
    const predicted = predict(centroid.meanIx, centroid.meanIy, 0, centroid.meanPitch, 0, 0, 0, 0);
    return Math.hypot(
      predicted.x - centroid.meanScreenX,
      predicted.y - centroid.meanScreenY,
    );
  });
  const meanCentroidError = centroidErrors.length > 0
    ? centroidErrors.reduce((sum, error) => sum + error, 0) / centroidErrors.length
    : Number.POSITIVE_INFINITY;
  const maxCentroidError = Math.max(...centroidErrors);

  const ixValues = centroids.map((centroid) => centroid.meanIx);
  const iyValues = centroids.map((centroid) => centroid.meanIy);
  const pitchValues = centroids.map((centroid) => centroid.meanPitch);
  const screenXValues = centroids.map((centroid) => centroid.meanScreenX);
  const screenYValues = centroids.map((centroid) => centroid.meanScreenY);

  calibrationLogger.debug('[IDW CENTROIDS]', () =>
    centroids.map((centroid) => ({
      point: centroid.pointIndex,
      phase: centroid.phase,
      ix: Number(centroid.meanIx.toFixed(5)),
      iy: Number(centroid.meanIy.toFixed(5)),
      pitch: Number(centroid.meanPitch.toFixed(5)),
      screenX: Number(centroid.meanScreenX.toFixed(2)),
      screenY: Number(centroid.meanScreenY.toFixed(2)),
      samples: centroid.sampleCount,
    })),
  );

  const gridCentroids = centroids.filter((centroid) => centroid.phase === 'STATIC').length;
  const readingCentroids = centroids.filter((centroid) => centroid.phase === 'READING_ANCHOR').length;

  calibrationLogger.debug('[IDW FIT]', {
    rawSamples: trainSamples.length,
    gridCentroids,
    readingCentroids,
    centroidCount: n,
    power: 2,
    selectedPitchScale: bestCandidate.pitchScale,
    ixRange: [Math.min(...ixValues), Math.max(...ixValues)].map((value) => Number(value.toFixed(5))),
    iyRange: [Math.min(...iyValues), Math.max(...iyValues)].map((value) => Number(value.toFixed(5))),
    pitchRange: [Math.min(...pitchValues), Math.max(...pitchValues)].map((value) => Number(value.toFixed(5))),
    screenXRange: [Math.min(...screenXValues), Math.max(...screenXValues)].map((value) => Number(value.toFixed(2))),
    screenYRange: [Math.min(...screenYValues), Math.max(...screenYValues)].map((value) => Number(value.toFixed(2))),
    pitchScaleSweep: candidates.map((candidate) => ({
      pitchScale: candidate.pitchScale,
      topBottomVerticalError: Number(candidate.topBottomVerticalError.toFixed(6)),
      selectorErrorPx: Number(candidate.selectorError.toFixed(2)),
      trainingErrorPx: Number(candidate.trainingError.toFixed(2)),
    })),
    rawTrainingErrorPx: Number(trainingError.toFixed(2)),
    meanCentroidErrorPx: Number(meanCentroidError.toFixed(2)),
    maxCentroidErrorPx: Number(maxCentroidError.toFixed(2)),
  });

  return {
    kind: 'idw',
    predict,
    trainingError,
    maxCentroidErrorPx: maxCentroidError,
    info:
      `IDW centroid model (pitchScale=${bestCandidate.pitchScale}, centroids=${n}, rawTrainErr=${trainingError.toFixed(2)}px, ` +
      `maxCentroidErr=${maxCentroidError.toFixed(2)}px)`,
  };
}

function fitPolynomialRidge(
  train: TrainingSample[],
  validation: TrainingSample[],
): CalibrationModel {
  const selector = validation.length > 0 ? validation : train;

  logSampleSummary('train', train);
  logSampleSummary(validation.length > 0 ? 'validation' : 'selector=fallback-train', selector);
  logStaticIyDiagnostics(validation.length > 0 ? [...train, ...validation] : train);

  const selectedModel = fitCandidateModel(train, selector, 'poly-x-y-separate');

  const model: CalibrationModel = {
    kind: 'polynomial-ridge',
    predict: selectedModel.predict,
    trainingError: selectedModel.trainingError,
    info:
      `Polynomial ridge (${selectedModel.label}, ` +
      `lambdaX=${selectedModel.lambdaX}, lambdaY=${selectedModel.lambdaY}, ` +
      `selectorErr=${selectedModel.error.toFixed(2)}px)`,
  };

  calibrationLogger.debug('[MODEL INFO]', model.info);
  calibrationLogger.debug('[POLY MODEL]', {
      selectedLabel: selectedModel.label,
      lambdaX: selectedModel.lambdaX,
      lambdaY: selectedModel.lambdaY,
      selectorErrorPx: Number(selectedModel.error.toFixed(2)),
      trainingErrorPx: Number(selectedModel.trainingError.toFixed(2)),
      coeffsX: selectedModel.coeffsX.map((value) => Number(value.toFixed(5))),
      coeffsY: selectedModel.coeffsY.map((value) => Number(value.toFixed(5))),
  });
  return model;
}

export function fitProductionCalibrationModel(
  samples: TrainingSample[],
  validationSamples: TrainingSample[] = [],
): CalibrationModel {
  if (samples.length < 8) {
    return {
      kind: 'idw',
      predict: () => ({ x: 0, y: 0 }),
      trainingError: Number.POSITIVE_INFINITY,
      info: 'IDW (insufficient samples)',
    };
  }

  const selector = validationSamples.length > 0 ? validationSamples : samples;
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;

  calibrationLogger.debug('[FEATURE SET] calibration models - separate X/Y feature builders', {
    xAxisFeatures: NUM_FEATURES_X,
    yAxisFeatures: NUM_FEATURES_Y,
    xFeatures: [
      '1', 'ix', 'iy', 'pitch',
      'ix^2', 'iy^2', 'ix*iy',
      'ix^3', 'iy^3', 'ix^2*iy', 'ix*iy^2',
      'yaw', 'yaw*ix', 'pitch*iy',
    ],
    yFeatures: [
      '1', 'ix', 'iy', 'pitch',
      'ix^2', 'iy^2', 'ix*iy',
      'ix^3', 'iy^3', 'ix^2*iy', 'ix*iy^2',
      'pitch*iy',
    ],
    excludedFromY: ['yaw', 'yaw*ix'],
    excludedFromBoth: ['invHeadZ', 'invHeadZ*ix', 'headY*iy'],
  });

  const idwModel = fitIdwModel(samples, selector, screenW, screenH);
  const polynomialModel = fitPolynomialRidge(samples, validationSamples);

  const idwSelectorError = meanEuclideanError(selector, (sample) =>
    idwModel.predict(sample.ix, sample.iy, 0, sample.pitch, 0, 0, 0, 0),
  );
  const idwMaxCentroidError = idwModel.maxCentroidErrorPx ?? Number.POSITIVE_INFINITY;
  const polynomialSelectorError = meanEuclideanError(selector, (sample) =>
    polynomialModel.predict(
      sample.ix,
      sample.iy,
      sample.yaw,
      sample.pitch,
      sample.roll ?? 0,
      sample.headX ?? 0,
      sample.headY ?? 0,
      sample.invHeadZ ?? 0,
    ),
  );

  const idwCandidate = {
    kind: 'idw' as const,
    model: idwModel,
    selectorErrorPx: idwSelectorError,
    trainingErrorPx: idwModel.trainingError,
    maxCentroidErrorPx: idwMaxCentroidError,
    sanityPassed: idwMaxCentroidError <= 100,
  };
  const polynomialCandidate = {
    kind: 'polynomial-ridge' as const,
    model: polynomialModel,
    selectorErrorPx: polynomialSelectorError,
    trainingErrorPx: polynomialModel.trainingError,
    maxCentroidErrorPx: null,
    sanityPassed: true,
  };
  const candidates = [idwCandidate, polynomialCandidate]
    .filter((candidate) => candidate.sanityPassed)
    .sort((a, b) => a.selectorErrorPx - b.selectorErrorPx);

  let selectedCandidate = candidates[0] ?? idwCandidate;
  let reason = selectedCandidate.kind === 'idw'
    ? 'IDW had lower selector error'
    : 'Polynomial ridge had lower selector error';

  if (selectedCandidate.kind === 'polynomial-ridge' && selectedCandidate.trainingErrorPx > 200) {
    selectedCandidate = idwCandidate;
    reason = 'Polynomial training error > 200px, falling back to IDW';
  } else if (!idwCandidate.sanityPassed) {
    reason = 'IDW max centroid error exceeded 100px sanity threshold';
  }

  const selectedModel = selectedCandidate.model;

  calibrationLogger.debug('[MODEL CANDIDATES]', {
      idw: {
        kind: idwModel.kind,
        selectorErrorPx: Number(idwSelectorError.toFixed(2)),
        trainingErrorPx: Number(idwModel.trainingError.toFixed(2)),
        maxCentroidErrorPx: Number(idwMaxCentroidError.toFixed(2)),
        sanityPassed: idwCandidate.sanityPassed,
        info: idwModel.info,
      },
      polynomial: {
        kind: polynomialModel.kind,
        selectorErrorPx: Number(polynomialSelectorError.toFixed(2)),
        trainingErrorPx: Number(polynomialModel.trainingError.toFixed(2)),
        info: polynomialModel.info,
      },
  });

  calibrationLogger.debug('[MODEL SELECTED]', {
      kind: selectedModel.kind,
      reason,
      selectorErrorPx: Number(selectedCandidate.selectorErrorPx.toFixed(2)),
      trainingErrorPx: Number(selectedModel.trainingError.toFixed(2)),
      info: selectedModel.info,
  });

  if (typeof window !== 'undefined') {
    (window as typeof window & {
      __lexoraCalibrationModel?: { predict: CalibrationModel['predict'] };
    }).__lexoraCalibrationModel = { predict: selectedModel.predict };
  }

  return selectedModel;
}
