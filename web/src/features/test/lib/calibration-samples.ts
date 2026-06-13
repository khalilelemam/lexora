import type { CalibrationPhaseType } from '../types';
import type { TrainingSample } from './calibration-models';

export interface CollectedSample {
  pointIndex: number;
  observedX: number;
  observedY: number;
  targetX: number;
  targetY: number;
  yaw: number;
  pitch: number;
  roll?: number;
  headX?: number;
  headY?: number;
  headZ?: number;
  /** Weight applied during model training. Defaults to 1.0 if not set. */
  sampleWeight?: number;
  /** The calibration phase this sample was collected during. */
  phase?: CalibrationPhaseType;
}

export interface CalibrationMappingResult {
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
}

export function createSampleBuckets(pointCount: number): CollectedSample[][] {
  return Array.from({ length: pointCount }, () => []);
}

export function ensureSampleBucket(
  buckets: CollectedSample[][],
  pointIndex: number,
): CollectedSample[] {
  while (buckets.length <= pointIndex) buckets.push([]);
  return buckets[pointIndex];
}

export function summarizeCollectedBuckets(buckets: CollectedSample[][]) {
  return buckets.map((bucket, pointIndex) => {
    const phaseCounts = bucket.reduce(
      (acc, sample) => {
        const phase = sample.phase ?? 'STATIC';
        acc[phase] = (acc[phase] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const weights = bucket.map((sample) => sample.sampleWeight ?? 1.0);
    return {
      pointIndex,
      sampleCount: bucket.length,
      totalWeight: Number(weights.reduce((sum, weight) => sum + weight, 0).toFixed(2)),
      phaseCounts,
    };
  });
}

export function toTrainingSample(
  sample: CollectedSample,
  screenWidth: number,
  screenHeight: number,
): TrainingSample {
  return {
    ix: sample.observedX,
    iy: sample.observedY,
    yaw: sample.yaw,
    pitch: sample.pitch,
    roll: sample.roll ?? 0,
    headX: sample.headX ?? 0,
    headY: sample.headY ?? 0,
    invHeadZ: sample.headZ != null && sample.headZ > 0 ? 1 / sample.headZ : 0,
    targetX: sample.targetX * screenWidth,
    targetY: sample.targetY * screenHeight,
    pointIndex: sample.pointIndex,
    sampleWeight: sample.sampleWeight ?? 1.0,
    phase: sample.phase ?? 'STATIC',
  };
}
