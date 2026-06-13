'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { CalibrationResult, CalibrationPhaseType, CalibrationPoint } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import { fitProductionCalibrationModel, type TrainingSample } from '../lib/calibration-models';
import { calibrationLogger } from '../lib/debug-config';
import {
  type CollectedSample,
  buildSerpentineOrder,
  splitDeterministic,
  filterOutliers,
  mean,
  median,
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

type CalibrationPhase =
  | 'idle'
  | 'collecting'
  | 'recalibrating'
  | 'reading-anchors'
  | 'validating'
  | 'complete';

function ensureSampleBucket(buckets: CollectedSample[][], pointIndex: number): CollectedSample[] {
  while (buckets.length <= pointIndex) buckets.push([]);
  return buckets[pointIndex];
}

function summarizeCollectedBuckets(buckets: CollectedSample[][]) {
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

export function useCalibration(pointsOverride?: readonly CalibrationPoint[]) {
  const fullPointSequence = pointsOverride ?? CALIBRATION_POINTS;
  const defaultOrder = useMemo(() => {
    return buildSerpentineOrder(fullPointSequence.length, GRID_COLUMNS);
  }, [fullPointSequence]);

  const [phase, setPhase] = useState<CalibrationPhase>('idle');
  const [collectionOrder, setCollectionOrder] = useState<number[]>(defaultOrder);
  const [collectionCursor, setCollectionCursor] = useState(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [pointSampleCounts, setPointSampleCounts] = useState<number[]>(() =>
    Array.from({ length: fullPointSequence.length }, () => 0),
  );
  const [recalibrationRound, setRecalibrationRound] = useState(0);
  const samplesByPointRef = useRef<CollectedSample[][]>(
    Array.from({ length: fullPointSequence.length }, () => []),
  );

  const currentPointIndex = collectionOrder[collectionCursor] ?? 0;

  const toTrainingSample = useCallback(
    (s: CollectedSample, screenWidth: number, screenHeight: number): TrainingSample => {
      return {
        ix: s.observedX,
        iy: s.observedY,
        yaw: s.yaw,
        pitch: s.pitch,
        roll: s.roll ?? 0,
        headX: s.headX ?? 0,
        headY: s.headY ?? 0,
        invHeadZ: s.headZ != null && s.headZ > 0 ? 1 / s.headZ : 0,
        targetX: s.targetX * screenWidth,
        targetY: s.targetY * screenHeight,
        pointIndex: s.pointIndex,
        sampleWeight: s.sampleWeight ?? 1.0,
        phase: s.phase ?? 'STATIC',
      };
    },
    [],
  );

  const addSampleForPoint = useCallback(
    (
      pointIndex: number,
      observedX: number,
      observedY: number,
      targetX: number,
      targetY: number,
      yaw = 0,
      pitch = 0,
      roll = 0,
      headX = 0,
      headY = 0,
      headZ = 0.65,
      sampleWeight?: number,
      samplePhase?: CalibrationPhaseType,
    ) => {
      if (phase !== 'collecting' && phase !== 'recalibrating' && phase !== 'reading-anchors') {
        return;
      }

      const pointBucket = ensureSampleBucket(samplesByPointRef.current, pointIndex);
      pointBucket.push({
        pointIndex,
        observedX,
        observedY,
        targetX,
        targetY,
        yaw,
        pitch,
        roll,
        headX,
        headY,
        headZ,
        sampleWeight,
        phase: samplePhase,
      });

      setPointSampleCounts((prev) => {
        const next = [...prev];
        while (next.length <= pointIndex) next.push(0);
        next[pointIndex] = (next[pointIndex] ?? 0) + 1;
        return next;
      });
    },
    [phase],
  );

  const advancePoint = useCallback(
    (capturedSamplesThisPoint?: number) => {
      const currentPointIdx = collectionOrder[collectionCursor] ?? -1;
      const nextCursor = collectionCursor + 1;
      const currentPoint = currentPointIdx >= 0 ? fullPointSequence[currentPointIdx] : undefined;
      const capturedThisPoint =
        capturedSamplesThisPoint ?? samplesByPointRef.current[currentPointIdx]?.length ?? 0;
      const isCompletion = collectionCursor >= collectionOrder.length - 1;

      calibrationLogger.debug(
        `[DONE] cursor=${collectionCursor}/${collectionOrder.length - 1} pointIndex=${currentPointIdx} phase=${currentPoint?.phase} samples=${capturedThisPoint}`,
      );

      if (!isCompletion) {
        setCollectionCursor(nextCursor);
      } else {
        setPhase(phase === 'collecting' ? 'reading-anchors' : 'validating');
      }
    },
    [collectionCursor, collectionOrder, fullPointSequence, phase],
  );

  const startCalibration = useCallback(() => {
    samplesByPointRef.current = Array.from({ length: fullPointSequence.length }, () => []);
    setCollectionOrder(defaultOrder);
    setCollectionCursor(0);
    setPointSampleCounts(Array.from({ length: fullPointSequence.length }, () => 0));
    setRecalibrationRound(0);
    setResult(null);
    setPhase('collecting');
  }, [defaultOrder, fullPointSequence.length]);

  const completeReadingAnchors = useCallback(() => {
    setPhase('validating');
  }, []);

  const computeTobiiCalibration = useCallback((): CalibrationResult => {
    const samples = samplesByPointRef.current.flat();
    const pointAccuracies: number[] = [];

    for (let i = 0; i < samplesByPointRef.current.length; i++) {
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
  }, []);

  const computeWebcamCalibration = useCallback(
    (
      screenWidth: number,
      screenHeight: number,
    ): {
      result: CalibrationResult | null;
      mapping: CalibrationMappingResult;
      mappingIsFallback: boolean;
      needsRecalibration: boolean;
      recalibrationPoints: number[];
    } => {
      calibrationLogger.debug(
        '[CALIBRATION RAW SAMPLES]',
        summarizeCollectedBuckets(samplesByPointRef.current),
      );

      const cleanedByPoint = samplesByPointRef.current.map((bucket) => filterOutliers(bucket));
      calibrationLogger.debug('[CALIBRATION CLEANED SAMPLES]', summarizeCollectedBuckets(cleanedByPoint));

      const trainingSamples: TrainingSample[] = [];
      const heldOutSamples: TrainingSample[] = [];

      for (let i = 0; i < cleanedByPoint.length; i++) {
        const { train, held } = splitDeterministic(cleanedByPoint[i]);
        for (const s of train) {
          trainingSamples.push(toTrainingSample(s, screenWidth, screenHeight));
        }
        for (const s of held) {
          heldOutSamples.push(toTrainingSample(s, screenWidth, screenHeight));
        }
      }

      const coveredPoints = cleanedByPoint.reduce(
        (count, bucket) => count + (bucket.length >= MIN_WEBCAM_SAMPLES_PER_POINT ? 1 : 0),
        0,
      );

      calibrationLogger.debug('[CALIBRATION FIT INPUT]', {
        coveredPoints,
        minCoveredPointsRequired: MIN_WEBCAM_POINTS_WITH_SAMPLES,
        trainingSamples: trainingSamples.length,
        heldOutSamples: heldOutSamples.length,
        minTrainingSamplesRequired: MIN_WEBCAM_SAMPLES,
      });

      if (
        trainingSamples.length < MIN_WEBCAM_SAMPLES ||
        coveredPoints < MIN_WEBCAM_POINTS_WITH_SAMPLES
      ) {
        calibrationLogger.warn('[CALIBRATION FIT SKIPPED] insufficient data', {
          coveredPoints,
          trainingSamples: trainingSamples.length,
        });
        const poorResult = buildCalibrationResult(cleanedByPoint.map(() => 1.0));
        setResult(poorResult);
        // Phase stays 'validating' — engine manages lifecycle
        return {
          result: poorResult,
          mapping: {
            predict: () => ({
              x: screenWidth * 0.5,
              y: screenHeight * 0.5,
            }),
          },
          mappingIsFallback: true,
          needsRecalibration: false,
          recalibrationPoints: [],
        };
      }

      const model = fitProductionCalibrationModel(trainingSamples, heldOutSamples);
      const predictModel = (
        ix: number,
        iy: number,
        yaw: number,
        pitch: number,
        roll: number,
        headX: number,
        headY: number,
        invHeadZ: number,
      ) => model.predict(ix, iy, yaw, pitch, roll, headX, headY, invHeadZ);

      const pointErrorsOrNull = cleanedByPoint.map((bucket) => {
        if (bucket.length === 0) return null;
        const errs = bucket.map((sample) =>
          normalizedError(sample, predictModel, screenWidth, screenHeight),
        );
        return mean(errs);
      });

      const observedErrors = pointErrorsOrNull.filter((value): value is number => value != null);
      const fallbackPointError = observedErrors.length > 0 ? mean(observedErrors) : 0.35;
      const pointAccuracies = pointErrorsOrNull.map((value) => value ?? fallbackPointError);

      const calibrationPointErrors = pointErrorsOrNull.map((error, index) => ({
        pointIndex: index,
        phase: cleanedByPoint[index]?.[0]?.phase ?? fullPointSequence[index]?.phase ?? 'STATIC',
        normalizedError: error != null ? Number(error.toFixed(4)) : null,
      }));

      calibrationLogger.debug('[CALIBRATION POINT ERRORS]', calibrationPointErrors);

      // Only STATIC points can be flagged for recalibration.
      // Sweep phase errors are expected to be high while head position changes.
      const recalibrationCandidates = calibrationPointErrors
        .filter(
          (
            point,
          ): point is {
            pointIndex: number;
            phase: CalibrationPhaseType;
            normalizedError: number;
          } => point.phase === 'STATIC' && point.normalizedError !== null,
        )
        .sort((a, b) => b.normalizedError - a.normalizedError)
        .slice(0, TARGETED_RECALIBRATION_MAX_POINTS);

      const staticErrorValues = calibrationPointErrors
        .filter(
          (
            point,
          ): point is {
            pointIndex: number;
            phase: CalibrationPhaseType;
            normalizedError: number;
          } => point.phase === 'STATIC' && point.normalizedError !== null,
        )
        .map((point) => point.normalizedError);
      const staticMedianError = median(staticErrorValues);
      const targetedRecalibrationThreshold = Math.max(
        TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD,
        staticMedianError + 0.025,
      );
      const flaggedPointCandidates = recalibrationCandidates
        .filter((point) => point.normalizedError > targetedRecalibrationThreshold)
        .map((point) => point.pointIndex);

      calibrationLogger.debug('[TARGETED RECALIBRATION CHECK]', {
        staticMedianError: Number(staticMedianError.toFixed(4)),
        baseThreshold: TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD,
        effectiveThreshold: Number(targetedRecalibrationThreshold.toFixed(4)),
        candidates: recalibrationCandidates.map((point) => ({
          pointIndex: point.pointIndex,
          normalizedError: Number(point.normalizedError.toFixed(4)),
        })),
        flaggedPointCandidates,
      });

      if (
        flaggedPointCandidates.length > 0 &&
        recalibrationRound < TARGETED_RECALIBRATION_MAX_ROUNDS
      ) {
        calibrationLogger.warn('[TARGETED RECALIBRATION]', {
          recalibrationRound,
          flaggedPointCandidates,
        });
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
            predict: () => ({
              x: screenWidth * 0.5,
              y: screenHeight * 0.5,
            }),
          },
          mappingIsFallback: true,
          needsRecalibration: true,
          recalibrationPoints: flaggedPointCandidates,
        };
      }

      const calibResult = buildCalibrationResult(pointAccuracies);
      calibrationLogger.debug('[CALIBRATION RESULT]', {
        quality: calibResult.quality,
        averageError: Number(calibResult.averageError.toFixed(4)),
        pointAccuracies: pointAccuracies.map((value) => Number(value.toFixed(4))),
      });
      setResult(calibResult);
      // Phase stays 'validating' — engine manages: pre-validation → quick validation → canFinalize

      return {
        result: calibResult,
        mapping: { predict: predictModel },
        mappingIsFallback: false,
        needsRecalibration: false,
        recalibrationPoints: [],
      };
    },
    [fullPointSequence, recalibrationRound, toTrainingSample],
  );

  const resetCalibration = useCallback(() => {
    samplesByPointRef.current = Array.from({ length: fullPointSequence.length }, () => []);
    setCollectionOrder(defaultOrder);
    setCollectionCursor(0);
    setPointSampleCounts(Array.from({ length: fullPointSequence.length }, () => 0));
    setRecalibrationRound(0);
    setResult(null);
    setPhase('idle');
  }, [defaultOrder, fullPointSequence.length]);

  return {
    phase,
    currentPointIndex,
    currentPoint: fullPointSequence[currentPointIndex] ?? fullPointSequence[0],
    totalPoints: fullPointSequence.length,
    collectionStep: collectionCursor + 1,
    collectionTotal: collectionOrder.length,
    recalibrationRound,
    pointSampleCounts,
    activePointIndices: collectionOrder,
    result,
    startCalibration,
    addSampleForPoint,
    advancePoint,
    completeReadingAnchors,
    computeTobiiCalibration,
    computeWebcamCalibration,
    resetCalibration,
  };
}
