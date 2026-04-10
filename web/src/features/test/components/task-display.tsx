'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  MIN_GAZE_POINTS,
  ESTIMATED_READING_WPM,
  MIN_AUTO_DETECT_SECONDS,
  CROSS_PROXIMITY_PX,
  CROSS_DWELL_MS,
  CROSS_JITTER_TOLERANCE,
} from '../lib/constants';

interface TaskDisplayProps {
  /** The task type key (for layout hints — syllables use a different layout than paragraphs) */
  taskType: string;
  /** Reading content to display */
  content: string;
  /** Number of gaze points collected so far */
  pointCount: number;
  /** Whether gaze collection is actively happening */
  isCollecting: boolean;
  /** Called when reading is confirmed as done */
  onDone: () => void;
  /**
   * Optional: live access to the latest gaze position (screen-pixel coords).
   * Used for gaze-based end-of-reading detection.
   */
  getLastGazePosition?: () => { x: number; y: number } | null;
  /**
   * Optional: callback to provide normalized line centers (Y-values 0-1)
   * Called after DOM measurement completes
   */
  onLineCentersReady?: (lineCenters: number[]) => void;
}

/**
 * Immersive reading surface with a fixation cross at the end of the text.
 *
 * End-of-reading detection:
 * 1. Primary: gaze enters a proximity radius of the fixation cross for `CROSS_DWELL_MS`
 * 2. Fallback: time-based estimate from word count
 * Both require `MIN_GAZE_POINTS` before the dialog can appear.
 *
 * Y-Axis Line Snapping:
 * - For paragraph content, measures the vertical centers of each line via DOM
 * - Normalizes line centers relative to the content container (0.0-1.0)
 * - Calls onLineCentersReady with the computed centers
 */
