'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AOI_Y_BOUNDS } from '../lib/constants';
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
 * AOI X bounds — reading zone spans 20%–80% of the screen.
 */
const AOI_X_BOUNDS = { min: 0.2, max: 0.8 };

/**
 * Map a raw gaze coordinate from AOI screen-space to [0, 1] element space.
 *
 * Formula: mapped = clamp((raw - min) / (max - min), 0, 1)
 */
function mapToElement(raw: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (raw - min) / (max - min)));
}

/**
 * Replays gaze fixations as animated Lexplore-style bubbles overlaid on
 * text content.
 *
 * Coordinate remapping:
 *   - fixationX: screen [AOI_X_MIN, AOI_X_MAX] → element [0, 1]
 *   - fixationY: screen [AOI_Y_MIN, AOI_Y_MAX] → element [0, 1]
 *
 * Both axes must be remapped from the calibration/task AOI down to the
 * compact replay container, otherwise bubbles are misaligned.
 */
export function GazeReplayViewer({ content, features, direction = 'ltr' }: GazeReplayViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [trail, setTrail] = useState<number[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalized timeline: cumulative duration offsets (ms) for each fixation
  const timeline = useMemo(() => {
    return features.reduce(
      (state, feature) => ({
        elapsed: state.elapsed + feature.durationMs,
        points: [...state.points, state.elapsed],
      }),
      { elapsed: 0, points: [] as number[] },
    ).points;
  }, [features]);

  const totalDuration = useMemo(
    () =>
      timeline.length > 0
        ? timeline[timeline.length - 1] + features[features.length - 1].durationMs
        : 0,
    [timeline, features],
  );

  useEffect(() => {
    if (!isPlaying) return;

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) * speed;
      if (elapsed >= totalDuration) {
        setIsPlaying(false);
        setCurrentIndex(features.length - 1);
        setTrail(features.map((_, i) => i));
        return;
      }

      let idx = 0;
      for (let i = timeline.length - 1; i >= 0; i--) {
        if (elapsed >= timeline[i]) {
          idx = i;
          break;
        }
      }

      setCurrentIndex(idx);
      setTrail((prev) => {
        if (prev.length === 0 || prev[prev.length - 1] !== idx) return [...prev, idx];
        return prev;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed, totalDuration, features, timeline]);

  const handlePlay = useCallback(() => {
    if (currentIndex >= features.length - 1) {
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

  const maxDuration = useMemo(() => Math.max(...features.map((f) => f.durationMs), 1), [features]);
  const getBubbleSize = useCallback(
    (durationMs: number) => 8 + (durationMs / maxDuration) * 22,
    [maxDuration],
  );

  // AOI bounds — fixation coords are screen-normalized [0, 1],
  // so we remap from the AOI region to [0, 1] within this container.
  const aoiX = useMemo(() => AOI_X_BOUNDS, []);
  const aoiY = AOI_Y_BOUNDS;

  const mapX = useCallback((raw: number) => mapToElement(raw, aoiX.min, aoiX.max), [aoiX]);
  const mapY = useCallback((raw: number) => mapToElement(raw, aoiY.min, aoiY.max), [aoiY]);

  const progress = currentIndex >= 0 ? Math.round(((currentIndex + 1) / features.length) * 100) : 0;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-[#8B857E]">
        <Eye className="h-4 w-4" />
        <span className="font-medium text-[#2D2A26]">Gaze Replay</span>
        <span className="text-xs text-[#C4BDB4]">— where the reader&apos;s eyes tracked</span>
        {currentIndex >= 0 && (
          <span className="ml-auto text-xs text-[#8B857E]">
            {currentIndex + 1} / {features.length} fixations
          </span>
        )}
      </div>

      {/* Replay canvas — aspect ratio matches the test AOI for accurate overlay.
           TaskDisplay AOI: X = 20%-80% (60%), Y = 10%-65% (55%).
           On a 16:9 screen: width = 16*0.6 = 9.6, height = 9*0.55 = 4.95
           Aspect ratio = 9.6 / 4.95 ≈ 1.94 */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-xl border border-[#E8E0D4] bg-[#FDF8F0] select-none',
        )}
        dir={direction}
        style={{
          aspectRatio: '1.94 / 1',
          minHeight: '200px',
          containerType: 'inline-size',
        }}
      >
        {/* Inner text wrapper — no extra padding since the container IS the AOI */}
        <div
          className="absolute inset-0 flex items-start overflow-hidden"
          style={{ padding: '2% 0%' }}
        >
          {/* Text replica — uses container-query units (cqw) so line breaks
              scale proportionally to the container width, matching the live
              test's text wrapping at any display size. */}
          <p
            className={cn(
              'w-full leading-loose whitespace-pre-line text-[#2D2A26]/30',
              'font-normal',
              direction === 'rtl' && 'text-right',
            )}
            style={{
              fontSize: 'clamp(0.55rem, 2.6cqw, 1.8rem)',
              lineHeight: 2.0,
              letterSpacing: '0.05em',
              wordSpacing: '0.12em',
              userSelect: 'none',
            }}
          >
            {content}
          </p>
        </div>

        {/* Gaze bubbles — positioned as % of the container (which represents the AOI) */}
        {trail.map((idx) => {
          const f = features[idx];
          if (!f) return null;
          const size = getBubbleSize(f.durationMs);
          const isCurrent = idx === currentIndex;

          // Convert screen-normalized coords → AOI-relative % for the container
          const leftPct = mapX(f.fixationX) * 100;
          const topPct = mapY(f.fixationY) * 100;

          return (
            <div
              key={idx}
              className={cn(
                'pointer-events-none absolute rounded-full transition-opacity duration-200',
                f.isRegression ? 'bg-red-400' : 'bg-[#4A7C59]',
                isCurrent ? 'opacity-75' : 'opacity-20',
              )}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: isCurrent
                  ? f.isRegression
                    ? '0 0 0 4px rgba(248, 113, 113, 0.25)'
                    : '0 0 0 4px rgba(74, 124, 89, 0.2)'
                  : undefined,
              }}
            />
          );
        })}

        {/* Saccade lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" overflow="visible">
          {trail.length > 1 &&
            trail.slice(1).map((idx, i) => {
              const prev = features[trail[i]];
              const curr = features[idx];
              if (!prev || !curr) return null;

              const stroke = curr.isReturnSweep
                ? '#d1d5db'
                : curr.isRegression
                  ? '#f87171'
                  : '#86efac';
              const dashArray = curr.isReturnSweep ? '3 4' : 'none';
              const opacity = curr.isReturnSweep ? 0.35 : 0.45;

              return (
                <line
                  key={`${trail[i]}-${idx}`}
                  x1={`${mapX(prev.fixationX) * 100}%`}
                  y1={`${mapY(prev.fixationY) * 100}%`}
                  x2={`${mapX(curr.fixationX) * 100}%`}
                  y2={`${mapY(curr.fixationY) * 100}%`}
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeDasharray={dashArray}
                  opacity={opacity}
                />
              );
            })}
        </svg>

        {/* Empty state */}
        {trail.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-[#C4BDB4]">Press play to see the eye movement replay</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8E0D4]/60">
        <div
          className="h-full rounded-full bg-[#4A7C59] transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              className="h-8 border-[#D4CBBD] text-[#6B6560] hover:text-[#2D2A26]"
            >
              <Pause className="mr-1 h-3.5 w-3.5" />
              Pause
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePlay}
              className="h-8 bg-[#4A7C59] text-white hover:bg-[#3D6A4B]"
            >
              <Play className="mr-1 h-3.5 w-3.5" />
              {currentIndex >= features.length - 1 ? 'Replay' : 'Play'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="h-8 w-8 p-0 text-[#8B857E] hover:text-[#2D2A26]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-[#8B857E]">Speed:</span>
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                'rounded px-2 py-0.5 text-xs transition-colors',
                speed === s
                  ? 'bg-[#4A7C59] text-white'
                  : 'text-[#8B857E] hover:bg-[#F0EBE3] hover:text-[#2D2A26]',
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-[#8B857E]">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#4A7C59] opacity-60" />
          <span>Forward fixation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400 opacity-60" />
          <span>Regression</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="4">
            <line
              x1="0"
              y1="2"
              x2="14"
              y2="2"
              stroke="#d1d5db"
              strokeWidth="1.5"
              strokeDasharray="3 4"
            />
          </svg>
          <span>Return sweep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Bubble size = fixation duration</span>
        </div>
      </div>
    </div>
  );
}
