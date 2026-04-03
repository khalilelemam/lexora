'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CALIBRATION_POINTS } from '../lib/constants';
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
 * Extract AOI X bounds from calibration points.
 * AOI X spans from min X value to max X value in calibration grid.
 */
function getAOIXBounds() {
  const xs = CALIBRATION_POINTS.map((p) => p.x);
  return {
    min: Math.min(...xs),
    max: Math.max(...xs),
  };
}

/**
 * Map raw gaze coordinates from AOI space to normalized element space.
 * Raw coordinates are calibrated within AOI [0.2, 0.8] for X-axis.
 * This remaps them to [0, 1] so they span the full paragraph width.
 *
 * Formula: mappedX = (rawX - aoiMin) / (aoiMax - aoiMin)
 */
function mapAOICoordinateToElement(rawCoord: number, aoiMin: number, aoiMax: number): number {
  return Math.max(0, Math.min(1, (rawCoord - aoiMin) / (aoiMax - aoiMin)));
}

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
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [scaleRatio, setScaleRatio] = useState(1);
  const [contentDimensions, setContentDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [textOffset, setTextOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
    () =>
      timeline.length > 0
        ? timeline[timeline.length - 1] + features[features.length - 1].durationMs
        : 0,
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

  // ─── AOI coordinate mapping ────────────────────────

  const aoiBounds = useMemo(() => getAOIXBounds(), []);

  const mapGazeX = useCallback(
    (rawX: number) => mapAOICoordinateToElement(rawX, aoiBounds.min, aoiBounds.max),
    [aoiBounds],
  );

  // ─── Progress ──────────────────────────────────────

  const progress = currentIndex >= 0 ? Math.round(((currentIndex + 1) / features.length) * 100) : 0;

  // DEBUG: Log feature Y values and container dimensions
  useEffect(() => {
    if (features.length > 0) {
      const debugData = {
        totalFeatures: features.length,
        firstTenY: features.slice(0, 10).map((f) => f.fixationY),
        firstTenX: features.slice(0, 10).map((f) => f.fixationX),
      };

      console.log('=== GAZE REPLAY VISUALIZER DEBUG ===', debugData);

      fetch('http://localhost:8001/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '=== GAZE REPLAY FEATURES ===',
          data: debugData,
        }),
      }).catch(() => {});

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const containerData = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          offsetWidth: containerRef.current.offsetWidth,
          offsetHeight: containerRef.current.offsetHeight,
        };

        console.log('Replay container dimensions:', containerData);

        fetch('http://localhost:8001/debug/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Replay container dimensions',
            data: containerData,
          }),
        }).catch(() => {});

        // Calculate expected pixel positions
        const containerHeight = rect.height;
        const pixelData = {
          containerHeight,
          yValuesAsPixels: features.slice(0, 10).map((f) => f.fixationY * containerHeight),
        };

        console.log('Y-values as pixels:', pixelData);

        fetch('http://localhost:8001/debug/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Y-values converted to pixels',
            data: pixelData,
          }),
        }).catch(() => {});
      }
    }
  }, [features]);

  // ─── Measure content dimensions for exact replica ──

  useEffect(() => {
    if (!contentRef.current || !containerRef.current) return;

    // CRITICAL FIX: Measure actual TEXT content bounds (not container)
    // This must match the measurement in task-display.tsx for alignment
    const allWords = contentRef.current.querySelectorAll('[data-word]');

    if (allWords.length === 0) {
      // No words found; use container dimensions as fallback
      const contentRect = contentRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setContentDimensions({ width: contentRect.width, height: contentRect.height });
      setTextOffset({ x: 0, y: 0 });
      setScaleRatio(1);
      return;
    }

    // Get text content bounds (same as task-display)
    let textTop = Infinity;
    let textBottom = -Infinity;
    let textLeft = Infinity;
    let textRight = -Infinity;

    allWords.forEach((word) => {
      const rect = (word as HTMLElement).getBoundingClientRect();
      textTop = Math.min(textTop, rect.top);
      textBottom = Math.max(textBottom, rect.bottom);
      textLeft = Math.min(textLeft, rect.left);
      textRight = Math.max(textRight, rect.right);
    });

    const textHeight = Math.max(0, textBottom - textTop);
    const textWidth = Math.max(0, textRight - textLeft);

    // For horizontal scaling, also consider container width
    const containerRect = containerRef.current.getBoundingClientRect();
    const availableWidth = containerRect.width - 32; // accounting for padding
    const calculatedScale = Math.min(1, availableWidth / textWidth);

    // CRITICAL: Calculate text offset within the scaled container
    // This is the position of text relative to container top-left
    const offsetY = textTop - containerRect.top;
    const offsetX = textLeft - containerRect.left;

    setContentDimensions({ width: textWidth, height: textHeight });
    setTextOffset({ x: offsetX, y: offsetY });
    setScaleRatio(calculatedScale);

    console.log('[REPLAY FIX] Text bounds:', { textTop, textBottom, textHeight, textWidth });
    console.log('[REPLAY FIX] Text offset:', { offsetX, offsetY });
    console.log('[REPLAY FIX] Calculated scale:', calculatedScale);
  }, [content]);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
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
        className="bg-background relative overflow-hidden rounded-lg border p-6 sm:p-8"
        dir={direction}
      >
        {/* Exact replica wrapper with scaling for alignment */}
        <div
          className="relative inline-block"
          style={{
            transformOrigin: 'top left',
            transform: `scale(${scaleRatio})`,
          }}
        >
          {/* The reading content (for spatial reference) - EXACT REPLICA */}
          <p
            ref={contentRef}
            className={cn(
              'text-base tracking-wide whitespace-pre-line sm:text-lg',
              'text-muted-foreground/60 font-normal select-none',
              direction === 'rtl' && 'text-right',
            )}
            style={{ lineHeight: 2 }}
          >
            {content}
          </p>
        </div>

        {/* Gaze trail (faded past fixations) - positioned relative to content */}
        {contentDimensions &&
          trail.map((idx) => {
            const f = features[idx];
            const size = getBubbleSize(f.durationMs);
            const isCurrent = idx === currentIndex;
            const mappedX = mapGazeX(f.fixationX);

            // Calculate bubble position relative to ACTUAL TEXT CONTENT
            // CRITICAL FIX: Include textOffset to account for text position within container
            const bubbleTop = textOffset.y + f.fixationY * contentDimensions.height;
            const bubbleLeft = textOffset.x + mappedX * contentDimensions.width;

            return (
              <div
                key={idx}
                className={cn(
                  'pointer-events-none absolute rounded-full',
                  f.isRegression ? 'bg-red-500' : 'bg-blue-400',
                  isCurrent ? 'opacity-70' : 'opacity-20',
                )}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${bubbleLeft}px`,
                  top: `${bubbleTop}px`,
                  transform: 'translate(-50%, -50%)',
                  transition: isCurrent ? 'none' : 'opacity 0.3s',
                  // Inverse scale to counteract parent scaling
                  transformOrigin: 'center',
                }}
              />
            );
          })}

        {/* Saccade lines connecting consecutive fixations */}
        {contentDimensions && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {trail.length > 1 &&
              trail.slice(1).map((idx, i) => {
                const prev = features[trail[i]];
                const curr = features[idx];

                let strokeColor = '#60a5fa'; // Standard Forward Saccades (blue-400)
                let lineOpacity = 0.5;
                let dashArray = 'none';

                if (curr.isReturnSweep) {
                  strokeColor = '#9ca3af'; // gray-400
                  lineOpacity = 0.4;
                  dashArray = '4 4';
                } else if (curr.isRegression) {
                  strokeColor = '#ef4444'; // red-500
                  lineOpacity = 0.5;
                }

                const prevMappedX = mapGazeX(prev.fixationX);
                const currMappedX = mapGazeX(curr.fixationX);

                // CRITICAL FIX: Include textOffset to match bubble positioning
                const prevTop = textOffset.y + prev.fixationY * contentDimensions.height;
                const prevLeft = textOffset.x + prevMappedX * contentDimensions.width;
                const currTop = textOffset.y + curr.fixationY * contentDimensions.height;
                const currLeft = textOffset.x + currMappedX * contentDimensions.width;

                return (
                  <line
                    key={`${trail[i]}-${idx}`}
                    x1={prevLeft}
                    y1={prevTop}
                    x2={currLeft}
                    y2={currTop}
                    stroke={strokeColor}
                    strokeWidth={1}
                    strokeDasharray={dashArray}
                    opacity={lineOpacity}
                  />
                );
              })}
          </svg>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-150"
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
          <span className="text-muted-foreground mr-1 text-xs">Speed:</span>
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
      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-blue-400 opacity-50" />
          <span>Forward fixation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500 opacity-50" />
          <span>Regression (backward)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="16" height="4" className="mr-1">
            <line
              x1="0"
              y1="2"
              x2="16"
              y2="2"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeDasharray="4 4"
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