export function TaskDisplay({
  taskType,
  content,
  pointCount,
  isCollecting,
  onDone,
  getLastGazePosition,
  onLineCentersReady,
}: TaskDisplayProps) {
  const [showDialog, setShowDialog] = useState(false);
  const autoDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gazeCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const dismissCountRef = useRef(0);
  const crossDwellStartRef = useRef<number | null>(null);
  const crossMissCountRef = useRef(0);
  const dialogTriggeredRef = useRef(false);

  // Ref to the fixation cross element — used to compute its screen position
  const crossRef = useRef<HTMLSpanElement>(null);

  // Ref to the paragraph container for line center measurement
  const paragraphContainerRef = useRef<HTMLDivElement>(null);

  // Keep a ref so timers can read the *current* value without stale closures
  const pointCountRef = useRef(pointCount);
  useEffect(() => {
    pointCountRef.current = pointCount;
  }, [pointCount]);

  const isSyllables = taskType === 'syllables';
  const isPseudoWords = taskType === 'pseudo-words';
  const isShortContent = isSyllables || isPseudoWords;

  // ─── Trigger the done-reading dialog ────────────────

  const triggerDialog = useCallback(() => {
    if (dialogTriggeredRef.current) return;
    if (pointCountRef.current < MIN_GAZE_POINTS) return;
    dialogTriggeredRef.current = true;
    setShowDialog(true);
  }, []);

  // ─── Measure line centers for Y-axis snapping ──────

  useLayoutEffect(() => {
    if (isShortContent || !paragraphContainerRef.current || !onLineCentersReady) {
      return;
    }

    // Get all word spans
    const wordSpans = paragraphContainerRef.current.querySelectorAll('[data-word]');
    if (wordSpans.length === 0) {
      onLineCentersReady([]);
      return;
    }

    // Group spans by their Y-coordinate (getBoundingClientRect().top)
    // to identify distinct physical lines
    const lineMap = new Map<number, Array<{ top: number; bottom: number }>>();

    wordSpans.forEach((span) => {
      const rect = (span as HTMLElement).getBoundingClientRect();
      const lineKey = Math.round(rect.top); // Group by rounded top value

      if (!lineMap.has(lineKey)) {
        lineMap.set(lineKey, []);
      }
      lineMap.get(lineKey)!.push({ top: rect.top, bottom: rect.bottom });
    });

    // CRITICAL FIX: Find the first and last word to get text content bounds
    // This ensures line centers are relative to TEXT, not the container
    const firstWordRect = (wordSpans[0] as HTMLElement).getBoundingClientRect();
    const lastWordRect = (wordSpans[wordSpans.length - 1] as HTMLElement).getBoundingClientRect();

    const textTop = firstWordRect.top;
    const textBottom = lastWordRect.bottom;
    const textHeight = textBottom - textTop;

    // Calculate the vertical center of each line and normalize
    const lineCenters: number[] = [];
    const sortedLineKeys = Array.from(lineMap.keys()).sort((a, b) => a - b);

    sortedLineKeys.forEach((lineKey) => {
      const rects = lineMap.get(lineKey)!;

      // Calculate the absolute vertical center of this line
      const minTop = Math.min(...rects.map((r) => r.top));
      const maxBottom = Math.max(...rects.map((r) => r.bottom));
      const lineCenterAbsolute = (minTop + maxBottom) / 2;

      // CRITICAL FIX: Normalize relative to TEXT CONTENT (not container)
      // This ensures line centers are consistent regardless of container padding
      if (textHeight > 0) {
        const normalizedCenter = (lineCenterAbsolute - textTop) / textHeight;
        const clamped = Math.max(0, Math.min(1, normalizedCenter));
        lineCenters.push(clamped);
      }
    });

    onLineCentersReady(lineCenters);
  }, [isShortContent, onLineCentersReady, content]);

  // ─── Detect overflow outside AOI bounds ─────────────────

  useLayoutEffect(() => {
    if (isShortContent || !paragraphContainerRef.current) return;

    const container = paragraphContainerRef.current;
    const hasOverflow = container.scrollHeight > container.clientHeight;

    if (hasOverflow && process.env.NODE_ENV === 'development') {
      console.warn(`[TaskDisplay] Text exceeds AOI bounds — Container: ${container.clientHeight}px, Content: ${container.scrollHeight}px`);
    }
  }, [isShortContent, content]);

  // ─── Compute estimated reading time ─────────────────

  const estimatedSeconds = useCallback(() => {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return Math.max(MIN_AUTO_DETECT_SECONDS, (wordCount / ESTIMATED_READING_WPM) * 60);
  }, [content]);

  // ─── Render paragraph with word wrapping for measurement ───

  const renderParagraphWithWords = () => {
    // Split content into words, preserving whitespace
    const words = content.split(/(\s+)/);

    return (
      <div ref={paragraphContainerRef}>
        <p
          className={cn(
            'text-xl sm:text-2xl md:text-3xl leading-loose sm:leading-loose md:leading-loose tracking-wide whitespace-pre-line',
            'font-normal select-none',
          )}
        >
          {words.map((word, idx) => {
            // Don't wrap whitespace in spans
            if (/^\s+$/.test(word)) {
              return word;
            }
            return (
              <span key={idx} data-word={idx}>
                {word}
              </span>
            );
          })}
        </p>
      </div>
    );
  };

  // ─── Keyboard shortcut for testing (Enter key) ─────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isCollecting) {
        e.preventDefault();
        triggerDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollecting, triggerDialog]);

  // ─── Gaze-based cross-proximity detection (primary) ─

  useEffect(() => {
    if (!isCollecting || !getLastGazePosition) return;

    gazeCheckIntervalRef.current = setInterval(() => {
      const pos = getLastGazePosition();
      const crossEl = crossRef.current;
      if (!pos || !crossEl) {
        crossDwellStartRef.current = null;
        crossMissCountRef.current = 0;
        return;
      }

      // Get fixation-cross center in viewport coordinates
      const rect = crossEl.getBoundingClientRect();
      const crossCenterX = rect.left + rect.width / 2;
      const crossCenterY = rect.top + rect.height / 2;

      // Euclidean distance from gaze to cross center
      const dist = Math.sqrt((pos.x - crossCenterX) ** 2 + (pos.y - crossCenterY) ** 2);

      if (dist <= CROSS_PROXIMITY_PX) {
        // Gaze is near the cross — start or continue dwell
        crossMissCountRef.current = 0;
        if (crossDwellStartRef.current === null) {
          crossDwellStartRef.current = Date.now();
        } else if (Date.now() - crossDwellStartRef.current >= CROSS_DWELL_MS) {
          triggerDialog();
        }
      } else {
        // Gaze left the zone — allow brief jitter before resetting
        crossMissCountRef.current += 1;
        if (crossMissCountRef.current > CROSS_JITTER_TOLERANCE) {
          crossDwellStartRef.current = null;
          crossMissCountRef.current = 0;
        }
      }
    }, 200); // Check 5 times per second

    return () => {
      if (gazeCheckIntervalRef.current) clearInterval(gazeCheckIntervalRef.current);
    };
  }, [isCollecting, getLastGazePosition, triggerDialog]);

  // ─── Time-based fallback (secondary) ────────────────

  useEffect(() => {
    if (!isCollecting) return;

    startTimeRef.current = Date.now();
    dismissCountRef.current = 0;
    dialogTriggeredRef.current = false;

    const scheduleDialog = (delaySeconds: number) => {
      autoDetectTimerRef.current = setTimeout(() => {
        if (pointCountRef.current >= MIN_GAZE_POINTS) {
          triggerDialog();
        } else {
          // Not enough data yet — retry in 3s
          scheduleDialog(3);
        }
      }, delaySeconds * 1000);
    };

    scheduleDialog(estimatedSeconds());

    return () => {
      if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);
    };
  }, [isCollecting, estimatedSeconds, triggerDialog]);

  // ─── Dialog handlers ────────────────────────────────

  const handleContinueReading = useCallback(() => {
    setShowDialog(false);
    dialogTriggeredRef.current = false;
    dismissCountRef.current += 1;
    crossDwellStartRef.current = null;
    crossMissCountRef.current = 0;

    // Re-schedule time-based fallback (shorter interval)
    const reschedule = Math.max(5, estimatedSeconds() * 0.5);
    autoDetectTimerRef.current = setTimeout(() => {
      triggerDialog();
    }, reschedule * 1000);
  }, [estimatedSeconds, triggerDialog]);

  const handleConfirmDone = useCallback(() => {
    setShowDialog(false);
    if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);
    if (gazeCheckIntervalRef.current) clearInterval(gazeCheckIntervalRef.current);
    onDone();
  }, [onDone]);

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="z-40 fixed inset-0 bg-background cursor-none">
      {/* Rigid AOI-bounded reading surface (10%-65% Y, 20%-80% X) */}
      <div
        ref={paragraphContainerRef}
        className="absolute flex flex-col justify-center items-center overflow-hidden"
        style={{
          top: '10%',
          bottom: '35%', // Height = 55% (100% - 10% - 35%)
          left: '20%',
          right: '20%', // Width = 60% (100% - 20% - 20%)
        }}
        dir="ltr"
      >
        {/* Content with optimised reading typography */}
        <div
          className={cn(
            'w-full h-full overflow-hidden',
            isShortContent && 'flex items-center justify-center',
          )}
        >
          {isShortContent ? (
            // Syllables & pseudo-words: monospaced, large, evenly spaced
            <div className="flex flex-col justify-center items-center gap-6">
              <pre
                className={cn(
                  'font-mono text-center whitespace-pre-wrap',
                  'text-3xl leading-loose tracking-[0.25em] sm:text-4xl md:text-5xl',
                  'select-none',
                )}
              >
                {content}
              </pre>
              {/* Fixation cross — end marker */}
              <div className="flex justify-center items-center mt-4" aria-hidden="true">
                <span
                  ref={crossRef}
                  className="font-light text-muted-foreground/60 text-4xl select-none"
                >
                  +
                </span>
              </div>
            </div>
          ) : (
            // Paragraphs / meaningful text: large body text with end marker
            <div>
              {renderParagraphWithWords()}
              {/* Fixation cross — placed at the text's natural end */}
              <div className="flex justify-end mt-6" aria-hidden="true">
                <span
                  ref={crossRef}
                  className="font-light text-muted-foreground/60 text-4xl select-none"
                >
                  +
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Subtle live indicator */}
        {isCollecting && (
          <div className="bottom-4 left-1/2 absolute -translate-x-1/2 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-muted/60 backdrop-blur-sm px-3 py-1 rounded-full text-muted-foreground text-xs">
              <div className="bg-green-500 rounded-full w-1.5 h-1.5 animate-pulse" />
              <span>Tracking</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── "Are you done?" dialog ──────────────────── */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && handleContinueReading()}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center items-center bg-primary/10 mx-auto mb-2 rounded-full w-12 h-12">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Has the reader finished?</DialogTitle>
            <DialogDescription className="text-center">
              It looks like enough time has passed for this passage. Is the child done reading?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-center sm:justify-center gap-3">
            <Button variant="outline" onClick={handleContinueReading}>
              <Clock className="mr-2 w-4 h-4" />
              Need more time
            </Button>
            <Button onClick={handleConfirmDone}>Yes, done reading</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
