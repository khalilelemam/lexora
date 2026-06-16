import { calibrationLogger } from '../debug-config';

export interface FeatureScaler {
  means: number[];
  stds: number[];
}

export function fitScaler(matrix: number[][]): FeatureScaler {
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
    stds.map((s, i) => ({ col: i, std: s })).filter(({ std }) => std < 0.01),
  );

  return { means, stds };
}

export function normalizeFeatures(matrix: number[][], scaler: FeatureScaler): number[][] {
  return matrix.map((row) => normalizeRow(row, scaler));
}

export function normalizeRow(row: number[], scaler: FeatureScaler): number[] {
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

export function predictLinear(coeffs: number[], features: number[]): number {
  let sum = 0;
  for (let i = 0; i < coeffs.length; i++) sum += coeffs[i] * features[i];
  return sum;
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

export function selectBestAxisCoefficients(
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
            return predicted - selectorTargets[index];
          }),
          selectorWeights,
        );

    if (!best || mse < best.mse) {
      calibrationLogger.debug('[RIDGE LAMBDA]', {
        lambda,
        mse: Number(mse.toFixed(6)),
      });
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
