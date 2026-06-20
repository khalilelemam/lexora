'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  Eye,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { LexoraLogo } from '@/components/shared/lexora-logo';
import { cn } from '@/lib/utils';
import { TASK_LABELS } from '../lib/test-content';
import { MIN_GAZE_POINTS } from '../lib/constants';
import { TaskDisplay } from './task-display';
import type { WebcamGazePoint } from '../types';

interface ReviewPanelProps {
  taskType: string;
  pointCount: number;
  isLastTask: boolean;
  onRetake: () => void;
  onContinue: () => void;
  /** The reading content that was shown during the task */
  readingContent?: string;
  /** Raw gaze data collected during the reading task (screen-pixel coords) */
  rawGazeData?: WebcamGazePoint[];
}

const TRAIL_LENGTH = 30;
const REPLAY_SPEED = 4;

/**
 * Post-task review screen.
 *
 * Default view: centered status card with data quality info.
 * "View Gaze Trail" button: expands to fullscreen TaskDisplay (preview mode)
 * with raw gaze trail replaying over the text.
 */
export function ReviewPanel({
  taskType,
  pointCount,
  isLastTask,
  onRetake,
  onContinue,
  readingContent,
  rawGazeData: rawGazeDataProp,
}: ReviewPanelProps) {
  const hasEnoughData = pointCount >= MIN_GAZE_POINTS;
  const label = TASK_LABELS[taskType] ?? taskType;

  // Stabilize to avoid re-renders on every parent render
  const rawGazeData = useMemo(() => rawGazeDataProp ?? [], [rawGazeDataProp]);

  // ── Gaze preview state ──
  const [showGazePreview, setShowGazePreview] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rafRef = useRef(0);
  const startTimeRef = useRef(0);
  const baseIndexRef = useRef(0);

  const trail = useMemo(() => {
    if (currentIndex <= 0) return [];
    const start = Math.max(0, currentIndex - TRAIL_LENGTH);
    return rawGazeData.slice(start, currentIndex + 1);
  }, [rawGazeData, currentIndex]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || rawGazeData.length < 2) return;

    const baseIdx = baseIndexRef.current;
    const baseTs = rawGazeData[baseIdx]?.timestamp ?? rawGazeData[0].timestamp;
    startTimeRef.current = performance.now();

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) * REPLAY_SPEED;
      const targetTs = baseTs + elapsed;

      let idx = baseIdx;
      while (idx < rawGazeData.length - 1 && rawGazeData[idx + 1].timestamp <= targetTs) {
        idx++;
      }

      if (idx >= rawGazeData.length - 1) {
        setCurrentIndex(rawGazeData.length - 1);
        setIsPlaying(false);
        return;
      }

      setCurrentIndex(idx);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, rawGazeData]);

  const handleOpenGaze = useCallback(() => {
    setShowGazePreview(true);
    setCurrentIndex(0);
    baseIndexRef.current = 0;
    setIsPlaying(true);
  }, []);

  const handleCloseGaze = useCallback(() => {
    setShowGazePreview(false);
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (currentIndex >= rawGazeData.length - 1) {
      setCurrentIndex(0);
      baseIndexRef.current = 0;
      setIsPlaying(true);
    } else if (isPlaying) {
      setIsPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      baseIndexRef.current = currentIndex;
      setIsPlaying(true);
    }
  }, [currentIndex, rawGazeData.length, isPlaying]);

  const progress =
    rawGazeData.length > 1 ? Math.round((currentIndex / (rawGazeData.length - 1)) * 100) : 0;

  // ═══════════════════════════════════════════════════════
  //  FULLSCREEN GAZE PREVIEW
  // ═══════════════════════════════════════════════════════
  if (showGazePreview && readingContent) {
    return (
      <div className="fixed inset-0 z-50">
        <TaskDisplay
          taskType={taskType}
          content={readingContent}
          pointCount={pointCount}
          isCollecting={false}
          onDone={() => {}}
          preview={true}
        />

        {/* Raw gaze trail dots */}
        {trail.map((point, idx) => {
          const age = trail.length - idx;
          const opacity = Math.max(0.1, 1 - (age / TRAIL_LENGTH) * 0.9);
          const isLatest = idx === trail.length - 1;
          const size = isLatest ? 14 : 5;

          return (
            <div
              key={`${point.timestamp}-${idx}`}
              className="pointer-events-none fixed"
              style={{
                left: `${point.x}px`,
                top: `${point.y}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 60,
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: isLatest ? 'rgba(239, 68, 68, 0.85)' : 'rgba(239, 68, 68, 0.5)',
                  opacity,
                  boxShadow: isLatest ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none',
                }}
              />
            </div>
          );
        })}

        {/* Bottom controls */}
        <div className="fixed bottom-4 left-1/2 z-70 flex -translate-x-1/2 items-center gap-4 border border-[#51513d]/18 bg-[#f3edd7]/90 px-5 py-2.5 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={handlePlayPause}
            className="text-[#51513d] hover:text-[#1b2021]"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <div className="h-1.5 w-32 overflow-hidden bg-[#51513d]/18">
            <div
              className="h-full bg-[#51513d] transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-8 text-[11px] text-[#1b2021] tabular-nums">{progress}%</span>
          <div className="h-4 w-px bg-[#51513d]" />
          <button
            type="button"
            onClick={handleCloseGaze}
            className="text-[#1b2021] hover:text-[#1b2021]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  DEFAULT VIEW — Status card
  // ═══════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#e3dcc2]/90 backdrop-blur-sm"
      style={{ animation: 'float-up 0.4s ease-out' }}
    >
      <div className="w-[min(420px,90vw)] border border-[#51513d]/18 bg-[#f3edd7] shadow-[10px_10px_0_rgba(81,81,61,.08)]">
        <div className="border-b border-[#51513d]/18 p-5">
          <LexoraLogo size="sm" />
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Status */}
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center border',
                hasEnoughData
                  ? 'border-[#a6a867] bg-[#a6a867]/15'
                  : 'border-[#e3dc95] bg-[#e3dc95]/25',
              )}
            >
              {hasEnoughData ? (
                <CheckCircle2 className="h-6 w-6 text-[#51513d]" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-[#8b6f25]" />
              )}
            </div>
            <div className="flex flex-col gap-0.5 pt-0.5">
              <h2 className="text-xl font-black tracking-tight text-[#1b2021]">
                {hasEnoughData ? 'Task Complete' : 'Task Finished'}
              </h2>
              <p className="text-xs font-black tracking-[0.15em] text-[#51513d] uppercase">
                {label}
              </p>
            </div>
          </div>

          {/* Data quality */}
          <div
            className={cn(
              'border p-4 text-sm leading-relaxed',
              hasEnoughData
                ? 'border-[#51513d]/12 bg-[#e3dcc2]/60 text-[#1b2021]'
                : 'border-[#e3dc95] bg-[#e3dc95]/25 text-[#1b2021]',
            )}
          >
            {hasEnoughData ? (
              <p>
                <span className="font-black text-[#51513d]">{pointCount}</span> gaze points captured
                successfully.
              </p>
            ) : (
              <p>
                Only <span className="font-black text-[#8b6f25]">{pointCount}</span> points
                captured. Consider retaking.
              </p>
            )}
          </div>

          {/* View Gaze button */}
          {rawGazeData.length > 1 && readingContent && (
            <button
              type="button"
              onClick={handleOpenGaze}
              className="flex items-center gap-3 border border-[#51513d]/20 bg-[#e3dc95]/30 p-3.5 text-sm text-[#51513d] transition-colors hover:bg-[#e3dc95]/60"
            >
              <Eye className="h-5 w-5" />
              <span className="font-black">View Gaze Trail</span>
              <span className="ml-auto text-xs text-[#1b2021]/60">Fullscreen replay</span>
            </button>
          )}

          {/* Actions */}
          <div className="mt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex w-full items-center justify-center bg-[#51513d] px-5 py-3.5 text-sm font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
            >
              {isLastTask ? 'Submit for Analysis' : 'Next Task'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onRetake}
              className="inline-flex w-full items-center justify-center border border-[#51513d]/25 bg-[#e3dcc2] px-5 py-3.5 text-sm font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
