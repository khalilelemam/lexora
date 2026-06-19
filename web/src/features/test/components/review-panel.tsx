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
import { groupIntoFixations, type GazeFixation } from '../lib/gaze-processing';
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

const REPLAY_SPEED = 1;

/**
 * Post-task review screen.
 *
 * Default view: Modern Submit Screen.
 * "View Gaze Trail" button: expands to fullscreen TaskDisplay (preview mode)
 * with grouped fixations and smooth interpolation over the text.
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

  // Stabilize raw data and group into fixations
  const rawGazeData = useMemo(() => rawGazeDataProp ?? [], [rawGazeDataProp]);
  const fixations = useMemo(() => groupIntoFixations(rawGazeData), [rawGazeData]);

  // ── Gaze preview state ──
  const [showGazePreview, setShowGazePreview] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Interpolated state for the bubble
  const [bubbleState, setBubbleState] = useState<{ x: number; y: number; size: number } | null>(null);
  const [progress, setProgress] = useState(0);

  const rafRef = useRef(0);
  const startTimeRef = useRef(0);
  const baseElapsedRef = useRef(0);

  const maxDuration = useMemo(() => Math.max(...fixations.map(f => f.durationMs), 1), [fixations]);

  const totalDuration = useMemo(() => {
    if (fixations.length < 2) return 0;
    const first = fixations[0];
    const last = fixations[fixations.length - 1];
    return last.timestamp + last.durationMs - first.timestamp;
  }, [fixations]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || fixations.length < 2) return;

    const firstTs = fixations[0].timestamp;

    const tick = () => {
      const elapsed = baseElapsedRef.current + (performance.now() - startTimeRef.current) * REPLAY_SPEED;
      const targetTs = firstTs + elapsed;

      let currentIdx = 0;
      for (let i = 0; i < fixations.length; i++) {
        if (targetTs >= fixations[i].timestamp) {
          currentIdx = i;
        } else {
          break;
        }
      }

      if (elapsed >= totalDuration || currentIdx >= fixations.length - 1) {
        setIsPlaying(false);
        baseElapsedRef.current = totalDuration;
        setProgress(100);
        
        const last = fixations[fixations.length - 1];
        setBubbleState({ 
          x: last.x, 
          y: last.y, 
          size: 10 + (last.durationMs / maxDuration) * 26 
        });
        return;
      }

      const curr = fixations[currentIdx];
      const next = fixations[currentIdx + 1];

      // Interpolation logic
      const t = Math.max(0, Math.min(1, (targetTs - curr.timestamp) / (next.timestamp - curr.timestamp)));
      
      // Easing (ease-in-out) for smoother bubble glides
      const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const interpX = curr.x + (next.x - curr.x) * easeT;
      const interpY = curr.y + (next.y - curr.y) * easeT;
      const interpDuration = curr.durationMs + (next.durationMs - curr.durationMs) * easeT;
      const size = 10 + (interpDuration / maxDuration) * 26;

      setBubbleState({ x: interpX, y: interpY, size });
      setProgress(Math.round((elapsed / totalDuration) * 100));

      rafRef.current = requestAnimationFrame(tick);
    };

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, fixations, totalDuration, maxDuration]);

  const handleOpenGaze = useCallback(() => {
    setShowGazePreview(true);
    baseElapsedRef.current = 0;
    setProgress(0);
    if (fixations.length > 0) {
      setBubbleState({ x: fixations[0].x, y: fixations[0].y, size: 10 + (fixations[0].durationMs / maxDuration) * 26 });
    }
    setIsPlaying(true);
  }, [fixations, maxDuration]);

  const handleCloseGaze = useCallback(() => {
    setShowGazePreview(false);
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (progress >= 100) {
      baseElapsedRef.current = 0;
      setProgress(0);
      setIsPlaying(true);
    } else if (isPlaying) {
      setIsPlaying(false);
      baseElapsedRef.current += (performance.now() - startTimeRef.current) * REPLAY_SPEED;
      cancelAnimationFrame(rafRef.current);
    } else {
      setIsPlaying(true);
    }
  }, [isPlaying, progress]);


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

        {/* Smooth Visualization Bubble */}
        {bubbleState && (
          <div
            className="pointer-events-none fixed"
            style={{
              left: `${bubbleState.x}px`,
              top: `${bubbleState.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 60,
            }}
          >
            <div
              className="rounded-full bg-[#51513d] transition-all"
              style={{
                width: `${bubbleState.size}px`,
                height: `${bubbleState.size}px`,
                opacity: 0.75,
                boxShadow: '0 0 0 4px rgba(81, 81, 61, 0.2)',
              }}
            />
          </div>
        )}

        {/* Bottom controls */}
        <div className="fixed bottom-4 left-1/2 z-70 flex -translate-x-1/2 items-center gap-4 border border-[#51513d]/18 bg-[#f3edd7]/90 px-5 py-2.5 shadow-lg backdrop-blur-md rounded-lg">
          <button
            type="button"
            onClick={handlePlayPause}
            className="text-[#51513d] hover:text-[#1b2021] transition-colors"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <div className="h-1.5 w-48 overflow-hidden bg-[#51513d]/15 rounded-full">
            <div
              className="h-full bg-[#51513d] transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-10 text-[11px] font-black text-[#1b2021] tabular-nums">{progress}%</span>
          <div className="h-4 w-px bg-[#51513d]/20" />
          <button
            type="button"
            onClick={handleCloseGaze}
            className="text-[#1b2021]/60 hover:text-[#1b2021] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  DEFAULT VIEW — Modern Submit Screen
  // ═══════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#e3dcc2]/90 backdrop-blur-md"
      style={{ animation: 'float-up 0.4s ease-out' }}
    >
      <div className="w-[min(460px,90vw)] rounded-xl border border-[#51513d]/18 bg-[#f3edd7] shadow-xl overflow-hidden flex flex-col">
        <div className="border-b border-[#51513d]/18 p-6 flex justify-between items-center bg-[#e3dcc2]/30">
          <LexoraLogo size="sm" />
          <span className="text-xs font-black tracking-widest text-[#51513d]/70 uppercase">Task Verification</span>
        </div>

        <div className="flex flex-col gap-6 p-8">
          {/* Status Header */}
          <div className="flex items-center gap-5">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4',
                hasEnoughData
                  ? 'border-[#a6a867]/30 bg-[#a6a867]/20 text-[#51513d]'
                  : 'border-[#e3dc95]/40 bg-[#e3dc95]/30 text-[#8b6f25]',
              )}
            >
              {hasEnoughData ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <AlertTriangle className="h-7 w-7" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-black tracking-tight text-[#1b2021]">
                {hasEnoughData ? 'Recording Saved' : 'Data Incomplete'}
              </h2>
              <p className="text-sm font-medium text-[#51513d]/80 uppercase tracking-widest">
                {label}
              </p>
            </div>
          </div>

          {/* Data Quality Metrics */}
          <div className="flex flex-col gap-3">
            <div
              className={cn(
                'rounded-lg border p-5 text-sm leading-relaxed',
                hasEnoughData
                  ? 'border-[#51513d]/10 bg-[#e3dcc2]/60'
                  : 'border-[#8b6f25]/20 bg-yellow-50',
              )}
            >
              <div className="flex justify-between items-end mb-2">
                 <span className="text-xs font-black uppercase tracking-wider text-[#51513d]/60">Data Quality</span>
                 <span className={cn("text-2xl font-black font-mono leading-none", hasEnoughData ? "text-[#51513d]" : "text-[#8b6f25]")}>{pointCount}</span>
              </div>
              {hasEnoughData ? (
                <p className="text-[#1b2021]/80">
                  Gaze points captured successfully. The reading sample is stable and ready for analysis.
                </p>
              ) : (
                <p className="text-yellow-800">
                  Insufficient data points captured for accurate analysis. We highly recommend retaking this task.
                </p>
              )}
            </div>
          </div>

          {/* View Gaze Feature */}
          {fixations.length > 1 && readingContent && (
            <button
              type="button"
              onClick={handleOpenGaze}
              className="group relative flex items-center gap-4 overflow-hidden rounded-lg border border-[#51513d]/20 bg-white p-4 transition-all hover:border-[#51513d]/40 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3edd7] text-[#51513d]">
                <Eye className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-[#1b2021]">Review Playback</span>
                <span className="text-xs text-[#1b2021]/60">Watch how the text was read</span>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-[#51513d]/40 transition-transform group-hover:translate-x-1 group-hover:text-[#51513d]" />
            </button>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={onContinue}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#51513d] px-6 py-4 text-sm font-black text-[#e3dcc2] shadow-sm transition-all hover:bg-[#1b2021] hover:shadow-md"
            >
              {isLastTask ? 'Submit for Analysis' : 'Continue to Next Task'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onRetake}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#51513d]/20 bg-transparent px-6 py-4 text-sm font-black text-[#51513d] transition-all hover:bg-[#51513d]/5 hover:text-[#1b2021]"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Recording
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
