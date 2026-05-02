'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalibrationPoint, CalibrationResult } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import { useCalibration } from './use-calibration';
import {
  useQuickValidation,
  type QuickValidationState,
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

/* ── Public types ───────────────────────────────────────── */

export type CalibrationVisualMode = 'grid' | 'stickman' | 'star';

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

// Re-export for consumers that imported from this module
export type { QuickValidationState };

/* ── Options ────────────────────────────────────────────── */

interface UseCalibrationEngineOptions {
  tracker: 'tobii' | 'webcam';
  mode?: CalibrationVisualMode;
  participantAge?: number;
  onGetGazeSample?: () => { x: number; y: number } | null;
  onGetIrisSample?: () => WebcamCalibrationSample | null;
  onGetHeadPoseSample?: () => { yaw: number; pitch: number } | null;
}

/* ── Helpers ────────────────────────────────────────────── */

export function resolveCalibrationMode(
  requestedMode?: CalibrationVisualMode,
  participantAge?: number,
): CalibrationVisualMode {
  if (requestedMode === 'grid' || requestedMode === 'star') return requestedMode;
  if (requestedMode === 'stickman') {
    // Stickman mode is temporarily disabled until stabilization is complete.
    return 'grid';
  }

  if (typeof participantAge === 'number' && Number.isFinite(participantAge)) {
    if (participantAge >= 7 && participantAge <= 9) return 'star';
    if (participantAge >= 10) return 'grid';
  }

  return 'grid';
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
  const calibration = useCalibration();
  const {
    phase: calibrationPhase,
    startCalibration,
    resetCalibration,
    addSample,
    computeTobiiCalibration,
    computeWebcamCalibration,
  } = calibration;

  const resolvedMode = useMemo(
    () => resolveCalibrationMode(mode, participantAge),
    [mode, participantAge],
  );
  const requiredStableFixationMs = resolvedMode === 'grid' ? STABLE_FIXATION_MS : STABLE_FIXATION_MS * 0.85;
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
  // Prevents the pre-validation card from flashing before recalibration.
  // Only becomes true once the post-calibration computation finishes
  // WITHOUT triggering a recalibration round.
  const [readyForPreValidation, setReadyForPreValidation] = useState(false);

  /* ---- refs ---- */
  const mappingRef = useRef<MappingFn>(null);
  const lastStabilityPointRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const lastCaptureAtRef = useRef(0);
  const finalizationStartedRef = useRef(false);
  const storedSamplesRef = useRef<StoredCalibrationSample[]>([]);

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
      const headPose = onGetHeadPoseSample?.() ?? { yaw: 0, pitch: 0 };
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
  }, []);

  /** Shared state reset — used by both resetEngine and beginCalibration */
  const resetState = useCallback(() => {
    resetCalibration();
    setCountdown(COUNTDOWN_SECONDS);
    setCaptureCount(0);
    setGazeCursor(null);
    setFinalResult(null);
    setActiveMapping(null);
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

  /* ---- pending result ref for two-step finalization ---- */
  const pendingResultRef = useRef<CalibrationResult | null>(null);

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
      const result = computeTobiiCalibration();
      pendingResultRef.current = result;
      queueMicrotask(() => setReadyForPreValidation(true));
      // Don't run validation yet — UI will call startValidation()
      return;
    }

    const { result, mapping, needsRecalibration } = computeWebcamCalibration(width, height);

    if (needsRecalibration) {
      mappingRef.current = null;
      queueMicrotask(() => setActiveMapping(null));
      queueMicrotask(() => setGazeCursor(null));
      queueMicrotask(() => setReadyForPreValidation(false));
      resetQuickValidation();
      finalizationStartedRef.current = false;
      pendingResultRef.current = null;
      return;
    }

    mappingRef.current = mapping;
    queueMicrotask(() => setActiveMapping(mapping));

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

    pendingResultRef.current = result;
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
    await runQuickValidation(tracker === 'tobii' ? null : mapping);
    if (pendingResultRef.current) {
      setFinalResult(pendingResultRef.current);
      pendingResultRef.current = null;
    }
  }, [quickValidation.phase, tracker, runQuickValidation]);

  /* ---- sample ingestion ---- */
  const ingestSampleForTarget = useCallback(
    (target: CalibrationPoint) => {
      if (calibrationPhase !== 'collecting' && calibrationPhase !== 'recalibrating') return;

      const now = performance.now();
      const { width, height, diagonal } = getScreenInfo();

      let observedX = 0;
      let observedY = 0;
      let cursorX = 0;
      let cursorY = 0;
      let stabilityX = 0;
      let stabilityY = 0;
      let rawIrisLandmarks: RawIrisLandmark[] = [];
      const headPose = onGetHeadPoseSample?.() ?? { yaw: 0, pitch: 0 };

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

      const previous = lastStabilityPointRef.current;
      if (!previous) {
        lastStabilityPointRef.current = { x: stabilityX, y: stabilityY, timestamp: now };
        return;
      }

      const dtMs = Math.max(1, now - previous.timestamp);
      const motionDistance = Math.hypot(stabilityX - previous.x, stabilityY - previous.y);

      // Calculate velocity as fraction of screen diagonal per second
      // This normalizes across different screen sizes
      const velocityNormPerSecond = motionDistance / diagonal / (dtMs / 1000);

      // Velocity in normalized screen-diagonal units per second
      const stable = velocityNormPerSecond < stableVelocityThreshold;
      if (stable) {
        if (stableSinceRef.current == null) stableSinceRef.current = now;
      } else {
        stableSinceRef.current = null;
      }

      const stableMs = stableSinceRef.current == null ? 0 : now - stableSinceRef.current;
      setIsStableFixation(stableMs >= requiredStableFixationMs);
      setFixationProgress(clamp01(stableMs / requiredStableFixationMs));

      if (
        stableMs >= requiredStableFixationMs &&
        now - lastCaptureAtRef.current >= CAPTURE_COOLDOWN_MS
      ) {
        addSample(observedX, observedY, target.x, target.y, headPose.yaw, headPose.pitch);
        storedSamplesRef.current.push({
          screenX: target.x * width,
          screenY: target.y * height,
          rawIrisLandmarks,
          timestamp: Date.now(),
        });
        lastCaptureAtRef.current = now;
        setCaptureCount((prev) => prev + 1);
      }

      lastStabilityPointRef.current = { x: stabilityX, y: stabilityY, timestamp: now };
    },
    [
      calibrationPhase,
      addSample,
      tracker,
      onGetGazeSample,
      onGetIrisSample,
      onGetHeadPoseSample,
      resolvedMode,
      requiredStableFixationMs,
      stableVelocityThreshold,
    ],
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
        predict: () => ({ x: width * 0.5, y: height * 0.5 }),
      };
      setActiveMapping(mappingRef.current);
    }
  }, [tracker]);

  const canFinalize =
    calibrationPhase === 'complete' ||
    (calibrationPhase === 'validating' && quickValidation.phase === 'done');

  return {
    resolvedMode,
    calibration,
    showCountdown,
    countdown,
    fixationProgress,
    isStableFixation,
    captureCount,
    gazeCursor,
    finalResult,
    quickValidation,
    canFinalize,
    readyForPreValidation,
    mapping: activeMapping,
    beginCalibration,
    resetEngine,
    ingestSampleForTarget,
    resetFixationState,
    skipCalibration,
    startValidation,
  };
}
