'use client';

import { useCallback, useRef, useState } from 'react';
import type { CalibrationPoint } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import {
  VALIDATION_SETTLE_MS,
  VALIDATION_HOLD_MS,
  VALIDATION_THRESHOLD_SCREEN_DIAGONAL,
  VALIDATION_MIN_SAMPLES_PER_POINT,
  VALIDATION_POINT_INDICES,
  shuffleArray,
  clamp01,
  mean,
  nextAnimationFrame,
  getScreenInfo,
} from '../lib/calibration-engine-constants';
import { calibrationLogger } from '../lib/debug-config';

/* ── Types ──────────────────────────────────────────────── */

export interface QuickValidationState {
  phase: 'idle' | 'running' | 'done';
  currentStep: number;
  totalSteps: number;
  target: CalibrationPoint | null;
  holdProgress: number;
  accuracyPercent: number | null;
  pointScores: number[];
}

export interface QuickValidationRunResult {
  accuracyPercent: number | null;
  normalizedErrors: number[];
  completedPoints: number;
  totalPoints: number;
  pointScores: number[];
  perPointResults: Array<{
    pointIndex: number;
    meanDistancePx: number;
    verticalErrorPx: number;
    horizontalErrorPx: number;
  }>;
  meanVerticalErrorPx: number;
  meanHorizontalErrorPx: number;
}

export type MappingFn = {
  predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
} | null;

type PredictionReader = (mapping: MappingFn) => { x: number; y: number } | null;

/* ── Initial state factory ──────────────────────────────── */

function createInitialState(): QuickValidationState {
  return {
    phase: 'idle',
    currentStep: 0,
    totalSteps: VALIDATION_POINT_INDICES.length,
    target: null,
    holdProgress: 0,
    accuracyPercent: null,
    pointScores: [],
  };
}

/* ── Hook ───────────────────────────────────────────────── */

/**
 * Manages the quick-validation phase that runs after calibration.
 *
 * Validation flow:
 * 1. Shuffle validation point order (prevents anticipatory saccades)
 * 2. For each point: settle → hold → measure accuracy
 * 3. Score each point as % of screen diagonal
 * 4. Report overall accuracy
 */
