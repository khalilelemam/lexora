'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Crosshair, RefreshCw, Sparkles, Star, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CalibrationQuality, CalibrationResult } from '../types';
import { useCalibration } from '../hooks';

interface CalibrationScreenProps {
  mode: 'tobii' | 'webcam';
  onGetGazeSample?: () => { x: number; y: number } | null;
  onGetIrisSample?: () => { x: number; y: number } | null;
  onGetHeadPoseSample?: () => { yaw: number; pitch: number } | null;
  onComplete: (
    result: CalibrationResult,
    mapping?: {
      predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
    },
  ) => void;
  blockOnPoor?: boolean;
}

const DOT_TRAVEL_MS = 700;
const SAMPLE_INTERVAL_MS = 40;

function seededNoise(seed: number): number {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

const QUALITY_CONFIG: Record<
  CalibrationQuality,
  { color: string; icon: typeof CheckCircle2; label: string }
> = {
  good: { color: 'text-green-600', icon: CheckCircle2, label: 'Excellent' },
  acceptable: { color: 'text-yellow-600', icon: AlertTriangle, label: 'Acceptable' },
  poor: { color: 'text-destructive', icon: XCircle, label: 'Poor' },
};

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function CalibrationScreen({
  mode,
  onGetGazeSample,
  onGetIrisSample,
  onGetHeadPoseSample,
  onComplete,
  blockOnPoor = false,
}: CalibrationScreenProps) {
  const {
    phase,
    currentPoint,
    currentPointIndex,
    collectionStep,
    collectionTotal,
    result,
    dotDuration,
    startCalibration,
    addSample,
    advancePoint,
    computeTobiiCalibration,
    computeWebcamCalibration,
    resetCalibration,
  } = useCalibration();

  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(true);
  const [dotVisible, setDotVisible] = useState(false);
  const [isSampling, setIsSampling] = useState(false);
  const [dotPos, setDotPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [captures, setCaptures] = useState(0);
  const [capturePulse, setCapturePulse] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturePulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousTargetRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const currentTargetRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const mappingRef = useRef<{
    predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
  } | null>(null);

  const stars = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        top: `${seededNoise(i + 1) * 100}%`,
        left: `${seededNoise(i + 101) * 100}%`,
        size: 2 + seededNoise(i + 201) * 4,
        delay: seededNoise(i + 301) * 2,
      })),
    [],
  );

  const collectSample = useCallback(
    (target: { x: number; y: number }) => {
      if (mode === 'tobii' && onGetGazeSample) {
        const sample = onGetGazeSample();
        if (sample) addSample(sample.x, sample.y, target.x, target.y);
        return;
      }

      if (mode === 'webcam' && onGetIrisSample) {
        const sample = onGetIrisSample();
        if (!sample) return;
        const pose = onGetHeadPoseSample?.() ?? { yaw: 0, pitch: 0 };
        addSample(sample.x, sample.y, target.x, target.y, pose.yaw, pose.pitch);
      }
    },
    [mode, onGetGazeSample, onGetIrisSample, onGetHeadPoseSample, addSample],
  );

  useEffect(() => {
    if (!showCountdown) return;
    const timer = setTimeout(() => {
      setCountdown((current) => {
        if (current <= 1) {
          setShowCountdown(false);
          startCalibration();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [showCountdown, startCalibration]);

  useEffect(() => {
    if (phase !== 'collecting') return;

    const from = previousTargetRef.current;
    const to = currentPoint;

    requestAnimationFrame(() => {
      setDotVisible(true);
      setIsSampling(true);
      setDotPos(from);
      requestAnimationFrame(() => {
        setDotPos(to);
      });
    });

    const startedAt = performance.now();
    intervalRef.current = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const moveProgress = Math.min(1, elapsed / DOT_TRAVEL_MS);
      const eased = easeInOutQuad(moveProgress);

      const target = {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
      };

      currentTargetRef.current = target;
      collectSample(target);
    }, SAMPLE_INTERVAL_MS);

    const totalDuration = DOT_TRAVEL_MS + dotDuration;
    const advanceTimer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsSampling(false);
      previousTargetRef.current = to;
      currentTargetRef.current = to;
      advancePoint();
    }, totalDuration);

    return () => {
      clearTimeout(advanceTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, currentPointIndex, currentPoint, collectSample, dotDuration, advancePoint]);

  useEffect(() => {
    if (phase !== 'validating') return;

    if (mode === 'tobii') {
      computeTobiiCalibration();
      return;
    }

    const { mapping } = computeWebcamCalibration(window.screen.width, window.screen.height);
    mappingRef.current = mapping;
  }, [phase, mode, computeTobiiCalibration, computeWebcamCalibration]);

  const handleCapture = useCallback(() => {
    if (phase !== 'collecting') return;
    collectSample(currentTargetRef.current);
    setCaptures((prev) => prev + 1);
    setCapturePulse(true);
    if (capturePulseTimerRef.current) clearTimeout(capturePulseTimerRef.current);
    capturePulseTimerRef.current = setTimeout(() => setCapturePulse(false), 260);
  }, [phase, collectSample]);

  useEffect(() => {
    return () => {
      if (capturePulseTimerRef.current) clearTimeout(capturePulseTimerRef.current);
    };
  }, []);

  const handleRetry = useCallback(() => {
    resetCalibration();
    setCountdown(3);
    setShowCountdown(true);
    setDotVisible(false);
    setIsSampling(false);
    setDotPos({ x: 0.5, y: 0.5 });
    setCaptures(0);
    setCapturePulse(false);
    previousTargetRef.current = { x: 0.5, y: 0.5 };
    currentTargetRef.current = { x: 0.5, y: 0.5 };
    mappingRef.current = null;
  }, [resetCalibration]);

  const handleContinue = useCallback(() => {
    if (!result) return;
    if (mode === 'webcam' && mappingRef.current) {
      onComplete(result, mappingRef.current);
      return;
    }
    onComplete(result);
  }, [result, mode, onComplete]);

  if (showCountdown) {
    return (
      <div className="fixed inset-0 z-50 flex cursor-none flex-col items-center justify-center bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.25),transparent_45%),radial-gradient(circle_at_80%_85%,hsl(var(--primary)/0.18),transparent_45%),hsl(var(--background))]">
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-background/80 px-8 py-7 backdrop-blur-sm">
          <Sparkles className="h-12 w-12 text-primary" />
          <h2 className="text-2xl font-semibold">Orb Hunt Calibration</h2>
          <p className="max-w-md text-center text-muted-foreground">
            Follow the moving orb with your eyes and click it whenever you can.
            We calibrate continuously while it moves.
          </p>
          <div className="mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-4xl font-bold text-primary-foreground">
            {countdown}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'collecting') {
    const starsCompleted = Math.max(0, collectionStep - 1);

    return (
      <div className="fixed inset-0 z-50 cursor-none overflow-hidden bg-[radial-gradient(circle_at_30%_15%,hsl(var(--primary)/0.20),transparent_35%),radial-gradient(circle_at_75%_75%,hsl(var(--primary)/0.15),transparent_40%),hsl(var(--background))]">
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute animate-pulse rounded-full bg-white/70"
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

        <div className="absolute left-4 top-4 rounded-md border bg-background/75 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm">
          Orb {collectionStep} / {collectionTotal}
        </div>

        <div className="absolute right-4 top-4 rounded-md border bg-background/75 px-3 py-2 text-sm backdrop-blur-sm">
          <span className="text-muted-foreground">Captures: </span>
          <span className="font-semibold text-foreground">{captures}</span>
        </div>

        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-md border bg-background/75 px-3 py-2 backdrop-blur-sm">
          {Array.from({ length: collectionTotal }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-3.5 w-3.5',
                i < starsCompleted ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40',
              )}
            />
          ))}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border bg-background/75 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
          Keep your head steady, follow the orb, click to lock focus
        </div>

        {dotVisible && (
          <button
            type="button"
            aria-label="Capture orb"
            onClick={handleCapture}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${dotPos.x * 100}%`,
              top: `${dotPos.y * 100}%`,
              transition: `left ${DOT_TRAVEL_MS}ms linear, top ${DOT_TRAVEL_MS}ms linear`,
            }}
          >
            <div
              className={cn(
                'relative flex h-14 w-14 items-center justify-center rounded-full',
                isSampling ? 'scale-100' : 'scale-90',
                capturePulse && 'scale-110',
                'transition-transform duration-200',
              )}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 opacity-80 blur-sm" />
              <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-white to-yellow-100" />
              <div className="relative z-10 rounded-full bg-amber-500/20 p-2">
                <Crosshair className="h-4 w-4 text-amber-700" />
              </div>
            </div>
          </button>
        )}
      </div>
    );
  }

  if (phase === 'validating') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Building your personalized eye map...</p>
      </div>
    );
  }

  if (phase === 'complete' && result) {
    const config = QUALITY_CONFIG[result.quality];
    const Icon = config.icon;
    const canProceed = result.quality !== 'poor' || !blockOnPoor;

    return (
      <div className="flex flex-col items-center gap-6">
        <Icon className={cn('h-12 w-12', config.color)} />

        <div className="text-center">
          <h2 className="text-2xl font-semibold">Calibration Complete</h2>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-muted-foreground">Quality:</span>
            <Badge
              variant={
                result.quality === 'good'
                  ? 'default'
                  : result.quality === 'acceptable'
                    ? 'secondary'
                    : 'destructive'
              }
            >
              {config.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Average error: {(result.averageError * 100).toFixed(1)}% of screen
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Orb captures: {captures}</p>
        </div>

        {result.quality === 'poor' && (
          <div className="max-w-md rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Try again for better precision:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Keep your face centered and stable</li>
              <li>Use even front lighting</li>
              <li>Follow the orb continuously, not with head movement</li>
              <li>Click the orb to reinforce focus</li>
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Calibration
          </Button>
          {canProceed && <Button onClick={handleContinue}>Continue to Test</Button>}
        </div>

        {result.quality === 'poor' && blockOnPoor && (
          <p className="text-sm text-destructive">
            Calibration quality is too low to proceed. Please retry.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex cursor-none items-center justify-center bg-background">
      <div className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground/40" />
    </div>
  );
}
