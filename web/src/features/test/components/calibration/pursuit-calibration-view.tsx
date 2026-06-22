'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalibrationPoint } from '../../types';
import type { CollectedSample } from '../../lib/calibration-samples';
import { STABLE_VELOCITY_NORM_PER_SEC } from '../../lib/calibration-engine-constants';
import { AOI_X_BOUNDS, AOI_Y_BOUNDS } from '../../lib/constants';
import { calibrationLogger } from '../../lib/debug-config';
import type { WebcamCalibrationSample } from '../../hooks/use-calibration-engine';

interface PursuitDotPoint {
  timestamp: number;
  x: number;
  y: number;
}

interface PursuitCalibrationViewProps {
  gridPointCount: number;
  aoiBounds?: {
    x: { min: number; max: number };
    y: { min: number; max: number };
  };
  irisStream: () => WebcamCalibrationSample | null;
  headPoseStream?: () => {
    yaw: number;
    pitch: number;
  } | null;
  onSampleReady: (sample: CollectedSample) => void;
  onComplete: (validationTargets: CalibrationPoint[]) => void;
  onCancel: () => void;
}

type PursuitStage = 'instruction' | 'sweeping' | 'line-pause' | 'complete';

const LINE_COUNT = 5;
const SWEEP_DURATION_MS = 4000;
const LINE_PAUSE_MS = 600;
const INSTRUCTION_MS = 3000;
const SAMPLE_INTERVAL_MS = 33;
const PURSUIT_LAG_MS = 130;
const PURSUIT_SAMPLE_WEIGHT = 0.7;
const PURSUIT_VELOCITY_REJECT_THRESHOLD = STABLE_VELOCITY_NORM_PER_SEC * 2.5;

function pursuitPointIndex(lineIndex: number, gridPointCount: number): number {
  return gridPointCount + lineIndex;
}

function interpolateLaggedPoint(
  buffer: PursuitDotPoint[],
  targetTs: number,
): PursuitDotPoint | null {
  if (buffer.length < 2) return null;
  if (buffer[0].timestamp > targetTs) return null;

  for (let i = 1; i < buffer.length; i += 1) {
    const prev = buffer[i - 1];
    const curr = buffer[i];
    if (targetTs > curr.timestamp) continue;

    const dt = curr.timestamp - prev.timestamp;
    if (dt <= 0) return prev;

    const ratio = (targetTs - prev.timestamp) / dt;
    return {
      timestamp: targetTs,
      x: prev.x + (curr.x - prev.x) * ratio,
      y: prev.y + (curr.y - prev.y) * ratio,
    };
  }

  return buffer[buffer.length - 1] ?? null;
}

