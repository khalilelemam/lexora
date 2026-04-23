'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CheckCircle2, RotateCcw, ArrowRight, AlertTriangle, Eye, X, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const progress = rawGazeData.length > 1
    ? Math.round((currentIndex / (rawGazeData.length - 1)) * 100)
    : 0;

  // ═══════════════════════════════════════════════════════
  //  FULLSCREEN GAZE PREVIEW
  // ═══════════════════════════════════════════════════════
  if (showGazePreview && readingContent) {
    return (
      <div className="z-50 fixed inset-0">
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
              className="fixed pointer-events-none"
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-70 flex items-center gap-4 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-[#E8E0D4] shadow-lg">
          <button type="button" onClick={handlePlayPause} className="text-[#4A7C59] hover:text-[#3D6A4B]">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <div className="w-32 h-1.5 bg-[#E8E0D4] rounded-full overflow-hidden">
            <div className="h-full bg-[#4A7C59] rounded-full transition-all duration-75" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] text-[#8B857E] tabular-nums w-8">{progress}%</span>
          <div className="w-px h-4 bg-[#E8E0D4]" />
          <button type="button" onClick={handleCloseGaze} className="text-[#8B857E] hover:text-[#2D2A26]">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  DEFAULT VIEW — Status card
  // ═══════════════════════════════════════════════════════
  return (
    <div className="z-50 fixed inset-0 bg-[#FDF8F0] flex items-center justify-center" style={{ animation: 'float-up 0.4s ease-out' }}>
      <div className="bg-white/80 backdrop-blur-sm border border-[#E8E0D4] rounded-2xl shadow-lg w-[min(420px,90vw)] overflow-hidden">
        <div className="p-5 border-b border-[#E8E0D4]">
          <LexoraLogo size="sm" />
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full',
              hasEnoughData ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200',
            )}>
              {hasEnoughData
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                : <AlertTriangle className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <h2 className="font-bold text-base text-[#2D2A26]">
                {hasEnoughData ? 'Task Complete' : 'Task Finished'}
              </h2>
              <p className="text-[#8B857E] text-xs">{label}</p>
            </div>
          </div>

          {/* Data quality */}
          <div className={cn(
            'p-3.5 rounded-xl border text-sm leading-relaxed',
            hasEnoughData
              ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700',
          )}>
            {hasEnoughData ? (
              <p><span className="font-medium">{pointCount}</span> gaze points captured successfully.</p>
            ) : (
              <p>Only <span className="font-medium">{pointCount}</span> points captured. Consider retaking.</p>
            )}
          </div>

          {/* View Gaze button */}
          {rawGazeData.length > 1 && readingContent && (
            <button
              type="button"
              onClick={handleOpenGaze}
              className="flex items-center gap-2 p-3 rounded-xl border border-[#4A7C59]/20 bg-[#4A7C59]/5 text-[#4A7C59] text-sm hover:bg-[#4A7C59]/10 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="font-medium">View Gaze Trail</span>
              <span className="ml-auto text-xs text-[#8B857E]">Fullscreen replay</span>
            </button>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-1">
            <Button onClick={onContinue} className="w-full bg-[#4A7C59] hover:bg-[#3D6A4B] text-white">
              {isLastTask ? 'Submit for Analysis' : 'Next Task'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onRetake} className="w-full border-[#D4CBBD] text-[#6B6560] hover:text-[#2D2A26]">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
