'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Palette,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  WandSparkles,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CalibrationPoint, CalibrationQuality, CalibrationResult } from '../types';
import { CALIBRATION_POINTS } from '../lib/constants';
import { GridModeView, StickmanCanvas, StarCanvas } from './calibration-modes';
import { getCalibrationAudio } from '../lib/calibration-audio';
import {
  type CalibrationVisualMode,
  type WebcamCalibrationSample,
  useCalibrationEngine,
} from '../hooks/use-calibration-engine';

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

const MOTION_DURATION_MS = 460;
const HOLD_DURATION_MS = 900;
const SAMPLE_INTERVAL_MS = 33;
const GRID_MIN_SAMPLES_WEBCAM = 14;
const GRID_MIN_SAMPLES_TOBII = 6;
const GRID_MIN_DWELL_MS = 900;
const GRID_MAX_DWELL_MS = 4200;
const GRID_TIMEOUT_MIN_SAMPLES_WEBCAM = 4;
const POINT_SAMPLES_GOAL_WEBCAM = 3;
const POINT_SAMPLES_GOAL_TOBII = 3;

function speakInstruction(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 0.65;
  window.speechSynthesis.speak(utterance);
}

function playSoftSound(frequency: number, durationMs = 95, volume = 0.04) {
  if (typeof window === 'undefined') return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);

  osc.onended = () => {
    ctx.close().catch(() => undefined);
  };
}

const QUALITY_CONFIG: Record<
  CalibrationQuality,
  { color: string; icon: typeof CheckCircle2; label: string }
> = {
  good: { color: 'text-green-600', icon: CheckCircle2, label: 'Excellent' },
  acceptable: { color: 'text-yellow-600', icon: AlertTriangle, label: 'Acceptable' },
  poor: { color: 'text-destructive', icon: XCircle, label: 'Poor' },
};

