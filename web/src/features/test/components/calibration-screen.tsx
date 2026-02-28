'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Target, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CalibrationResult, CalibrationQuality } from '../types';
import { useCalibration } from '../hooks';
import { CALIBRATION_DOT_DURATION } from '../lib/constants';

// ─── Types ───────────────────────────────────────────────

interface CalibrationScreenProps {
  mode: 'tobii' | 'webcam';
  /** For Tobii: called to get gaze data for each calibration point */
  onGetGazeSample?: () => { x: number; y: number } | null;
  /** For webcam: called to get iris position for each calibration point */
  onGetIrisSample?: () => { x: number; y: number } | null;
  /** Called when calibration is complete */
  onComplete: (result: CalibrationResult, mapping?: { xCoeffs: number[]; yCoeffs: number[] }) => void;
  /** Whether to block on poor quality (Tobii) or allow proceeding (webcam) */
  blockOnPoor?: boolean;
}

const QUALITY_CONFIG: Record<CalibrationQuality, { color: string; icon: typeof CheckCircle2; label: string }> = {
  good: { color: 'text-green-600', icon: CheckCircle2, label: 'Excellent' },
  acceptable: { color: 'text-yellow-600', icon: AlertTriangle, label: 'Acceptable' },
  poor: { color: 'text-destructive', icon: XCircle, label: 'Poor' },
};

/** Time in ms for the dot to animate to its new position */
const DOT_TRAVEL_MS = 400;
/** Time in ms for the dot to settle before sampling begins */
const DOT_SETTLE_MS = 200;

