'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalibrationPoint, CalibrationResult } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import { useCalibration } from './use-calibration';

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
  // Screen-space hint used for live feedback and stability velocity.
  screenHint?: { x: number; y: number } | null;
}

export interface StoredCalibrationSample {
  screenX: number;
  screenY: number;
  rawIrisLandmarks: RawIrisLandmark[];
  timestamp: number;
}

export interface QuickValidationState {
  phase: 'idle' | 'running' | 'done';
  currentStep: number;
  totalSteps: number;
  target: CalibrationPoint | null;
  holdProgress: number;
  accuracyPercent: number | null;
  pointScores: number[];
}

interface UseCalibrationEngineOptions {
  tracker: 'tobii' | 'webcam';
  mode?: CalibrationVisualMode;
  participantAge?: number;
  onGetGazeSample?: () => { x: number; y: number } | null;
  onGetIrisSample?: () => WebcamCalibrationSample | null;
  onGetHeadPoseSample?: () => { yaw: number; pitch: number } | null;
}

const COUNTDOWN_SECONDS = 3;
const STABLE_FIXATION_MS = 500;
const STABLE_VELOCITY_NORM_PER_SEC = 0.35;
const CAPTURE_COOLDOWN_MS = 65;
const VALIDATION_SETTLE_MS = 450;
const VALIDATION_HOLD_MS = 1200;
const VALIDATION_THRESHOLD_SCREEN_DIAGONAL = 0.12;
const VALIDATION_MIN_SAMPLES_PER_POINT = 10;
const VALIDATION_POINT_INDICES = [0, 4, 7, 10, 14];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function nextAnimationFrame(): Promise<number> {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

export function resolveCalibrationMode(
  requestedMode?: CalibrationVisualMode,
  participantAge?: number,
): CalibrationVisualMode {
  if (requestedMode) return requestedMode;

  if (typeof participantAge === 'number' && Number.isFinite(participantAge)) {
    if (participantAge >= 7 && participantAge <= 9) return 'star';
    if (participantAge >= 10) return 'stickman';
  }

  return 'grid';
}

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
  const requiredStableFixationMs = resolvedMode === 'grid' ? STABLE_FIXATION_MS : 240;
  const stableVelocityThreshold =
    resolvedMode === 'grid' ? STABLE_VELOCITY_NORM_PER_SEC : STABLE_VELOCITY_NORM_PER_SEC * 1.8;

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [showCountdown, setShowCountdown] = useState(false);
  const [fixationProgress, setFixationProgress] = useState(0);
  const [isStableFixation, setIsStableFixation] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [gazeCursor, setGazeCursor] = useState<{ x: number; y: number } | null>(null);
  const [quickValidation, setQuickValidation] = useState<QuickValidationState>({
    phase: 'idle',
    currentStep: 0,
    totalSteps: VALIDATION_POINT_INDICES.length,
    target: null,
    holdProgress: 0,
    accuracyPercent: null,
    pointScores: [],
  });
  const [finalResult, setFinalResult] = useState<CalibrationResult | null>(null);

  const mappingRef = useRef<{
    predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
  } | null>(null);
  const lastStabilityPointRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const stableSinceRef = useRef<number | null>(null);
  const lastCaptureAtRef = useRef(0);
  const finalizationStartedRef = useRef(false);
  const cancelledRef = useRef(false);
  const storedSamplesRef = useRef<StoredCalibrationSample[]>([]);

  const resetFixationState = useCallback(() => {
    setFixationProgress(0);
    setIsStableFixation(false);
    lastStabilityPointRef.current = null;
    stableSinceRef.current = null;
  }, []);

  const resetEngine = useCallback(() => {
    resetCalibration();
    setCountdown(COUNTDOWN_SECONDS);
    setShowCountdown(false);
    setCaptureCount(0);
    setGazeCursor(null);
    setFinalResult(null);
    setQuickValidation({
      phase: 'idle',
      currentStep: 0,
      totalSteps: VALIDATION_POINT_INDICES.length,
      target: null,
      holdProgress: 0,
      accuracyPercent: null,
      pointScores: [],
    });
    resetFixationState();
    mappingRef.current = null;
    finalizationStartedRef.current = false;
    lastCaptureAtRef.current = 0;
    storedSamplesRef.current = [];
  }, [resetCalibration, resetFixationState]);

  const beginCalibration = useCallback(() => {
    resetCalibration();
    setCountdown(COUNTDOWN_SECONDS);
    setShowCountdown(true);
    setCaptureCount(0);
    setGazeCursor(null);
    setFinalResult(null);
    setQuickValidation({
      phase: 'idle',
      currentStep: 0,
      totalSteps: VALIDATION_POINT_INDICES.length,
      target: null,
      holdProgress: 0,
      accuracyPercent: null,
      pointScores: [],
    });
    resetFixationState();
    mappingRef.current = null;
    finalizationStartedRef.current = false;
    lastCaptureAtRef.current = 0;
    storedSamplesRef.current = [];
  }, [resetCalibration, resetFixationState]);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

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

  const getScreenInfo = useCallback(() => {
    if (typeof window === 'undefined') {
      return { width: 1920, height: 1080, diagonal: Math.hypot(1920, 1080) };
    }

    const width = window.screen.width;
    const height = window.screen.height;
    return { width, height, diagonal: Math.hypot(width, height) };
  }, []);

  const readCurrentPrediction = useCallback(
    (
      mapping: {
        predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
      } | null,
    ) => {
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
    [tracker, onGetGazeSample, onGetIrisSample, onGetHeadPoseSample, getScreenInfo],
  );

  const runQuickValidation = useCallback(
    async (
      mapping: {
        predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
      } | null,
    ): Promise<number | null> => {
      const { width, height, diagonal } = getScreenInfo();
      const validationPoints = VALIDATION_POINT_INDICES.map((index) => CALIBRATION_POINTS[index]);
      const scores: number[] = [];

      setQuickValidation({
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

        setQuickValidation((prev) => ({
          ...prev,
          currentStep: index + 1,
          target,
          holdProgress: 0,
        }));

        const settleStartedAt = performance.now();
        while (performance.now() - settleStartedAt < VALIDATION_SETTLE_MS) {
          await nextAnimationFrame();
          const prediction = readCurrentPrediction(mapping);
          if (prediction) {
            setGazeCursor({ x: prediction.x, y: prediction.y });
          }
        }

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
            setQuickValidation((prev) => ({
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

        // If we did not observe enough valid prediction samples, skip this
        // point so transient camera loss does not force a false 0% verdict.
        if (distances.length < VALIDATION_MIN_SAMPLES_PER_POINT) {
          setQuickValidation((prev) => ({
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

        setQuickValidation((prev) => ({
          ...prev,
          holdProgress: 1,
          pointScores: [...scores],
        }));
      }

      const accuracy = scores.length > 0 ? Math.round(mean(scores)) : null;
      setQuickValidation((prev) => ({
        ...prev,
        phase: 'done',
        target: null,
        holdProgress: 0,
        accuracyPercent: accuracy,
        pointScores: [...scores],
      }));

      return accuracy;
    },
    [getScreenInfo, readCurrentPrediction],
  );

  useEffect(() => {
    if (calibrationPhase !== 'validating') return;
    if (finalizationStartedRef.current) return;

    finalizationStartedRef.current = true;

    (async () => {
      const { width, height } = getScreenInfo();

      if (tracker === 'tobii') {
        const result = computeTobiiCalibration();
        await runQuickValidation(null);
        setFinalResult(result);
        return;
      }

      const { result, mapping, needsRecalibration } = computeWebcamCalibration(width, height);

      if (needsRecalibration) {
        mappingRef.current = null;
        setGazeCursor(null);
        setQuickValidation({
          phase: 'idle',
          currentStep: 0,
          totalSteps: VALIDATION_POINT_INDICES.length,
          target: null,
          holdProgress: 0,
          accuracyPercent: null,
          pointScores: [],
        });
        finalizationStartedRef.current = false;
        return;
      }

      mappingRef.current = mapping;

      if (!result) {
        setFinalResult({
          quality: 'poor',
          pointAccuracies: CALIBRATION_POINTS.map(() => 1),
          averageError: 1,
        });
        return;
      }

      await runQuickValidation(mapping);
      setFinalResult(result);
    })();
  }, [
    calibrationPhase,
    computeTobiiCalibration,
    computeWebcamCalibration,
    getScreenInfo,
    tracker,
    runQuickValidation,
  ]);

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

      // Stability threshold: 0.35 means movement < 35% of screen diagonal per second
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
      getScreenInfo,
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
    }
  }, [getScreenInfo, tracker]);

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
    mapping: mappingRef.current,
    storedSamples: storedSamplesRef.current,
    beginCalibration,
    resetEngine,
    ingestSampleForTarget,
    resetFixationState,
    skipCalibration,
  };
}
