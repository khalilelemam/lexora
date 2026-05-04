'use client';

import { useMemo, useCallback } from 'react';
import { X, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CALIBRATION_POINTS, AOI_Y_BOUNDS } from '../lib/constants';
import { TaskDisplay } from './task-display';
import { useGazeReplay } from '../hooks/use-gaze-replay';
import type { GazeFeature } from '../types';

function getAOIXBounds() {
  const xs = CALIBRATION_POINTS.map((p) => p.x);
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

function mapToElement(raw: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (raw - min) / (max - min)));
}

interface FullscreenGazeReplayProps {
  /** Task type for TaskDisplay layout */
  taskType: string;
  /** Reading content to render behind the overlay */
  content: string;
  /** ML fixation features */
  features: GazeFeature[];
  /** Called when user closes the overlay */
  onClose: () => void;
}

/**
 * Fullscreen overlay that renders TaskDisplay in preview mode
 * with ML fixation bubbles + saccade lines on top.
 *
 * Uses the exact same reading zone as the live test (20%–80% X, 10%–95% Y)
 * so fixation positions map correctly — zero perspective mismatch.
 */
export function FullscreenGazeReplay({
  taskType,
  content,
  features,
  onClose,
}: FullscreenGazeReplayProps) {
  const replay = useGazeReplay({ features, active: true });

  const aoiX = useMemo(() => getAOIXBounds(), []);
  const aoiY = AOI_Y_BOUNDS;
  const mapX = useCallback((raw: number) => mapToElement(raw, aoiX.min, aoiX.max), [aoiX]);
  const mapY = useCallback((raw: number) => mapToElement(raw, aoiY.min, aoiY.max), [aoiY]);

  // Reading zone pixel bounds (must match TaskDisplay layout)
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const zoneLeft = screenW * 0.2;
  const zoneTop = screenH * 0.1;
  const zoneW = screenW * 0.6; // 20%–80%
  const zoneH = screenH * 0.85; // 10%–95%

  return (
    <div className="fixed inset-0 z-50">
      {/* TaskDisplay in preview mode — identical text layout */}
      <TaskDisplay
        taskType={taskType}
        content={content}
        pointCount={0}
        isCollecting={false}
        onDone={() => {}}
        preview={true}
      />

      {/* Saccade lines — rendered under the bubbles */}
      <svg className="pointer-events-none fixed inset-0 h-full w-full" style={{ zIndex: 59 }}>
        {replay.trail.length > 1 &&
          replay.trail.slice(1).map((idx, i) => {
            const prev = features[replay.trail[i]];
            const curr = features[idx];
            if (!prev || !curr) return null;

            const x1 = zoneLeft + mapX(prev.fixationX) * zoneW;
            const y1 = zoneTop + mapY(prev.fixationY) * zoneH;
            const x2 = zoneLeft + mapX(curr.fixationX) * zoneW;
            const y2 = zoneTop + mapY(curr.fixationY) * zoneH;

            const stroke = curr.isReturnSweep
              ? '#d1d5db'
              : curr.isRegression
                ? '#f87171'
                : '#86efac';
            const dashArray = curr.isReturnSweep ? '3 4' : 'none';
            const opacity = curr.isReturnSweep ? 0.35 : 0.45;

            return (
              <line
                key={`${replay.trail[i]}-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth={1.5}
                strokeDasharray={dashArray}
                opacity={opacity}
              />
            );
          })}
      </svg>

      {/* Fixation bubbles */}
      {replay.trail.map((idx) => {
        const f = features[idx];
        if (!f) return null;
        const size = replay.getBubbleSize(f.durationMs);
        const isCurrent = idx === replay.currentIndex;
        const leftPx = zoneLeft + mapX(f.fixationX) * zoneW;
        const topPx = zoneTop + mapY(f.fixationY) * zoneH;

        return (
          <div
            key={idx}
            className="pointer-events-none fixed"
            style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 60,
            }}
          >
            <div
              className={cn('rounded-full', f.isRegression ? 'bg-red-400' : 'bg-[#4A7C59]')}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                opacity: isCurrent ? 0.75 : 0.2,
                boxShadow: isCurrent
                  ? f.isRegression
                    ? '0 0 0 4px rgba(248, 113, 113, 0.25)'
                    : '0 0 0 4px rgba(74, 124, 89, 0.2)'
                  : undefined,
              }}
            />
          </div>
        );
      })}

      {/* Bottom control bar */}
      <div className="fixed bottom-4 left-1/2 z-70 flex -translate-x-1/2 items-center gap-4 rounded-full border border-[#E8E0D4] bg-white/90 px-5 py-2.5 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={replay.togglePlayPause}
          className="text-[#4A7C59] hover:text-[#3D6A4B]"
        >
          {replay.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[#E8E0D4]">
          <div
            className="h-full rounded-full bg-[#4A7C59] transition-all duration-75"
            style={{ width: `${replay.progress}%` }}
          />
        </div>

        <span className="w-8 text-[11px] text-[#8B857E] tabular-nums">{replay.progress}%</span>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {replay.speedOptions.map((s) => (
            <button
              key={s}
              onClick={() => replay.setSpeed(s)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                replay.speed === s
                  ? 'bg-[#4A7C59] text-white'
                  : 'text-[#8B857E] hover:bg-[#F0EBE3]',
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[#E8E0D4]" />

        <button type="button" onClick={onClose} className="text-[#8B857E] hover:text-[#2D2A26]">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="fixed top-4 right-4 z-70 flex flex-col gap-1.5 rounded-xl border border-[#E8E0D4] bg-white/90 px-4 py-2.5 text-[11px] text-[#8B857E] shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#4A7C59] opacity-60" />
          <span>Forward fixation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400 opacity-60" />
          <span>Regression (backward)</span>
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
