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
      className="fixed inset-0 z-50 flex h-[100dvh] w-[100vw] flex-col items-center justify-center overflow-hidden bg-[#e3dcc2] p-6 text-[#1b2021] md:p-12"
      style={{ animation: 'float-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#e3dc95]/40 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-0 w-full max-w-[800px] flex-col border border-[#51513d]/20 bg-[#f3edd7] shadow-[12px_12px_0_rgba(81,81,61,.14)] md:max-w-4xl">
        <div className="flex flex-col gap-6 p-6 md:p-10 min-h-0">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            {hasEnoughData ? (
              <div className="mb-4 flex h-14 w-14 items-center justify-center bg-[#a6a867] text-[#1b2021]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
            ) : (
              <div className="mb-4 flex h-14 w-14 items-center justify-center bg-[#e3dc95] text-[#1b2021]">
                <AlertTriangle className="h-7 w-7" />
              </div>
            )}

            <h2 className="text-3xl font-black tracking-tight md:text-5xl">
              {hasEnoughData ? 'Wonderful reading!' : 'We had a little trouble seeing you.'}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#1b2021]/70 md:text-base">
              {hasEnoughData
                ? "We've successfully captured a clear picture of your eye movements."
                : 'You can submit this attempt, or try reading the paragraph once more for better results.'}
            </p>
          </div>

          {/* Reading Paragraph Display - Responsive Scaling */}
          {readingContent && (
            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center border border-[#51513d]/18 bg-[#e3dcc2]/60 p-6 shadow-inner">
              <p
                className="text-center font-medium leading-relaxed text-[#1b2021]"
                style={{ fontSize: 'clamp(0.875rem, 1.5vh + 0.5vw, 1.75rem)' }}
              >
                {readingContent}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="mt-4 flex flex-col items-stretch gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onRetake}
              className="flex flex-1 items-center justify-center gap-2 border border-[#51513d]/25 bg-[#e3dcc2] px-6 py-4 text-sm font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10 active:translate-y-px active:shadow-none"
            >
              <RotateCcw className="h-4 w-4" />
              Read Again
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex flex-1 items-center justify-center gap-2 bg-[#51513d] px-6 py-4 text-sm font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021] active:translate-y-px active:shadow-none"
            >
              {isLastTask ? 'Submit for Analysis' : 'Next Task'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Eye Tracking Visualization Toggle */}
          {rawGazeData.length > 1 && readingContent && (
            <button
              type="button"
              onClick={handleOpenGaze}
              className="mx-auto mt-2 flex items-center gap-2 text-xs font-black tracking-widest text-[#51513d]/70 uppercase transition-colors hover:text-[#51513d]"
            >
              <Eye className="h-4 w-4" />
              Eye Tracking Visualization
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
