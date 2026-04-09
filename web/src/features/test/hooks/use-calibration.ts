'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { CalibrationResult, CalibrationQuality } from '../types';
import {
  CALIBRATION_POINTS,
  CALIBRATION_DOT_DURATION,
  CALIBRATION_SAMPLES_PER_POINT,
  CALIBRATION_THRESHOLDS,
} from '../lib/constants';
import { fitProductionCalibrationModel, type TrainingSample } from '../lib/calibration-models';

interface CollectedSample {
  pointIndex: number;
  observedX: number;
  observedY: number;
  targetX: number;
  targetY: number;
  yaw: number;
  pitch: number;
}

interface CalibrationMappingResult {
  predict: (irisX: number, irisY: number, yaw: number, pitch: number) => { x: number; y: number };
}

type CalibrationPhase = 'idle' | 'collecting' | 'recalibrating' | 'validating' | 'complete';

const GRID_COLUMNS = 5;
const HOLDOUT_STRIDE = 5;
const MIN_WEBCAM_SAMPLES = 96;
const MIN_WEBCAM_POINTS_WITH_SAMPLES = 12;
const MIN_WEBCAM_SAMPLES_PER_POINT = 3;
const OUTLIER_Z_THRESHOLD = 3;
const TARGETED_RECALIBRATION_MAX_ROUNDS = 1;
const TARGETED_RECALIBRATION_MAX_POINTS = 6;
const TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD = 0.09;

