'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CalibrationPoint } from '../../types';
import {
  READING_ANCHOR_COLLECT_MS,
  READING_ANCHOR_LINES,
  READING_ANCHOR_MIN_SAMPLES,
  READING_ANCHOR_SETTLE_MS,
  READING_ANCHOR_TARGET_COUNT,
  READING_ANCHOR_TIMEOUT_MS,
  READING_ANCHOR_WORD_INDICES,
  READING_VALIDATION_WORD_INDICES,
  createReadingValidationPoint,
  readingAnchorPointIndex,
} from '../../lib/reading-anchor-constants';
import { getScreenInfo } from '../../lib/calibration-engine-constants';

type ReadingAnchorStage = 'settling' | 'waiting-for-stability' | 'collecting' | 'skipped' | 'complete';

interface ReadingAnchorPhaseProps {
  gridPointCount: number;
  gazeCursor: { x: number; y: number } | null;
  tracker: 'tobii' | 'webcam';
  fixationProgress: number;
  isStableFixation: boolean;
  captureCount: number;
  onTargetChange: () => void;
  onIngestTarget: (pointIndex: number, target: CalibrationPoint) => void;
  onComplete: (validationTargets: CalibrationPoint[]) => void;
  onCancel: () => void;
}

function getWordCenter(span: HTMLSpanElement | null): { x: number; y: number } | null {
  if (!span || typeof window === 'undefined') return null;

  const rect = span.getBoundingClientRect();
  const { width: screenWidth, height: screenHeight } = getScreenInfo();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return {
    x: centerX / screenWidth,
    y: centerY / screenHeight,
  };
}