export function CalibrationScreen({
  mode,
  onGetGazeSample,
  onGetIrisSample,
  onComplete,
  blockOnPoor = false,
}: CalibrationScreenProps) {
  const {
    phase,
    currentPointIndex,
    currentPoint,
    totalPoints,
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
  /** Whether the dot has arrived and is actively sampling */
  const [isSampling, setIsSampling] = useState(false);
  /** Whether the dot is visible at all (used for inter-point transitions) */
  const [dotVisible, setDotVisible] = useState(false);
  /** Position the dot is currently rendering at (for CSS transition) */
  const [dotPos, setDotPos] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  // ─── Start countdown then calibration ───────────────

  useEffect(() => {
    if (!showCountdown) return;
    if (countdown <= 0) {
      setShowCountdown(false);
      startCalibration();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, showCountdown, startCalibration]);

  // ─── Animate dot and collect samples ────────────────

  useEffect(() => {
    if (phase !== 'collecting') return;

    // Step 1: Show dot and animate to position
    setDotVisible(true);
    setIsSampling(false);
    setDotPos({ x: currentPoint.x, y: currentPoint.y });

    // Step 2: After travel + settle time, start sampling
    const settleTimer = setTimeout(() => {
      setIsSampling(true);

      // Collect samples during dot display
      intervalRef.current = setInterval(() => {
        if (mode === 'tobii' && onGetGazeSample) {
          const sample = onGetGazeSample();
          if (sample) addSample(sample.x, sample.y);
        } else if (mode === 'webcam' && onGetIrisSample) {
          const sample = onGetIrisSample();
          if (sample) addSample(sample.x, sample.y);
        }
      }, 50); // ~20 samples per second
    }, DOT_TRAVEL_MS + DOT_SETTLE_MS);

    // Step 3: After sampling duration, advance to next point
    const advanceTimer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsSampling(false);
      advancePoint();
    }, DOT_TRAVEL_MS + DOT_SETTLE_MS + dotDuration);

    return () => {
      clearTimeout(settleTimer);
      clearTimeout(advanceTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, currentPointIndex, mode, onGetGazeSample, onGetIrisSample, addSample, advancePoint, dotDuration, currentPoint]);

  // ─── Compute results when validation phase starts ───

  useEffect(() => {
    if (phase !== 'validating') return;

    if (mode === 'tobii') {
      const calibResult = computeTobiiCalibration();
      void calibResult;
    } else {
      const { result: calibResult, mapping } = computeWebcamCalibration(
        window.screen.width,
        window.screen.height,
      );
      void calibResult;
      void mapping;
    }
  }, [phase, mode, computeTobiiCalibration, computeWebcamCalibration]);

  // ─── Handle retry ───────────────────────────────────

  const handleRetry = useCallback(() => {
    resetCalibration();
    setCountdown(3);
    setShowCountdown(true);
    setDotVisible(false);
    setIsSampling(false);
    setDotPos({ x: 0.5, y: 0.5 });
  }, [resetCalibration]);

  // ─── Handle continue ───────────────────────────────

  const handleContinue = useCallback(() => {
    if (!result) return;
    if (mode === 'webcam') {
      const { mapping } = computeWebcamCalibration(window.screen.width, window.screen.height);
      onComplete(result, mapping);
    } else {
      onComplete(result);
    }
  }, [result, mode, computeWebcamCalibration, onComplete]);

  // ─── Countdown Screen ──────────────────────────────

  if (showCountdown) {
    return (
      <div className="fixed inset-0 z-50 flex cursor-none flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Target className="h-12 w-12 text-primary" />
          <h2 className="text-2xl font-semibold">Calibration</h2>
          <p className="text-muted-foreground">
            Follow the dot with your eyes as it moves across the screen.
          </p>
          <div className="mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-4xl font-bold text-primary-foreground">
            {countdown}
          </div>
        </div>
      </div>
    );
  }

  // ─── Dot Collection Screen ─────────────────────────

  if (phase === 'collecting') {
    return (
      <div className="fixed inset-0 z-50 cursor-none bg-background">
        {/* Progress indicator */}
        <div className="absolute left-4 top-4 text-sm text-muted-foreground">
          Point {currentPointIndex + 1} of {totalPoints}
        </div>

        {/* Calibration dot — animated with CSS transition */}
        {dotVisible && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${dotPos.x * 100}%`,
              top: `${dotPos.y * 100}%`,
              transition: `left ${DOT_TRAVEL_MS}ms cubic-bezier(0.4, 0, 0.2, 1), top ${DOT_TRAVEL_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
            onClick={() => {
              // For webcam: clicking helps with calibration accuracy
              if (mode === 'webcam' && onGetIrisSample) {
                const sample = onGetIrisSample();
                if (sample) addSample(sample.x, sample.y);
              }
            }}
          >
            {/* Outer ring — pulses when sampling */}
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300',
                isSampling
                  ? 'scale-100 bg-primary/20'
                  : 'scale-75 bg-primary/10',
              )}
            >
              {/* Inner dot */}
              <div
                className={cn(
                  'rounded-full bg-primary transition-all duration-300',
                  isSampling ? 'h-4 w-4' : 'h-3 w-3',
                )}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Processing ────────────────────────────────────

  if (phase === 'validating') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Analyzing calibration...</p>
      </div>
    );
  }

  // ─── Results Screen ────────────────────────────────

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
              variant={result.quality === 'good' ? 'default' : result.quality === 'acceptable' ? 'secondary' : 'destructive'}
            >
              {config.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Average error: {(result.averageError * 100).toFixed(1)}% of screen
          </p>
        </div>

        {result.quality === 'poor' && (
          <div className="max-w-md rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Tips to improve:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              {mode === 'tobii' ? (
                <>
                  <li>Make sure the eye tracker can see your eyes</li>
                  <li>Adjust screen distance and angle</li>
                  <li>Reduce ambient light reflections</li>
                </>
              ) : (
                <>
                  <li>Ensure your face is well-lit and centered</li>
                  <li>Remove glasses if possible</li>
                  <li>Sit still and look directly at each dot</li>
                  <li>Click on each dot when it appears</li>
                </>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Calibration
          </Button>
          {canProceed && (
            <Button onClick={handleContinue}>
              {result.quality === 'poor' ? 'Proceed Anyway' : 'Continue to Test'}
            </Button>
          )}
        </div>

        {result.quality === 'poor' && blockOnPoor && (
          <p className="text-sm text-destructive">
            Calibration quality is too low to proceed. Please retry.
          </p>
        )}
      </div>
    );
  }

  // ─── Between dots / transition state ────────────────

  return (
    <div className="fixed inset-0 z-50 flex cursor-none items-center justify-center bg-background">
      <div className="h-3 w-3 rounded-full bg-muted-foreground/40" />
    </div>
  );
}