const MODE_OPTIONS: Array<{ key: CalibrationVisualMode; label: string }> = [
  { key: 'grid', label: 'Default Grid' },
  { key: 'stickman', label: 'Action Stickman' },
  { key: 'star', label: 'Gentle Star' },
];

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
  const [selectedMode, setSelectedMode] = useState<CalibrationVisualMode | undefined>(mode);
  const [hasStartedCalibration, setHasStartedCalibration] = useState(false);

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

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [collectionIssue, setCollectionIssue] = useState<'no-signal' | 'low-samples' | null>(null);
  const calibrationAudio = useMemo(() => getCalibrationAudio(), []);

  const previousPointRef = useRef<CalibrationPoint>(CALIBRATION_POINTS[0]);
  const [previousPoint, setPreviousPoint] = useState<CalibrationPoint>(CALIBRATION_POINTS[0]);
  const spokenKeyRef = useRef('');
  const captureCountRef = useRef(0);
  const stableFixationRef = useRef(false);

  useEffect(() => {
    captureCountRef.current = captureCount;
  }, [captureCount]);

  useEffect(() => {
    stableFixationRef.current = isStableFixation;
  }, [isStableFixation]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    calibrationAudio.setMuted(!voiceEnabled);
  }, [voiceEnabled, calibrationAudio]);

  useEffect(() => {
    if (captureCount <= 0) return;
    if (captureCount % 8 !== 0) return;
    playSoftSound(isStableFixation ? 760 : 520, 70, 0.015);
  }, [captureCount, isStableFixation]);

  const capturePulse = captureCount % 2 === 1;

  // Handle sample collected callback from Canvas modes
  const handleCanvasSampleCollected = useCallback(() => {
    // Canvas modes drive progression; sample collection remains engine-driven
    // via the regular interval + stability gating.
    advancePoint();
  }, [advancePoint]);

  useEffect(() => {
    if (phase !== 'collecting' && phase !== 'recalibrating') return;

    setPreviousPoint(previousPointRef.current);
    previousPointRef.current = currentPoint;
    resetFixationState();

    // For Canvas modes (stickman, star), don't use auto-advance timer
    // They signal completion via onSampleCollected callback
    const isCanvasMode = resolvedMode === 'stickman' || resolvedMode === 'star';

    // Sample collection interval - runs for all modes to collect iris data
    const sampleInterval = setInterval(() => {
      ingestSampleForTarget(currentPoint);
    }, SAMPLE_INTERVAL_MS);

    // Grid mode: advance when we have enough captured stable samples,
    // with a timeout fallback to avoid deadlocks.
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

        if (canAdvanceByQuality || mustAdvanceByTimeout) {
          pushIssue(null);
          advanced = true;
          advancePoint();
          return;
        }

        if (tracker === 'webcam' && elapsedMs >= GRID_MAX_DWELL_MS) {
          if (capturedThisPoint === 0) {
            pushIssue('no-signal');
          } else if (capturedThisPoint < minSamplesForTimeoutAdvance) {
            pushIssue('low-samples');
          } else {
            pushIssue(null);
          }
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

  useEffect(() => {
    if (!voiceEnabled) return;
    if (!hasStartedCalibration) return;

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
    voiceEnabled,
    hasStartedCalibration,
    showCountdown,
    countdown,
    phase,
    collectionStep,
    resolvedMode,
    quickValidation.phase,
    quickValidation.currentStep,
    quickValidation.accuracyPercent,
    canFinalize,
    finalResult,
  ]);

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
    [
      currentPoint,
      collectionStep,
      collectionTotal,
      previousPoint,
      fixationProgress,
      isStableFixation,
      capturePulse,
      gazeCursor,
    ],
  );

  const quickValidationPassed =
    quickValidation.accuracyPercent == null || quickValidation.accuracyPercent >= 70;

  if (!hasStartedCalibration) {
    return (
      <div className="z-50 fixed inset-0 flex flex-col justify-center items-center bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.25),transparent_45%),radial-gradient(circle_at_80%_85%,hsl(var(--primary)/0.18),transparent_45%),hsl(var(--background))]">
        <div className="flex flex-col items-center gap-4 bg-background/80 backdrop-blur-sm px-8 py-7 border rounded-2xl w-[min(720px,92vw)]">
          <Sparkles className="w-12 h-12 text-primary" />
          <h2 className="font-semibold text-2xl">Calibration Setup</h2>
          <p className="max-w-lg text-muted-foreground text-center">
            Choose your preferred style, then start calibration when you are ready.
          </p>

          <div className="bg-muted/50 p-3 rounded-lg w-full text-sm">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Palette className="w-4 h-4" />
              <span>Calibration style</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MODE_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  type="button"
                  variant={resolvedMode === option.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMode(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="mt-2 text-muted-foreground text-xs">
              Active style: <span className="font-medium text-foreground">{resolvedMode}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setVoiceEnabled((prev) => !prev)}>
              {voiceEnabled ? (
                <>
                  <Volume2 className="mr-2 w-4 h-4" /> Voice On
                </>
              ) : (
                <>
                  <VolumeX className="mr-2 w-4 h-4" /> Voice Off
                </>
              )}
            </Button>
            <Button onClick={handleStartCalibration}>Start Calibration</Button>
          </div>
        </div>
      </div>
    );
  }

  if (showCountdown) {
    return (
      <div className="z-50 fixed inset-0 flex flex-col justify-center items-center bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.25),transparent_45%),radial-gradient(circle_at_80%_85%,hsl(var(--primary)/0.18),transparent_45%),hsl(var(--background))] cursor-none">
        <div className="flex flex-col items-center gap-4 bg-background/80 backdrop-blur-sm px-8 py-7 border rounded-2xl">
          <Sparkles className="w-12 h-12 text-primary" />
          <h2 className="font-semibold text-2xl">Calibration Quest</h2>
          <p className="max-w-md text-muted-foreground text-center">
            Follow the target with your eyes and hold steady. We only collect samples during stable
            fixation for better accuracy.
          </p>
          <p className="text-muted-foreground text-sm">
            Mode: <span className="font-medium text-foreground">{resolvedMode}</span>
          </p>

          <div className="flex justify-center items-center bg-primary mt-2 rounded-full w-20 h-20 font-bold text-primary-foreground text-4xl">
            {countdown}
          </div>
          <Button variant="outline" size="sm" onClick={() => setVoiceEnabled((prev) => !prev)}>
            {voiceEnabled ? (
              <>
                <Volume2 className="mr-2 w-4 h-4" /> Voice On
              </>
            ) : (
              <>
                <VolumeX className="mr-2 w-4 h-4" /> Voice Off
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'collecting' || phase === 'recalibrating') {
    const isRecalibrating = phase === 'recalibrating';
    const pointSamplesGoal =
      tracker === 'webcam' ? POINT_SAMPLES_GOAL_WEBCAM : POINT_SAMPLES_GOAL_TOBII;
    const currentPointSamples = pointSampleCounts[currentPointIndex] ?? 0;
    const coveredPoints = pointSampleCounts.filter((count) => count >= pointSamplesGoal).length;

    const modeSurface =
      resolvedMode === 'stickman' ? (
        <StickmanCanvas {...modeViewProps} onSampleCollected={handleCanvasSampleCollected} />
      ) : resolvedMode === 'star' ? (
        <StarCanvas {...modeViewProps} onSampleCollected={handleCanvasSampleCollected} />
      ) : (
        <GridModeView {...modeViewProps} />
      );

    return (
      <div className="z-50 fixed inset-0 overflow-hidden cursor-none">
        {modeSurface}

        <div className="top-4 left-1/2 absolute bg-background/75 backdrop-blur-sm px-4 py-3 border rounded-lg w-[min(640px,90vw)] text-muted-foreground text-sm text-center -translate-x-1/2 pointer-events-none">
          Hold your gaze until the ring fills. Samples are recorded only during stable fixation.
        </div>

        {isRecalibrating && (
          <div className="top-4 left-4 absolute bg-amber-50/90 backdrop-blur-sm px-3 py-2 border border-amber-300/70 rounded-lg text-amber-700 text-xs pointer-events-none">
            Targeted recalibration pass {recalibrationRound}
          </div>
        )}

        <div className="top-16 right-4 absolute flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setVoiceEnabled((prev) => !prev)}>
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSkip}>
            Skip
          </Button>
        </div>

        <div className="bottom-4 left-1/2 absolute bg-background/75 backdrop-blur-sm px-4 py-3 border rounded-lg w-[min(640px,90vw)] text-sm -translate-x-1/2 pointer-events-none">
          <div className="flex justify-between items-center mb-2 text-muted-foreground">
            <span>Fixation lock</span>
            <span>{Math.round(fixationProgress * 100)}%</span>
          </div>
          <div className="bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                'rounded-full h-full transition-all duration-150',
                isStableFixation ? 'bg-emerald-500' : 'bg-primary',
              )}
              style={{ width: `${Math.round(fixationProgress * 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-muted-foreground text-xs">
            <span>Samples captured: {captureCount}</span>
            <span>
              {isStableFixation ? 'Stable fixation detected' : 'Keep your eyes still for 0.5s'}
            </span>
          </div>
          {tracker === 'webcam' && resolvedMode === 'grid' && (
            <div className="mt-2 text-[11px] text-muted-foreground/90">
              Live cursor preview is hidden during initial webcam capture to avoid misleading drift.
            </div>
          )}
          {tracker === 'webcam' && collectionIssue === 'no-signal' && (
            <div className="mt-2 text-[11px] text-amber-600">
              No face detected. Keep your face visible, centered, and well-lit before calibration
              can continue.
            </div>
          )}
          {tracker === 'webcam' && collectionIssue === 'low-samples' && (
            <div className="mt-2 text-[11px] text-amber-600">
              Signal is unstable. Hold your eyes on target and keep your head still to collect
              enough real samples.
            </div>
          )}
        </div>

        <div className="right-4 bottom-4 absolute bg-background/75 backdrop-blur-sm px-3 py-3 border rounded-lg w-[min(300px,45vw)] text-xs pointer-events-none">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Current point samples</span>
            <span>
              {currentPointSamples}/{pointSamplesGoal}
            </span>
          </div>
          <div className="bg-muted mt-2 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary rounded-full h-full transition-all duration-150"
              style={{
                width: `${Math.min(100, Math.round((currentPointSamples / Math.max(1, pointSamplesGoal)) * 100))}%`,
              }}
            />
          </div>

          <div className="flex justify-between items-center mt-3 text-muted-foreground">
            <span>Grid coverage</span>
            <span>
              {coveredPoints}/{CALIBRATION_POINTS.length} points ready
            </span>
          </div>
          <div className="bg-muted mt-2 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 rounded-full h-full transition-all duration-150"
              style={{ width: `${Math.round((coveredPoints / CALIBRATION_POINTS.length) * 100)}%` }}
            />
          </div>
        </div>

        {tracker === 'tobii' && gazeCursor && (
          <div
            className="absolute bg-cyan-300/70 shadow-[0_0_12px_rgba(34,211,238,0.8)] border border-white/80 rounded-full w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: gazeCursor.x,
              top: gazeCursor.y,
            }}
          />
        )}
      </div>
    );
  }

  if (quickValidation.phase === 'running') {
    const target = quickValidation.target;

    return (
      <div className="z-50 fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.2),transparent_45%),hsl(var(--background))] cursor-none">
        <div className="top-8 left-1/2 absolute bg-background/80 backdrop-blur-sm px-4 py-3 border rounded-lg w-[min(640px,90vw)] text-muted-foreground text-sm text-center -translate-x-1/2">
          <div className="font-medium text-foreground text-sm">
            Quick validation {quickValidation.currentStep} / {quickValidation.totalSteps}
          </div>
          <div className="mt-1 text-xs">Look at each target and hold until its ring fills.</div>
          <div className="mt-2">
            <div className="bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary rounded-full h-full transition-all duration-150"
                style={{
                  width: `${Math.round((quickValidation.holdProgress ?? 0) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {target && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}
          >
            <div
              className="relative rounded-full w-20 h-20"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${(quickValidation.holdProgress ?? 0) * 360}deg, rgba(148,163,184,0.35) 0deg)`,
              }}
            >
              <div className="absolute inset-1.75 bg-primary/15 shadow-[0_0_36px_rgba(59,130,246,0.45)] border-2 border-primary/80 rounded-full" />
            </div>
          </div>
        )}

        {gazeCursor && (
          <div
            className="absolute bg-cyan-300/70 shadow-[0_0_12px_rgba(34,211,238,0.8)] border border-white/80 rounded-full w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: gazeCursor.x, top: gazeCursor.y }}
          />
        )}
      </div>
    );
  }

  if (canFinalize && finalResult) {
    const config = QUALITY_CONFIG[finalResult.quality];
    const Icon = config.icon;
    const canProceed = finalResult.quality !== 'poor' || !blockOnPoor;

    return (
      <div className="flex flex-col items-center gap-6">
        <Icon className={cn('w-12 h-12', config.color)} />

        <div className="text-center">
          <h2 className="font-semibold text-2xl">Calibration Complete</h2>
          <div className="flex justify-center items-center gap-2 mt-2">
            <span className="text-muted-foreground">Quality:</span>
            <Badge
              variant={
                finalResult.quality === 'good'
                  ? 'default'
                  : finalResult.quality === 'acceptable'
                    ? 'secondary'
                    : 'destructive'
              }
            >
              {config.label}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Average error: {(finalResult.averageError * 100).toFixed(1)}% of screen
          </p>
          <p className="mt-1 text-muted-foreground text-xs">Fixation captures: {captureCount}</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Quick validation score:{' '}
            {quickValidation.accuracyPercent == null
              ? 'N/A (insufficient signal)'
              : `${quickValidation.accuracyPercent}%`}
          </p>
        </div>

        {quickValidation.accuracyPercent != null && !quickValidationPassed && (
          <div className="bg-amber-50 p-3 rounded-md max-w-md text-amber-700 text-sm">
            Quick validation score is below 70%. Calibration can still proceed, but retry is
            recommended for better reliability.
          </div>
        )}

        {finalResult.quality === 'poor' && (
          <div className="bg-muted p-3 rounded-md max-w-md text-muted-foreground text-sm">
            <p className="font-medium text-foreground">Try again for better precision:</p>
            <ul className="space-y-1 mt-1 list-disc list-inside">
              <li>Keep your face centered and stable</li>
              <li>Use even front lighting</li>
              <li>Use only your eyes to track targets</li>
              <li>Avoid sudden head movement during fixation</li>
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry Calibration
          </Button>
          {canProceed && <Button onClick={handleContinue}>Continue to Test</Button>}
        </div>

        {finalResult.quality === 'poor' && blockOnPoor && (
          <p className="text-destructive text-sm">
            Calibration quality is too low to proceed. Please retry.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="z-50 fixed inset-0 flex flex-col justify-center items-center gap-4 bg-background cursor-none">
      <WandSparkles className="w-8 h-8 text-primary" />
      <p className="text-muted-foreground text-sm">Building calibration mapping...</p>
    </div>
  );
}
