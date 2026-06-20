'use client';

import {
  useEffect,
  useMemo,
  useCallback,
  useLayoutEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { X, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CALIBRATION_POINTS,
  AOI_Y_BOUNDS,
  READING_ZONE_BOUNDS,
  GAZE_SNAPPING_MODE,
} from '../lib/constants';
import { TaskDisplay } from './task-display';
import { useGazeReplay } from '../hooks/use-gaze-replay';
import type { GazeFeature } from '../types';

import { detectRegressions } from '../lib/gaze-processing';

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
  toolbarSlot?: ReactNode;
}

/**
 * Fullscreen overlay that renders TaskDisplay in preview mode
 * with ML fixation bubbles + saccade lines on top.
 *
 * Uses the same reading zone as the live test so fixation positions map correctly.
 */
export function FullscreenGazeReplay({
  taskType,
  content,
  features: rawFeatures,
  onClose,
  toolbarSlot,
}: FullscreenGazeReplayProps) {
  const features = useMemo(() => detectRegressions(rawFeatures, 'ltr'), [rawFeatures]);
  const snappingMode = GAZE_SNAPPING_MODE;
  const replay = useGazeReplay({ features, active: true });

  // Lock body scroll while the overlay is mounted to prevent
  // the background page from scrolling behind the fixed overlay.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const aoiX = useMemo(() => getAOIXBounds(), []);
  const aoiY = AOI_Y_BOUNDS;
  const mapX = useCallback((raw: number) => mapToElement(raw, aoiX.min, aoiX.max), [aoiX]);
  const mapY = useCallback((raw: number) => mapToElement(raw, aoiY.min, aoiY.max), [aoiY]);

  // Reading zone pixel bounds (must match TaskDisplay layout)
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const zoneLeft = screenW * READING_ZONE_BOUNDS.left;
  const zoneTop = screenH * READING_ZONE_BOUNDS.top;
  const zoneW = screenW * (1 - READING_ZONE_BOUNDS.left - READING_ZONE_BOUNDS.right);
  const zoneH = screenH * (1 - READING_ZONE_BOUNDS.top - READING_ZONE_BOUNDS.bottom);

  const [lineCenters, setLineCenters] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const measure = () => {
      if (!containerRef.current) return;
      const wordSpans = containerRef.current.querySelectorAll('[data-word]');
      if (wordSpans.length === 0) return;

      const lineMap = new Map<number, Array<{ top: number; bottom: number }>>();

      wordSpans.forEach((span) => {
        const rect = (span as HTMLElement).getBoundingClientRect();
        const lineKey = Math.round(rect.top);

        if (!lineMap.has(lineKey)) {
          lineMap.set(lineKey, []);
        }
        lineMap.get(lineKey)!.push({ top: rect.top, bottom: rect.bottom });
      });

      const centers: number[] = [];
      const sortedLineKeys = Array.from(lineMap.keys()).sort((a, b) => a - b);

      sortedLineKeys.forEach((lineKey) => {
        const rects = lineMap.get(lineKey)!;
        const minTop = Math.min(...rects.map((r) => r.top));
        const maxBottom = Math.max(...rects.map((r) => r.bottom));
        centers.push((minTop + maxBottom) / 2);
      });

      setLineCenters(centers);
    };

    const timer = setTimeout(measure, 100);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [content, taskType]);

  const snappedYCoordinates = useMemo(() => {
    if (snappingMode === 'raw' || lineCenters.length === 0 || features.length === 0) {
      return [];
    }

    // ── 1. Run sequential snapping to map each fixation to its most likely reading line center ──
    let avgLineHeight = 50;
    if (lineCenters.length > 1) {
      let total = 0;
      for (let i = 1; i < lineCenters.length; i++) {
        total += lineCenters[i] - lineCenters[i - 1];
      }
      avgLineHeight = total / (lineCenters.length - 1);
    }
    const threshold = avgLineHeight * 1.5;

    const sequentialSnapped: number[] = [];
    let currentLineIndex = 0;

    features.forEach((f, idx) => {
      const yRaw = zoneTop + mapY(f.fixationY) * zoneH;

      if (idx === 0) {
        let closestIdx = 0;
        let minDiff = Math.abs(lineCenters[0] - yRaw);
        for (let j = 1; j < lineCenters.length; j++) {
          const diff = Math.abs(lineCenters[j] - yRaw);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = j;
          }
        }
        currentLineIndex = closestIdx;
      } else {
        if (f.isReturnSweep) {
          currentLineIndex = Math.min(lineCenters.length - 1, currentLineIndex + 1);
        } else {
          const distToCurrent = Math.abs(yRaw - lineCenters[currentLineIndex]);
          if (distToCurrent > threshold) {
            let closestIdx = 0;
            let minDiff = Math.abs(lineCenters[0] - yRaw);
            for (let j = 1; j < lineCenters.length; j++) {
              const diff = Math.abs(lineCenters[j] - yRaw);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = j;
              }
            }
            currentLineIndex = closestIdx;
          }
        }
      }

      sequentialSnapped.push(lineCenters[currentLineIndex]);
    });

    // ── 2. Global Shift mode: single uniform vertical offset calculated from median drift ──
    if (snappingMode === 'global-shift') {
      const rawYValues = features.map((f) => zoneTop + mapY(f.fixationY) * zoneH);
      const diffs = rawYValues.map((y, i) => sequentialSnapped[i] - y);

      const sortedDiffs = [...diffs].sort((a, b) => a - b);
      const mid = Math.floor(sortedDiffs.length / 2);
      const medianOffset =
        sortedDiffs.length % 2 !== 0
          ? sortedDiffs[mid]
          : (sortedDiffs[mid - 1] + sortedDiffs[mid]) / 2;

      return rawYValues.map((y) => y + medianOffset);
    }

    return sequentialSnapped;
  }, [features, lineCenters, zoneTop, zoneH, mapY, snappingMode]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50">
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

            const prevSnappedY = snappedYCoordinates[replay.trail[i]];
            const currSnappedY = snappedYCoordinates[idx];

            const x1 = zoneLeft + mapX(prev.fixationX) * zoneW;
            const y1 =
              prevSnappedY !== undefined ? prevSnappedY : zoneTop + mapY(prev.fixationY) * zoneH;
            const x2 = zoneLeft + mapX(curr.fixationX) * zoneW;
            const y2 =
              currSnappedY !== undefined ? currSnappedY : zoneTop + mapY(curr.fixationY) * zoneH;

            const isRegression = curr.isRegression && !curr.isReturnSweep;
            const stroke = curr.isReturnSweep
              ? '#d1d5db'
              : isRegression
                ? '#ef4444' // bright red
                : '#86efac';
            const dashArray = curr.isReturnSweep ? '3 4' : 'none';
            const strokeWidth = isRegression ? 3 : 1.5;
            const opacity = curr.isReturnSweep ? 0.35 : isRegression ? 0.8 : 0.45;

            return (
              <line
                key={`${replay.trail[i]}-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                opacity={opacity}
                className={isRegression ? 'drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]' : ''}
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
        const topPx =
          snappedYCoordinates[idx] !== undefined
            ? snappedYCoordinates[idx]
            : zoneTop + mapY(f.fixationY) * zoneH;

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
              className={cn('rounded-full', f.isRegression ? 'bg-red-400' : 'bg-[#51513d]')}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                opacity: isCurrent ? 0.75 : 0.2,
                boxShadow: isCurrent
                  ? f.isRegression
                    ? '0 0 0 4px rgba(248, 113, 113, 0.25)'
                    : '0 0 0 4px rgba(166, 168, 103, 0.24)'
                  : undefined,
              }}
            />
          </div>
        );
      })}

      {/* Bottom control bar */}
      <div className="fixed bottom-4 left-1/2 z-70 flex -translate-x-1/2 items-center gap-4 border border-[#51513d]/18 bg-[#f3edd7]/90 px-5 py-2.5 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={replay.togglePlayPause}
          className="text-[#51513d] hover:text-[#1b2021]"
        >
          {replay.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        <div className="h-1.5 w-32 overflow-hidden bg-[#51513d]/18">
          <div
            className="h-full bg-[#51513d] transition-all duration-75"
            style={{ width: `${replay.progress}%` }}
          />
        </div>

        <span className="w-8 text-[11px] text-[#1b2021] tabular-nums">{replay.progress}%</span>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {replay.speedOptions.map((s) => (
            <button
              key={s}
              onClick={() => replay.setSpeed(s)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                replay.speed === s
                  ? 'bg-[#51513d] text-[#f3edd7]'
                  : 'text-[#1b2021] hover:bg-[#e3dcc2]',
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        {toolbarSlot ? (
          <>
            <div className="h-4 w-px bg-[#51513d]" />
            {toolbarSlot}
          </>
        ) : null}

        <div className="h-4 w-px bg-[#51513d]" />

        <button type="button" onClick={onClose} className="text-[#1b2021] hover:text-[#1b2021]">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="fixed top-4 right-4 z-70 flex flex-col gap-1.5 border border-[#51513d]/18 bg-[#f3edd7]/90 px-4 py-2.5 text-[11px] text-[#1b2021] shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#51513d] opacity-60" />
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
