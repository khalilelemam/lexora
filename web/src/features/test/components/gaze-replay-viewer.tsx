'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GazeFeature } from '../types';

interface GazeReplayViewerProps {
  /** The reading content that was displayed during the test */
  content: string;
  /** Per-fixation features from the ML service (normalized 0-1 coords) */
  features: GazeFeature[];
  /** Text direction */
  direction?: 'ltr' | 'rtl';
}

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

/**
 * Replays gaze fixations as animated bubbles overlaid on the reading content.
 * Similar to Lexplore's visualization — each bubble represents a fixation,
 * sized proportionally to its duration, coloured red for regressions.
 */
export function GazeReplayViewer({ content, features, direction = 'ltr' }: GazeReplayViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [trail, setTrail] = useState<number[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalised timeline: cumulative duration offsets (ms) for each fixation
  const timeline = useMemo(() => {
    let acc = 0;
    return features.map((f) => {
      const t = acc;
      acc += f.durationMs;
      return t;
    });
  }, [features]);

  const totalDuration = useMemo(
    () => (timeline.length > 0 ? timeline[timeline.length - 1] + features[features.length - 1].durationMs : 0),
    [timeline, features],
  );

  // ─── Playback loop ─────────────────────────────────

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) * speed;
    if (elapsed >= totalDuration) {
      setIsPlaying(false);
      setCurrentIndex(features.length - 1);
      setTrail(features.map((_, i) => i));
      return;
    }

    // Find the fixation index at this timestamp
    let idx = 0;
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (elapsed >= timeline[i]) {
        idx = i;
        break;
      }
    }

    setCurrentIndex(idx);
    setTrail((prev) => {
      if (prev.length === 0 || prev[prev.length - 1] !== idx) {
        return [...prev, idx];
      }
      return prev;
    });

    rafRef.current = requestAnimationFrame(tick);
  }, [speed, totalDuration, features, timeline]);

  useEffect(() => {
    if (!isPlaying) return;
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, tick]);

  // ─── Controls ──────────────────────────────────────

  const handlePlay = useCallback(() => {
    if (currentIndex >= features.length - 1) {
      // Restart from beginning
      setCurrentIndex(-1);
      setTrail([]);
    }
    startTimeRef.current = performance.now();
    setIsPlaying(true);
  }, [currentIndex, features.length]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
    setCurrentIndex(-1);
    setTrail([]);
  }, []);

  // ─── Compute bubble size from duration ─────────────

  const maxDuration = useMemo(() => Math.max(...features.map((f) => f.durationMs), 1), [features]);

  const getBubbleSize = useCallback(
    (durationMs: number) => {
      const minR = 8;
      const maxR = 28;
      return minR + (durationMs / maxDuration) * (maxR - minR);
    },
    [maxDuration],
  );

  // ─── Progress ──────────────────────────────────────

  const progress = currentIndex >= 0 ? Math.round(((currentIndex + 1) / features.length) * 100) : 0;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="h-4 w-4" />
        <span>Gaze Replay</span>
        {currentIndex >= 0 && (
          <span className="ml-auto">
            Fixation {currentIndex + 1} / {features.length}
          </span>
        )}
      </div>

      {/* Replay canvas — text with overlaid bubbles */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border bg-background p-6 sm:p-8"
        dir={direction}
      >
        {/* The reading content (for spatial reference) */}
        <p
          className={cn(
            'whitespace-pre-line text-base leading-[2] tracking-wide sm:text-lg',
            'font-normal text-muted-foreground/60 select-none',
            direction === 'rtl' && 'text-right',
          )}
        >
          {content}
        </p>

        {/* Gaze trail (faded past fixations) */}
        {trail.map((idx) => {
          const f = features[idx];
          const size = getBubbleSize(f.durationMs);
          const isCurrent = idx === currentIndex;
          return (
            <div
              key={idx}
              className={cn(
                'pointer-events-none absolute rounded-full',
                f.isRegression ? 'bg-red-500' : 'bg-primary',
                isCurrent ? 'opacity-70' : 'opacity-20',
              )}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${f.fixationX * 100}%`,
                top: `${f.fixationY * 100}%`,
                transform: 'translate(-50%, -50%)',
                transition: isCurrent ? 'none' : 'opacity 0.3s',
              }}
            />
          );
        })}

        {/* Saccade lines connecting consecutive fixations */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {trail.length > 1 &&
            trail.slice(1).map((idx, i) => {
              const prev = features[trail[i]];
              const curr = features[idx];
              return (
                <line
                  key={`${trail[i]}-${idx}`}
                  x1={`${prev.fixationX * 100}%`}
                  y1={`${prev.fixationY * 100}%`}
                  x2={`${curr.fixationX * 100}%`}
                  y2={`${curr.fixationY * 100}%`}
                  stroke={curr.isRegression ? '#ef4444' : 'hsl(var(--primary))'}
                  strokeWidth={1}
                  opacity={0.2}
                />
              );
            })}
        </svg>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <Button size="sm" variant="outline" onClick={handlePause}>
              <Pause className="mr-1 h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button size="sm" onClick={handlePlay}>
              <Play className="mr-1 h-4 w-4" />
              {currentIndex >= features.length - 1 ? 'Replay' : 'Play'}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">Speed:</span>
          {SPEED_OPTIONS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? 'default' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => setSpeed(s)}
            >
              {s}x
            </Button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-primary opacity-50" />
          <span>Forward fixation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500 opacity-50" />
          <span>Regression (backward)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Bubble size = fixation duration</span>
        </div>
      </div>
    </div>
  );
}
