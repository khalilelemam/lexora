'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalibrationPoint, CalibrationResult, CalibrationPhaseType } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import {
  resolveCalibrationMode,
  type CalibrationVisualMode,
} from '../lib/calibration-mode';
import { useCalibration } from './use-calibration';
import { buildCalibrationResult } from '../lib/calibration-math';
import type { CollectedSample } from '../lib/calibration-samples';
import {
  evaluateFixationStability,
  type StabilityPoint,
} from '../lib/calibration-stability';
import { calibrationLogger } from '../lib/debug-config';

import {
  useQuickValidation,
  type MappingFn,
} from './use-quick-validation';
import {
  COUNTDOWN_SECONDS,
  STABLE_FIXATION_MS,
  STABLE_VELOCITY_NORM_PER_SEC,
  CAPTURE_COOLDOWN_MS,
  clamp01,
  getScreenInfo,
} from '../lib/calibration-engine-constants';

const FULL_POINT_SEQUENCE = CALIBRATION_POINTS;

/* ── Public types ───────────────────────────────────────── */

export interface RawIrisLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface WebcamCalibrationSample {
  x: number;
  y: number;
  rawIrisLandmarks?: RawIrisLandmark[] | null;
  /** Screen-space hint used for live feedback and stability velocity. */
  screenHint?: { x: number; y: number } | null;
}

export interface StoredCalibrationSample {
  screenX: number;
  screenY: number;
  rawIrisLandmarks: RawIrisLandmark[];
  timestamp: number;
}

/* ── Options ────────────────────────────────────────────── */

interface UseCalibrationEngineOptions {
  tracker: 'tobii' | 'webcam';
  mode?: CalibrationVisualMode;
  participantAge?: number;
  onGetGazeSample?: () => { x: number; y: number } | null;
  onGetIrisSample?: () => WebcamCalibrationSample | null;
  onGetHeadPoseSample?: () => {
    yaw: number;
    pitch: number;
  } | null;
}

/* ── Main hook ──────────────────────────────────────────── */

