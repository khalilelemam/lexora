export interface TrainingSample {
  ix: number;
  iy: number;
  yaw: number;
  pitch: number;
  targetX: number;
  targetY: number;
  pointIndex: number;
}
export type ModelKind = 'polynomial-ridge';

export interface CalibrationModel {
  kind: ModelKind;
  predict: (irisX: number, irisY: number, yaw: number, pitch: number) => { x: number; y: number };
  trainingError: number;
  info: string;
}

interface FeatureScaler {
  means: number[];
  stds: number[];
}

interface CandidateModelFit {
  label: string;
  lambdaX: number;
  lambdaY: number;
  error: number;
  trainingError: number;
  predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
}

function expandFeatures(ix: number, iy: number, yaw: number, pitch: number): number[] {
  return [
    1,
    ix,
    iy,
    yaw,
    pitch,
    ix * ix,
    iy * iy,
    yaw * yaw,
    pitch * pitch,
    ix * iy,
    ix * yaw,
    ix * pitch,
    iy * yaw,
    iy * pitch,
    yaw * pitch,
  ];
}

function expandCompactFeatures(ix: number, iy: number, yaw: number, pitch: number): number[] {
  return [1, ix, iy, yaw, pitch, ix * iy, ix * pitch, iy * yaw, yaw * pitch];
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
    normalized[col] = (row[col] - scaler.means[col]) / scaler.stds[col];
  }
  return normalized;
}

function solveRidge(
  A: number[][],
  b: number[],
  lambda: number,
  unregularizedCols: number,
): number[] {
  const cols = A[0]?.length ?? 0;
  const n = A.length;
  if (cols === 0 || n === 0) return new Array(cols).fill(0);

  const ATA: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += A[k][i] * A[k][j];
      ATA[i][j] = s;
    }
    if (i >= unregularizedCols) ATA[i][i] += lambda;
  }

  const ATb: number[] = new Array(cols).fill(0);
  for (let i = 0; i < cols; i++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += A[k][i] * b[k];
    ATb[i] = s;
  }

  const aug: number[][] = ATA.map((row, i) => [...row, ATb[i]]);
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

function leaveOneOutMse(features: number[][], targets: number[], lambda: number): number {
  const n = features.length;
  if (n <= 1) return Number.POSITIVE_INFINITY;

  const residuals: number[] = [];

  for (let holdOut = 0; holdOut < n; holdOut++) {
    const trainRows: number[][] = [];
    const trainTargets: number[] = [];

    for (let i = 0; i < n; i++) {
      if (i === holdOut) continue;
      trainRows.push(features[i]);
      trainTargets.push(targets[i]);
    }

    const coeffs = solveRidge(trainRows, trainTargets, lambda, 1);
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
): { lambda: number; coeffs: number[] } {
  const useLeaveOneOut = trainFeatures.length >= 6;
  let best: { lambda: number; mse: number } | null = null;

  for (const lambda of lambdas) {
    const fallbackCoeffs = solveRidge(trainFeatures, trainTargets, lambda, 1);
    const mse = useLeaveOneOut
      ? leaveOneOutMse(trainFeatures, trainTargets, lambda)
      : meanSquaredError(
          selectorFeatures.map(
            (row, index) => predictLinear(fallbackCoeffs, row) - selectorTargets[index],
          ),
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
    coeffs: solveRidge(trainFeatures, trainTargets, best.lambda, 1),
  };
}

function fitCandidateModel(
  train: TrainingSample[],
  selector: TrainingSample[],
  featureBuilder: (ix: number, iy: number, yaw: number, pitch: number) => number[],
  label: string,
): CandidateModelFit {
  const trainFeaturesRaw = train.map((sample) =>
    featureBuilder(sample.ix, sample.iy, sample.yaw, sample.pitch),
  );
  const scaler = fitScaler(trainFeaturesRaw);
  const trainFeatures = normalizeFeatures(trainFeaturesRaw, scaler);

  const selectorFeatures = normalizeFeatures(
    selector.map((sample) => featureBuilder(sample.ix, sample.iy, sample.yaw, sample.pitch)),
    scaler,
  );

  const trainTargetsX = train.map((sample) => sample.targetX);
  const trainTargetsY = train.map((sample) => sample.targetY);
  const selectorTargetsX = selector.map((sample) => sample.targetX);
  const selectorTargetsY = selector.map((sample) => sample.targetY);

  const lambdas = [1e-6, 1e-4, 1e-3, 1e-2, 3e-2, 1e-1, 3e-1, 1, 3];

  const bestX = selectBestAxisCoefficients(
    trainFeatures,
    trainTargetsX,
    selectorFeatures,
    selectorTargetsX,
    lambdas,
  );
  const bestY = selectBestAxisCoefficients(
    trainFeatures,
    trainTargetsY,
    selectorFeatures,
    selectorTargetsY,
    lambdas,
  );

  const predict = (ix: number, iy: number, yaw: number, pitch: number) => {
    const normalizedRow = normalizeRow(featureBuilder(ix, iy, yaw, pitch), scaler);
    return {
      x: predictLinear(bestX.coeffs, normalizedRow),
      y: predictLinear(bestY.coeffs, normalizedRow),
    };
  };

  const error = meanEuclideanError(selector, (sample) =>
    predict(sample.ix, sample.iy, sample.yaw, sample.pitch),
  );
  const trainingError = meanEuclideanError(train, (sample) =>
    predict(sample.ix, sample.iy, sample.yaw, sample.pitch),
  );

  return {
    label,
    lambdaX: bestX.lambda,
    lambdaY: bestY.lambda,
    error,
    trainingError,
    predict,
  };
}

function fitPolynomialRidge(
  train: TrainingSample[],
  validation: TrainingSample[],
): CalibrationModel {
  const selector = validation.length > 0 ? validation : train;

  const fullPolynomial = fitCandidateModel(train, selector, expandFeatures, 'poly2-full');
  const compactPolynomial = fitCandidateModel(
    train,
    selector,
    expandCompactFeatures,
    'poly2-compact',
  );

  // Prefer the compact model if it performs within 5% of full model error.
  // This improves stability and reduces overfitting in sparse/noisy webcam samples.
  const selectedModel =
    compactPolynomial.error <= fullPolynomial.error * 1.05 ? compactPolynomial : fullPolynomial;

  return {
    kind: 'polynomial-ridge',
    predict: selectedModel.predict,
    trainingError: selectedModel.trainingError,
    info:
      `Polynomial ridge (${selectedModel.label}, ` +
      `lambdaX=${selectedModel.lambdaX}, lambdaY=${selectedModel.lambdaY}, ` +
      `selectorErr=${selectedModel.error.toFixed(2)}px)`,
  };
}

export function fitProductionCalibrationModel(
  samples: TrainingSample[],
  validationSamples: TrainingSample[] = [],
): CalibrationModel {
  if (samples.length < 8) {
    return {
      kind: 'polynomial-ridge',
      predict: () => ({ x: 0, y: 0 }),
      trainingError: Number.POSITIVE_INFINITY,
      info: 'Polynomial ridge (insufficient samples)',
    };
  }

  return fitPolynomialRidge(samples, validationSamples);
}
