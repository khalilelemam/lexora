import { logCoefficientSummary, logSampleSummary, logStaticIyDiagnostics } from './diagnostics';
import { expandFeaturesX, expandFeaturesY } from './feature-builders';
import { meanEuclideanError } from './metrics';
import {
  fitScaler,
  normalizeFeatures,
  predictLinear,
  selectBestAxisCoefficients,
  type FeatureScaler,
} from './ridge-regression';
import { calibrationLogger } from '../debug-config';
import type { CalibrationModel, ModelKind, TrainingSample } from './types';

interface CandidateModelFit {
  label: string;
  kind: ModelKind;
  lambdaX: number;
  lambdaY: number;
  error: number;
  trainingError: number;
  coeffsX: number[];
  coeffsY: number[];
  predict: CalibrationModel['predict'];
}

function fitCandidateModel(
  train: TrainingSample[],
  selector: TrainingSample[],
  label: string,
): CandidateModelFit {
  // X and Y use separate feature spaces because horizontal head turn should
  // affect horizontal gaze more strongly than vertical gaze.
  const trainFeaturesX = train.map((sample) =>
    expandFeaturesX(sample.ix, sample.iy, sample.yaw, sample.pitch),
  );
  const trainFeaturesY = train.map((sample) => expandFeaturesY(sample.ix, sample.iy, sample.pitch));

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

  // X allows lower regularization so yaw correction can contribute. Y stays
  // conservative to reduce vertical overfitting from polynomial cross-terms.
  // const lambdasX = [0.05, 0.1, 0.25, 0.5, 1, 2, 3];
  // const lambdasY = [2.0, 3.0, 5, 10];

  const lambdasX = [0.05];
  const lambdasY = [0.75];

  const bestX = selectBestAxisCoefficients(
    trainX,
    trainTargetsX,
    selectorX,
    selectorTargetsX,
    lambdasX,
    trainWeights,
    selectorWeights,
  );
  const bestY = selectBestAxisCoefficients(
    trainY,
    trainTargetsY,
    selectorY,
    selectorTargetsY,
    lambdasY,
    trainWeights,
    selectorWeights,
  );

  logCoefficientSummary(label, 'x', bestX.coeffs);
  logCoefficientSummary(label, 'y', bestY.coeffs);

  const predict: CalibrationModel['predict'] = (
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

    const standardizeFeatures = (rawFeatures: number[], scaler: FeatureScaler): number[] =>
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
  const trainingError = meanEuclideanError(train, (sample) =>
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

export function fitPolynomialRidge(
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