export function useQuickValidation(
  readCurrentPrediction: PredictionReader,
  setGazeCursor: (cursor: { x: number; y: number } | null) => void,
) {
  const [state, setState] = useState<QuickValidationState>(createInitialState);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  const run = useCallback(
    async (
      mapping: MappingFn,
      targetOverride: readonly CalibrationPoint[] = [],
    ): Promise<QuickValidationRunResult | null> => {
      const { width, height, diagonal } = getScreenInfo();
      const usingOverride = targetOverride.length > 0;
      if (usingOverride) {
        calibrationLogger.debug('[QUICK VALIDATION RUN] Using pursuit override targets', {
          count: targetOverride.length,
          phases: targetOverride.map((t) => t.phase),
        });
      } else {
        calibrationLogger.debug(
          '[QUICK VALIDATION RUN] Using default grid VALIDATION_POINT_INDICES',
        );
      }
      const NUM_VALIDATION_POINTS = 5;
      const validationTargets =
        targetOverride.length > 0
          ? targetOverride.map((target, index) => ({ target, pointIndex: index }))
          : Array.from({ length: NUM_VALIDATION_POINTS }).map((_, index) => {
              // Strict bounds: Vertical 15% to 60%, Horizontal 20% to 80%
              const x = 0.2 + Math.random() * (0.8 - 0.2);
              const y = 0.15 + Math.random() * (0.6 - 0.15);
              return {
                target: { x, y, phase: 'STATIC' as const },
                pointIndex: index,
              };
            });
      const shuffledTargets = validationTargets; // No need to shuffle random points
      const validationPoints = shuffledTargets.map((entry) => entry.target);
      const scores: number[] = [];
      const normalizedErrors: number[] = [];
      const perPointResults: Array<{
        pointIndex: number;
        meanDistancePx: number;
        verticalErrorPx: number;
        horizontalErrorPx: number;
      }> = [];

      setState({
        phase: 'running',
        currentStep: 0,
        totalSteps: validationPoints.length,
        target: validationPoints[0] ?? null,
        holdProgress: 0,
        accuracyPercent: null,
        pointScores: [],
      });

      for (let index = 0; index < validationPoints.length; index++) {
        if (cancelledRef.current) return null;

        const target = validationPoints[index];
        const targetX = target.x * width;
        const targetY = target.y * height;
        const distances: number[] = [];

        setState((prev) => ({
          ...prev,
          currentStep: index + 1,
          target,
          holdProgress: 0,
        }));

        // ── Settle phase ────────────────────────────────
        const settleStartedAt = performance.now();
        while (performance.now() - settleStartedAt < VALIDATION_SETTLE_MS) {
          await nextAnimationFrame();
          const prediction = readCurrentPrediction(mapping);
          if (prediction == null) {
            // Clear the cursor instead of leaving the last position "stuck" onscreen.
            setGazeCursor(null);
            continue;
          }

          setGazeCursor({ x: prediction.x, y: prediction.y });
        }

        // ── Hold phase ──────────────────────────────────
        const startedAt = performance.now();
        let progressBucket = -1;
        const predictedXCoords: number[] = [];
        const predictedYCoords: number[] = [];
        while (performance.now() - startedAt < VALIDATION_HOLD_MS) {
          // Keep reads synced with rendering cadence.
          await nextAnimationFrame();
          const elapsed = performance.now() - startedAt;
          const holdProgress = clamp01(elapsed / VALIDATION_HOLD_MS);
          const nextBucket = Math.floor(holdProgress * 20);
          if (nextBucket !== progressBucket) {
            progressBucket = nextBucket;
            setState((prev) => ({
              ...prev,
              holdProgress,
            }));
          }

          const prediction = readCurrentPrediction(mapping);
          if (prediction == null) {
            // Clear the cursor instead of leaving the last position "stuck" onscreen.
            setGazeCursor(null);
            continue;
          }

          setGazeCursor({ x: prediction.x, y: prediction.y });

          const distance = Math.hypot(prediction.x - targetX, prediction.y - targetY);
          distances.push(distance);
          predictedXCoords.push(prediction.x);
          predictedYCoords.push(prediction.y);
        }

        // ── Score ───────────────────────────────────────
        // If we did not observe enough valid prediction samples, skip this
        // point so transient camera loss does not force a false 0% verdict.
        if (distances.length < VALIDATION_MIN_SAMPLES_PER_POINT) {
          calibrationLogger.warn('[QUICK VALIDATION] skipped point', {
            step: index + 1,
            pointIndex: shuffledTargets[index].pointIndex,
            label: target.label,
            target: {
              normalizedX: target.x,
              normalizedY: target.y,
              screenX: Math.round(targetX),
              screenY: Math.round(targetY),
            },
            sampleCount: distances.length,
            minRequired: VALIDATION_MIN_SAMPLES_PER_POINT,
          });
          setState((prev) => ({
            ...prev,
            holdProgress: 1,
            pointScores: [...scores],
          }));
          continue;
        }

        const meanDistance = mean(distances);
        const meanPredictedX = mean(predictedXCoords);
        const meanPredictedY = mean(predictedYCoords);
        const horizontalErrorPx = Math.abs(meanPredictedX - targetX);
        const verticalErrorPx = Math.abs(meanPredictedY - targetY);
        const normalizedError = meanDistance / diagonal;
        const pointScore = Math.round(
          Math.max(
            0,
            Math.min(
              100,
              100 - (meanDistance / (diagonal * VALIDATION_THRESHOLD_SCREEN_DIAGONAL)) * 100,
            ),
          ),
        );
        normalizedErrors.push(normalizedError);
        perPointResults.push({
          pointIndex: shuffledTargets[index].pointIndex,
          meanDistancePx: meanDistance,
          horizontalErrorPx,
          verticalErrorPx,
        });

        calibrationLogger.debug('[QUICK VALIDATION] point result', {
          step: index + 1,
          pointIndex: shuffledTargets[index].pointIndex,
          label: target.label,
          target: {
            normalizedX: target.x,
            normalizedY: target.y,
            screenX: Math.round(targetX),
            screenY: Math.round(targetY),
          },
          sampleCount: distances.length,
          meanDistancePx: Number(meanDistance.toFixed(2)),
          horizontalErrorPx: Number(horizontalErrorPx.toFixed(2)),
          verticalErrorPx: Number(verticalErrorPx.toFixed(2)),
          normalizedError: Number(normalizedError.toFixed(4)),
          minDistancePx: Number(Math.min(...distances).toFixed(2)),
          maxDistancePx: Number(Math.max(...distances).toFixed(2)),
          score: pointScore,
        });

        scores.push(pointScore);

        setState((prev) => ({
          ...prev,
          holdProgress: 1,
          pointScores: [...scores],
        }));
      }

      const accuracy = scores.length > 0 ? Math.round(mean(scores)) : null;

      // Calculate mean vertical and horizontal errors across all points
      const meanVerticalError =
        perPointResults.length > 0
          ? perPointResults.reduce((sum, p) => sum + p.verticalErrorPx, 0) / perPointResults.length
          : 0;
      const meanHorizontalError =
        perPointResults.length > 0
          ? perPointResults.reduce((sum, p) => sum + p.horizontalErrorPx, 0) /
            perPointResults.length
          : 0;

      const result = {
        accuracy,
        scores,
        totalPoints: validationPoints.length,
        perPointResults,
        meanVerticalErrorPx: meanVerticalError,
        meanHorizontalErrorPx: meanHorizontalError,
      };
      calibrationLogger.debug('[QUICK VALIDATION] finished', {
        accuracy: result.accuracy,
        scores: result.scores,
        totalPoints: result.totalPoints,
        meanVerticalErrorPx: Number(result.meanVerticalErrorPx.toFixed(2)),
        meanHorizontalErrorPx: Number(result.meanHorizontalErrorPx.toFixed(2)),
        perPointDistances: result.perPointResults?.map((p) => ({
          pointIndex: p.pointIndex,
          meanDistancePx: Math.round(p.meanDistancePx),
          horizontalErrorPx: Number(p.horizontalErrorPx.toFixed(2)),
          verticalErrorPx: Number(p.verticalErrorPx.toFixed(2)),
        })),
      });
      setState((prev) => ({
        ...prev,
        phase: 'done',
        target: null,
        holdProgress: 0,
        accuracyPercent: accuracy,
        pointScores: [...scores],
      }));

      return {
        accuracyPercent: accuracy,
        normalizedErrors,
        completedPoints: normalizedErrors.length,
        totalPoints: validationPoints.length,
        pointScores: scores,
        perPointResults,
        meanVerticalErrorPx: meanVerticalError,
        meanHorizontalErrorPx: meanHorizontalError,
      };
    },
    [readCurrentPrediction, setGazeCursor],
  );

  const setCancelled = useCallback((value: boolean) => {
    cancelledRef.current = value;
  }, []);

  return {
    quickValidation: state,
    runQuickValidation: run,
    resetQuickValidation: reset,
    setCancelled,
  };
}
