'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureTaskScreenshot } from '@/features/test/lib/capture-task-screenshot';
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
  READING_ZONE_BOUNDS,
} from '../lib/constants';

/* ── Public types ──────────────────────────────────────── */

export interface TaskDisplayProps {
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
   * Currently unused but kept for future gaze-based detection.
   */
  getLastGazePosition?: () => { x: number; y: number } | null;
  /**
   * When true, renders in read-only mode — no end-of-reading detection,
   * no dialog. Used by the review panel and results page to display
   * the exact same text layout for gaze overlay.
   */
  preview?: boolean;
  /**
   * Optional: called once with a JPEG data URL of the reading surface.
   * Used to capture the exact visual layout for export visualizations.
   */
  onScreenshotReady?: (dataUrl: string) => void;
  /**
   * Called when the "done reading?" dialog opens so the parent can
   * pause gaze collection. Prevents recording noise while the dialog
   * is visible.
   */
  onPauseCollection?: () => void;
  /**
   * Called when the user dismisses the dialog with "Continue Reading"
   * so the parent can resume gaze collection.
   */
  onResumeCollection?: () => void;
  debugOpenDoneDialog?: boolean;
}

/**
 * Immersive reading surface.
 *
 * Text layout:
 * - Horizontal margins match calibration X bounds (20%–80%)
 * - Text flows naturally from the top (10% padding) with no bottom clipping
 * - Font automatically scales down if text would exceed the reading zone
 *
 * End-of-reading detection (disabled in preview mode):
 * - Time-based estimate from word count triggers "are you done?" dialog
 * - Requires `MIN_GAZE_POINTS` before the dialog can appear
 */
