"use strict";

// src/features/test/lib/calibration-models.ts
var NUM_FEATURES = 28;
function expandFeatures(ix, iy, yaw, pitch, headX, headY, invHeadZ, roll) {
  const features = [
    // Block A: baseline polynomial terms
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
    ix * ix * ix,
    iy * iy * iy,
    ix * ix * iy,
    ix * iy * iy,
    ix * ix + iy * iy,
    // Block B: depth/roll compensation (headX, headY removed to reduce multicollinearity with yaw)
    invHeadZ,
    ix * invHeadZ,
    iy * invHeadZ,
    yaw * invHeadZ,
    pitch * invHeadZ,
    roll,
    ix * roll,
    iy * roll
  ];
  console.assert(features.length === NUM_FEATURES, "expandFeatures() must output 28 features");
  return features;
}
function expandCompactFeatures(ix, iy, yaw, pitch, headX, headY, invHeadZ, roll) {
  return [
    1,
    ix,
    iy,
    yaw,
    pitch,
    ix * iy,
    yaw * pitch,
    invHeadZ,
    ix * invHeadZ,
    iy * invHeadZ,
    pitch * invHeadZ,
    roll,
    ix * roll,
    iy * roll
  ];
}
function fitScaler(matrix) {
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
  const nearZeroStdCols = stds.map((s, i) => ({ col: i, std: s })).filter(({ std }) => std < 0.01);
  console.log("[STD CHECK] Near-zero std columns:", nearZeroStdCols);
  return { means, stds };
}
function normalizeFeatures(matrix, scaler) {
  return matrix.map((row) => {
    return normalizeRow(row, scaler);
  });
}
function normalizeRow(row, scaler) {
  const normalized = [...row];
  for (let col = 1; col < row.length; col++) {
    normalized[col] = (row[col] - scaler.means[col]) / scaler.stds[col];
  }
  return normalized;
}
function solveRidgeWeighted(A, b, lambda, weights, unregularizedCols) {
  const cols = A[0]?.length ?? 0;
  const n = A.length;
  if (cols === 0 || n === 0) return new Array(cols).fill(0);
  const AtWA = Array.from({ length: cols }, () => new Array(cols).fill(0));
  for (let i = 0; i < n; i++) {
    const wi = weights[i] ?? 1;
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < cols; k++) {
        AtWA[j][k] += wi * A[i][j] * A[i][k];
      }
    }
  }
  for (let j = unregularizedCols; j < cols; j++) {
    AtWA[j][j] += lambda;
  }
  const AtWb = new Array(cols).fill(0);
  for (let i = 0; i < n; i++) {
    const wi = weights[i] ?? 1;
    for (let j = 0; j < cols; j++) {
      AtWb[j] += wi * A[i][j] * b[i];
    }
  }
  const aug = AtWA.map((row, i) => [...row, AtWb[i]]);
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
function predictLinear(coeffs, features) {
  let sum = 0;
  for (let i = 0; i < coeffs.length; i++) sum += coeffs[i] * features[i];
  return sum;
}
function meanEuclideanError(samples2, predict) {
  if (samples2.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (const s of samples2) {
    const p2 = predict(s);
    total += Math.hypot(p2.x - s.targetX, p2.y - s.targetY);
  }
  return total / samples2.length;
}
function meanSquaredError(errors) {
  if (errors.length === 0) return Number.POSITIVE_INFINITY;
  return errors.reduce((sum, value) => sum + value * value, 0) / errors.length;
}
function leaveOneOutMseWeighted(features, targets, weights, lambda) {
  const n = features.length;
  if (n <= 1) return Number.POSITIVE_INFINITY;
  const residuals = [];
  for (let holdOut = 0; holdOut < n; holdOut++) {
    const trainRows = [];
    const trainTargets = [];
    const trainWeights = [];
    for (let i = 0; i < n; i++) {
      if (i === holdOut) continue;
      trainRows.push(features[i]);
      trainTargets.push(targets[i]);
      trainWeights.push(weights[i] ?? 1);
    }
    const coeffs = solveRidgeWeighted(trainRows, trainTargets, lambda, trainWeights, 1);
    const predicted = predictLinear(coeffs, features[holdOut]);
    residuals.push(predicted - targets[holdOut]);
  }
  return meanSquaredError(residuals);
}
function selectBestAxisCoefficients(trainFeatures, trainTargets, selectorFeatures, selectorTargets, lambdas, trainWeights, selectorWeights) {
  const useLeaveOneOut = trainFeatures.length >= 6;
  const weights = trainWeights ?? trainFeatures.map(() => 1);
  let best = null;
  for (const lambda of lambdas) {
    const fallbackCoeffs = solveRidgeWeighted(trainFeatures, trainTargets, lambda, weights, 1);
    const mse = useLeaveOneOut ? leaveOneOutMseWeighted(trainFeatures, trainTargets, weights, lambda) : meanSquaredError(
      selectorFeatures.map((row, index) => {
        const predicted = predictLinear(fallbackCoeffs, row);
        const target = selectorTargets[index];
        const residual = predicted - target;
        return (selectorWeights?.[index] ?? 1) * residual;
      })
    );
    if (!best || mse < best.mse) {
      best = { lambda, mse };
    }
  }
  if (!best) {
    return { lambda: lambdas[0] ?? 0.01, coeffs: new Array(trainFeatures[0]?.length ?? 0).fill(0) };
  }
  return {
    lambda: best.lambda,
    coeffs: solveRidgeWeighted(trainFeatures, trainTargets, best.lambda, weights, 1)
  };
}
function fitCandidateModel(train, selector, featureBuilder, label) {
  const trainFeaturesRaw = train.map(
    (sample) => featureBuilder(
      sample.ix,
      sample.iy,
      sample.yaw,
      sample.pitch,
      sample.headX,
      sample.headY,
      sample.invHeadZ,
      sample.roll
    )
  );
  const scaler = fitScaler(trainFeaturesRaw);
  const trainFeatures = normalizeFeatures(trainFeaturesRaw, scaler);
  const selectorFeatures = normalizeFeatures(
    selector.map(
      (sample) => featureBuilder(
        sample.ix,
        sample.iy,
        sample.yaw,
        sample.pitch,
        sample.headX,
        sample.headY,
        sample.invHeadZ,
        sample.roll
      )
    ),
    scaler
  );
  const trainTargetsX = train.map((sample) => sample.targetX);
  const trainTargetsY = train.map((sample) => sample.targetY);
  const selectorTargetsX = selector.map((sample) => sample.targetX);
  const selectorTargetsY = selector.map((sample) => sample.targetY);
  const trainWeights = train.map((sample) => sample.sampleWeight ?? 1);
  const selectorWeights = selector.map((sample) => sample.sampleWeight ?? 1);
  const lambdas = [1e-6, 1e-4, 1e-3, 0.01, 0.03, 0.1, 0.3, 1, 3];
  const bestX = selectBestAxisCoefficients(
    trainFeatures,
    trainTargetsX,
    selectorFeatures,
    selectorTargetsX,
    lambdas,
    trainWeights,
    selectorWeights
  );
  const bestY = selectBestAxisCoefficients(
    trainFeatures,
    trainTargetsY,
    selectorFeatures,
    selectorTargetsY,
    lambdas,
    trainWeights,
    selectorWeights
  );
  const predict = (ix, iy, yaw, pitch, roll, headX, headY, invHeadZ) => {
    const normalizedRow = normalizeRow(
      featureBuilder(ix, iy, yaw, pitch, headX, headY, invHeadZ, roll),
      scaler
    );
    const f_std = normalizedRow;
    const hasLargeValue = f_std.some((v) => Math.abs(v) > 10);
    if (hasLargeValue) {
      console.log(
        "[STD EXPLODE] standardized features with |value| > 10:",
        f_std.map((v, i) => ({ col: i, val: v.toFixed(4) })).filter(({ val }) => Math.abs(Number(val)) > 10)
      );
    }
    return {
      x: predictLinear(bestX.coeffs, normalizedRow),
      y: predictLinear(bestY.coeffs, normalizedRow)
    };
  };
  const error = meanEuclideanError(
    selector,
    (sample) => predict(
      sample.ix,
      sample.iy,
      sample.yaw,
      sample.pitch,
      sample.roll,
      sample.headX,
      sample.headY,
      sample.invHeadZ
    )
  );
  const trainingError = meanEuclideanError(
    train,
    (sample) => predict(
      sample.ix,
      sample.iy,
      sample.yaw,
      sample.pitch,
      sample.roll,
      sample.headX,
      sample.headY,
      sample.invHeadZ
    )
  );
  return {
    label,
    lambdaX: bestX.lambda,
    lambdaY: bestY.lambda,
    error,
    trainingError,
    predict
  };
}
function fitPolynomialRidge(train, validation) {
  const selector = validation.length > 0 ? validation : train;
  const fullPolynomial = fitCandidateModel(train, selector, expandFeatures, "poly2-full");
  const compactPolynomial = fitCandidateModel(
    train,
    selector,
    expandCompactFeatures,
    "poly2-compact"
  );
  const selectedModel = compactPolynomial.error <= fullPolynomial.error * 1.05 ? compactPolynomial : fullPolynomial;
  if (typeof window !== "undefined") {
    window.__lexoraCalibrationModel = {
      predict: selectedModel.predict
    };
  }
  return {
    kind: "polynomial-ridge",
    predict: selectedModel.predict,
    trainingError: selectedModel.trainingError,
    info: `Polynomial ridge (${selectedModel.label}, lambdaX=${selectedModel.lambdaX}, lambdaY=${selectedModel.lambdaY}, selectorErr=${selectedModel.error.toFixed(2)}px)`
  };
}
function fitProductionCalibrationModel(samples2, validationSamples = []) {
  if (samples2.length < 8) {
    return {
      kind: "polynomial-ridge",
      predict: () => ({ x: 0, y: 0 }),
      trainingError: Number.POSITIVE_INFINITY,
      info: "Polynomial ridge (insufficient samples)"
    };
  }
  return fitPolynomialRidge(samples2, validationSamples);
}

// tmp/run-calibration.ts
function makeSample(ix, iy, invHeadZ) {
  return {
    ix,
    iy,
    yaw: 0,
    pitch: 0,
    roll: 0,
    headX: 0,
    headY: 0,
    invHeadZ,
    targetX: ix * 1920,
    targetY: iy * 1080,
    pointIndex: 0,
    sampleWeight: 1,
    phase: "STATIC"
  };
}
var samples = [];
for (let i = 0; i < 40; i++) {
  const ix = 0.2 + 0.6 * Math.random();
  const iy = 0.2 + 0.6 * Math.random();
  const invHeadZ = 1.2 + Math.random() * 0.6;
  samples.push(makeSample(ix, iy, invHeadZ));
}
var model = fitProductionCalibrationModel(samples, []);
console.log("Model info:", model.info);
console.log("Calling predict(0.5,0.5,0,0,0,0,0,1.5)");
var p = model.predict(0.5, 0.5, 0, 0, 0, 0, 0, 1.5);
console.log("Predict result:", p);
