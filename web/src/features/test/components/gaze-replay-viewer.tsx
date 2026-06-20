'use client';

import { useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AOI_Y_BOUNDS } from '../lib/constants';
import { useGazeReplay } from '../hooks/use-gaze-replay';
import type { GazeFeature } from '../types';

interface GazeReplayViewerProps {
  /** The reading content that was displayed during the test */
  content: string;
  /** Per-fixation features from the ML service (normalized 0-1 coords) */
  features: GazeFeature[];
  /** Text direction */
  direction?: 'ltr' | 'rtl';
}

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
  const replay = useGazeReplay({ features, active: true });

  // AOI bounds — fixation coords are screen-normalized [0, 1],
  // so we remap from the AOI region to [0, 1] within this container.
  const aoiX = useMemo(() => AOI_X_BOUNDS, []);
  const aoiY = AOI_Y_BOUNDS;

  const mapX = useCallback((raw: number) => mapToElement(raw, aoiX.min, aoiX.max), [aoiX]);
  const mapY = useCallback((raw: number) => mapToElement(raw, aoiY.min, aoiY.max), [aoiY]);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-[#1b2021]">
        <Eye className="h-4 w-4" />
        <span className="font-medium text-[#1b2021]">Gaze Replay</span>
        <span className="text-xs text-[#51513d]/40">— where the reader&apos;s eyes tracked</span>
        {replay.currentIndex >= 0 && (
          <span className="ml-auto text-xs text-[#1b2021]">
            {replay.currentIndex + 1} / {features.length} fixations
          </span>
        )}
      </div>

      {/* Replay canvas — aspect ratio matches the test AOI for accurate overlay.
           TaskDisplay AOI: X = 20%-80% (60%), Y = 10%-65% (55%).
           On a 16:9 screen: width = 16*0.6 = 9.6, height = 9*0.55 = 4.95
           Aspect ratio = 9.6 / 4.95 ≈ 1.94 */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-[#51513d] bg-[#e3dcc2] select-none',
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
              'w-full leading-loose whitespace-pre-line text-[#1b2021]/30',
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
        {replay.trail.map((idx) => {
          const f = features[idx];
          if (!f) return null;
          const size = replay.getBubbleSize(f.durationMs);
          const isCurrent = idx === replay.currentIndex;

          // Convert screen-normalized coords → AOI-relative % for the container
          const leftPct = mapX(f.fixationX) * 100;
          const topPct = mapY(f.fixationY) * 100;

          return (
            <div
              key={idx}
              className={cn(
                'pointer-events-none absolute rounded-full transition-opacity duration-200',
                f.isRegression ? 'bg-red-400' : 'bg-[#51513d]',
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
                    : '0 0 0 4px rgba(81, 81, 61, 0.2)'
                  : undefined,
              }}
            />
          );
        })}

        {/* Saccade lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" overflow="visible">
          {replay.trail.length > 1 &&
            replay.trail.slice(1).map((idx, i) => {
              const prev = features[replay.trail[i]];
              const curr = features[idx];
              if (!prev || !curr) return null;

              const stroke = curr.isReturnSweep
                ? '#51513d'
                : curr.isRegression
                  ? '#f87171'
                  : '#a6a867';
              const dashArray = curr.isReturnSweep ? '3 4' : 'none';
              const opacity = curr.isReturnSweep ? 0.25 : 0.45;

              return (
                <line
                  key={`${replay.trail[i]}-${idx}`}
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
        {replay.trail.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-[#51513d]/40">Press play to see the eye movement replay</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#51513d]/15">
        <div
          className="h-full rounded-full bg-[#51513d] transition-all duration-150"
          style={{ width: `${replay.progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {replay.isPlaying ? (
            <button
              type="button"
              onClick={replay.pause}
              className="flex h-8 items-center gap-1.5 border border-[#51513d]/25 bg-[#e3dcc2]/60 px-3 text-xs font-black text-[#51513d] transition-colors hover:bg-[#51513d]/10"
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={replay.play}
              className="flex h-8 items-center gap-1.5 bg-[#51513d] px-3 text-xs font-black text-[#e3dcc2] transition-colors hover:bg-[#1b2021]"
            >
              <Play className="h-3.5 w-3.5" />
              {replay.currentIndex >= features.length - 1 ? 'Replay' : 'Play'}
            </button>
          )}
          <button
            type="button"
            onClick={replay.reset}
            className="flex h-8 w-8 items-center justify-center text-[#51513d] transition-colors hover:bg-[#51513d]/10"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] font-black tracking-[0.1em] text-[#51513d]/40 uppercase">
            Speed:
          </span>
          {replay.speedOptions.map((s) => (
            <button
              key={s}
              onClick={() => replay.setSpeed(s)}
              className={cn(
                'rounded px-2 py-0.5 text-xs font-black transition-colors',
                replay.speed === s
                  ? 'bg-[#51513d] text-[#e3dcc2]'
                  : 'text-[#51513d] hover:bg-[#51513d]/10',
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10px] font-black tracking-wide text-[#51513d]/70 uppercase">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#51513d] opacity-60" />
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
              stroke="#51513d"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              opacity="0.3"
            />
          </svg>
          <span>Return sweep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Bubble size = duration</span>
        </div>
      </div>
    </div>
  );
}
