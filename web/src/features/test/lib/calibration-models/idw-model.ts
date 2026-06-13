import type { CalibrationPhaseType } from '../../types';
import { calibrationLogger } from '../debug-config';
import { meanEuclideanError } from './metrics';
import type { CalibrationModel, TrainingSample } from './types';

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

const IDW_PITCH_SCALES = [2, 4, 6] as const;

function buildCentroids(trainSamples: TrainingSample[]): Centroid[] {
  const buckets = new Map<
    number,
    {
      ix: number;
      iy: number;
      pitch: number;
      sx: number;
      sy: number;
      count: number;
      phases: Record<CalibrationPhaseType, number>;
    }
  >();

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
      phase: Object.entries(bucket.phases).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0] as CalibrationPhaseType,
      meanIx: bucket.ix / bucket.count,
      meanIy: bucket.iy / bucket.count,
      meanPitch: bucket.pitch / bucket.count,
      meanScreenX: bucket.sx / bucket.count,
      meanScreenY: bucket.sy / bucket.count,
      sampleCount: bucket.count,
    }))
    .sort((a, b) => a.pointIndex - b.pointIndex);
}

function buildIdwPredictor(centroids: Centroid[], pitchScale: number): CalibrationModel['predict'] {
  return (ix: number, iy: number, yaw: number, pitch: number) => {
    void yaw;

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
  predict: CalibrationModel['predict'],
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
    const predicted = predict(sample.ix, sample.iy, sample.yaw, sample.pitch);
    totalVerticalError += Math.abs(predicted.y - sample.targetY);
  }

  return totalVerticalError / extremeSamples.length;
}

/**
 * IDW is the fallback adapter for noisy sessions where the polynomial model is
 * unsafe. It intentionally fits only STATIC grid centroids: reading anchors are
 * behaviorally closer to the task, but they are not spatially complete enough
 * to serve as nearest-neighbor anchors.
 */
export function fitIdwModel(
  trainSamples: TrainingSample[],
  selectorSamples: TrainingSample[],
  screenW: number,
  screenH: number,
): CalibrationModel {
  const centroids = buildCentroids(trainSamples.filter((sample) => sample.phase === 'STATIC'));
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
      predict(sample.ix, sample.iy, sample.yaw, sample.pitch),
    );
    const trainingError = meanEuclideanError(trainSamples, (sample) =>
      predict(sample.ix, sample.iy, sample.yaw, sample.pitch),
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
    const predicted = predict(centroid.meanIx, centroid.meanIy, 0, centroid.meanPitch);
    return Math.hypot(predicted.x - centroid.meanScreenX, predicted.y - centroid.meanScreenY);
  });
  const meanCentroidError =
    centroidErrors.length > 0
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

  calibrationLogger.debug('[IDW FIT]', {
    rawSamples: trainSamples.length,
    staticCentroids: n,
    readingCentroids: 0,
    centroidCount: n,
    power: 2,
    selectedPitchScale: bestCandidate.pitchScale,
    ixRange: [Math.min(...ixValues), Math.max(...ixValues)].map((value) =>
      Number(value.toFixed(5)),
    ),
    iyRange: [Math.min(...iyValues), Math.max(...iyValues)].map((value) =>
      Number(value.toFixed(5)),
    ),
    pitchRange: [Math.min(...pitchValues), Math.max(...pitchValues)].map((value) =>
      Number(value.toFixed(5)),
    ),
    screenXRange: [Math.min(...screenXValues), Math.max(...screenXValues)].map((value) =>
      Number(value.toFixed(2)),
    ),
    screenYRange: [Math.min(...screenYValues), Math.max(...screenYValues)].map((value) =>
      Number(value.toFixed(2)),
    ),
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
