'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  CalibrationResult,
  CalibrationQuality,
  CalibrationDiagnostics,
  HeadPoseSample,
  ModelDiagnostic,
} from '../types';
import {
  CALIBRATION_POINTS,
  CALIBRATION_DOT_DURATION,
  CALIBRATION_SAMPLES_PER_POINT,
  CALIBRATION_THRESHOLDS,
} from '../lib/constants';
import { DEBUG_GAZE_OVERLAY } from '../lib/debug-config';
import {
  computeCalibrationDiagnostics,
  logCalibrationDiagnostics,
} from '../lib/calibration-diagnostics';
import {
  trainAllModels,
  type TrainingSample,
  type CalibrationModel,
} from '../lib/calibration-models';

// ─── Types ───────────────────────────────────────────────

interface CollectedSample {
  /** Which calibration point this sample belongs to */
  pointIndex: number;
  /** Observed iris X (eye-relative normalised) */
  observedX: number;
  /** Observed iris Y */
  observedY: number;
  /** Head yaw at sample time */
  yaw: number;
  /** Head pitch at sample time */
  pitch: number;
}

interface CalibrationMappingResult {
  /** Model-agnostic predict function (best model) */
  predict: (irisX: number, irisY: number, yaw: number, pitch: number) => { x: number; y: number };
}

type CalibrationPhase = 'idle' | 'collecting' | 'recalibrating' | 'validating' | 'complete';

function splitBucket<T>(samples: T[]) {
  const shuffled = [...samples].sort(() => Math.random() - 0.5);
  const cutoff = Math.floor(shuffled.length * 0.8);
  return {
    train: shuffled.slice(0, cutoff),
    held: shuffled.slice(cutoff),
  };
}

type PointResult = { index: number; error: number };

function evaluatePoints(
  model: CalibrationModel,
  heldSplit: CollectedSample[][],
  points: typeof CALIBRATION_POINTS,
  screenWidth: number,
  screenHeight: number,
): PointResult[] {
  return points.map((pt, i) => {
    if (!heldSplit[i] || heldSplit[i].length === 0) return { index: i, error: 0 };
    const errors = heldSplit[i].map((s) => {
      const pred = model.predict(s.observedX, s.observedY, s.yaw, s.pitch);
      const targetX = pt.x * screenWidth;
      const targetY = pt.y * screenHeight;
      return Math.hypot(pred.x - targetX, pred.y - targetY);
    });
    errors.sort((a, b) => a - b);
    const median = errors[Math.floor(errors.length / 2)];
    return { index: i, error: median };
  });
}

function getFlaggedPoints(results: PointResult[]): number[] {
  const THRESHOLD = 80;
  const MAX_FLAGS = 5;
  return results
    .filter((r) => r.error > THRESHOLD)
    .sort((a, b) => b.error - a.error)
    .slice(0, MAX_FLAGS)
    .map((r) => r.index);
}

const MERGE_WEIGHTS = [
  { newW: 0.7, oldW: 0.3 },
  { newW: 0.9, oldW: 0.1 },
];

function mergePoint(
  freshSamples: CollectedSample[],
  oldSamples: CollectedSample[],
  round: number,
): CollectedSample[] {
  const { newW, oldW } = MERGE_WEIGHTS[Math.min(round, 1)];
  const newCount = Math.round(freshSamples.length * newW * 2);
  const oldCount = Math.round(oldSamples.length * oldW * 2);
  if (freshSamples.length === 0) return oldSamples;
  if (oldSamples.length === 0) return freshSamples;
  return [
    ...Array.from(
      { length: newCount },
      () => freshSamples[Math.floor(Math.random() * freshSamples.length)],
    ),
    ...Array.from(
      { length: oldCount },
      () => oldSamples[Math.floor(Math.random() * oldSamples.length)],
    ),
  ];
}

// ─── Hook ────────────────────────────────────────────────