export function ReadingAnchorPhase({
  gridPointCount,
  gazeCursor,
  tracker,
  fixationProgress,
  isStableFixation,
  captureCount,
  onTargetChange,
  onIngestTarget,
  onComplete,
  onCancel,
}: ReadingAnchorPhaseProps) {
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [stage, setStage] = useState<ReadingAnchorStage>('settling');
  const wordRefs = useRef<Array<Array<HTMLSpanElement | null>>>([]);
  const anchorTargetsRef = useRef<CalibrationPoint[]>([]);
  const validationTargetsRef = useRef<CalibrationPoint[]>([]);
  const completedRef = useRef(false);
  const skippedRef = useRef(false);

  // Track capture count at the start of each word to know how many samples
  // were collected specifically for this word.
  const wordStartCaptureCountRef = useRef<number>(0);
  const wordStartedAtRef = useRef<number>(0);
  const lastStageRef = useRef<ReadingAnchorStage>('settling');

  const measureTargets = useCallback(() => {
    const nextAnchors: CalibrationPoint[] = [];
    const nextValidationTargets: CalibrationPoint[] = [];

    for (let lineIndex = 0; lineIndex < READING_ANCHOR_TARGET_COUNT; lineIndex++) {
      const anchorWordIndex = READING_ANCHOR_WORD_INDICES[lineIndex];
      const validationWordIndex = READING_VALIDATION_WORD_INDICES[lineIndex];
      const anchorCenter = getWordCenter(wordRefs.current[lineIndex]?.[anchorWordIndex] ?? null);
      const validationCenter = getWordCenter(
        wordRefs.current[lineIndex]?.[validationWordIndex] ?? null,
      );

      if (anchorCenter) {
        nextAnchors[lineIndex] = {
          x: anchorCenter.x,
          y: anchorCenter.y,
          phase: 'READING_ANCHOR',
          label: `reading-anchor-line-${lineIndex + 1}`,
        };
      }

      if (validationCenter) {
        nextValidationTargets.push(
          createReadingValidationPoint(validationCenter.x, validationCenter.y, lineIndex),
        );
      }
    }

    anchorTargetsRef.current = nextAnchors;
    validationTargetsRef.current = nextValidationTargets;
  }, []);

  useLayoutEffect(() => {
    measureTargets();
    window.addEventListener('resize', measureTargets);
    return () => window.removeEventListener('resize', measureTargets);
  }, [measureTargets]);

  /* ---- Validate point index integrity at mount ---- */
  useEffect(() => {
    // Ensure reading anchor indices don't collide with grid indices
    const firstAnchorIndex = readingAnchorPointIndex(0, gridPointCount);
    const lastAnchorIndex = readingAnchorPointIndex(READING_ANCHOR_TARGET_COUNT - 1, gridPointCount);
    const gridIndicesEnd = gridPointCount - 1;

    if (firstAnchorIndex <= gridIndicesEnd) {
      console.error(
        `[READING ANCHORS] CRITICAL: Point index collision detected! ` +
        `Grid uses 0-${gridIndicesEnd}, but anchors start at ${firstAnchorIndex}. ` +
        `IDW centroid builder will merge samples from different screen positions!`,
      );
    } else {
      console.log(
        `[READING ANCHORS] Using point indices ${firstAnchorIndex}-${lastAnchorIndex} (grid uses 0-${gridIndicesEnd})`,
      );
    }
  }, [gridPointCount]);

  /* ---- Settle phase: fixed duration to let child find the highlighted word ---- */
  useEffect(() => {
    if (stage !== 'settling') return;

    skippedRef.current = false;
    onTargetChange();
    wordStartedAtRef.current = performance.now();
    lastStageRef.current = 'settling';

    const settleTimer = setTimeout(() => {
      // Move to waiting-for-stability after settling
      setStage('waiting-for-stability');
    }, READING_ANCHOR_SETTLE_MS);

    return () => clearTimeout(settleTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLineIndex, onTargetChange, stage]);

  /* ---- Waiting-for-stability phase: wait for isStableFixation to become true ---- */
  useEffect(() => {
    if (stage !== 'waiting-for-stability') return;

    const target = anchorTargetsRef.current[activeLineIndex];
    if (!target) {
      // No valid target for this line — skip it
      console.warn(
        `[READING ANCHOR] Skipped line ${activeLineIndex} — no valid word target found`,
      );
      advanceToNextWord('skipped');
      return;
    }

    // Track when we started waiting for stability
    const stabilityWaitStartedAt = performance.now();
    let advanced = false;
    let rafId = 0;

    const checkStability = () => {
      if (advanced) return;

      const elapsedMs = performance.now() - stabilityWaitStartedAt;

      // If stable fixation achieved, move to collecting
      if (isStableFixation) {
        advanced = true;
        // Reset capture count at the START of collection (now that we're stable)
        wordStartCaptureCountRef.current = captureCount;
        wordStartedAtRef.current = performance.now(); // Reset timer for overall timeout
        console.log(
          `[READING ANCHOR] Line ${activeLineIndex} — stable fixation detected, starting collection`,
        );
        setStage('collecting');
        return;
      }

      // Timeout: no stable fixation within READING_ANCHOR_TIMEOUT_MS
      if (elapsedMs >= READING_ANCHOR_TIMEOUT_MS) {
        advanced = true;
        console.warn(
          `[READING ANCHOR] Skipped line ${activeLineIndex} — no stable fixation achieved within ${Math.round(elapsedMs)}ms`,
        );
        advanceToNextWord('skipped');
        return;
      }

      // Keep checking
      rafId = requestAnimationFrame(checkStability);
    };

    rafId = requestAnimationFrame(checkStability);

    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLineIndex, isStableFixation, onComplete, stage, captureCount]);

  /* ---- Collect phase: only ingest samples while stable, advance when enough collected ---- */
  useEffect(() => {
    if (stage !== 'collecting') return;

    const target = anchorTargetsRef.current[activeLineIndex];
    if (!target) {
      // No valid target for this line — skip it
      console.warn(
        `[READING ANCHOR] Skipped line ${activeLineIndex} — no valid word target found`,
      );
      advanceToNextWord('skipped');
      return;
    }

    const pointIndex = readingAnchorPointIndex(activeLineIndex, gridPointCount);
    let advanced = false;
    let animationFrame = 0;
    // Max time from start of settling to ensure we don't hang
    const maxCollectionTimeMs = READING_ANCHOR_SETTLE_MS + READING_ANCHOR_TIMEOUT_MS + 1000;

    const loop = () => {
      if (advanced) return;
      const elapsedMs = performance.now() - wordStartedAtRef.current; // Measured from settling start
      const samplesThisWord = captureCount - wordStartCaptureCountRef.current;

      // Condition 1: Enough samples collected → check quality before advancing
      if (samplesThisWord >= READING_ANCHOR_MIN_SAMPLES) {
        advanced = true;

        // Quality gate: only ingest if >= 15 samples collected
        if (samplesThisWord >= 15) {
          console.log(
            `[READING ANCHOR] Line ${activeLineIndex} — collected ${samplesThisWord} stable samples, advancing`,
          );
          // Ingest this anchor since quality is good
          onIngestTarget(pointIndex, target);
          advanceToNextWord('collecting');
        } else {
          // Low quality: discard and warn
          console.warn(
            `[READING ANCHOR] Low quality: line ${activeLineIndex} only got ${samplesThisWord} samples, discarding`,
          );
          // Do NOT call onIngestTarget - these samples are discarded
          advanceToNextWord('collecting');
        }
        return;
      }

      // Condition 2: Overall timeout exceeded → skip this word
      if (elapsedMs >= maxCollectionTimeMs) {
        advanced = true;
        console.warn(
          `[READING ANCHOR] Skipped line ${activeLineIndex} — no stable fixation (samples=${samplesThisWord}, elapsed=${Math.round(elapsedMs)}ms)`,
        );
        advanceToNextWord('skipped');
        return;
      }

      // Keep checking - don't ingest yet until we validate quality
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLineIndex, gridPointCount, onComplete, onIngestTarget, stage, captureCount]);

  function advanceToNextWord(fromStage: 'collecting' | 'skipped') {
    if (completedRef.current) return;

    if (activeLineIndex >= READING_ANCHOR_TARGET_COUNT - 1) {
      // Last word — finish
      completedRef.current = true;
      setStage('complete');

      // Verify validation targets before passing to callback
      if (validationTargetsRef.current.length > 0) {
        console.log(
          `[READING ANCHORS] Passing ${validationTargetsRef.current.length} validation targets to calibration engine`,
          validationTargetsRef.current.map((t) => ({
            x: t.x.toFixed(3),
            y: t.y.toFixed(3),
            phase: t.phase,
            label: t.label,
          })),
        );
      } else {
        console.warn('[READING ANCHORS] No validation targets created');
      }
      onComplete(validationTargetsRef.current);
      return;
    }

    lastStageRef.current = fromStage === 'skipped' ? 'skipped' : 'collecting';
    setStage('settling');
    setActiveLineIndex((current) => current + 1);
  }

  const wordsCompleted = activeLineIndex + (stage === 'settling' || stage === 'waiting-for-stability' || stage === 'collecting' ? 0 : 1);
  const totalTargets = READING_ANCHOR_TARGET_COUNT;
  const progress = Math.min(1, wordsCompleted / totalTargets);
  const showFaceLost = tracker === 'webcam' && !gazeCursor;

  const DEBUG_GAZE_OVERLAY = process.env.NEXT_PUBLIC_DEBUG_GAZE_OVERLAY === 'true';

  return (
    <div className="fixed inset-0 z-50 cursor-none overflow-hidden bg-[#FDF8F0]">
      <div
        className="absolute flex flex-col"
        style={{
          top: '10%',
          left: '20%',
          right: '20%',
          bottom: '5%',
        }}
        dir="ltr"
      >
        <div className="w-full flex-1 min-h-0">
          <div>
            <p
              className="select-none whitespace-pre-line text-left font-normal leading-loose text-[#2D2A26] sm:leading-loose md:leading-loose"
              style={{
                fontSize: 'clamp(1.15rem, 2.5vw, 1.875rem)',
                letterSpacing: '0.05em',
                wordSpacing: '0.12em',
              }}
            >
              {READING_ANCHOR_LINES.map((line, lineIndex) => (
                <span key={lineIndex} className="block">
                  {line.map((word, wordIndex) => {
                    const isAnchor =
                      lineIndex === activeLineIndex &&
                      wordIndex === READING_ANCHOR_WORD_INDICES[lineIndex] &&
                      stage !== 'complete';

                    return (
                      <span key={`${lineIndex}-${wordIndex}`}>
                        <span
                          ref={(node) => {
                            if (!wordRefs.current[lineIndex]) wordRefs.current[lineIndex] = [];
                            wordRefs.current[lineIndex][wordIndex] = node;
                          }}
                          className={[
                            'border-b-2 px-0.5 transition-colors duration-150',
                            isAnchor
                              ? 'border-emerald-600 bg-emerald-500/20 text-[#1F3D2A]'
                              : 'border-transparent',
                          ].join(' ')}
                        >
                          {word}
                        </span>
                        {wordIndex < line.length - 1 ? ' ' : ''}
                      </span>
                    );
                  })}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      {/* Gaze dot during reading anchor collection (shows for all trackers when debug enabled) */}
      {DEBUG_GAZE_OVERLAY && gazeCursor && (
        <div
          className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-[#4A7C59]/80 shadow-[0_0_12px_rgba(74,124,89,0.8)]"
          style={{ left: gazeCursor.x, top: gazeCursor.y }}
        />
      )}

      {/* Face lost overlay for webcam */}
      {showFaceLost && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#FDF8F0]/80 backdrop-blur-[2px]">
          <div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-[#E8E0D4] bg-white/90 px-7 py-6 text-center shadow-lg">
            <p className="text-sm font-semibold text-[#2D2A26]">Face not detected</p>
            <p className="text-xs leading-relaxed text-[#8B857E]">
              Keep your face visible and well-lit while looking at the highlighted word.
            </p>
          </div>
        </div>
      )}

      {/* Bottom bar: progress + stable fixation indicator */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-16 items-center justify-center">
        <div className="w-[min(420px,85vw)] rounded-xl border border-[#E8E0D4] bg-white/85 px-5 py-2.5 shadow-sm backdrop-blur-md">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-[#8B857E]">
              Reading check
              {(stage === 'waiting-for-stability' || stage === 'collecting') && (
                <span className="inline-flex items-center gap-1">
                  {isStableFixation ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                  <span className="text-[10px]">
                    {isStableFixation ? 'looking' : 'searching...'}
                  </span>
                </span>
              )}
            </span>
            <span className="text-xs font-semibold text-[#2D2A26]">
              {wordsCompleted} / {totalTargets}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E8E0D4]/60">
            <div
              className="h-full rounded-full bg-[#4A7C59] transition-all duration-150"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Skip button */}
      <div className="absolute bottom-16 right-4 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="border-[#E8E0D4] bg-white/70 text-xs text-[#8B857E] backdrop-blur-sm hover:text-[#2D2A26]"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}