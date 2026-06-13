import { calibrationLogger } from './debug-config';
import {
  NUM_FEATURES_X,
  NUM_FEATURES_Y,
  expandFeaturesX,
  expandFeaturesY,
} from './calibration-models/feature-builders';
import { fitIdwModel } from './calibration-models/idw-model';
import { meanEuclideanError } from './calibration-models/metrics';
import { fitPolynomialRidge } from './calibration-models/polynomial-ridge-model';
import type {
  CalibrationModel,
  TrainingSample,
} from './calibration-models/types';

export { NUM_FEATURES_X, NUM_FEATURES_Y, expandFeaturesX, expandFeaturesY };
export { fitIdwModel };
export type { CalibrationModel, ModelKind, TrainingSample } from './calibration-models/types';

/**
 * Production calibration model selection.
 *
 * This is intentionally the small orchestration seam: the individual model
 * adapters own their math, while this module compares their validation errors
 * and applies the current safety thresholds.
 */
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
