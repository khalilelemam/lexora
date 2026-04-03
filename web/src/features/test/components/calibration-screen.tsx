'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Target, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  CalibrationResult,
  CalibrationQuality,
  CalibrationDiagnostics,
  HeadPoseSample,
  ValidationPointResult,
  ModelDiagnostic,
  HeadPoseDrift,
} from '../types';
import { useCalibration } from '../hooks';
import { CALIBRATION_DOT_DURATION, CALIBRATION_POINTS } from '../lib/constants';
import { DEBUG_GAZE_OVERLAY } from '../lib/debug-config';
import { evaluateModelsOnValidation } from '../lib/calibration-models';

// ─── Types ───────────────────────────────────────────────

interface CalibrationScreenProps {
  mode: 'tobii' | 'webcam';
  /** For Tobii: called to get gaze data for each calibration point */
  onGetGazeSample?: () => { x: number; y: number } | null;
  /** For webcam: called to get iris position for each calibration point */
  onGetIrisSample?: () => { x: number; y: number } | null;
  /** For webcam: called to get head pose for diagnostics */
  onGetHeadPoseSample?: () => { yaw: number; pitch: number } | null;
  /** Called when calibration is complete */
  onComplete: (result: CalibrationResult, mapping?: { predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number } }) => void;
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
/** Strict per-point validation threshold for targeted recalibration */
const STRICT_POINT_ERROR_THRESHOLD_PX = 120;

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
    currentPointIndex,
    currentPoint,
    totalPoints,
    collectionStep,
    collectionTotal,
    result,
    dotDuration,
    startCalibration,
    startTargetedRecalibration,
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

  // ─── Diagnostics state ──────────────────────────────
  const headPoseSamplesRef = useRef<HeadPoseSample[]>([]);
  const mappingRef = useRef<{ predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number } } | null>(null);
  const allModelsRef = useRef<any[]>([]);  // Store all three models for post-validation re-evaluation
  const diagnosticsRef = useRef<CalibrationDiagnostics | null>(null);
  const modelDiagnosticsRef = useRef<ModelDiagnostic[] | null>(null);
  const headPoseDriftRef = useRef<HeadPoseDrift | null>(null);
  const [failedPointIndices, setFailedPointIndices] = useState<number[]>([]);

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
    if (phase !== 'collecting' && phase !== 'recalibrating') return;

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
          if (sample) {
            const pose = onGetHeadPoseSample?.() ?? { yaw: 0, pitch: 0 };
            addSample(sample.x, sample.y, pose.yaw, pose.pitch);
          }
        }
        // Collect head pose for diagnostics
        if (mode === 'webcam' && onGetHeadPoseSample) {
          const pose = onGetHeadPoseSample();
          if (pose) headPoseSamplesRef.current.push(pose);
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
  }, [phase, currentPointIndex, mode, onGetGazeSample, onGetIrisSample, onGetHeadPoseSample, addSample, advancePoint, dotDuration, currentPoint]);

  // ─── Compute results when validation phase starts ───

  useEffect(() => {
    if (phase !== 'validating') return;

    if (mode === 'tobii') {
      const calibResult = computeTobiiCalibration();
      void calibResult;
    } else {
      const {
        result: calibResult,
        mapping,
        diagnostics,
        modelDiagnostics,
        allModels,
        flaggedPoints
      } = computeWebcamCalibration(
        window.screen.width,
        window.screen.height,
        headPoseSamplesRef.current,
      );

      mappingRef.current = mapping;
      diagnosticsRef.current = diagnostics;
      modelDiagnosticsRef.current = modelDiagnostics;
      allModelsRef.current = allModels ?? [];

      if (flaggedPoints.length > 0) {
        setFailedPointIndices(flaggedPoints);
        startTargetedRecalibration(flaggedPoints);
      } else {
        setFailedPointIndices([]);
      }

      void calibResult;
    }
  }, [phase, mode, computeTobiiCalibration, computeWebcamCalibration, startTargetedRecalibration]);

  // ─── Handle retry ───────────────────────────────────

  const handleRetry = useCallback(() => {
    resetCalibration();
    setCountdown(3);
    setShowCountdown(true);
    setDotVisible(false);
    setIsSampling(false);
    setDotPos({ x: 0.5, y: 0.5 });
    // Reset diagnostics state
    headPoseSamplesRef.current = [];
    mappingRef.current = null;
    allModelsRef.current = [];
    diagnosticsRef.current = null;
    modelDiagnosticsRef.current = null;
    headPoseDriftRef.current = null;
    setFailedPointIndices([]);
  }, [resetCalibration]);

  // ─── Handle continue ───────────────────────────────

  const handleContinue = useCallback(() => {
    if (!result) return;
    if (mode === 'webcam' && mappingRef.current) {
      onComplete(result, mappingRef.current);
    } else {
      onComplete(result);
    }
  }, [result, mode, onComplete]);

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

  if (phase === 'collecting' || phase === 'recalibrating') {
    const isRecalibrating = phase === 'recalibrating';

    return (
      <div className="fixed inset-0 z-50 cursor-none bg-background">
        {/* Progress indicator */}
        <div className="absolute left-4 top-4 text-sm text-muted-foreground">
          {isRecalibrating
            ? `Recalibrating ${collectionStep} of ${collectionTotal} (grid #${currentPointIndex + 1})`
            : `Point ${collectionStep} of ${collectionTotal}`}
        </div>

        {isRecalibrating && failedPointIndices.length > 0 && (
          <div className="absolute right-4 top-4 max-w-md rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">
            Smart targeted recalibration: only high-error points are repeated to reduce fatigue.
          </div>
        )}

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
                if (sample) {
                  const pose = onGetHeadPoseSample?.() ?? { yaw: 0, pitch: 0 };
                  addSample(sample.x, sample.y, pose.yaw, pose.pitch);
                }
              }
            }}
          >
            {/* Outer ring — pulses when sampling */}
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300',
                isSampling
                  ? isRecalibrating
                    ? 'scale-100 bg-orange-500/25'
                    : 'scale-100 bg-primary/20'
                  : isRecalibrating
                    ? 'scale-75 bg-orange-500/15'
                    : 'scale-75 bg-primary/10',
              )}
            >
              {/* Inner dot */}
              <div
                className={cn(
                  'rounded-full transition-all duration-300',
                  isRecalibrating ? 'bg-orange-500' : 'bg-primary',
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
    const isRetrainPass = failedPointIndices.length > 0;
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">
          {isRetrainPass ? 'Re-training and validating updated calibration...' : 'Analyzing calibration...'}
        </p>
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

        {/* ── Diagnostics Panel (debug mode only) ── */}
        {DEBUG_GAZE_OVERLAY && diagnosticsRef.current && (
          <details className="w-full max-w-2xl rounded-md border bg-muted/30 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium">
              🔬 Calibration Diagnostics
            </summary>
            <div className="mt-3 space-y-4 text-xs font-mono">
              {/* Summary metrics */}
              <div>
                <div className="font-sans text-sm font-medium">Summary</div>
                <div>
                  Mean Error: {diagnosticsRef.current.meanErrorPx.toFixed(1)}px
                  ({(diagnosticsRef.current.meanErrorNormalized * 100).toFixed(2)}% normalized)
                </div>
                <div>Median Error: {diagnosticsRef.current.medianErrorPx.toFixed(1)}px</div>
              </div>

              {/* Per-point errors */}
              <div>
                <div className="font-sans text-sm font-medium">Per-Point Errors</div>
                {diagnosticsRef.current.perPointErrors.map((p, i) => (
                  <div key={i}>
                    Point ({p.point.x},{p.point.y}): mean={p.meanError.toFixed(1)}px
                    std={p.stdError.toFixed(1)}px samples={p.sampleCount}
                  </div>
                ))}
              </div>

              {/* Axis correlation */}
              <div>
                <div className="font-sans text-sm font-medium">Axis Correlation</div>
                <div className={diagnosticsRef.current.corrX > 0.85 ? 'text-green-600' : 'text-red-500'}>
                  corr_x = {diagnosticsRef.current.corrX.toFixed(4)}{' '}
                  {diagnosticsRef.current.corrX > 0.85 ? '✅' : '❌'} (threshold: 0.85)
                </div>
                <div className={diagnosticsRef.current.corrY > 0.85 ? 'text-green-600' : 'text-red-500'}>
                  corr_y = {diagnosticsRef.current.corrY.toFixed(4)}{' '}
                  {diagnosticsRef.current.corrY > 0.85 ? '✅' : '❌'} (threshold: 0.85)
                </div>
              </div>

              {/* Screen coverage */}
              <div>
                <div className="font-sans text-sm font-medium">Screen Coverage</div>
                <div>
                  X: {diagnosticsRef.current.coverage.minX.toFixed(0)} →{' '}
                  {diagnosticsRef.current.coverage.maxX.toFixed(0)}{' '}
                  ({(diagnosticsRef.current.coverage.widthCoverage * 100).toFixed(1)}%)
                  {diagnosticsRef.current.coverage.widthCoverage >= 0.3 ? ' ✅' : ' ❌ <30%'}
                </div>
                <div>
                  Y: {diagnosticsRef.current.coverage.minY.toFixed(0)} →{' '}
                  {diagnosticsRef.current.coverage.maxY.toFixed(0)}{' '}
                  ({(diagnosticsRef.current.coverage.heightCoverage * 100).toFixed(1)}%)
                  {diagnosticsRef.current.coverage.heightCoverage >= 0.3 ? ' ✅' : ' ❌ <30%'}
                </div>
              </div>

              {/* Iris range */}
              <div>
                <div className="font-sans text-sm font-medium">Iris Input Range</div>
                <div>
                  X: {diagnosticsRef.current.irisRange.minX.toFixed(4)} →{' '}
                  {diagnosticsRef.current.irisRange.maxX.toFixed(4)}
                </div>
                <div>
                  Y: {diagnosticsRef.current.irisRange.minY.toFixed(4)} →{' '}
                  {diagnosticsRef.current.irisRange.maxY.toFixed(4)}
                </div>
                {(diagnosticsRef.current.irisRange.maxX - diagnosticsRef.current.irisRange.minX < 0.05 ||
                  diagnosticsRef.current.irisRange.maxY - diagnosticsRef.current.irisRange.minY < 0.05) && (
                    <div className="text-yellow-600">
                      ⚠️ Extremely small iris range — polynomial cannot learn screen mapping
                    </div>
                  )}
              </div>

              {/* Head pose */}
              <div>
                <div className="font-sans text-sm font-medium">Head Pose</div>
                <div>
                  Yaw: mean={diagnosticsRef.current.headPose.meanYaw.toFixed(4)}{' '}
                  std={diagnosticsRef.current.headPose.stdYaw.toFixed(4)}
                </div>
                <div>
                  Pitch: mean={diagnosticsRef.current.headPose.meanPitch.toFixed(4)}{' '}
                  std={diagnosticsRef.current.headPose.stdPitch.toFixed(4)}
                </div>
                {(diagnosticsRef.current.headPose.stdYaw > 0.05 ||
                  diagnosticsRef.current.headPose.stdPitch > 0.05) && (
                    <div className="text-yellow-600">
                      ⚠️ High head pose variance — calibration may be inconsistent
                    </div>
                  )}
              </div>

              {/* Heatmap pairs */}
              <div>
                <div className="font-sans text-sm font-medium">Heatmap (Target → Predicted)</div>
                {diagnosticsRef.current.heatmapPairs.map((pair, i) => (
                  <div key={i}>
                    target=({pair.target.x.toFixed(0)},{pair.target.y.toFixed(0)}){' '}
                    pred=({pair.predicted.x.toFixed(0)},{pair.predicted.y.toFixed(0)})
                  </div>
                ))}
              </div>

              {/* Model Comparison */}
              {modelDiagnosticsRef.current && modelDiagnosticsRef.current.length > 0 && (
                <div>
                  <div className="font-sans text-sm font-medium">🏆 Model Comparison</div>
                  {modelDiagnosticsRef.current.map((m, i) => (
                    <div key={i} className={m.isBest ? 'text-green-600 font-bold' : ''}>
                      {m.isBest ? '⭐ ' : '   '}
                      {m.kind}: training={m.trainingErrorPx.toFixed(1)}px
                      {' '}corr_x={m.corrX.toFixed(4)} corr_y={m.corrY.toFixed(4)}
                      {' '}— {m.info}
                    </div>
                  ))}
                  <div className="mt-2 text-muted-foreground">Per-model per-point errors (px):</div>
                  {modelDiagnosticsRef.current.map((m, mi) => (
                    <details key={mi} className="ml-2">
                      <summary className={m.isBest ? 'text-green-600 cursor-pointer' : 'cursor-pointer'}>
                        {m.kind} {m.isBest ? '(selected)' : ''}
                      </summary>
                      {m.perPointErrors.map((p, pi) => (
                        <div key={pi} className="ml-4">
                          ({p.point.x},{p.point.y}): {p.meanError.toFixed(1)}px
                        </div>
                      ))}
                    </details>
                  ))}
                </div>
              )}

              {/* Post-calibration validation results */}
            </div>
          </details>
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
