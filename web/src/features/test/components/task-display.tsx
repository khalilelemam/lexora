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
import type { Language } from '../types';
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
  /** Current language (affects text direction) */
  language: Language;
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
  language,
  pointCount,
  isCollecting,
  onDone,
  getLastGazePosition,
  onLineCentersReady,
}: TaskDisplayProps) {
  const [showDialog, setShowDialog] = useState(false);
  const autoDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gazeCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());
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
  pointCountRef.current = pointCount;

  const isArabic = language === 'ar';
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

    // Get the paragraph container's bounding box (for backward compat logging only)
    const containerRect = paragraphContainerRef.current.getBoundingClientRect();

    // DEBUG: Log container and screen measurements
    const debugData = {
      containerTop: containerRect.top,
      containerBottom: containerRect.bottom,
      textTop: textTop,
      textBottom: textBottom,
      textHeight: textHeight,
      containerLeft: containerRect.left,
      containerRight: containerRect.right,
      containerHeight: containerRect.height,
      containerWidth: containerRect.width,
      windowInnerHeight: window.innerHeight,
      windowInnerWidth: window.innerWidth,
      screenHeight: window.screen.height,
      screenWidth: window.screen.width,
      detectedLines: lineMap.size,
    };

    console.log('=== LINE CENTER MEASUREMENT DEBUG ===', debugData);

    // Send to server
    fetch('http://localhost:8001/debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '=== LINE CENTER MEASUREMENT DEBUG ===',
        data: debugData,
      }),
    }).catch(() => { });

    // Calculate the vertical center of each line and normalize
    const lineCenters: number[] = [];
    const sortedLineKeys = Array.from(lineMap.keys()).sort((a, b) => a - b);

    sortedLineKeys.forEach((lineKey, lineIndex) => {
      const rects = lineMap.get(lineKey)!;

      // Calculate the absolute vertical center of this line
      const minTop = Math.min(...rects.map(r => r.top));
      const maxBottom = Math.max(...rects.map(r => r.bottom));
      const lineCenterAbsolute = (minTop + maxBottom) / 2;

      // CRITICAL FIX: Normalize relative to TEXT CONTENT (not container)
      // This ensures line centers are consistent regardless of container padding
      if (textHeight > 0) {
        const normalizedCenter = (lineCenterAbsolute - textTop) / textHeight;
        const clamped = Math.max(0, Math.min(1, normalizedCenter));
        lineCenters.push(clamped);

        // DEBUG: Log each line's measurements
        const lineData = {
          rawTopPx: minTop,
          rawBottomPx: maxBottom,
          lineCenterAbsolutePx: lineCenterAbsolute,
          textTopPx: textTop,
          textHeightPx: textHeight,
          normalizedCenter: normalizedCenter,
          clamped: clamped,
        };
        console.log(`Line ${lineIndex}:`, lineData);

        fetch('http://localhost:8001/debug/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Line ${lineIndex} measurement`,
            data: lineData,
          }),
        }).catch(() => { });
      }
    });

    const finalData = {
      finalNormalizedLineCenters: lineCenters,
      totalLines: lineCenters.length,
    };
    console.log('Final normalized line centers:', finalData);
    fetch('http://localhost:8001/debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '=== FINAL LINE CENTERS ===',
        data: finalData,
      }),
    }).catch(() => { });

    onLineCentersReady(lineCenters);
  }, [isShortContent, onLineCentersReady, content]);

  // ─── Detect overflow outside AOI bounds ─────────────────

  useLayoutEffect(() => {
    if (isShortContent || !paragraphContainerRef.current) return;

    const container = paragraphContainerRef.current;
    const hasOverflow = container.scrollHeight > container.clientHeight;

    if (hasOverflow) {
      const message = `[OVERFLOW] Text exceeds AOI bounds - Container: ${container.clientHeight}px, Content: ${container.scrollHeight}px`;
      console.error(message);

      // Send debug log to server
      fetch('/api/debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'AOI Overflow Detected',
          data: {
            message,
            containerHeight: container.clientHeight,
            scrollHeight: container.scrollHeight,
            overage: container.scrollHeight - container.clientHeight,
          },
        }),
      }).catch(() => { });
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
            'whitespace-pre-line',
            'text-xl leading-[2] tracking-wide sm:text-2xl sm:leading-[2] md:text-3xl md:leading-[2]',
            'font-normal select-none',
            isArabic && 'text-right',
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
      const dist = Math.sqrt(
        (pos.x - crossCenterX) ** 2 + (pos.y - crossCenterY) ** 2,
      );

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
    <div className="fixed inset-0 z-40 cursor-none bg-background">
      {/* Rigid AOI-bounded reading surface (10%-65% Y, 20%-80% X) */}
      <div
        ref={paragraphContainerRef}
        className="absolute flex flex-col items-center justify-center overflow-hidden"
        style={{
          top: '10%',
          bottom: '35%',  // Height = 55% (100% - 10% - 35%)
          left: '20%',
          right: '20%',   // Width = 60% (100% - 20% - 20%)
        }}
        dir={isArabic ? 'rtl' : 'ltr'}
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
            <div className="flex flex-col items-center justify-center gap-6">
              <pre
                className={cn(
                  'whitespace-pre-wrap text-center font-mono',
                  'text-3xl leading-loose tracking-[0.25em] sm:text-4xl md:text-5xl',
                  'select-none',
                )}
              >
                {content}
              </pre>
              {/* Fixation cross — end marker */}
              <div className="mt-4 flex items-center justify-center" aria-hidden="true">
                <span ref={crossRef} className="text-4xl font-light text-muted-foreground/60 select-none">+</span>
              </div>
            </div>
          ) : (
            // Paragraphs / meaningful text: large body text with end marker
            <div>
              {renderParagraphWithWords()}
              {/* Fixation cross — placed at the text's natural end */}
              <div
                className={cn(
                  'mt-6 flex',
                  isArabic ? 'justify-start' : 'justify-end',
                )}
                aria-hidden="true"
              >
                <span ref={crossRef} className="text-4xl font-light text-muted-foreground/60 select-none">+</span>
              </div>
            </div>
          )}
        </div>

        {/* Subtle live indicator */}
        {isCollecting && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              <span>Tracking</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── "Are you done?" dialog ──────────────────── */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && handleContinueReading()}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Has the reader finished?</DialogTitle>
            <DialogDescription className="text-center">
              {dismissCountRef.current === 0
                ? 'It looks like enough time has passed for this passage. Is the child done reading?'
                : 'Still reading? Take as much time as needed.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-center gap-3 sm:justify-center">
            <Button variant="outline" onClick={handleContinueReading}>
              <Clock className="mr-2 h-4 w-4" />
              Need more time
            </Button>
            <Button onClick={handleConfirmDone}>Yes, done reading</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
