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
  debugView?: CalibrationDebugView | null;
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

export type CalibrationDebugView =
  | 'static-countdown'
  | 'static-points'
  | 'pursuit-countdown'
  | 'pursuit-active'
  | 'validation-countdown'
  | 'validation-active'
  | 'accuracy-result'
  | 'reading-prep';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalibrationScreen({
  tracker,
  mode,
  participantAge,
  debugView,
  onGetGazeSample,
  onGetIrisSample,
  onGetHeadPoseSample,
  onComplete,
  blockOnPoor = false,
}: CalibrationScreenProps) {
  /* ---- local state ---- */
  const [collectionIssue, setCollectionIssue] = useState<'no-signal' | 'low-samples' | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);

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

  /* ---- subtle capture pulse sound ---- */
  useEffect(() => {
    if (!audioEnabled) return;
    if (phase === 'pursuit') return;
    if (captureCount <= 0 || captureCount % 8 !== 0) return;
    playSoftSound(isStableFixation ? 760 : 520, 70, 0.015);
  }, [audioEnabled, captureCount, isStableFixation, phase]);

  /* ---- phase audio ---- */
  useEffect(() => {
    calibrationAudio.setMuted(!audioEnabled);

    if (phase === 'collecting' || phase === 'recalibrating') {
      calibrationAudio.startPhase('grid');
    } else if (phase !== 'pursuit') {
      calibrationAudio.stopPhase();
    }

    return () => calibrationAudio.stopPhase();
  }, [audioEnabled, phase, calibrationAudio]);

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

    const isCanvasMode =
      resolvedMode === 'stickman' || resolvedMode === 'star' || resolvedMode === 'grid';
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
    beginCalibration();
    setCollectionIssue(null);
    setDismissedValidationRound(null);
  }, [beginCalibration]);

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

  if (process.env.NODE_ENV === 'development' && debugView) {
    const debugPoint = { x: 0.5, y: 0.42, phase: 'STATIC' as const, label: 'debug-center' };
    const debugResult: CalibrationResult = {
      quality: 'good',
      averageError: 0.08,
      pointAccuracies: [93, 91, 95, 90, 94],
    };

    if (debugView === 'static-countdown') {
      return (
        <CalibrationCountdown
          countdown={3}
          resolvedMode={resolvedMode}
          audioEnabled={audioEnabled}
          onToggleAudio={() => setAudioEnabled((enabled) => !enabled)}
        />
      );
    }

    if (debugView === 'static-points') {
      return (
        <CalibrationCollecting
          tracker={tracker}
          collectionIssue={null}
          gazeCursor={null}
          onSkip={() => {}}
          modeSurface={
            <GridModeView
              points={CALIBRATION_POINTS}
              currentPoint={debugPoint}
              previousPoint={debugPoint}
              collectionStep={7}
              collectionTotal={CALIBRATION_POINTS.length}
              fixationProgress={0.55}
              isStableFixation={false}
              capturePulse={false}
              motionDurationMs={getModeTiming('grid').motionDurationMs}
              holdDurationMs={getModeTiming('grid').holdDurationMs}
              onSampleCollected={() => {}}
            />
          }
        />
      );
    }

    if (debugView === 'pursuit-countdown') {
      return (
        <PursuitCalibrationView
          gridPointCount={CALIBRATION_POINTS.length}
          aoiBounds={{ x: AOI_X_BOUNDS, y: AOI_Y_BOUNDS }}
          irisStream={() => ({ x: 0.45, y: 0.45, rawIrisLandmarks: [], screenHint: null })}
          headPoseStream={() => ({ yaw: 0, pitch: 0 })}
          onSampleReady={() => {}}
          onComplete={() => {}}
          onCancel={() => {}}
          audioEnabled={audioEnabled}
          onToggleAudio={() => setAudioEnabled((enabled) => !enabled)}
        />
      );
    }

    if (debugView === 'pursuit-active') {
      return <DebugPursuitActive />;
    }

    if (debugView === 'validation-countdown') {
      return <CalibrationPreValidation resolvedMode={resolvedMode} onReady={() => {}} />;
    }

    if (debugView === 'validation-active') {
      return (
        <CalibrationValidation
          currentStep={2}
          totalSteps={5}
          holdProgress={0.62}
          target={{ x: 0.58, y: 0.34 }}
          gazeCursor={{ x: 0, y: 0 }}
          resolvedMode={resolvedMode}
        />
      );
    }

    if (debugView === 'reading-prep') {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-auto bg-[#e3dcc2] py-8">
          <CalibrationResultView
            result={debugResult}
            quickValidationAccuracy={93}
            quickValidationPassed={true}
            blockOnPoor={false}
            onRetry={() => {}}
            onContinue={() => {}}
            initialLaunchCountdown={4}
          />
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-auto bg-[#e3dcc2] py-8">
        <CalibrationResultView
          result={debugResult}
          quickValidationAccuracy={93}
          quickValidationPassed={true}
          blockOnPoor={false}
          onRetry={() => {}}
          onContinue={() => {}}
        />
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER — delegates to extracted sub-components                   */
  /* ================================================================ */

  /* 2. Countdown */
  if (showCountdown) {
    return (
      <CalibrationCountdown
        countdown={countdown}
        resolvedMode={resolvedMode}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled((enabled) => !enabled)}
      />
    );
  }

  /* 3. Collecting / Recalibrating */
  if (phase === 'collecting' || phase === 'recalibrating') {
    const modeSurface: ReactNode =
      resolvedMode === 'stickman' ? (
        <StickmanCanvas {...modeViewProps} onSampleCollected={handleCanvasSampleCollected} />
      ) : resolvedMode === 'star' ? (
        <StarCanvas {...modeViewProps} onSampleCollected={handleCanvasSampleCollected} />
      ) : (
        <GridModeView {...modeViewProps} onSampleCollected={handleCanvasSampleCollected} />
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
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled((enabled) => !enabled)}
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

function DebugPursuitActive() {
  return (
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-[#e3dcc2] select-none">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(81,81,61,.05) 1px, transparent 1px), linear-gradient(rgba(81,81,61,.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(166,168,103,0.12)_0%,_transparent_58%)]" />

      <div className="pointer-events-none absolute top-[42%] left-[20%] h-px w-[60%] bg-[#51513d]/20" />
      <div className="pointer-events-none absolute top-[42%] left-[20%] h-2 w-[38%] -translate-y-1/2 bg-[#a6a867]/45" />
      <div className="pointer-events-none absolute top-[42%] left-[58%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#1b2021] bg-[#a6a867] shadow-[4px_4px_0_0_rgba(27,32,33,0.3)]">
        <div className="h-2 w-2 rounded-full bg-[#1b2021]" />
      </div>

      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-12 items-center justify-center px-6">
        <div className="w-[min(520px,90vw)]">
          <div className="h-4 overflow-hidden border-2 border-[#1b2021] bg-[#e3dcc2] shadow-[4px_4px_0_0_#1b2021]">
            <div className="h-full w-[42%] border-r-2 border-[#1b2021] bg-[#a6a867]" />
          </div>
        </div>
      </div>
    </div>
  );
}
