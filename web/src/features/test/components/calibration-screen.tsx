'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CalibrationPoint, CalibrationResult } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import { GridModeView, StickmanCanvas, StarCanvas } from './calibration-modes';
import { getCalibrationAudio } from '../lib/calibration-audio';
import { playSoftSound, speakInstruction } from '../lib/ui-audio';
import {
  type CalibrationVisualMode,
  type WebcamCalibrationSample,
  useCalibrationEngine,
} from '../hooks/use-calibration-engine';
import {
  CalibrationSetup,
  CalibrationCountdown,
  CalibrationCollecting,
  CalibrationValidation,
  CalibrationResult as CalibrationResultView,
  MOTION_DURATION_MS,
  HOLD_DURATION_MS,
  SAMPLE_INTERVAL_MS,
  GRID_MIN_SAMPLES_WEBCAM,
  GRID_MIN_SAMPLES_TOBII,
  GRID_MIN_DWELL_MS,
  GRID_MAX_DWELL_MS,
  GRID_FORCE_ADVANCE_MS,
  GRID_TIMEOUT_MIN_SAMPLES_WEBCAM,
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
  const [hasStartedCalibration, setHasStartedCalibration] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
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
    advancePoint,
    pointSampleCounts,
    recalibrationRound,
  } = calibration;

  const calibrationAudio = useMemo(() => getCalibrationAudio(), []);

  /* ---- refs ---- */
  const previousPointRef = useRef<CalibrationPoint>(CALIBRATION_POINTS[0]);
  const [previousPoint, setPreviousPoint] = useState<CalibrationPoint>(CALIBRATION_POINTS[0]);
  const spokenKeyRef = useRef('');
  const captureCountRef = useRef(0);
  const stableFixationRef = useRef(false);

  useEffect(() => { captureCountRef.current = captureCount; }, [captureCount]);
  useEffect(() => { stableFixationRef.current = isStableFixation; }, [isStableFixation]);

  /* ---- cleanup speech on unmount ---- */
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* ---- audio sync ---- */
  useEffect(() => { calibrationAudio.setMuted(!voiceEnabled); }, [voiceEnabled, calibrationAudio]);

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

    setPreviousPoint(previousPointRef.current);
    previousPointRef.current = currentPoint;
    resetFixationState();

    const isCanvasMode = resolvedMode === 'stickman' || resolvedMode === 'star';

    const sampleInterval = setInterval(() => {
      ingestSampleForTarget(currentPoint);
    }, SAMPLE_INTERVAL_MS);

    let advanceMonitor: ReturnType<typeof setInterval> | null = null;
    if (!isCanvasMode) {
      const pointStartedAt = performance.now();
      const startCaptureCount = captureCountRef.current;
      const minSamples = tracker === 'webcam' ? GRID_MIN_SAMPLES_WEBCAM : GRID_MIN_SAMPLES_TOBII;
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
          (stableFixationRef.current || elapsedMs >= GRID_MIN_DWELL_MS);
        const mustAdvanceByTimeout =
          tracker === 'webcam'
            ? elapsedMs >= GRID_MAX_DWELL_MS && capturedThisPoint >= minSamplesForTimeoutAdvance
            : elapsedMs >= GRID_MAX_DWELL_MS;
        const forceAdvance = tracker === 'webcam' && elapsedMs >= GRID_FORCE_ADVANCE_MS;

        if (canAdvanceByQuality || mustAdvanceByTimeout || forceAdvance) {
          pushIssue(null);
          advanced = true;
          advancePoint();
          return;
        }

        if (tracker === 'webcam' && elapsedMs >= GRID_MAX_DWELL_MS) {
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
    phase, currentPointIndex, currentPoint, tracker,
    advancePoint, ingestSampleForTarget, resetFixationState, resolvedMode,
  ]);

  /* ---- voice narration ---- */
  useEffect(() => {
    if (!voiceEnabled || !hasStartedCalibration) return;

    let key = '';
    let text = '';

    if (showCountdown) {
      key = `countdown-${countdown}`;
      text = 'Calibration is about to start. Follow the target and keep your head steady.';
    } else if (phase === 'collecting' || phase === 'recalibrating') {
      key = `collecting-${resolvedMode}-${collectionStep}`;
      text = 'Keep your eyes on the target until the ring fills.';
    } else if (quickValidation.phase === 'running') {
      key = `quick-validation-${quickValidation.currentStep}`;
      text = 'Great. Now look at five quick check points to verify accuracy.';
    } else if (canFinalize && finalResult) {
      key = `complete-${finalResult.quality}-${quickValidation.accuracyPercent ?? -1}`;
      text = 'Calibration finished. Review your score and continue when ready.';
    }

    if (!key || spokenKeyRef.current === key) return;
    spokenKeyRef.current = key;
    speakInstruction(text, voiceEnabled);
  }, [
    voiceEnabled, hasStartedCalibration, showCountdown, countdown,
    phase, collectionStep, resolvedMode,
    quickValidation.phase, quickValidation.currentStep, quickValidation.accuracyPercent,
    canFinalize, finalResult,
  ]);

  /* ---- callbacks ---- */
  const handleRetry = useCallback(() => {
    resetEngine();
    setHasStartedCalibration(false);
    setCollectionIssue(null);
  }, [resetEngine]);

  const handleStartCalibration = useCallback(() => {
    beginCalibration();
    setHasStartedCalibration(true);
    setCollectionIssue(null);
  }, [beginCalibration]);

  const handleSkip = useCallback(() => { skipCalibration(); }, [skipCalibration]);

  const handleContinue = useCallback(() => {
    if (!finalResult) return;
    if (tracker === 'webcam' && mapping) {
      onComplete(finalResult, mapping);
      return;
    }
    onComplete(finalResult);
  }, [finalResult, tracker, mapping, onComplete]);

  const toggleVoice = useCallback(() => setVoiceEnabled((v) => !v), []);

  /* ---- derived props for mode views ---- */
  const modeViewProps = useMemo(
    () => ({
      points: CALIBRATION_POINTS,
      currentPoint,
      previousPoint,
      collectionStep,
      collectionTotal,
      isBossPoint: collectionStep === collectionTotal,
      fixationProgress,
      isStableFixation,
      capturePulse,
      motionDurationMs: MOTION_DURATION_MS,
      holdDurationMs: HOLD_DURATION_MS,
      gazeX: gazeCursor?.x ?? 0,
      gazeY: gazeCursor?.y ?? 0,
    }),
    [currentPoint, collectionStep, collectionTotal, previousPoint,
     fixationProgress, isStableFixation, capturePulse, gazeCursor],
  );

  const quickValidationPassed =
    quickValidation.accuracyPercent == null || quickValidation.accuracyPercent >= 70;

  /* ================================================================ */
  /*  RENDER — delegates to extracted sub-components                   */
  /* ================================================================ */

  /* 1. Setup (mode selection + instructions) */
  if (!hasStartedCalibration) {
    return (
      <CalibrationSetup
        resolvedMode={resolvedMode}
        voiceEnabled={voiceEnabled}
        onSelectMode={setSelectedMode}
        onToggleVoice={toggleVoice}
        onStart={handleStartCalibration}
      />
    );
  }

  /* 2. Countdown */
  if (showCountdown) {
    return (
      <CalibrationCountdown
        countdown={countdown}
        resolvedMode={resolvedMode}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
      />
    );
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
        isRecalibrating={phase === 'recalibrating'}
        recalibrationRound={recalibrationRound}
        fixationProgress={fixationProgress}
        isStableFixation={isStableFixation}
        captureCount={captureCount}
        currentPointIndex={currentPointIndex}
        pointSampleCounts={pointSampleCounts}
        collectionIssue={collectionIssue}
        resolvedMode={resolvedMode}
        gazeCursor={gazeCursor}
        voiceEnabled={voiceEnabled}
        onToggleVoice={toggleVoice}
        onSkip={handleSkip}
        modeSurface={modeSurface}
      />
    );
  }

  /* 4. Quick validation */
  if (quickValidation.phase === 'running') {
    return (
      <CalibrationValidation
        currentStep={quickValidation.currentStep}
        totalSteps={quickValidation.totalSteps}
        holdProgress={quickValidation.holdProgress ?? 0}
        target={quickValidation.target}
        gazeCursor={gazeCursor}
      />
    );
  }

  /* 5. Result */
  if (canFinalize && finalResult) {
    return (
      <div className="z-50 fixed inset-0 flex flex-col justify-center items-center bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.18),transparent_50%),radial-gradient(circle_at_80%_85%,hsl(var(--accent)/0.12),transparent_50%),hsl(var(--background))] overflow-auto py-8">
        <CalibrationResultView
          result={finalResult}
          captureCount={captureCount}
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