export function useCalibrationEngine({
  tracker,
  mode,
  participantAge,
  onGetGazeSample,
  onGetIrisSample,
  onGetHeadPoseSample,
}: UseCalibrationEngineOptions) {
  const resolvedMode = useMemo(
    () => resolveCalibrationMode(mode, participantAge),
    [mode, participantAge],
  );

  /** Reading-augmented calibration: grid anchors first, reading anchors second. */
  const fullPointSequence = FULL_POINT_SEQUENCE;
  const loggedOptionBKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const logKey = `${tracker}:${resolvedMode}`;
    if (loggedOptionBKeyRef.current === logKey) return;
    loggedOptionBKeyRef.current = logKey;

    calibrationLogger.debug('[OPTION B CALIBRATION] grid-dot sequence selected', {
      tracker,
      resolvedMode,
      totalPoints: fullPointSequence.length,
      phaseCounts: { STATIC: fullPointSequence.length },
    });
  }, [tracker, resolvedMode, fullPointSequence.length]);

  const calibration = useCalibration(fullPointSequence);
  const {
    phase: calibrationPhase,
    startCalibration,
    resetCalibration,
    addSampleForPoint,
    completeReadingAnchors,
    computeTobiiCalibration,
    computeWebcamCalibration,
  } = calibration;
  const requiredStableFixationMs = resolvedMode === 'grid' ? STABLE_FIXATION_MS : 120;
  const stableVelocityThreshold =
    resolvedMode === 'grid' ? STABLE_VELOCITY_NORM_PER_SEC : STABLE_VELOCITY_NORM_PER_SEC * 1.5;

  /* ---- local state ---- */
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [showCountdown, setShowCountdown] = useState(false);
  const [fixationProgress, setFixationProgress] = useState(0);
  const [isStableFixation, setIsStableFixation] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [gazeCursor, setGazeCursor] = useState<{ x: number; y: number } | null>(null);
  const [finalResult, setFinalResult] = useState<CalibrationResult | null>(null);
  const [activeMapping, setActiveMapping] = useState<MappingFn>(null);
  const [readingValidationTargets, setReadingValidationTargets] = useState<CalibrationPoint[]>([]);
  // Gate for pre-validation UI (recalibration currently disabled)
  const [readyForPreValidation, setReadyForPreValidation] = useState(false);

  /* ---- refs ---- */
  const mappingRef = useRef<MappingFn>(null);
  const lastStabilityPointRef = useRef<StabilityPoint | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const lastCaptureAtRef = useRef(0);
  const finalizationStartedRef = useRef(false);
  const storedSamplesRef = useRef<StoredCalibrationSample[]>([]);

  const currentPointCaptureCountRef = useRef<number>(0);

  /* ---- prediction reader (shared with quick validation) ---- */
  const readCurrentPrediction = useCallback(
    (mapping: MappingFn) => {
      const { width, height } = getScreenInfo();

      if (tracker === 'tobii') {
        const sample = onGetGazeSample?.();
        if (!sample) return null;
        return { x: sample.x * width, y: sample.y * height };
      }

      const sample = onGetIrisSample?.();
      if (!sample || !mapping) return null;
      const headPose = onGetHeadPoseSample?.() ?? {
        yaw: 0,
        pitch: 0,
      };
      return mapping.predict(sample.x, sample.y, headPose.yaw, headPose.pitch);
    },
    [tracker, onGetGazeSample, onGetIrisSample, onGetHeadPoseSample],
  );

  /* ---- quick validation (extracted hook) ---- */
  const { quickValidation, runQuickValidation, resetQuickValidation, setCancelled } =
    useQuickValidation(readCurrentPrediction, (cursor) => setGazeCursor(cursor));

  /* ---- lifecycle management ---- */

  useEffect(() => {
    setCancelled(false);
    return () => {
      setCancelled(true);
    };
  }, [setCancelled]);

  const resetFixationState = useCallback(() => {
    setFixationProgress(0);
    setIsStableFixation(false);
    lastStabilityPointRef.current = null;
    stableSinceRef.current = null;
    currentPointCaptureCountRef.current = 0;
  }, []);

  /** Shared state reset — used by both resetEngine and beginCalibration */
  const resetState = useCallback(() => {
    resetCalibration();
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureCount(0);
    setGazeCursor(null);
    setFinalResult(null);
    setActiveMapping(null);
    setReadingValidationTargets([]);
    setReadyForPreValidation(false);
    resetQuickValidation();
    resetFixationState();
    mappingRef.current = null;
    finalizationStartedRef.current = false;
    lastCaptureAtRef.current = 0;
    storedSamplesRef.current = [];
  }, [resetCalibration, resetFixationState, resetQuickValidation]);

  const resetEngine = useCallback(() => {
    resetState();
    setShowCountdown(false);
  }, [resetState]);

  const beginCalibration = useCallback(() => {
    resetState();
    setShowCountdown(true);
  }, [resetState]);

  /* ---- countdown timer ---- */
  useEffect(() => {
    if (!showCountdown) return;

    const timer = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(0);
        setShowCountdown(false);
        startCalibration();
        return;
      }

      setCountdown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showCountdown, countdown, startCalibration]);

  /**
   * Step 1: When calibrationPhase → 'validating', compute the mapping/result
   *         but DO NOT start validation yet. The UI shows pre-validation instructions first.
   */
  useEffect(() => {
    if (calibrationPhase !== 'validating') return;
    if (finalizationStartedRef.current) return;

    finalizationStartedRef.current = true;

    const { width, height } = getScreenInfo();

    if (tracker === 'tobii') {
      computeTobiiCalibration();
      queueMicrotask(() => setReadyForPreValidation(true));
      // Don't run validation yet — UI will call startValidation()
      return;
    }

    const { result, mapping, mappingIsFallback, needsRecalibration } = computeWebcamCalibration(
      width,
      height,
    );

    if (needsRecalibration) {
      mappingRef.current = null;
      queueMicrotask(() => setActiveMapping(null));
      queueMicrotask(() => setGazeCursor(null));
      queueMicrotask(() => setReadyForPreValidation(false));
      resetQuickValidation();
      finalizationStartedRef.current = false;
      return;
    }

    const liveMapping = mappingIsFallback ? null : mapping;
    mappingRef.current = liveMapping;
    queueMicrotask(() => setActiveMapping(liveMapping));

    if (!result) {
      queueMicrotask(() =>
        setFinalResult({
          quality: 'poor',
          pointAccuracies: CALIBRATION_POINTS.map(() => 1),
          averageError: 1,
        }),
      );
      queueMicrotask(() => setReadyForPreValidation(true));
      return;
    }

    queueMicrotask(() => setReadyForPreValidation(true));
    // Don't run validation yet — UI will call startValidation()
  }, [
    calibrationPhase,
    computeTobiiCalibration,
    computeWebcamCalibration,
    tracker,
    resetQuickValidation,
  ]);

  /**
   * Step 2: Called by the UI after the pre-validation instructions are dismissed.
   *         Now we actually run the quick validation loop.
   */
  const startValidation = useCallback(async () => {
    if (quickValidation.phase !== 'idle') return;
    const mapping = mappingRef.current;
    if (tracker === 'webcam' && !mapping) {
      calibrationLogger.warn('[QUICK VALIDATION] missing webcam mapping; validation will fail closed');
    }

    if (readingValidationTargets.length > 0) {
      calibrationLogger.debug('[QUICK VALIDATION] Starting with reading anchor validation targets', {
        count: readingValidationTargets.length,
        targets: readingValidationTargets.map((t) => ({ x: t.x.toFixed(3), y: t.y.toFixed(3), phase: t.phase })),
      });
    } else {
      calibrationLogger.debug('[QUICK VALIDATION] No reading targets; using default grid validation points');
    }

    const validation = await runQuickValidation(
      tracker === 'tobii' ? null : mapping,
      readingValidationTargets,
    );
    if (!validation) return;

    const validationResult =
      validation.normalizedErrors.length > 0
        ? buildCalibrationResult(validation.normalizedErrors)
        : {
          quality: 'poor' as const,
          pointAccuracies: CALIBRATION_POINTS.map(() => 1),
          averageError: 1,
        };
    setFinalResult(validationResult);
  }, [quickValidation.phase, tracker, runQuickValidation, readingValidationTargets]);

  /* ---- sample ingestion ---- */
  const ingestSampleForTarget = useCallback(
    (target: CalibrationPoint) => {
      if (calibrationPhase !== 'collecting' && calibrationPhase !== 'recalibrating') {
        return;
      }

      const now = performance.now();
      const { width, height, diagonal } = getScreenInfo();

      let observedX = 0;
      let observedY = 0;
      let cursorX = 0;
      let cursorY = 0;
      let stabilityX = 0;
      let stabilityY = 0;
      let rawIrisLandmarks: RawIrisLandmark[] = [];
      const headPose = onGetHeadPoseSample?.() ?? {
        yaw: 0,
        pitch: 0,
      };

      if (tracker === 'tobii') {
        const gaze = onGetGazeSample?.();
        if (!gaze) {
          setGazeCursor(null);
          setFixationProgress(0);
          setIsStableFixation(false);
          stableSinceRef.current = null;
          lastStabilityPointRef.current = null;
          return;
        }

        observedX = gaze.x;
        observedY = gaze.y;
        cursorX = gaze.x * width;
        cursorY = gaze.y * height;
        stabilityX = cursorX;
        stabilityY = cursorY;
      } else {
        const iris = onGetIrisSample?.();
        if (!iris) {
          setGazeCursor(null);
          setFixationProgress(0);
          setIsStableFixation(false);
          stableSinceRef.current = null;
          lastStabilityPointRef.current = null;
          return;
        }

        observedX = iris.x;
        observedY = iris.y;
        rawIrisLandmarks = [...(iris.rawIrisLandmarks ?? [])];

        if (iris.screenHint) {
          // Prefer global screen-space iris hint when available so the dot
          // reflects real movement instead of looking pinned near center.
          const hintedX = Math.max(0, Math.min(width, iris.screenHint.x));
          const hintedY = Math.max(0, Math.min(height, iris.screenHint.y));
          cursorX = hintedX;
          cursorY = hintedY;
          stabilityX = hintedX;
          stabilityY = hintedY;
        } else {
          // Fallback for missing global hint: map iris-local coordinates into
          // the calibration AOI as a rough pre-mapping visual indicator.
          const hintNormX = clamp01(observedX);
          const hintNormY = clamp01(observedY);
          const xMin = resolvedMode === 'grid' ? 0.2 : 0.1;
          const xMax = resolvedMode === 'grid' ? 0.8 : 0.9;
          const yMin = resolvedMode === 'grid' ? 0.1 : 0.08;
          const yMax = resolvedMode === 'grid' ? 0.65 : 0.92;
          cursorX = (xMin + hintNormX * (xMax - xMin)) * width;
          cursorY = (yMin + hintNormY * (yMax - yMin)) * height;
          stabilityX = cursorX;
          stabilityY = cursorY;
        }
      }

      setGazeCursor({ x: cursorX, y: cursorY });

      const currentStabilityPoint = { x: stabilityX, y: stabilityY, timestamp: now };
      const previousStabilityPoint = lastStabilityPointRef.current;
      if (!previousStabilityPoint) {
        lastStabilityPointRef.current = currentStabilityPoint;
        return;
      }

      const stability = evaluateFixationStability({
        previousPoint: previousStabilityPoint,
        currentPoint: currentStabilityPoint,
        stableSince: stableSinceRef.current,
        screenDiagonal: diagonal,
        stableVelocityThreshold,
        requiredStableFixationMs,
        lastCaptureAt: lastCaptureAtRef.current,
        captureCooldownMs: CAPTURE_COOLDOWN_MS,
      });
      stableSinceRef.current = stability.stableSince;
      setIsStableFixation(stability.isStableFixation);
      setFixationProgress(stability.fixationProgress);

      if (stability.shouldCollect) {
        const pointIndex = fullPointSequence.findIndex((p) => p.x === target.x && p.y === target.y);

        if (pointIndex >= 0) {
          addSampleForPoint(
            pointIndex,
            observedX,
            observedY,
            target.x,
            target.y,
            headPose.yaw,
            headPose.pitch,
            1.0,
            'STATIC',
          );
        }
        storedSamplesRef.current.push({
          screenX: target.x * width,
          screenY: target.y * height,
          rawIrisLandmarks,
          timestamp: Date.now(),
        });
        lastCaptureAtRef.current = now;
        currentPointCaptureCountRef.current += 1;
        setCaptureCount((prev) => prev + 1);

        if (currentPointCaptureCountRef.current === 1) {
          calibrationLogger.debug('[TARGET UNITS]', {
            pointIndex,
            phase: 'STATIC',
            targetX_stored: target.x,
            targetY_stored: target.y,
            currentPoint_x: target.x,
            currentPoint_y: target.y,
            screenW: width,
            screenH: height,
          });
        }
      }

      lastStabilityPointRef.current = currentStabilityPoint;
    },
    [
      calibrationPhase,
      addSampleForPoint,
      tracker,
      onGetGazeSample,
      onGetIrisSample,
      onGetHeadPoseSample,
      resolvedMode,
      requiredStableFixationMs,
      stableVelocityThreshold,
      fullPointSequence,
    ],
  );

  const ingestReadingAnchorSample = useCallback(
    (sample: CollectedSample) => {
      if (calibrationPhase !== 'reading-anchors') return;
      addSampleForPoint(
        sample.pointIndex,
        sample.observedX,
        sample.observedY,
        sample.targetX,
        sample.targetY,
        sample.yaw,
        sample.pitch,
        sample.sampleWeight ?? 0.7,
        sample.phase ?? 'READING_ANCHOR',
      );
      setCaptureCount((prev) => prev + 1);
    },
    [addSampleForPoint, calibrationPhase],
  );

  const finishReadingAnchors = useCallback(
    (validationTargets: CalibrationPoint[] = []) => {
      setReadingValidationTargets(validationTargets);
      if (validationTargets.length > 0) {
        calibrationLogger.debug('[READING ANCHORS COMPLETE] Stored validation targets in engine', {
          count: validationTargets.length,
          targets: validationTargets.map((t) => ({ x: t.x.toFixed(3), y: t.y.toFixed(3), phase: t.phase })),
        });
      } else {
        calibrationLogger.warn('[READING ANCHORS COMPLETE] No validation targets received');
      }
      completeReadingAnchors();
    },
    [completeReadingAnchors],
  );

  const skipCalibration = useCallback(() => {
    const { width, height } = getScreenInfo();
    const fallbackResult: CalibrationResult = {
      quality: 'poor',
      pointAccuracies: CALIBRATION_POINTS.map(() => 1),
      averageError: 1,
    };

    setFinalResult(fallbackResult);
    if (tracker === 'webcam') {
      mappingRef.current = {
        predict: () => ({
          x: width * 0.5,
          y: height * 0.5,
        }),
      };
      setActiveMapping(mappingRef.current);
    }
  }, [tracker]);

  const canFinalize =
    calibrationPhase === 'complete' ||
    (calibrationPhase === 'validating' && quickValidation.phase === 'done');

  const currentPointIndex = calibration.currentPointIndex ?? -1;
  const currentPointSampleCount = calibration.pointSampleCounts?.[currentPointIndex] ?? 0;

  return {
    resolvedMode,
    calibration,
    showCountdown,
    countdown,
    fixationProgress,
    isStableFixation,
    captureCount,
    currentPointSampleCount,
    gazeCursor,
    finalResult,
    quickValidation,
    canFinalize,
    readyForPreValidation,
    mapping: activeMapping,
    fullPointSequence,
    currentPhase: 1 as const,
    currentPhaseType: 'STATIC' as CalibrationPhaseType,
    beginCalibration,
    resetEngine,
    ingestSampleForTarget,
    resetFixationState,
    skipCalibration,
    ingestReadingAnchorSample,
    finishReadingAnchors,
    startValidation,
  };
}
