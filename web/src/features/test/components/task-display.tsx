'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
}

/**
 * Immersive reading surface with a fixation cross at the end of the text.
 *
 * End-of-reading detection:
 * 1. Primary: gaze enters a proximity radius of the fixation cross for `CROSS_DWELL_MS`
 * 2. Fallback: time-based estimate from word count
 * Both require `MIN_GAZE_POINTS` before the dialog can appear.
 */
export function TaskDisplay({
  taskType,
  content,
  language,
  pointCount,
  isCollecting,
  onDone,
  getLastGazePosition,
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

  // ─── Compute estimated reading time ─────────────────

  const estimatedSeconds = useCallback(() => {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return Math.max(MIN_AUTO_DETECT_SECONDS, (wordCount / ESTIMATED_READING_WPM) * 60);
  }, [content]);

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
    <div className="fixed inset-0 z-40 flex cursor-none items-center justify-center bg-background">
      {/* Reading surface */}
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center px-8 py-12',
          'sm:px-16 md:px-24 lg:px-32',
        )}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Content with optimised reading typography */}
        <div
          className={cn(
            'w-full max-w-5xl',
            isShortContent && 'flex items-center justify-center',
          )}
        >
          {isShortContent ? (
            // Syllables & pseudo-words: monospaced, large, evenly spaced
            <div className="flex flex-col items-center gap-6">
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
              <p
                className={cn(
                  'whitespace-pre-line',
                  'text-xl leading-[2] tracking-wide sm:text-2xl sm:leading-[2] md:text-3xl md:leading-[2]',
                  'font-normal select-none',
                  isArabic && 'text-right',
                )}
              >
                {content}
              </p>
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
