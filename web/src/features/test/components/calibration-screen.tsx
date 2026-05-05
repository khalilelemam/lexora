'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalibrationPoint, CalibrationResult } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import { GridModeView, StickmanCanvas, StarCanvas } from './calibration-modes';
import { getCalibrationAudio } from '../lib/calibration-audio';
import { playSoftSound } from '../lib/ui-audio';
import {
  type CalibrationVisualMode,
  type WebcamCalibrationSample,
  useCalibrationEngine,
} from '../hooks/use-calibration-engine';
import {
  CalibrationSetup,
  CalibrationCountdown,
  CalibrationCollecting,
  CalibrationPreValidation,
  CalibrationValidation,
  CalibrationResult as CalibrationResultView,
  SAMPLE_INTERVAL_MS,
  GRID_TIMEOUT_MIN_SAMPLES_WEBCAM,
  getModeTiming,
} from './calibration';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CalibrationScreenProps {
  tracker: 'tobii' | 'webcam';
  mode?: CalibrationVisualMode;
  participantAge?: number;
  onGetGazeSample?: () => { x: number; y: number } | null;
  onGetIrisSample?: () => WebcamCalibrationSample | null;
  onGetHeadPoseSample?: () => { yaw: number; pitch: number } | null;
  onComplete: (
    result: CalibrationResult,
    mapping?: {
      predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
    },
  ) => void;
  blockOnPoor?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalibrationScreen({
  tracker,
  mode,
  participantAge,
  onGetGazeSample,
  onGetIrisSample,
  onGetHeadPoseSample,
  onComplete,
  blockOnPoor = false,
}: CalibrationScreenProps) {
  /* ---- local state ---- */
  const [selectedMode, setSelectedMode] = useState<CalibrationVisualMode | undefined>(mode);
  const [collectionIssue, setCollectionIssue] = useState<'no-signal' | 'low-samples' | null>(null);

  /* ---- engine ---- */
  const {
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
    mapping,
    beginCalibration,
    resetEngine,
    ingestSampleForTarget,
    resetFixationState,
    skipCalibration,
    startValidation,
    readyForPreValidation,
  } = useCalibrationEngine({
    tracker,
    mode: selectedMode,
    participantAge,
    onGetGazeSample,
    onGetIrisSample,
    onGetHeadPoseSample,
  });

  const {
    phase,
    currentPoint,
    currentPointIndex,
    collectionStep,
    collectionTotal,
    recalibrationRound,
    advancePoint,
  } = calibration;

  const [dismissedValidationRound, setDismissedValidationRound] = useState<number | null>(null);
  const preValidationDismissed = dismissedValidationRound === recalibrationRound;

  const calibrationAudio = useMemo(() => getCalibrationAudio(), []);

  /* ---- refs ---- */
  const previousPointRef = useRef<CalibrationPoint>(CALIBRATION_POINTS[0]);
  const [previousPoint, setPreviousPoint] = useState<CalibrationPoint>(CALIBRATION_POINTS[0]);
  const captureCountRef = useRef(0);
  const stableFixationRef = useRef(false);

  useEffect(() => {
    beginCalibration();
  }, [beginCalibration]);

  useEffect(() => {
    captureCountRef.current = captureCount;
  }, [captureCount]);
  useEffect(() => {
    stableFixationRef.current = isStableFixation;
  }, [isStableFixation]);

  /* ---- audio sync (calibration-audio engine mute is independent of voice now) ---- */
  useEffect(() => {
    calibrationAudio.setMuted(false);
  }, [calibrationAudio]);

  /* ---- subtle capture pulse sound ---- */
  useEffect(() => {
    if (captureCount <= 0 || captureCount % 8 !== 0) return;
    playSoftSound(isStableFixation ? 760 : 520, 70, 0.015);
  }, [captureCount, isStableFixation]);

  const capturePulse = captureCount % 2 === 1;

  /* ---- canvas mode advance callback ---- */
  const handleCanvasSampleCollected = useCallback(() => {
    advancePoint();
  }, [advancePoint]);

  /* ---- main collection effect ---- */
  useEffect(() => {
    if (phase !== 'collecting' && phase !== 'recalibrating') return;

    queueMicrotask(() => setPreviousPoint(previousPointRef.current));
    previousPointRef.current = currentPoint;
    resetFixationState();

    const isCanvasMode = resolvedMode === 'stickman' || resolvedMode === 'star';
    const timing = getModeTiming(resolvedMode);

    const sampleInterval = setInterval(() => {
      ingestSampleForTarget(currentPoint);
    }, SAMPLE_INTERVAL_MS);

    let advanceMonitor: ReturnType<typeof setInterval> | null = null;
    if (!isCanvasMode) {
      const pointStartedAt = performance.now();
      const startCaptureCount = captureCountRef.current;
      const minSamples =
        tracker === 'webcam' ? timing.gridMinSamplesWebcam : timing.gridMinSamplesTobii;
      const minSamplesForTimeoutAdvance =
        tracker === 'webcam' ? Math.min(minSamples, GRID_TIMEOUT_MIN_SAMPLES_WEBCAM) : minSamples;
      let advanced = false;
      let currentIssue: 'no-signal' | 'low-samples' | null = null;

      const pushIssue = (nextIssue: 'no-signal' | 'low-samples' | null) => {
        if (currentIssue === nextIssue) return;
        currentIssue = nextIssue;
        setCollectionIssue(nextIssue);
      };

      advanceMonitor = setInterval(() => {
        if (advanced) return;
        const elapsedMs = performance.now() - pointStartedAt;
        const capturedThisPoint = captureCountRef.current - startCaptureCount;
        const canAdvanceByQuality =
          capturedThisPoint >= minSamples &&
          (stableFixationRef.current || elapsedMs >= timing.gridMinDwellMs);
        const mustAdvanceByTimeout =
          tracker === 'webcam'
            ? elapsedMs >= timing.gridMaxDwellMs && capturedThisPoint >= minSamplesForTimeoutAdvance
            : elapsedMs >= timing.gridMaxDwellMs;
        const forceAdvance = tracker === 'webcam' && elapsedMs >= timing.gridForceAdvanceMs;

        if (canAdvanceByQuality || mustAdvanceByTimeout || forceAdvance) {
          pushIssue(null);
          advanced = true;
          advancePoint();
          return;
        }

        if (tracker === 'webcam' && elapsedMs >= timing.gridMaxDwellMs) {
          if (capturedThisPoint === 0) pushIssue('no-signal');
          else if (capturedThisPoint < minSamplesForTimeoutAdvance) pushIssue('low-samples');
          else pushIssue(null);
        } else if (capturedThisPoint > 0) {
          pushIssue(null);
        }
      }, 80);
    }

    return () => {
      clearInterval(sampleInterval);
      if (advanceMonitor) clearInterval(advanceMonitor);
    };
  }, [
    phase,
    currentPointIndex,
    currentPoint,
    tracker,
    advancePoint,
    ingestSampleForTarget,
    resetFixationState,
    resolvedMode,
  ]);

  /* ---- callbacks ---- */
  const handleRetry = useCallback(() => {
    resetEngine();
    setCollectionIssue(null);
    setDismissedValidationRound(null);
  }, [resetEngine]);

  const handleSkip = useCallback(() => {
    skipCalibration();
  }, [skipCalibration]);

  const handleContinue = useCallback(() => {
    if (!finalResult) return;
    if (tracker === 'webcam' && mapping) {
      onComplete(finalResult, mapping);
      return;
    }
    onComplete(finalResult);
  }, [finalResult, tracker, mapping, onComplete]);

  /* ---- derived props for mode views ---- */
  const modeViewProps = {
    points: CALIBRATION_POINTS,
    currentPoint,
    previousPoint,
    collectionStep,
    collectionTotal,
    fixationProgress,
    isStableFixation,
    capturePulse,
    motionDurationMs: getModeTiming(resolvedMode).motionDurationMs,
    holdDurationMs: getModeTiming(resolvedMode).holdDurationMs,
    gazeX: gazeCursor?.x ?? 0,
    gazeY: gazeCursor?.y ?? 0,
  };

  const quickValidationPassed =
    quickValidation.accuracyPercent == null || quickValidation.accuracyPercent >= 70;

  /* ================================================================ */
  /*  RENDER — delegates to extracted sub-components                   */
  /* ================================================================ */

  /* 2. Countdown */
  if (showCountdown) {
    return <CalibrationCountdown countdown={countdown} resolvedMode={resolvedMode} />;
  }

  /* 3. Collecting / Recalibrating */
  if (phase === 'collecting' || phase === 'recalibrating') {
    const modeSurface =
      resolvedMode === 'stickman' ? (
        <StickmanCanvas {...modeViewProps} onSampleCollected={handleCanvasSampleCollected} />
      ) : resolvedMode === 'star' ? (
        <StarCanvas {...modeViewProps} onSampleCollected={handleCanvasSampleCollected} />
      ) : (
        <GridModeView {...modeViewProps} />
      );

    return (
      <CalibrationCollecting
        tracker={tracker}
        collectionIssue={collectionIssue}
        gazeCursor={gazeCursor}
        onSkip={handleSkip}
        modeSurface={modeSurface}
      />
    );
  }

  /* 4. Pre-validation instructions (shown once before validation starts)
   *    IMPORTANT: readyForPreValidation prevents flashing the card before
   *    recalibration — it is only true after the engine computation finishes
   *    without triggering a recalibration round.
   */
  if (
    quickValidation.phase === 'idle' &&
    phase === 'validating' &&
    readyForPreValidation &&
    !preValidationDismissed
  ) {
    return (
      <CalibrationPreValidation
        resolvedMode={resolvedMode}
        onReady={() => {
          setDismissedValidationRound(recalibrationRound);
          startValidation();
        }}
      />
    );
  }
  /* 4b. Transitional: computing calibration, waiting for recalibration decision, or
   *     dismissed but validation hasn't started yet (brief async gap).
   *     Shows a spinner so the UI never flashes the wrong panel. */
  if (phase === 'validating' && quickValidation.phase === 'idle') {
    return (
      <div className="fixed inset-0 z-50 flex cursor-none flex-col items-center justify-center bg-[#FDF8F0]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#4A7C59] border-t-transparent" />
          <p className="text-sm text-[#8B857E]">
            {preValidationDismissed ? 'Preparing validation…' : 'Computing calibration…'}
          </p>
        </div>
      </div>
    );
  }

  /* 5. Quick validation */
  if (quickValidation.phase === 'running') {
    return (
      <CalibrationValidation
        currentStep={quickValidation.currentStep}
        totalSteps={quickValidation.totalSteps}
        holdProgress={quickValidation.holdProgress ?? 0}
        target={quickValidation.target}
        gazeCursor={gazeCursor}
        resolvedMode={resolvedMode}
      />
    );
  }

  /* 6. Result */
  if (canFinalize && finalResult) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-auto bg-[#FDF8F0] py-8">
        <CalibrationResultView
          result={finalResult}
          quickValidationAccuracy={quickValidation.accuracyPercent}
          quickValidationPassed={quickValidationPassed}
          blockOnPoor={blockOnPoor}
          onRetry={handleRetry}
          onContinue={handleContinue}
        />
      </div>
    );
  }

  /* Fallback — should never display */
  return null;
}
