'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CalibrationPoint, CalibrationResult } from '../types';
import { AOI_X_BOUNDS, AOI_Y_BOUNDS, CALIBRATION_POINTS } from '../lib/constants';
import { GridModeView, StickmanCanvas, StarCanvas } from './calibration-modes';
import { getCalibrationAudio } from '../lib/calibration-audio';
import { playSoftSound } from '../lib/ui-audio';
import type { CalibrationVisualMode } from '../lib/calibration-mode';
import type { CollectedSample } from '../lib/calibration-samples';
import {
  type WebcamCalibrationSample,
  useCalibrationEngine,
} from '../hooks/use-calibration-engine';
import {
  CalibrationCountdown,
  CalibrationCollecting,
  CalibrationPreValidation,
  CalibrationValidation,
  CalibrationResult as CalibrationResultView,
  PursuitCalibrationView,
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
  onGetHeadPoseSample?: () => {
    yaw: number;
    pitch: number;
  } | null;
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
    ingestPursuitSample,
    finishPursuit,
    resetFixationState,
    skipCalibration,
    startValidation,
    readyForPreValidation,
  } = useCalibrationEngine({
    tracker,
    mode: mode,
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

  useEffect(() => {
    if (phase === 'pursuit' && tracker !== 'webcam') {
      finishPursuit([]);
    }
  }, [finishPursuit, phase, tracker]);

  /* ---- audio sync (calibration-audio engine mute is independent of voice now) ---- */
  useEffect(() => {
    calibrationAudio.setMuted(false);
  }, [calibrationAudio]);

  /* ---- subtle capture pulse sound ---- */
  useEffect(() => {
    if (phase === 'pursuit') return;
    if (captureCount <= 0 || captureCount % 8 !== 0) return;
    playSoftSound(isStableFixation ? 760 : 520, 70, 0.015);
  }, [captureCount, isStableFixation, phase]);

  /* ---- phase audio ---- */
  useEffect(() => {
    if (phase === 'collecting' || phase === 'recalibrating') {
      calibrationAudio.startPhase('grid');
    } else if (phase === 'pursuit') {
      calibrationAudio.startPhase('pursuit');
    } else {
      calibrationAudio.stopPhase();
    }
  }, [phase, calibrationAudio]);

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
        const shouldAdvance =
          capturedThisPoint >= minSamples &&
          (stableFixationRef.current || elapsedMs >= timing.gridMinDwellMs);
        const canForceAdvance = capturedThisPoint >= minSamplesForTimeoutAdvance;
        const mustAdvanceByTimeout =
          tracker === 'webcam'
            ? elapsedMs >= timing.gridMaxDwellMs && canForceAdvance
            : elapsedMs >= timing.gridMaxDwellMs;
        const forceAdvance = tracker === 'webcam' && elapsedMs >= timing.gridForceAdvanceMs;

        if (shouldAdvance || mustAdvanceByTimeout || forceAdvance) {
          pushIssue(null);
          advanced = true;
          advancePoint(capturedThisPoint);
          return;
        }

        const issueStartsAtMs = timing.gridMaxDwellMs;
        const issueMinSamples = minSamplesForTimeoutAdvance;
        if (tracker === 'webcam' && elapsedMs >= issueStartsAtMs) {
          if (capturedThisPoint === 0) pushIssue('no-signal');
          else if (capturedThisPoint < issueMinSamples) pushIssue('low-samples');
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
    const modeSurface: ReactNode =
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

  if (phase === 'pursuit') {
    if (tracker !== 'webcam' || !onGetIrisSample) {
      return (
        <div className="fixed inset-0 z-50 flex cursor-none flex-col items-center justify-center bg-[#FDF8F0]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#4A7C59] border-t-transparent" />
            <p className="text-sm text-[#8B857E]">Preparing validation…</p>
          </div>
        </div>
      );
    }

    const handlePursuitSample = (sample: CollectedSample) => {
      ingestPursuitSample(sample);
    };

    return (
      <PursuitCalibrationView
        gridPointCount={calibration.totalPoints}
        aoiBounds={{ x: AOI_X_BOUNDS, y: AOI_Y_BOUNDS }}
        irisStream={onGetIrisSample}
        headPoseStream={onGetHeadPoseSample}
        onSampleReady={handlePursuitSample}
        onComplete={finishPursuit}
        onCancel={() => finishPursuit([])}
      />
    );
  }

  /* 4. Pre-validation instructions (shown once before validation starts)
   *    readyForPreValidation gates the UI (recalibration currently disabled)
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
  /* 4b. Transitional: computing calibration or dismissed but validation hasn't started yet.
   *     Shows a spinner to prevent UI flashing. */
  if (phase === 'validating' && quickValidation.phase === 'idle') {
    return (
      <div className="fixed inset-0 z-50 flex cursor-none flex-col items-center justify-center bg-[#e3dcc2]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#51513d] border-t-transparent" />
          <p className="text-sm text-[#51513d]/70">
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-auto bg-[#e3dcc2] py-8">
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
