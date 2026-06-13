'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CalibrationPoint } from '../../types';
import type { CollectedSample } from '../../lib/calibration-samples';
import {
  STABLE_VELOCITY_NORM_PER_SEC,
} from '../../lib/calibration-engine-constants';
import { AOI_X_BOUNDS, AOI_Y_BOUNDS } from '../../lib/constants';
import { calibrationLogger } from '../../lib/debug-config';
import { readingAnchorPointIndex } from '../../lib/reading-anchor-constants';
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
    roll: number;
    headX: number;
    headY: number;
    headZ: number;
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

function interpolateLaggedPoint(buffer: PursuitDotPoint[], targetTs: number): PursuitDotPoint | null {
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
  const bounds = useMemo(
    () => aoiBounds ?? { x: AOI_X_BOUNDS, y: AOI_Y_BOUNDS },
    [aoiBounds],
  );
  const lineYs = useMemo(() => {
    const span = bounds.y.max - bounds.y.min;
    return Array.from({ length: LINE_COUNT }, (_, i) => bounds.y.min + (i * span) / (LINE_COUNT - 1));
  }, [bounds]);
  const validationTargets = useMemo(
    () =>
      lineYs.map((y, index) => ({
        x: 0.5,
        y,
        phase: 'READING_VALIDATION' as const,
        label: `reading-line-${index + 1}`,
      })),
    [lineYs],
  );

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
        const pointIndex = readingAnchorPointIndex(lineIndex, gridPointCount);

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
              roll: iris.roll ?? 0,
              headX: iris.headX ?? 0,
              headY: iris.headY ?? 0,
              headZ: iris.headZ ?? 0.65,
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
              roll: headPose.roll,
              headX: headPose.headX,
              headY: headPose.headY,
              headZ: headPose.headZ,
              sampleWeight: PURSUIT_SAMPLE_WEIGHT,
              phase: 'READING_ANCHOR',
            });
            sampleCountsRef.current[lineIndex] += 1;
          }

          prevObservedRef.current = observed;
        }
      }

      if (progress >= 1) {
        calibrationLogger.debug('[PURSUIT LINE DONE]', {
          lineIndex,
          pointIndex: readingAnchorPointIndex(lineIndex, gridPointCount),
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
            pointIndex: readingAnchorPointIndex(idx, gridPointCount),
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
  }, [bounds.x.min, bounds.y.min, gridPointCount, lineIndex, lineYs, onComplete, stage, validationTargets]);

  const overallProgress =
    stage === 'instruction'
      ? 0
      : Math.min(1, ((stage === 'line-pause' ? lineIndex + 1 : lineIndex + lineProgress) / LINE_COUNT));

  return (
    <div className="fixed inset-0 z-50 cursor-none overflow-hidden bg-[#FDF8F0]">
      <div className="absolute inset-x-0 top-10 flex justify-center px-4">
        <div className="rounded-xl border border-[#E8E0D4] bg-white/90 px-5 py-3 text-center shadow-sm">
          <p className="text-sm font-medium text-[#2D2A26]">
            Follow the dot with your eyes as it moves across the screen
          </p>
          {stage === 'instruction' ? (
            <p className="mt-1 text-xs text-[#8B857E]">Starting shortly…</p>
          ) : (
            <p className="mt-1 text-xs text-[#8B857E]">Line {Math.min(lineIndex + 1, LINE_COUNT)} of {LINE_COUNT}</p>
          )}
        </div>
      </div>

      {dotPos && stage === 'sweeping' && (
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[#2D2A26] shadow-[0_0_0_6px_rgba(45,42,38,0.12)]"
          style={{
            left: `${dotPos.x * 100}%`,
            top: `${dotPos.y * 100}%`,
          }}
        />
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-12 items-center justify-center px-6">
        <div className="w-[min(520px,90vw)]">
          <div className="h-1 overflow-hidden rounded-full bg-[#E8E0D4]/80">
            <div
              className="h-full rounded-full bg-[#2D2A26] transition-[width] duration-150"
              style={{ width: `${Math.round(overallProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-16 right-4 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="border-[#E8E0D4] bg-white/70 text-xs text-[#8B857E] backdrop-blur-sm hover:text-[#2D2A26]"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
