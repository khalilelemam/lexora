'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { CalibrationResult, CalibrationPhaseType, CalibrationPoint } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import { fitProductionCalibrationModel } from '../lib/calibration-models';
import type { TrainingSample } from '../lib/calibration-models/types';
import { calibrationLogger } from '../lib/debug-config';
import {
  type CalibrationMappingResult,
  type CollectedSample,
  createSampleBuckets,
  ensureSampleBucket,
  summarizeCollectedBuckets,
  toTrainingSample,
} from '../lib/calibration-samples';
import {
  buildCalibrationPointErrors,
  selectTargetedRecalibrationPoints,
  TARGETED_RECALIBRATION_ENABLED,
  TARGETED_RECALIBRATION_MAX_ROUNDS,
} from '../lib/calibration-recalibration';
import {
  buildSerpentineOrder,
  splitDeterministic,
  filterOutliers,
  mean,
  normalizedError,
  buildCalibrationResult,
} from '../lib/calibration-math';

const GRID_COLUMNS = 5;
// Minimum data required before webcam model fitting is allowed. These are
// fitting eligibility guards, not per-point UI advance thresholds.
const MIN_WEBCAM_SAMPLES = 30;
const MIN_WEBCAM_POINTS_WITH_SAMPLES = 8;
const MIN_WEBCAM_SAMPLES_PER_POINT = 2;

type CalibrationPhase =
  | 'idle'
  | 'collecting'
  | 'recalibrating'
  | 'reading-anchors'
  | 'validating'
  | 'complete';

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
  const samplesByPointRef = useRef<CollectedSample[][]>(createSampleBuckets(fullPointSequence.length));

  const currentPointIndex = collectionOrder[collectionCursor] ?? 0;

  const addSampleForPoint = useCallback(
    (
      pointIndex: number,
      observedX: number,
      observedY: number,
      targetX: number,
      targetY: number,
      yaw = 0,
      pitch = 0,
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
    samplesByPointRef.current = createSampleBuckets(fullPointSequence.length);
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
      ) => model.predict(ix, iy, yaw, pitch);

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

      const calibrationPointErrors = buildCalibrationPointErrors(
        pointErrorsOrNull,
        cleanedByPoint,
        fullPointSequence,
      );

      calibrationLogger.debug('[CALIBRATION POINT ERRORS]', calibrationPointErrors);

      const recalibrationSelection = selectTargetedRecalibrationPoints(calibrationPointErrors);
      const { flaggedPointCandidates } = recalibrationSelection;

      calibrationLogger.debug('[TARGETED RECALIBRATION CHECK]', {
        enabled: TARGETED_RECALIBRATION_ENABLED,
        staticMedianError: Number(recalibrationSelection.staticMedianError.toFixed(4)),
        baseThreshold: recalibrationSelection.baseThreshold,
        effectiveThreshold: Number(recalibrationSelection.effectiveThreshold.toFixed(4)),
        candidates: recalibrationSelection.candidates.map((point) => ({
          pointIndex: point.pointIndex,
          normalizedError: Number(point.normalizedError.toFixed(4)),
        })),
        flaggedPointCandidates,
      });

      if (
        TARGETED_RECALIBRATION_ENABLED &&
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
    [fullPointSequence, recalibrationRound],
  );

  const resetCalibration = useCallback(() => {
    samplesByPointRef.current = createSampleBuckets(fullPointSequence.length);
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
