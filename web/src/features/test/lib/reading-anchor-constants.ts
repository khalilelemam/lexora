import type { CalibrationPoint } from '../types';

export const READING_ANCHOR_SETTLE_MS = 450;
export const READING_ANCHOR_COLLECT_MS = 900;
export const READING_ANCHOR_TARGET_COUNT = 5;

/**
 * Minimum stable samples required per reading anchor word before advancing.
 * At ~60fps ingestion, the engine's stability gate + CAPTURE_COOLDOWN_MS (45ms)
 * means roughly 1 sample every ~50–60ms during stable fixation.
 * 20 samples ≈ 1 second of stable collection per word.
 */
export const READING_ANCHOR_MIN_SAMPLES = 25;

/**
 * Maximum time (ms) to wait for stable fixation on a reading anchor word.
 * If the child cannot fixate within this window, the word is skipped
 * (no data collected) and a warning is logged.
 */
export const READING_ANCHOR_TIMEOUT_MS = 3500;

export const READING_ANCHOR_LINES = [
  ['Maya', 'found', 'a', 'quiet', 'corner', 'near', 'the', 'window.'],
  ['She', 'read', 'each', 'sentence', 'slowly', 'and', 'carefully.'],
  ['The', 'bright', 'story', 'helped', 'her', 'notice', 'small', 'details.'],
  ['Every', 'line', 'gave', 'her', 'another', 'clue', 'to', 'follow.'],
  ['When', 'she', 'finished', 'the', 'page', 'she', 'smiled', 'softly.'],
] as const;

export const READING_ANCHOR_WORD_INDICES = [3, 4, 2, 6, 4] as const;
export const READING_VALIDATION_WORD_INDICES = [5, 2, 5, 3, 6] as const;

export function readingAnchorPointIndex(lineIndex: number, gridPointCount: number): number {
  return gridPointCount + lineIndex;
}

export function createReadingValidationPoint(
  x: number,
  y: number,
  lineIndex: number,
): CalibrationPoint {
  return {
    x,
    y,
    phase: 'READING_VALIDATION',
    label: `reading-validation-line-${lineIndex + 1}`,
  };
}