export function PursuitCalibrationView({
  gridPointCount,
  aoiBounds,
  irisStream,
  headPoseStream,
  onSampleReady,
  onComplete,
  onCancel,
}: PursuitCalibrationViewProps) {
  const bounds = useMemo(() => aoiBounds ?? { x: AOI_X_BOUNDS, y: AOI_Y_BOUNDS }, [aoiBounds]);
  const lineYs = useMemo(() => {
    const span = bounds.y.max - bounds.y.min;
    return Array.from(
      { length: LINE_COUNT },
      (_, i) => bounds.y.min + (i * span) / (LINE_COUNT - 1),
    );
  }, [bounds]);
  const validationTargets = useMemo(() => {
    // Distribute X coordinates across the AOI to avoid all points
    // collapsing into a single vertical line at x: 0.5.
    const xSpan = bounds.x.max - bounds.x.min;
    const xPositions = lineYs.map((_, i) => {
      // Spread evenly across the AOI X range
      if (lineYs.length <= 1) return 0.5;
      return bounds.x.min + (i * xSpan) / (lineYs.length - 1);
    });

    return lineYs.map((y, index) => ({
      x: xPositions[index],
      y,
      phase: 'PURSUIT_VALIDATION' as const,
      label: `pursuit-line-${index + 1}`,
    }));
  }, [lineYs, bounds]);

  const [stage, setStage] = useState<PursuitStage>('instruction');
  const [lineIndex, setLineIndex] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [dotPos, setDotPos] = useState<{ x: number; y: number } | null>(null);

  const sampleCountsRef = useRef<number[]>(Array.from({ length: LINE_COUNT }, () => 0));
  const lagBufferRef = useRef<PursuitDotPoint[]>([]);
  const prevObservedRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const sweepStartTsRef = useRef<number | null>(null);
  const lastSampleTsRef = useRef(0);
  const debugSampleCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const pointIndex = pursuitPointIndex(lineIndex, gridPointCount);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStage('sweeping');
      setLineIndex(0);
      setLineProgress(0);
      setDotPos({ x: bounds.x.min, y: lineYs[0] ?? bounds.y.min });
      lagBufferRef.current = [];
      prevObservedRef.current = null;
      sweepStartTsRef.current = null;
      lastSampleTsRef.current = 0;
      debugSampleCountRef.current = 0;
    }, INSTRUCTION_MS);

    return () => window.clearTimeout(timer);
  }, [bounds.x.min, bounds.y.min, lineYs]);

  useEffect(() => {
    if (stage !== 'sweeping') return;

    const tick = (now: number) => {
      if (sweepStartTsRef.current == null) {
        sweepStartTsRef.current = now;
      }

      const elapsed = now - sweepStartTsRef.current;
      const progress = Math.min(1, elapsed / SWEEP_DURATION_MS);
      const y = lineYs[lineIndex] ?? bounds.y.min;
      const x = bounds.x.min + (bounds.x.max - bounds.x.min) * progress;

      setLineProgress(progress);
      setDotPos({ x, y });

      lagBufferRef.current.push({ timestamp: now, x, y });
      lagBufferRef.current = lagBufferRef.current.filter((entry) => now - entry.timestamp <= 800);

      const shouldTrySample = now - lastSampleTsRef.current >= SAMPLE_INTERVAL_MS;
      if (shouldTrySample) {
        lastSampleTsRef.current = now;

        const lagged = interpolateLaggedPoint(lagBufferRef.current, now - PURSUIT_LAG_MS);
        const iris = irisStream();
        if (lagged && iris) {
          const observed = { x: iris.x, y: iris.y, timestamp: now };
          const prevObserved = prevObservedRef.current;
          let rejectByVelocity = false;

          if (prevObserved) {
            const dt = Math.max(1, observed.timestamp - prevObserved.timestamp);
            const distance = Math.hypot(observed.x - prevObserved.x, observed.y - prevObserved.y);
            const velocityNormPerSecond = distance / (dt / 1000);
            rejectByVelocity = velocityNormPerSecond > PURSUIT_VELOCITY_REJECT_THRESHOLD;
          }

          if (rejectByVelocity) {
            calibrationLogger.debug('[PURSUIT REJECT] reason: velocity', {
              lineIndex,
              pointIndex,
            });
          } else {
            const headPose = headPoseStream?.() ?? {
              yaw: 0,
              pitch: 0,
            };

            if (lineIndex === 0 && debugSampleCountRef.current < 5) {
              const screenW = window.innerWidth;
              const currentDotX = lagBufferRef.current[lagBufferRef.current.length - 1]?.x ?? 0;
              calibrationLogger.debug('[PURSUIT LAG DEBUG]', {
                dotNow_x: currentDotX.toFixed(4),
                dotLagged_x: lagged.x.toFixed(4),
                xDiffPx: ((currentDotX - lagged.x) * screenW).toFixed(1),
                iris_relIx: iris.x.toFixed(4),
                iris_relIy: iris.y.toFixed(4),
              });
              debugSampleCountRef.current++;
            }

            onSampleReady({
              pointIndex,
              observedX: observed.x,
              observedY: observed.y,
              targetX: lagged.x,
              targetY: lagged.y,
              yaw: headPose.yaw,
              pitch: headPose.pitch,
              sampleWeight: PURSUIT_SAMPLE_WEIGHT,
              phase: 'PURSUIT_SAMPLE',
            });
            sampleCountsRef.current[lineIndex] += 1;
          }

          prevObservedRef.current = observed;
        }
      }

      if (progress >= 1) {
        calibrationLogger.debug('[PURSUIT LINE DONE]', {
          lineIndex,
          pointIndex,
          samples: sampleCountsRef.current[lineIndex] ?? 0,
        });
        setStage('line-pause');
        setDotPos(null);
        setLineProgress(1);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [
    bounds.x.max,
    bounds.x.min,
    bounds.y.min,
    headPoseStream,
    gridPointCount,
    pointIndex,
    irisStream,
    lineIndex,
    lineYs,
    onSampleReady,
    stage,
  ]);

  useEffect(() => {
    if (stage !== 'line-pause') return;

    const timer = window.setTimeout(() => {
      const nextLine = lineIndex + 1;
      if (nextLine >= LINE_COUNT) {
        setStage('complete');
        calibrationLogger.debug('[PURSUIT COMPLETE]', {
          sampleCountsByLine: sampleCountsRef.current.map((samples, idx) => ({
            lineIndex: idx,
            pointIndex: pursuitPointIndex(idx, gridPointCount),
            samples,
          })),
        });
        onComplete(validationTargets);
        return;
      }

      setLineIndex(nextLine);
      setLineProgress(0);
      setStage('sweeping');
      setDotPos({ x: bounds.x.min, y: lineYs[nextLine] ?? bounds.y.min });
      lagBufferRef.current = [];
      prevObservedRef.current = null;
      sweepStartTsRef.current = null;
      lastSampleTsRef.current = 0;
    }, LINE_PAUSE_MS);

    return () => window.clearTimeout(timer);
  }, [
    bounds.x.min,
    bounds.y.min,
    gridPointCount,
    lineIndex,
    pointIndex,
    lineYs,
    onComplete,
    stage,
    validationTargets,
  ]);

  const overallProgress =
    stage === 'instruction'
      ? 0
      : Math.min(
          1,
          (stage === 'line-pause' ? lineIndex + 1 : lineIndex + lineProgress) / LINE_COUNT,
        );

  return (
    <div className="fixed inset-0 z-50 cursor-none overflow-hidden bg-[#e3dcc2]">
      <div 
        className={cn(
          "absolute inset-x-0 top-6 flex justify-center px-4 z-40 transition-opacity duration-500",
          stage === 'instruction' ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="border-2 border-[#1b2021] bg-[#e3dcc2] px-6 py-4 text-center shadow-[4px_4px_0_0_#1b2021] max-w-lg w-full">
          <p className="text-sm sm:text-base font-black uppercase tracking-tight text-[#1b2021]">
            Follow the dot with your eyes as it moves across the screen
          </p>
          <p className="mt-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#51513d]">
            Starting shortly…
          </p>
        </div>
      </div>

      {dotPos && stage === 'sweeping' && (
        <div
          className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-2 border-[#1b2021] bg-[#a6a867] shadow-[4px_4px_0_0_rgba(27,32,33,0.3)] transition-[opacity] duration-150"
          style={{
            left: `${dotPos.x * 100}%`,
            top: `${dotPos.y * 100}%`,
          }}
        >
          <div className="h-2 w-2 rounded-full bg-[#1b2021]" />
        </div>
      )}

      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex h-12 items-center justify-center px-6">
        <div className="w-[min(520px,90vw)]">
          <div className="h-4 overflow-hidden rounded-none border-2 border-[#1b2021] bg-[#e3dcc2] shadow-[4px_4px_0_0_#1b2021]">
            <div
              className="h-full border-r-2 border-[#1b2021] bg-[#a6a867] transition-[width] duration-150"
              style={{ width: `${Math.round(overallProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="absolute right-4 bottom-16 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="rounded-none border-2 border-[#1b2021] bg-[#e3dcc2] text-xs font-black uppercase tracking-wider text-[#1b2021] shadow-[4px_4px_0_0_#1b2021] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#1b2021]"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
