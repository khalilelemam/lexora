import type { CalibrationPhaseType, CalibrationPoint } from '../types';
import type { CollectedSample } from './calibration-samples';
import { median } from './calibration-math';
import { envFloat, envNumber } from './env';

export const TARGETED_RECALIBRATION_MAX_ROUNDS = Math.max(
  0,
  Math.floor(envNumber('NEXT_PUBLIC_TARGETED_RECALIBRATION_MAX_ROUNDS', 1)),
);
export const TARGETED_RECALIBRATION_MAX_POINTS = Math.max(
  0,
  Math.floor(envNumber('NEXT_PUBLIC_TARGETED_RECALIBRATION_MAX_POINTS', 6)),
);
export const TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD = envFloat(
  'NEXT_PUBLIC_TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD',
  0.2,
);
const TARGETED_RECALIBRATION_MEDIAN_MARGIN = envFloat(
  'NEXT_PUBLIC_TARGETED_RECALIBRATION_MEDIAN_MARGIN',
  0.025,
);

export interface CalibrationPointError {
  pointIndex: number;
  phase: CalibrationPhaseType;
  normalizedError: number | null;
}

interface StaticCalibrationPointError extends CalibrationPointError {
  phase: 'STATIC';
  normalizedError: number;
}

function isStaticErrorPoint(point: CalibrationPointError): point is StaticCalibrationPointError {
  return point.phase === 'STATIC' && point.normalizedError !== null;
}

export function buildCalibrationPointErrors(
  pointErrorsOrNull: Array<number | null>,
  cleanedByPoint: CollectedSample[][],
  fullPointSequence: readonly CalibrationPoint[],
): CalibrationPointError[] {
  return pointErrorsOrNull.map((error, index) => ({
    pointIndex: index,
    phase: cleanedByPoint[index]?.[0]?.phase ?? fullPointSequence[index]?.phase ?? 'STATIC',
    normalizedError: error != null ? Number(error.toFixed(4)) : null,
  }));
}

export function selectTargetedRecalibrationPoints(calibrationPointErrors: CalibrationPointError[]) {
  const recalibrationCandidates = calibrationPointErrors
    .filter(isStaticErrorPoint)
    .sort((a, b) => b.normalizedError - a.normalizedError)
    .slice(0, TARGETED_RECALIBRATION_MAX_POINTS);

  const staticErrorValues = calibrationPointErrors
    .filter(isStaticErrorPoint)
    .map((point) => point.normalizedError);
  const staticMedianError = median(staticErrorValues);
  const effectiveThreshold = Math.max(
    TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD,
    staticMedianError + TARGETED_RECALIBRATION_MEDIAN_MARGIN,
  );
  const flaggedPointCandidates = recalibrationCandidates
    .filter((point) => point.normalizedError > effectiveThreshold)
    .map((point) => point.pointIndex);

  return {
    staticMedianError,
    baseThreshold: TARGETED_RECALIBRATION_POINT_ERROR_THRESHOLD,
    effectiveThreshold,
    candidates: recalibrationCandidates,
    flaggedPointCandidates,
  };
}