export function TaskDisplay({
  taskType,
  content,
  pointCount,
  isCollecting,
  onDone,
  onScreenshotReady,
  onPauseCollection,
  onResumeCollection,
  debugOpenDoneDialog = false,
  preview = false,
}: TaskDisplayProps) {
  const [showDialog, setShowDialog] = useState(debugOpenDoneDialog);
  const [fontScale, setFontScale] = useState(1);
  const autoDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const dismissCountRef = useRef(0);
  const dialogTriggeredRef = useRef(false);

  // Ref to the text content wrapper for measurement
  const textContentRef = useRef<HTMLDivElement>(null);
  // Ref to the reading zone container for overflow detection
  const readingZoneRef = useRef<HTMLDivElement>(null);
  // Ref to the root element for screenshot capture
  const rootRef = useRef<HTMLDivElement>(null);
  // Track if screenshot was already captured (fire-once)
  const screenshotCapturedRef = useRef(false);
  // Stable ref for the screenshot callback to avoid effect re-runs
  const onScreenshotReadyRef = useRef(onScreenshotReady);
  useEffect(() => {
    onScreenshotReadyRef.current = onScreenshotReady;
  }, [onScreenshotReady]);

  // Keep a ref so timers can read the *current* value without stale closures
  const pointCountRef = useRef(pointCount);
  useEffect(() => {
    pointCountRef.current = pointCount;
  }, [pointCount]);

  const isSyllables = taskType === 'syllables';
  const isPseudoWords = taskType === 'pseudo-words';
  const isShortContent = isSyllables || isPseudoWords;

  useEffect(() => {
    if (!debugOpenDoneDialog || preview) return;

    const timer = window.setTimeout(() => {
      dialogTriggeredRef.current = true;
      onPauseCollection?.();
      setShowDialog(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [debugOpenDoneDialog, onPauseCollection, preview]);

  // ─── Screenshot capture ────────────────────────────
  // Fires once when isCollecting becomes true (text is rendered,
  // no overlays present). Best-effort — never blocks the test.
  useEffect(() => {
    if (
      !isCollecting ||
      preview ||
      screenshotCapturedRef.current ||
      !rootRef.current ||
      !onScreenshotReadyRef.current
    ) {
      return;
    }

    screenshotCapturedRef.current = true;

    // Small delay to ensure the browser has fully painted the text.
    const timer = setTimeout(() => {
      if (rootRef.current) {
        void captureTaskScreenshot(rootRef.current).then((dataUrl) => {
          if (dataUrl) {
            onScreenshotReadyRef.current?.(dataUrl);
          }
        });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isCollecting, preview]);

  // ─── Trigger the done-reading dialog ────────────────

  const triggerDialog = useCallback(() => {
    if (preview) return;
    if (dialogTriggeredRef.current) return;
    if (pointCountRef.current < MIN_GAZE_POINTS) return;
    dialogTriggeredRef.current = true;
    onPauseCollection?.();
    setShowDialog(true);
  }, [preview, onPauseCollection]);

  // ─── Auto-scale font if text overflows the reading zone ───

  useLayoutEffect(() => {
    if (isShortContent || !readingZoneRef.current) return;

    const zone = readingZoneRef.current;
    const availableHeight = zone.clientHeight;
    const contentHeight = zone.scrollHeight;

    if (contentHeight > availableHeight && fontScale > 0.7) {
      const ratio = availableHeight / contentHeight;
      setFontScale(Math.max(0.7, ratio * fontScale));
    }
  }, [isShortContent, content, fontScale]);

  // ─── Compute estimated reading time ─────────────────

  const estimatedSeconds = useCallback(() => {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return Math.max(MIN_AUTO_DETECT_SECONDS, (wordCount / ESTIMATED_READING_WPM) * 60);
  }, [content]);

  // ─── Render paragraph with word wrapping for measurement ───

  const renderParagraphWithWords = () => {
    const words = content.split(/(\s+)/);

    return (
      <div ref={textContentRef}>
        <p
          className={cn(
            'leading-loose whitespace-pre-line text-[#1b2021] sm:leading-loose md:leading-loose',
            'text-left font-[family-name:var(--font-lexend)] select-none',
          )}
          style={{
            fontSize: `calc(${fontScale} * clamp(1.15rem, 2.5vw, 1.875rem))`,
            letterSpacing: '0.1em',
            wordSpacing: '0.3em',
          }}
        >
          {words.map((word, idx) => {
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
    if (preview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isCollecting) {
        e.preventDefault();
        triggerDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollecting, triggerDialog, preview]);

  // ─── Time-based auto-detect (primary detection) ─────

  useEffect(() => {
    if (preview || !isCollecting) return;

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
  }, [preview, isCollecting, estimatedSeconds, triggerDialog]);

  // ─── Dialog handlers ────────────────────────────────

  const handleContinueReading = useCallback(() => {
    setShowDialog(false);
    dialogTriggeredRef.current = false;
    dismissCountRef.current += 1;
    onResumeCollection?.();

    // Re-schedule time-based fallback (shorter interval)
    const reschedule = Math.max(5, estimatedSeconds() * 0.5);
    autoDetectTimerRef.current = setTimeout(() => {
      triggerDialog();
    }, reschedule * 1000);
  }, [estimatedSeconds, triggerDialog, onResumeCollection]);

  const handleConfirmDone = useCallback(() => {
    setShowDialog(false);
    if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);
    onDone();
  }, [onDone]);

  // ─── Render ─────────────────────────────────────────

  return (
    <div ref={rootRef} className={cn('fixed inset-0 z-40 bg-[#e3dcc2]', !preview && 'cursor-none')}>
      {/*
       * Reading zone — text flows within the replay/export bounds.
       * Horizontal bounds: 25%–75% of screen (within calibration X: 0.2–0.8)
       * Vertical bounds: 18%–62% of screen (within calibration Y: 0.15–0.60)
       */}
      <div
        ref={readingZoneRef}
        className="absolute flex flex-col"
        style={{
          top: `${READING_ZONE_BOUNDS.top * 100}%`,
          left: `${READING_ZONE_BOUNDS.left * 100}%`,
          right: `${READING_ZONE_BOUNDS.right * 100}%`,
          bottom: `${READING_ZONE_BOUNDS.bottom * 100}%`,
        }}
        dir="ltr"
      >
        <div
          className={cn(
            'min-h-0 w-full flex-1',
            preview ? 'overflow-hidden' : 'overflow-visible',
            isShortContent && 'flex items-center justify-center',
          )}
          style={preview ? undefined : { scrollbarWidth: 'none' }}
        >
          {isShortContent ? (
            <div className="flex flex-col items-center justify-center gap-6">
              <pre
                className={cn(
                  'text-center font-mono whitespace-pre-wrap text-[#1b2021]',
                  'text-3xl leading-loose tracking-[0.25em] sm:text-4xl md:text-5xl',
                  'select-none',
                )}
              >
                {content}
              </pre>
            </div>
          ) : (
            <div>{renderParagraphWithWords()}</div>
          )}
        </div>
      </div>

      {/* Tracking indicator — pinned to bottom of screen */}
      {isCollecting && !preview && (
        <div
          className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2"
          style={{ bottom: '12px' }}
        >
          <div className="flex items-center gap-1.5 border border-[#51513d]/18 bg-[#f3edd7]/75 px-3 py-1 text-xs text-[#51513d]/70 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a6a867]" />
            <span>Tracking</span>
          </div>
        </div>
      )}

      {/* ─── "Are you done?" dialog ──────────────────── */}
      {!preview && (
        <Dialog open={showDialog} onOpenChange={(open) => !open && handleContinueReading()}>
          <DialogContent
            showCloseButton={false}
            className="border-[#51513d]/18 bg-[#f3edd7] p-0 text-[#1b2021] shadow-[14px_14px_0_rgba(81,81,61,.12)] sm:max-w-lg"
          >
            <DialogHeader className="border-b border-[#51513d]/12 px-6 pt-6 pb-5 text-left">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center border border-[#51513d]/18 bg-[#e3dcc2]">
                  <BookOpen className="h-6 w-6 text-[#51513d]" />
                </div>
                <div className="border border-[#51513d]/14 bg-[#e3dcc2]/70 px-3 py-1.5 font-mono text-[10px] font-black tracking-widest text-[#51513d] uppercase">
                  Reading checkpoint
                </div>
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-[#1b2021]">
                Done reading?
              </DialogTitle>
              <DialogDescription className="pt-2 text-sm leading-relaxed text-[#51513d]">
                Confirm only when the reader has reached the final word. If they are still reading,
                keep collecting gaze data.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
              <div className="border border-[#51513d]/14 bg-[#e3dcc2]/55 p-3">
                <span className="font-mono text-[10px] font-black text-[#a6a867]">01</span>
                <p className="mt-1 text-xs font-bold text-[#1b2021]">More time keeps recording</p>
              </div>
              <div className="border border-[#51513d]/14 bg-[#e3dcc2]/55 p-3">
                <span className="font-mono text-[10px] font-black text-[#a6a867]">02</span>
                <p className="mt-1 text-xs font-bold text-[#1b2021]">Done submits this passage</p>
              </div>
            </div>
            <DialogFooter className="flex-row justify-center gap-3 border-t border-[#51513d]/12 px-6 pt-5 pb-6 sm:justify-end">
              <Button
                variant="outline"
                onClick={handleContinueReading}
                className="border-[#51513d]/30 bg-[#f3edd7] text-[#51513d] hover:bg-[#e3dcc2] hover:text-[#1b2021]"
              >
                <Clock className="mr-2 h-4 w-4" />
                Keep Reading
              </Button>
              <Button
                onClick={handleConfirmDone}
                className="bg-[#51513d] text-[#f3edd7] hover:bg-[#1b2021]"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Done Reading
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
