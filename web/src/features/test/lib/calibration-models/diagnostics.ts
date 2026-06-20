import { calibrationLogger } from '../debug-config';
import type { TrainingSample } from './types';

function summarizeSamplesByPoint(samples: TrainingSample[]) {
  const byPoint = new Map<
    number,
    {
      count: number;
      totalWeight: number;
      phases: Record<string, number>;
    }
  >();

  for (const sample of samples) {
    const entry = byPoint.get(sample.pointIndex) ?? {
      count: 0,
      totalWeight: 0,
      phases: {},
    };
    entry.count += 1;
    entry.totalWeight += sample.sampleWeight ?? 1.0;
    entry.phases[sample.phase] = (entry.phases[sample.phase] ?? 0) + 1;
    byPoint.set(sample.pointIndex, entry);
  }

  return Array.from(byPoint.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([pointIndex, entry]) => ({
      pointIndex,
      count: entry.count,
      totalWeight: Number(entry.totalWeight.toFixed(2)),
      phases: entry.phases,
    }));
}

export function logSampleSummary(label: string, samples: TrainingSample[]) {
  if (!calibrationLogger.enabled) return;

  const phaseCounts = samples.reduce(
    (acc, sample) => {
      acc[sample.phase] = (acc[sample.phase] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  calibrationLogger.debug(`[CALIBRATION DATASET] ${label}`, {
    totalSamples: samples.length,
    uniquePoints: new Set(samples.map((sample) => sample.pointIndex)).size,
    phaseCounts,
    samplesByPoint: summarizeSamplesByPoint(samples),
  });
}

export function logStaticIyDiagnostics(samples: TrainingSample[]) {
  if (!calibrationLogger.enabled) return;

  const staticSamples = samples.filter((sample) => sample.phase === 'STATIC');
  if (staticSamples.length === 0) {
    calibrationLogger.debug('[STATIC IY DIAG] No STATIC samples');
    return;
  }

  const byPoint = new Map<
    number,
    {
      sumIy: number;
      count: number;
      targetX: number;
      targetY: number;
    }
  >();

  for (const sample of staticSamples) {
    const entry = byPoint.get(sample.pointIndex) ?? {
      sumIy: 0,
      count: 0,
      targetX: sample.targetX,
      targetY: sample.targetY,
    };
    entry.sumIy += sample.iy;
    entry.count += 1;
    byPoint.set(sample.pointIndex, entry);
  }

  const perPoint = Array.from(byPoint.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([pointIndex, entry]) => ({
      pointIndex,
      targetX: Number(entry.targetX.toFixed(4)),
      targetY: Number(entry.targetY.toFixed(4)),
      meanIy: Number((entry.sumIy / entry.count).toFixed(5)),
      samples: entry.count,
    }));

  const byRow = new Map<number, { targetY: number; sumMeanIy: number; countPoints: number }>();
  for (const point of perPoint) {
    const rowKey = Number(point.targetY.toFixed(4));
    const entry = byRow.get(rowKey) ?? { targetY: point.targetY, sumMeanIy: 0, countPoints: 0 };
    entry.sumMeanIy += point.meanIy;
    entry.countPoints += 1;
    byRow.set(rowKey, entry);
  }

  const rows = Array.from(byRow.values())
    .sort((a, b) => a.targetY - b.targetY)
    .map((entry) => ({
      targetY: Number(entry.targetY.toFixed(4)),
      meanIy: Number((entry.sumMeanIy / entry.countPoints).toFixed(5)),
      points: entry.countPoints,
    }));

  const topRow = rows[0] ?? null;
  const midRow = rows.length >= 2 ? rows[1] : null;
  const topMidDiff = topRow && midRow ? Math.abs(topRow.meanIy - midRow.meanIy) : null;
  const saturated = topMidDiff !== null && topMidDiff < 0.01;

  calibrationLogger.debug('[STATIC IY DIAG] mean(iy) for static points', {
    perPoint,
    rows,
    topMidDiff: topMidDiff !== null ? Number(topMidDiff.toFixed(5)) : null,
    saturated,
    saturationNote: saturated
      ? 'Top vs mid mean(iy) differ < 0.01; iris Y likely saturated/compressed for vertical extremes. Model changes will not fix it.'
      : null,
  });
}

export function logCoefficientSummary(label: string, axis: 'x' | 'y', coeffs: number[]) {
  if (!calibrationLogger.enabled) return;

  const formatted = coeffs.map((value, index) => ({
    feature: index,
    weight: Number(value.toFixed(5)),
    absWeight: Number(Math.abs(value).toFixed(5)),
  }));
  const topWeights = [...formatted]
    .sort((a, b) => b.absWeight - a.absWeight)
    .slice(0, Math.min(8, formatted.length));

  calibrationLogger.debug(`[RIDGE COEFFS] ${label} axis=${axis}`, {
    allWeights: formatted,
    topWeights,
  });
}
