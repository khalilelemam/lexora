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
  setGazeCursor: (cursor: { x: number; y: number }) => void,
) {
  const [state, setState] = useState<QuickValidationState>(createInitialState);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  const run = useCallback(
    async (mapping: MappingFn): Promise<number | null> => {
      const { width, height, diagonal } = getScreenInfo();
      // Randomize validation order to prevent anticipatory saccades
      const shuffledIndices = shuffleArray(VALIDATION_POINT_INDICES);
      const validationPoints = shuffledIndices.map((index) => CALIBRATION_POINTS[index]);
      const scores: number[] = [];

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
        if (cancelledRef.current) return 0;

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
          if (prediction) {
            setGazeCursor({ x: prediction.x, y: prediction.y });
          }
        }

        // ── Hold phase ──────────────────────────────────
        const startedAt = performance.now();
        let progressBucket = -1;
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
          if (!prediction) continue;

          setGazeCursor({ x: prediction.x, y: prediction.y });

          const distance = Math.hypot(prediction.x - targetX, prediction.y - targetY);
          distances.push(distance);
        }

        // ── Score ───────────────────────────────────────
        // If we did not observe enough valid prediction samples, skip this
        // point so transient camera loss does not force a false 0% verdict.
        if (distances.length < VALIDATION_MIN_SAMPLES_PER_POINT) {
          setState((prev) => ({
            ...prev,
            holdProgress: 1,
            pointScores: [...scores],
          }));
          continue;
        }

        const meanDistance = mean(distances);
        const pointScore = Math.round(
          Math.max(
            0,
            Math.min(
              100,
              100 - (meanDistance / (diagonal * VALIDATION_THRESHOLD_SCREEN_DIAGONAL)) * 100,
            ),
          ),
        );

        scores.push(pointScore);

        setState((prev) => ({
          ...prev,
          holdProgress: 1,
          pointScores: [...scores],
        }));
      }

      const accuracy = scores.length > 0 ? Math.round(mean(scores)) : null;
      setState((prev) => ({
        ...prev,
        phase: 'done',
        target: null,
        holdProgress: 0,
        accuracyPercent: accuracy,
        pointScores: [...scores],
      }));

      return accuracy;
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
