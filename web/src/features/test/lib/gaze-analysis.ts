import type { GazeFeature } from '../types';

export interface RawReadingGazePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface RawFixation {
  x: number;
  y: number;
  durationMs: number;
  startTimestamp: number;
  endTimestamp: number;
}

export interface ReadingAnalysis {
  wordCount: number;
  totalSeconds: number;
  readingWpm: number;
  sampleCount: number;
  fixationCount: number;
  avgFixationMs: number;
  regressionCount: number;
  returnSweepCount: number;
  fixations: RawFixation[];
}

export interface DerivedGazeAnalysis {
  fixationCount: number;
  avgFixationMs: number;
  regressionCount: number;
  returnSweepCount: number;
  avgSaccadeAmplitude: number;
  avgEfficiencyRatio: number | null;
}

const FIXATION_DISPERSION_PX = 100;
const MIN_FIXATION_MS = 100;
const REGRESSION_X_PX = 80;
const LINE_Y_PX = 44;

function finitePoint(point: RawReadingGazePoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.timestamp);
}

export function sanitizeRawGaze(points: RawReadingGazePoint[]): RawReadingGazePoint[] {
  return points
    .filter(finitePoint)
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(
      (point, index, sorted) => index === 0 || point.timestamp >= sorted[index - 1].timestamp,
    );
}

export function calculateRawFixations(points: RawReadingGazePoint[]): RawFixation[] {
  const sorted = sanitizeRawGaze(points);
  const fixations: RawFixation[] = [];
  let start = 0;

  while (start < sorted.length) {
    let end = start;
    let minX = sorted[start].x;
    let maxX = sorted[start].x;
    let minY = sorted[start].y;
    let maxY = sorted[start].y;

    while (end + 1 < sorted.length) {
      const next = sorted[end + 1];
      const nextMinX = Math.min(minX, next.x);
      const nextMaxX = Math.max(maxX, next.x);
      const nextMinY = Math.min(minY, next.y);
      const nextMaxY = Math.max(maxY, next.y);
      const dispersion = nextMaxX - nextMinX + (nextMaxY - nextMinY);

      if (dispersion > FIXATION_DISPERSION_PX) break;

      minX = nextMinX;
      maxX = nextMaxX;
      minY = nextMinY;
      maxY = nextMaxY;
      end += 1;
    }

    const startTimestamp = sorted[start].timestamp;
    const endTimestamp = sorted[end].timestamp;
    const durationMs = endTimestamp - startTimestamp;

    if (durationMs >= MIN_FIXATION_MS) {
      fixations.push({
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        durationMs,
        startTimestamp,
        endTimestamp,
      });
    }

    start = Math.max(end + 1, start + 1);
  }

  return fixations;
}

export function calculateReadingAnalysis(
  content: string | undefined,
  points: RawReadingGazePoint[],
): ReadingAnalysis | null {
  const sorted = sanitizeRawGaze(points);
  const wordCount = content?.trim().split(/\s+/).filter(Boolean).length ?? 0;

  if (wordCount === 0 || sorted.length < 2) return null;

  const totalMs = Math.max(0, sorted[sorted.length - 1].timestamp - sorted[0].timestamp);
  const totalSeconds = totalMs / 1000;
  const readingWpm = totalSeconds > 0 ? Math.round(wordCount / (totalSeconds / 60)) : 0;
  const fixations = calculateRawFixations(sorted);

  let regressionCount = 0;
  let returnSweepCount = 0;

  for (let i = 1; i < fixations.length; i += 1) {
    const previous = fixations[i - 1];
    const current = fixations[i];
    const movedLeft = previous.x - current.x;
    const movedDown = current.y - previous.y;
    const sameLine = Math.abs(current.y - previous.y) < LINE_Y_PX;

    if (movedLeft > REGRESSION_X_PX && movedDown > LINE_Y_PX) {
      returnSweepCount += 1;
    } else if (movedLeft > REGRESSION_X_PX && sameLine) {
      regressionCount += 1;
    }
  }

  const avgFixationMs =
    fixations.length > 0
      ? Math.round(
          fixations.reduce((sum, fixation) => sum + fixation.durationMs, 0) / fixations.length,
        )
      : 0;

  return {
    wordCount,
    totalSeconds: Math.round(totalSeconds),
    readingWpm,
    sampleCount: sorted.length,
    fixationCount: fixations.length,
    avgFixationMs,
    regressionCount,
    returnSweepCount,
    fixations,
  };
}

export function calculateDerivedGazeAnalysis(features: GazeFeature[] = []): DerivedGazeAnalysis {
  const fixationCount = features.length;
  const avgFixationMs =
    fixationCount > 0
      ? Math.round(features.reduce((sum, feature) => sum + feature.durationMs, 0) / fixationCount)
      : 0;
  const regressionCount = features.filter((feature) => feature.isRegression).length;
  const returnSweepCount = features.filter((feature) => feature.isReturnSweep).length;
  const avgSaccadeAmplitude =
    fixationCount > 0
      ? features.reduce((sum, feature) => sum + feature.saccadeAmplitude, 0) / fixationCount
      : 0;
  const efficiencyValues = features
    .map((feature) => feature.efficiencyRatio)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  return {
    fixationCount,
    avgFixationMs,
    regressionCount,
    returnSweepCount,
    avgSaccadeAmplitude,
    avgEfficiencyRatio:
      efficiencyValues.length > 0
        ? efficiencyValues.reduce((sum, value) => sum + value, 0) / efficiencyValues.length
        : null,
  };
}