function buildSerpentineOrder(total: number, columns: number): number[] {
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

function findCenterPointIndex(points: readonly { x: number; y: number }[]): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - 0.5;
    const dy = points[i].y - 0.5;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function splitDeterministic<T>(samples: T[]) {
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

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function filterOutliers(samples: CollectedSample[]): CollectedSample[] {
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

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function normalizedError(
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

export function useCalibration() {
  const points = CALIBRATION_POINTS;
  const defaultOrder = useMemo(() => {
    const order = buildSerpentineOrder(points.length, GRID_COLUMNS);
    // Keep the original 15 points and append a final center "boss" fixation.
    order.push(findCenterPointIndex(points));
    return order;
  }, [points]);

  const [phase, setPhase] = useState<CalibrationPhase>('idle');
  const [collectionOrder, setCollectionOrder] = useState<number[]>(defaultOrder);
  const [collectionCursor, setCollectionCursor] = useState(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [pointSampleCounts, setPointSampleCounts] = useState<number[]>(() =>
    Array.from({ length: points.length }, () => 0),
  );
  const [recalibrationRound, setRecalibrationRound] = useState(0);
  const samplesByPointRef = useRef<CollectedSample[][]>(
    Array.from({ length: points.length }, () => []),
  );

  const currentPointIndex = collectionOrder[collectionCursor] ?? 0;

  const addSample = useCallback(
    (
      observedX: number,
      observedY: number,
      targetX: number,
      targetY: number,
      yaw = 0,
      pitch = 0,
    ) => {
      if (phase !== 'collecting' && phase !== 'recalibrating') return;
      const pointBucket = samplesByPointRef.current[currentPointIndex];
      if (!pointBucket) return;
      pointBucket.push({
        pointIndex: currentPointIndex,
        observedX,
        observedY,
        targetX,
        targetY,
        yaw,
        pitch,
      });

      setPointSampleCounts((prev) => {
        const next = [...prev];
        next[currentPointIndex] = (next[currentPointIndex] ?? 0) + 1;
        return next;
      });
    },
    [phase, currentPointIndex],
  );

  const advancePoint = useCallback(() => {
    if (collectionCursor < collectionOrder.length - 1) {
      setCollectionCursor((prev) => prev + 1);
    } else {
      setPhase('validating');
    }
  }, [collectionCursor, collectionOrder.length]);

  const startCalibration = useCallback(() => {
    samplesByPointRef.current = Array.from({ length: points.length }, () => []);
    setCollectionOrder(defaultOrder);
    setCollectionCursor(0);
    setPointSampleCounts(Array.from({ length: points.length }, () => 0));
    setRecalibrationRound(0);
    setResult(null);
    setPhase('collecting');
  }, [defaultOrder, points.length]);

  const computeTobiiCalibration = useCallback((): CalibrationResult => {
    const samples = samplesByPointRef.current.flat();
    const pointAccuracies: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const pointSamples = samples.filter((s) => s.pointIndex === i);
      if (pointSamples.length === 0) {
        pointAccuracies.push(1.0);
        continue;
      }

      const errors = pointSamples.map((s) => {
        const dx = s.observedX - s.targetX;
        const dy = s.observedY - s.targetY;
        return Math.hypot(dx, dy);
      });
      pointAccuracies.push(mean(errors));
    }

    const averageError = mean(pointAccuracies);
    let quality: CalibrationQuality = 'poor';
    if (averageError < CALIBRATION_THRESHOLDS.good) quality = 'good';
    else if (averageError < CALIBRATION_THRESHOLDS.acceptable) quality = 'acceptable';

    const calibResult: CalibrationResult = { quality, pointAccuracies, averageError };
    setResult(calibResult);
    setPhase('complete');
    return calibResult;
  }, [points]);

  const computeWebcamCalibration = useCallback(
    (
      screenWidth: number,
      screenHeight: number,
    ): {
      result: CalibrationResult | null;
      mapping: CalibrationMappingResult;
      needsRecalibration: boolean;
      recalibrationPoints: number[];
    } => {
      const cleanedByPoint = samplesByPointRef.current.map((bucket) => filterOutliers(bucket));
      const trainingSamples: TrainingSample[] = [];
      const heldOutSamples: TrainingSample[] = [];

      for (let i = 0; i < points.length; i++) {
        const { train, held } = splitDeterministic(cleanedByPoint[i]);
        for (const s of train) {
          trainingSamples.push({
            ix: s.observedX,
            iy: s.observedY,
            yaw: s.yaw,
            pitch: s.pitch,
            targetX: s.targetX * screenWidth,
            targetY: s.targetY * screenHeight,
            pointIndex: s.pointIndex,
          });
        }
        for (const s of held) {
          heldOutSamples.push({
            ix: s.observedX,
            iy: s.observedY,
            yaw: s.yaw,
            pitch: s.pitch,
            targetX: s.targetX * screenWidth,
            targetY: s.targetY * screenHeight,
            pointIndex: s.pointIndex,
          });
        }
      }

      const coveredPoints = cleanedByPoint.reduce(
        (count, bucket) => count + (bucket.length >= MIN_WEBCAM_SAMPLES_PER_POINT ? 1 : 0),
        0,
      );

      if (
        trainingSamples.length < MIN_WEBCAM_SAMPLES ||
        coveredPoints < MIN_WEBCAM_POINTS_WITH_SAMPLES
      ) {
        const poorResult: CalibrationResult = {
          quality: 'poor',
          pointAccuracies: points.map(() => 1.0),
          averageError: 1.0,
        };
        setResult(poorResult);
        setPhase('complete');
        return {
          result: poorResult,
          mapping: {
            predict: () => ({ x: screenWidth * 0.5, y: screenHeight * 0.5 }),
          },
          needsRecalibration: false,
          recalibrationPoints: [],
        };
      }

      const model = fitProductionCalibrationModel(trainingSamples, heldOutSamples);
      const predictClamped = (ix: number, iy: number, yaw: number, pitch: number) => {
        const predicted = model.predict(ix, iy, yaw, pitch);
        return {
          x: Math.max(0, Math.min(screenWidth, predicted.x)),
          y: Math.max(0, Math.min(screenHeight, predicted.y)),
        };
      };

      const pointErrorsOrNull = cleanedByPoint.map((bucket) => {
        if (bucket.length === 0) return null;
        const errs = bucket.map((sample) =>
          normalizedError(sample, predictClamped, screenWidth, screenHeight),
        );
        return mean(errs);
      });

      const observedErrors = pointErrorsOrNull.filter((value): value is number => value != null);
      const fallbackPointError = observedErrors.length > 0 ? mean(observedErrors) : 0.35;
      const pointAccuracies = pointErrorsOrNull.map((value) => value ?? fallbackPointError);

      const flaggedPointCandidates = pointErrorsOrNull
        .map((error, index) => ({ error, index }))
        .filter(
          (item): item is { error: number; index: number } =>
            item.error != null && item.error > TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD,
        )
        .sort((a, b) => b.error - a.error)
        .slice(0, TARGETED_RECALIBRATION_MAX_POINTS)
        .map((item) => item.index);

      if (
        flaggedPointCandidates.length > 0 &&
        recalibrationRound < TARGETED_RECALIBRATION_MAX_ROUNDS
      ) {
        for (const pointIndex of flaggedPointCandidates) {
          samplesByPointRef.current[pointIndex] = [];
        }

        setPointSampleCounts((prev) => {
          const next = [...prev];
          for (const pointIndex of flaggedPointCandidates) {
            next[pointIndex] = 0;
          }
          return next;
        });

        setCollectionOrder(flaggedPointCandidates);
        setCollectionCursor(0);
        setRecalibrationRound((prev) => prev + 1);
        setResult(null);
        setPhase('recalibrating');

        return {
          result: null,
          mapping: {
            predict: () => ({ x: screenWidth * 0.5, y: screenHeight * 0.5 }),
          },
          needsRecalibration: true,
          recalibrationPoints: flaggedPointCandidates,
        };
      }

      const averageError = mean(pointAccuracies);

      let quality: CalibrationQuality = 'poor';
      if (averageError < CALIBRATION_THRESHOLDS.good) quality = 'good';
      else if (averageError < CALIBRATION_THRESHOLDS.acceptable) quality = 'acceptable';

      const calibResult: CalibrationResult = { quality, pointAccuracies, averageError };
      setResult(calibResult);
      setPhase('complete');

      return {
        result: calibResult,
        mapping: { predict: predictClamped },
        needsRecalibration: false,
        recalibrationPoints: [],
      };
    },
    [points, recalibrationRound],
  );

  const resetCalibration = useCallback(() => {
    samplesByPointRef.current = Array.from({ length: points.length }, () => []);
    setCollectionOrder(defaultOrder);
    setCollectionCursor(0);
    setPointSampleCounts(Array.from({ length: points.length }, () => 0));
    setRecalibrationRound(0);
    setResult(null);
    setPhase('idle');
  }, [defaultOrder, points.length]);

  return {
    phase,
    currentPointIndex,
    currentPoint: points[currentPointIndex] ?? points[0],
    totalPoints: points.length,
    collectionStep: collectionCursor + 1,
    collectionTotal: collectionOrder.length,
    recalibrationRound,
    pointSampleCounts,
    activePointIndices: collectionOrder,
    result,
    samplesPerPoint: CALIBRATION_SAMPLES_PER_POINT,
    dotDuration: CALIBRATION_DOT_DURATION,
    startCalibration,
    addSample,
    advancePoint,
    computeTobiiCalibration,
    computeWebcamCalibration,
    resetCalibration,
  };
}