export function useCalibration() {
  const points = CALIBRATION_POINTS;

  const [phase, setPhase] = useState<CalibrationPhase>('idle');
  const [collectionOrder, setCollectionOrder] = useState<number[]>(() =>
    points.map((_, idx) => idx),
  );
  const [collectionCursor, setCollectionCursor] = useState(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const samplesByPointRef = useRef<CollectedSample[][]>(
    Array.from({ length: points.length }, () => []),
  );
  const trainSplitRef = useRef<CollectedSample[][]>(
    Array.from({ length: points.length }, () => []),
  );
  const heldSplitRef = useRef<CollectedSample[][]>(Array.from({ length: points.length }, () => []));
  const recalRoundRef = useRef<number>(0);

  const currentPointIndex = collectionOrder[collectionCursor] ?? 0;

  // ─── Add a gaze sample during calibration ───────────

  const addSample = useCallback(
    (observedX: number, observedY: number, yaw = 0, pitch = 0) => {
      if (phase !== 'collecting' && phase !== 'recalibrating') return;
      const pointBucket = samplesByPointRef.current[currentPointIndex];
      if (!pointBucket) return;
      pointBucket.push({
        pointIndex: currentPointIndex,
        observedX,
        observedY,
        yaw,
        pitch,
      });
    },
    [phase, currentPointIndex],
  );

  // ─── Advance to next calibration point ──────────────

  const advancePoint = useCallback(() => {
    if (collectionCursor < collectionOrder.length - 1) {
      setCollectionCursor((prev) => prev + 1);
    } else {
      // Current collection pass done — train/re-train and validate
      setPhase('validating');
    }
  }, [collectionCursor, collectionOrder.length]);

  // ─── Start calibration ─────────────────────────────

  const startCalibration = useCallback(() => {
    samplesByPointRef.current = Array.from({ length: points.length }, () => []);
    trainSplitRef.current = Array.from({ length: points.length }, () => []);
    heldSplitRef.current = Array.from({ length: points.length }, () => []);
    recalRoundRef.current = 0;
    setCollectionOrder(points.map((_, idx) => idx));
    setCollectionCursor(0);
    setResult(null);
    setPhase('collecting');
  }, [points]);

  // ─── Start targeted recalibration on failed points ───

  const startTargetedRecalibration = useCallback(
    (failedPointIndices: number[]) => {
      const uniqueSorted = Array.from(new Set(failedPointIndices))
        .filter((idx) => idx >= 0 && idx < points.length)
        .sort((a, b) => a - b);

      if (uniqueSorted.length === 0) return;

      // Drop poisoned samples for failed points only; preserve good points.
      for (const idx of uniqueSorted) {
        samplesByPointRef.current[idx] = [];
      }

      setCollectionOrder(uniqueSorted);
      setCollectionCursor(0);
      setPhase('recalibrating');
    },
    [points],
  );

  // ─── Compute calibration quality (Tobii) ────────────
  // For Tobii: gaze data is already in normalized screen coords (0-1)
  // We measure the average distance from the expected calibration point

  const computeTobiiCalibration = useCallback((): CalibrationResult => {
    const samples = samplesByPointRef.current.flat();
    const pointAccuracies: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const pointSamples = samples.filter((s) => s.pointIndex === i);
      if (pointSamples.length === 0) {
        pointAccuracies.push(1.0); // worst case
        continue;
      }

      const errors = pointSamples.map((s) => {
        const dx = s.observedX - points[i].x;
        const dy = s.observedY - points[i].y;
        return Math.sqrt(dx * dx + dy * dy);
      });
      pointAccuracies.push(errors.reduce((a, b) => a + b, 0) / errors.length);
    }

    const averageError = pointAccuracies.reduce((a, b) => a + b, 0) / pointAccuracies.length;
    let quality: CalibrationQuality = 'poor';
    if (averageError < CALIBRATION_THRESHOLDS.good) quality = 'good';
    else if (averageError < CALIBRATION_THRESHOLDS.acceptable) quality = 'acceptable';

    const calibResult: CalibrationResult = { quality, pointAccuracies, averageError };
    setResult(calibResult);
    setPhase('complete');
    return calibResult;
  }, [points]);

  // ─── Compute webcam calibration mapping ─────────────
  // For webcam: we have iris positions + head pose → multi-model comparison

  const computeWebcamCalibration = useCallback(
    (
      screenWidth: number,
      screenHeight: number,
      headPoseSamples?: HeadPoseSample[],
    ): {
      result: CalibrationResult | null;
      mapping: CalibrationMappingResult;
      diagnostics: CalibrationDiagnostics | null;
      modelDiagnostics: ModelDiagnostic[] | null;
      allModels: CalibrationModel[];
      flaggedPoints: number[];
      pointResults: PointResult[];
      lowAccuracyWarning: boolean;
    } => {
      const samplesByPoint = samplesByPointRef.current;

      // ── Outlier rejection: discard samples > 2σ from per-point mean ──
      const cleanedSamplesByPoint: CollectedSample[][] = Array.from(
        { length: points.length },
        () => [],
      );

      for (let i = 0; i < points.length; i++) {
        const pointSamples = samplesByPoint[i] ?? [];
        if (pointSamples.length < 4) {
          cleanedSamplesByPoint[i].push(...pointSamples);
          continue;
        }
        const meanX = pointSamples.reduce((a, s) => a + s.observedX, 0) / pointSamples.length;
        const meanY = pointSamples.reduce((a, s) => a + s.observedY, 0) / pointSamples.length;
        const stdX = Math.sqrt(
          pointSamples.reduce((a, s) => a + (s.observedX - meanX) ** 2, 0) / pointSamples.length,
        );
        const stdY = Math.sqrt(
          pointSamples.reduce((a, s) => a + (s.observedY - meanY) ** 2, 0) / pointSamples.length,
        );
        for (const s of pointSamples) {
          if (
            Math.abs(s.observedX - meanX) <= 2 * stdX + 1e-9 &&
            Math.abs(s.observedY - meanY) <= 2 * stdY + 1e-9
          ) {
            cleanedSamplesByPoint[i].push(s);
          }
        }
      }

      if (recalRoundRef.current === 0) {
        for (let i = 0; i < points.length; i++) {
          const { train, held } = splitBucket(cleanedSamplesByPoint[i]);
          trainSplitRef.current[i] = train;
          heldSplitRef.current[i] = held;
        }
      } else {
        for (const flaggedIndex of collectionOrder) {
          const fresh = cleanedSamplesByPoint[flaggedIndex];
          const old = trainSplitRef.current[flaggedIndex];
          trainSplitRef.current[flaggedIndex] = mergePoint(fresh, old, recalRoundRef.current - 1);
        }
      }
      recalRoundRef.current += 1;

      // ── Build training samples with head pose ──
      const trainingSamples: TrainingSample[] = [];
      for (let i = 0; i < points.length; i++) {
        for (const s of trainSplitRef.current[i]) {
          trainingSamples.push({
            ix: s.observedX,
            iy: s.observedY,
            yaw: s.yaw,
            pitch: s.pitch,
            targetX: points[i].x * screenWidth,
            targetY: points[i].y * screenHeight,
            pointIndex: i,
          });
        }
      }

      // ── Train all models and pick the best ──
      const comparison = trainAllModels(trainingSamples, screenWidth, screenHeight);
      const bestModel = comparison.best;

      const pointResults = evaluatePoints(
        bestModel,
        heldSplitRef.current,
        points,
        screenWidth,
        screenHeight,
      );
      const flaggedPoints = getFlaggedPoints(pointResults);

      let lowAccuracyWarning = false;
      if (recalRoundRef.current > 2 && flaggedPoints.length > 0) {
        lowAccuracyWarning = true;
        flaggedPoints.length = 0; // force proceed
      }

      // ── Evaluate per-point training error for quality metric ──
      const pointAccuracies: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const ptSamples = trainSplitRef.current[i] ?? [];
        if (ptSamples.length === 0) {
          pointAccuracies.push(1.0);
          continue;
        }
        const errors = ptSamples.map((s) => {
          const pred = bestModel.predict(s.observedX, s.observedY, s.yaw, s.pitch);
          const dx = (pred.x - points[i].x * screenWidth) / screenWidth;
          const dy = (pred.y - points[i].y * screenHeight) / screenHeight;
          return Math.sqrt(dx * dx + dy * dy);
        });
        pointAccuracies.push(errors.reduce((a, b) => a + b, 0) / errors.length);
      }

      const averageError =
        pointAccuracies.length > 0
          ? pointAccuracies.reduce((a, b) => a + b, 0) / pointAccuracies.length
          : 1.0;

      let quality: CalibrationQuality = 'poor';
      if (averageError < CALIBRATION_THRESHOLDS.good) quality = 'good';
      else if (averageError < CALIBRATION_THRESHOLDS.acceptable) quality = 'acceptable';

      // ── Diagnostics ──
      let diagnostics: CalibrationDiagnostics | null = null;
      let modelDiagnostics: ModelDiagnostic[] | null = null;

      if (DEBUG_GAZE_OVERLAY) {
        const cleanedSamples = trainSplitRef.current.flat();

        // Per-point averages for correlation / heatmap (using best model)
        const fittedInputs: [number, number][] = [];
        const fittedTargetsX: number[] = [];
        const fittedTargetsY: number[] = [];
        for (let i = 0; i < points.length; i++) {
          const ptSamples = trainSplitRef.current[i] ?? [];
          if (ptSamples.length === 0) continue;
          const avgX = ptSamples.reduce((a, s) => a + s.observedX, 0) / ptSamples.length;
          const avgY = ptSamples.reduce((a, s) => a + s.observedY, 0) / ptSamples.length;
          fittedInputs.push([avgX, avgY]);
          fittedTargetsX.push(points[i].x * screenWidth);
          fittedTargetsY.push(points[i].y * screenHeight);
        }

        const rawSamplesPerPoint = points.map((_, idx) =>
          (trainSplitRef.current[idx] ?? []).map((s) => ({
            observedX: s.observedX,
            observedY: s.observedY,
          })),
        );

        diagnostics = computeCalibrationDiagnostics({
          fittedInputs,
          targetScreenX: fittedTargetsX,
          targetScreenY: fittedTargetsY,
          bestModel,
          screenWidth,
          screenHeight,
          calibrationPoints: points,
          rawSamplesPerPoint,
          rawSamplesWithPose: cleanedSamples.map((s) => ({
            observedX: s.observedX,
            observedY: s.observedY,
            yaw: s.yaw,
            pitch: s.pitch,
            pointIndex: s.pointIndex,
          })),
          headPoseSamples,
        });

        logCalibrationDiagnostics(diagnostics);

        // ── Per-model diagnostics ──
        modelDiagnostics = comparison.models.map((model) => {
          const perPointErrors = points.map((pt, idx) => {
            const ptSamples = trainSplitRef.current[idx] ?? [];
            if (ptSamples.length === 0) return { point: { x: pt.x, y: pt.y }, meanError: 0 };
            const errors = ptSamples.map((s) => {
              const pred = model.predict(s.observedX, s.observedY, s.yaw, s.pitch);
              return Math.sqrt(
                (pred.x - pt.x * screenWidth) ** 2 + (pred.y - pt.y * screenHeight) ** 2,
              );
            });
            return {
              point: { x: pt.x, y: pt.y },
              meanError: errors.reduce((a, b) => a + b, 0) / errors.length,
            };
          });

          // Axis correlation for this model
          const predX: number[] = [];
          const predY: number[] = [];
          const targX: number[] = [];
          const targY: number[] = [];
          for (let i = 0; i < points.length; i++) {
            const ptSamples = trainSplitRef.current[i] ?? [];
            if (ptSamples.length === 0) continue;
            const avgS = {
              observedX: ptSamples.reduce((a, s) => a + s.observedX, 0) / ptSamples.length,
              observedY: ptSamples.reduce((a, s) => a + s.observedY, 0) / ptSamples.length,
              yaw: ptSamples.reduce((a, s) => a + s.yaw, 0) / ptSamples.length,
              pitch: ptSamples.reduce((a, s) => a + s.pitch, 0) / ptSamples.length,
            };
            const pred = model.predict(avgS.observedX, avgS.observedY, avgS.yaw, avgS.pitch);
            predX.push(pred.x);
            predY.push(pred.y);
            targX.push(points[i].x * screenWidth);
            targY.push(points[i].y * screenHeight);
          }

          const pearson = (a: number[], b: number[]) => {
            const n = a.length;
            if (n < 2) return 0;
            const ma = a.reduce((s, v) => s + v, 0) / n;
            const mb = b.reduce((s, v) => s + v, 0) / n;
            let num = 0,
              da = 0,
              db = 0;
            for (let i = 0; i < n; i++) {
              num += (a[i] - ma) * (b[i] - mb);
              da += (a[i] - ma) ** 2;
              db += (b[i] - mb) ** 2;
            }
            const den = Math.sqrt(da * db);
            return den === 0 ? 0 : num / den;
          };

          return {
            kind: model.kind,
            trainingErrorPx: model.trainingError,
            info: model.info,
            isBest: model === bestModel,
            perPointErrors,
            corrX: pearson(predX, targX),
            corrY: pearson(predY, targY),
            validationErrorPx: 0,
            validationJitterStdDev: 0,
          };
        });
      }

      const calibResult: CalibrationResult = { quality, pointAccuracies, averageError };
      setResult(calibResult);
      if (flaggedPoints.length === 0 || lowAccuracyWarning) {
        setPhase('complete');
      }
      return {
        result: calibResult,
        mapping: { predict: bestModel.predict },
        diagnostics,
        modelDiagnostics,
        allModels: comparison.models,
        flaggedPoints,
        pointResults,
        lowAccuracyWarning,
      };
    },
    [points, collectionOrder],
  );

  // ─── Reset ──────────────────────────────────────────

  const resetCalibration = useCallback(() => {
    samplesByPointRef.current = Array.from({ length: points.length }, () => []);
    trainSplitRef.current = Array.from({ length: points.length }, () => []);
    heldSplitRef.current = Array.from({ length: points.length }, () => []);
    recalRoundRef.current = 0;
    setCollectionOrder(points.map((_, idx) => idx));
    setCollectionCursor(0);
    setResult(null);
    setPhase('idle');
  }, [points]);

  return {
    // State
    phase,
    currentPointIndex,
    currentPoint: points[currentPointIndex] ?? points[0],
    totalPoints: points.length,
    collectionStep: collectionCursor + 1,
    collectionTotal: collectionOrder.length,
    activePointIndices: collectionOrder,
    result,
    samplesPerPoint: CALIBRATION_SAMPLES_PER_POINT,
    dotDuration: CALIBRATION_DOT_DURATION,
    // Actions
    startCalibration,
    startTargetedRecalibration,
    addSample,
    advancePoint,
    computeTobiiCalibration,
    computeWebcamCalibration,
    resetCalibration,
  };
}
