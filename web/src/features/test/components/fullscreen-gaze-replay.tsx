'use client';

import { useMemo, useCallback } from 'react';
import { X, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskDisplay } from './task-display';
import { useGazeReplay } from '../hooks/use-gaze-replay';
import type { GazeFeature } from '../types';

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
 * Fixation coordinates from the ML service are screen-normalized [0, 1],
 * so we position bubbles directly at `fixationX * screenW` and
 * `fixationY * screenH` — no AOI remapping needed. This ensures
 * zero perspective mismatch with the live test.
 */
export function FullscreenGazeReplay({
  taskType,
  content,
  features,
  onClose,
}: FullscreenGazeReplayProps) {
  const replay = useGazeReplay({ features, active: true });

  // Fixation coords are already screen-normalized [0, 1].
  // Convert directly to pixel positions on screen.
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const toPixelX = useCallback((normX: number) => normX * screenW, [screenW]);
  const toPixelY = useCallback((normY: number) => normY * screenH, [screenH]);

  return (
    <div className="z-50 fixed inset-0">
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
      <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 59 }}>
        {replay.trail.length > 1 &&
          replay.trail.slice(1).map((idx, i) => {
            const prev = features[replay.trail[i]];
            const curr = features[idx];
            if (!prev || !curr) return null;

            const x1 = toPixelX(prev.fixationX);
            const y1 = toPixelY(prev.fixationY);
            const x2 = toPixelX(curr.fixationX);
            const y2 = toPixelY(curr.fixationY);

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
        const leftPx = toPixelX(f.fixationX);
        const topPx = toPixelY(f.fixationY);

        return (
          <div
            key={idx}
            className="fixed pointer-events-none"
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
      <div className="bottom-4 left-1/2 z-70 fixed flex items-center gap-4 bg-white/90 shadow-lg backdrop-blur-md px-5 py-2.5 border border-[#E8E0D4] rounded-full -translate-x-1/2">
        <button
          type="button"
          onClick={replay.togglePlayPause}
          className="text-[#4A7C59] hover:text-[#3D6A4B]"
        >
          {replay.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        <div className="bg-[#E8E0D4] rounded-full w-32 h-1.5 overflow-hidden">
          <div
            className="bg-[#4A7C59] rounded-full h-full transition-all duration-75"
            style={{ width: `${replay.progress}%` }}
          />
        </div>

        <span className="w-8 tabular-nums text-[#8B857E] text-[11px]">{replay.progress}%</span>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {replay.speedOptions.map((s) => (
            <button
              key={s}
              onClick={() => replay.setSpeed(s)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] transition-colors',
                replay.speed === s
                  ? 'bg-[#4A7C59] text-white'
                  : 'text-[#8B857E] hover:bg-[#F0EBE3]',
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="bg-[#E8E0D4] w-px h-4" />

        <button type="button" onClick={onClose} className="text-[#8B857E] hover:text-[#2D2A26]">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="top-4 right-4 z-70 fixed flex flex-col gap-1.5 bg-white/90 shadow-sm backdrop-blur-md px-4 py-2.5 border border-[#E8E0D4] rounded-xl text-[#8B857E] text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="bg-[#4A7C59] opacity-60 rounded-full w-2.5 h-2.5" />
          <span>Forward fixation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-red-400 opacity-60 rounded-full w-2.5 h-2.5" />
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
