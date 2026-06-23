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

  // Stabilize to avoid re-renders on every parent render
  const rawGazeData = useMemo(() => rawGazeDataProp ?? [], [rawGazeDataProp]);

  // ── Reading Metrics (Phase 1) ──
  const coreMetrics = useMemo(() => {
    if (!readingContent || rawGazeData.length < 2) return null;

    const wordCount = readingContent.trim().split(/\s+/).length;
    const totalMs = rawGazeData[rawGazeData.length - 1].timestamp - rawGazeData[0].timestamp;
    const totalSeconds = totalMs / 1000;
    const wpm = totalSeconds > 0 ? Math.round(wordCount / (totalSeconds / 60)) : 0;

    return {
      wordCount,
      totalSeconds: Math.round(totalSeconds),
      wpm,
    };
  }, [readingContent, rawGazeData]);

  // ── Advanced Metrics (Phases 2 & 3) ──
  const advancedMetrics = useMemo(() => {
    if (rawGazeData.length < 2) return null;

    // Phase 2: Focus Time (Average Fixation Duration via simplified I-DT)
    const FIXATION_RADIUS = 50; // pixels
    const MIN_FIXATION_MS = 100; // milliseconds

    const fixations: { duration: number; x: number; y: number }[] = [];
    let windowStart = 0;

    while (windowStart < rawGazeData.length) {
      let windowEnd = windowStart;
      let minX = rawGazeData[windowStart].x;
      let maxX = rawGazeData[windowStart].x;
      let minY = rawGazeData[windowStart].y;
      let maxY = rawGazeData[windowStart].y;

      while (windowEnd + 1 < rawGazeData.length) {
        const nextPt = rawGazeData[windowEnd + 1];
        const newMinX = Math.min(minX, nextPt.x);
        const newMaxX = Math.max(maxX, nextPt.x);
        const newMinY = Math.min(minY, nextPt.y);
        const newMaxY = Math.max(maxY, nextPt.y);

        const dispersion = newMaxX - newMinX + (newMaxY - newMinY);
        if (dispersion <= FIXATION_RADIUS * 2) {
          minX = newMinX;
          maxX = newMaxX;
          minY = newMinY;
          maxY = newMaxY;
          windowEnd++;
        } else {
          break;
        }
      }

      const duration = rawGazeData[windowEnd].timestamp - rawGazeData[windowStart].timestamp;
      if (duration >= MIN_FIXATION_MS) {
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        fixations.push({ duration, x: centerX, y: centerY });
      }

      windowStart = windowEnd + 1;
    }

    const avgFocus =
      fixations.length > 0
        ? Math.round(fixations.reduce((sum, f) => sum + f.duration, 0) / fixations.length)
        : 0;

    // Phase 3: Re-reads (Regressions)
    let reReads = 0;
    const REGRESSION_X_THRESHOLD = 80;
    const NEW_LINE_Y_THRESHOLD = 40;

    let currentLineY = fixations[0]?.y ?? 0;

    for (let i = 1; i < fixations.length; i++) {
      const fix = fixations[i];
      const prevFix = fixations[i - 1];

      // New line detection (moving down)
      if (fix.y > currentLineY + NEW_LINE_Y_THRESHOLD) {
        currentLineY = fix.y;
        continue;
      }

      // Regression detection: jumped significantly left from the previous fixation
      if (prevFix.x - fix.x > REGRESSION_X_THRESHOLD) {
        // Did not jump up a line
        if (Math.abs(fix.y - currentLineY) < NEW_LINE_Y_THRESHOLD) {
          reReads++;
        }
      }
    }

    return {
      avgFocus,
      reReads,
      fixations,
    };
  }, [rawGazeData]);

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
      className="fixed inset-0 z-50 flex h-dvh w-screen flex-col items-center justify-center overflow-hidden bg-[#e3dcc2] p-6 text-[#1b2021] md:p-12"
      style={{ animation: 'float-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-[#e3dc95]/40 blur-[100px]" />
      </div>

      <div className="relative z-10 flex max-h-[90dvh] min-h-0 w-full max-w-5xl flex-col border border-[#51513d]/20 bg-[#f3edd7] shadow-[12px_12px_0_rgba(81,81,61,.14)]">
        {/* Header - Fixed at top */}
        <div className="flex shrink-0 flex-col items-center border-b border-[#51513d]/18 bg-[#e3dcc2]/40 p-6 text-center md:p-8">
          {hasEnoughData ? (
            <div className="mb-4 flex h-12 w-12 items-center justify-center bg-[#a6a867] text-[#1b2021]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          ) : (
            <div className="mb-4 flex h-12 w-12 items-center justify-center bg-[#e3dc95] text-[#1b2021]">
              <AlertTriangle className="h-6 w-6" />
            </div>
          )}

          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            {hasEnoughData ? 'Wonderful reading!' : 'We had a little trouble seeing you.'}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#1b2021]/70">
            {hasEnoughData
              ? "We've successfully captured a clear picture of your eye movements."
              : 'You can submit this attempt, or try reading the paragraph once more for better results.'}
          </p>
        </div>

        {/* 2-Column Split Content - Scrollable if needed */}
        <div className="flex min-h-0 flex-col overflow-y-auto md:flex-row">
          {/* Left Side: Stats Grid */}
          <div className="flex-1 border-b border-[#51513d]/18 p-6 md:border-r md:border-b-0 md:p-8">
            <h3 className="mb-6 text-center text-xs font-black tracking-widest text-[#51513d] uppercase md:text-left">
              Key Metrics
            </h3>
            {coreMetrics && (
              <div className="mx-auto grid max-w-sm grid-cols-2 gap-px border border-[#51513d]/18 bg-[#51513d]/18 shadow-sm">
                <div className="flex flex-col items-center justify-center bg-[#f3edd7] p-5 text-center transition-colors hover:bg-[#e3dcc2]/50">
                  <p className="max-w-full text-[9px] font-black tracking-widest wrap-break-word text-[#51513d] uppercase sm:text-[10px]">
                    Reading Speed
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1b2021] sm:text-3xl">
                    {coreMetrics.wpm}{' '}
                    <span className="text-[10px] font-bold text-[#51513d]/60">WPM</span>
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center bg-[#f3edd7] p-5 text-center transition-colors hover:bg-[#e3dcc2]/50">
                  <p className="max-w-full text-[9px] font-black tracking-widest wrap-break-word text-[#51513d] uppercase sm:text-[10px]">
                    Focus Time
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1b2021] sm:text-3xl">
                    {advancedMetrics?.avgFocus ?? 0}{' '}
                    <span className="text-[10px] font-bold text-[#51513d]/60">MS</span>
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center bg-[#f3edd7] p-5 text-center transition-colors hover:bg-[#e3dcc2]/50">
                  <p className="max-w-full text-[9px] font-black tracking-widest wrap-break-word text-[#51513d] uppercase sm:text-[10px]">
                    Re-reads
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1b2021] sm:text-3xl">
                    {advancedMetrics?.reReads ?? 0}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center bg-[#f3edd7] p-5 text-center transition-colors hover:bg-[#e3dcc2]/50">
                  <p className="max-w-full text-[9px] font-black tracking-widest wrap-break-word text-[#51513d] uppercase sm:text-[10px]">
                    Total Time
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1b2021] sm:text-3xl">
                    {coreMetrics.totalSeconds}{' '}
                    <span className="text-[10px] font-bold text-[#51513d]/60">SEC</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Insights */}
          <div className="flex-1 bg-[#e3dcc2]/30 p-6 shadow-inner md:p-8">
            <h3 className="mb-6 text-center text-xs font-black tracking-widest text-[#51513d] uppercase md:text-left">
              Your Reading Insights
            </h3>
            {coreMetrics && advancedMetrics && (
              <div className="flex flex-col gap-5 text-sm leading-relaxed font-medium text-[#1b2021] md:text-[15px]">
                <p>
                  {coreMetrics.wpm > 200 ? (
                    <>You blazed through the text at a fast </>
                  ) : coreMetrics.wpm > 120 ? (
                    <>You read at a steady, conversational pace of </>
                  ) : (
                    <>You took your time, reading at a careful pace of </>
                  )}
                  <strong className="font-black text-[#51513d]">
                    {coreMetrics.wpm} words per minute
                  </strong>
                  , completing the entire passage in just{' '}
                  <strong className="font-black text-[#51513d]">
                    {coreMetrics.totalSeconds} seconds
                  </strong>
                  .
                </p>
                <p>
                  {advancedMetrics.avgFocus < 200 ? (
                    <>Your eyes scanned quickly, spending only </>
                  ) : advancedMetrics.avgFocus < 300 ? (
                    <>You maintained a very typical and healthy rhythm, spending </>
                  ) : (
                    <>You were deeply processing the words, spending </>
                  )}
                  <strong className="font-black text-[#51513d]">
                    {advancedMetrics.avgFocus}ms
                  </strong>{' '}
                  on average focusing on each point.
                </p>
                <p>
                  {advancedMetrics.reReads === 0 ? (
                    <>
                      Incredibly, you did not jump backward to re-read at all! You maintained{' '}
                      <strong className="font-black text-[#51513d]">
                        perfect forward momentum
                      </strong>
                      .
                    </>
                  ) : advancedMetrics.reReads <= 3 ? (
                    <>
                      You only had to backtrack and re-read{' '}
                      <strong className="font-black text-[#51513d]">
                        {advancedMetrics.reReads} time{advancedMetrics.reReads > 1 ? 's' : ''}
                      </strong>
                      , showing very strong comprehension.
                    </>
                  ) : (
                    <>
                      We noticed you naturally jumped back to re-read{' '}
                      <strong className="font-black text-[#51513d]">
                        {advancedMetrics.reReads} times
                      </strong>
                      , which is a great strategy for double-checking meaning.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer Area */}
        <div className="flex shrink-0 flex-col gap-4 border-t border-[#51513d]/10 bg-[#f3edd7] p-4 md:px-10 md:py-6">
          {/* Controls */}
          <div className="flex flex-col items-stretch gap-4 sm:flex-row">
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
              onClick={() => {}}
              className="flex flex-1 items-center justify-center gap-2 border-2 border-[#1b2021] bg-[#a6a867] px-6 py-4 text-sm font-black text-[#1b2021] uppercase shadow-[4px_4px_0_0_#1b2021] transition-colors hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1b2021]"
            >
              <Eye className="h-4 w-4" />
              See my child vision
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
              className="mx-auto flex items-center gap-2 text-xs font-black tracking-widest text-[#51513d]/70 uppercase transition-colors hover:text-[#51513d]"
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
