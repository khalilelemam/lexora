'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { CalibrationResult } from '../types';
import {
  CALIBRATION_POINTS,
} from '../lib/constants';
import { fitProductionCalibrationModel, type TrainingSample } from '../lib/calibration-models';
import {
  type CollectedSample,
  buildSerpentineOrder,
  splitDeterministic,
  filterOutliers,
  mean,
  normalizedError,
  buildCalibrationResult,
  GRID_COLUMNS,
  MIN_WEBCAM_SAMPLES,
  MIN_WEBCAM_POINTS_WITH_SAMPLES,
  MIN_WEBCAM_SAMPLES_PER_POINT,
  TARGETED_RECALIBRATION_MAX_ROUNDS,
  TARGETED_RECALIBRATION_MAX_POINTS,
  TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD,
} from '../lib/calibration-math';

interface CalibrationMappingResult {
  predict: (irisX: number, irisY: number, yaw: number, pitch: number) => { x: number; y: number };
}

type CalibrationPhase = 'idle' | 'collecting' | 'recalibrating' | 'validating' | 'complete';

export function useCalibration() {
  const points = CALIBRATION_POINTS;
  const defaultOrder = useMemo(() => {
    // Pure serpentine order — 15 points, no boss/duplicate
    return buildSerpentineOrder(points.length, GRID_COLUMNS);
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

    const calibResult = buildCalibrationResult(pointAccuracies);
    setResult(calibResult);
    // Phase is NOT advanced here — the engine manages the lifecycle:
    // validating → pre-validation card → quick validation → finalResult → canFinalize
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
        const poorResult = buildCalibrationResult(points.map(() => 1.0));
        setResult(poorResult);
        // Phase stays 'validating' — engine manages lifecycle
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

      const calibResult = buildCalibrationResult(pointAccuracies);
      setResult(calibResult);
      // Phase stays 'validating' — engine manages: pre-validation → quick validation → canFinalize

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
    startCalibration,
    addSample,
    advancePoint,
    computeTobiiCalibration,
    computeWebcamCalibration,
    resetCalibration,
  };
}
