import { clamp01 } from './calibration-engine-constants';

export interface StabilityPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface EvaluateFixationStabilityInput {
  previousPoint: StabilityPoint;
  currentPoint: StabilityPoint;
  stableSince: number | null;
  screenDiagonal: number;
  stableVelocityThreshold: number;
  requiredStableFixationMs: number;
  lastCaptureAt: number;
  captureCooldownMs: number;
}

export interface FixationStabilityResult {
  stableSince: number | null;
  stableMs: number;
  isStableFixation: boolean;
  fixationProgress: number;
  shouldCollect: boolean;
}

export function evaluateFixationStability({
  previousPoint,
  currentPoint,
  stableSince,
  screenDiagonal,
  stableVelocityThreshold,
  requiredStableFixationMs,
  lastCaptureAt,
  captureCooldownMs,
}: EvaluateFixationStabilityInput): FixationStabilityResult {
  const dtMs = Math.max(1, currentPoint.timestamp - previousPoint.timestamp);
  const motionDistance = Math.hypot(currentPoint.x - previousPoint.x, currentPoint.y - previousPoint.y);
  const velocityNormPerSecond = motionDistance / screenDiagonal / (dtMs / 1000);

  const nextStableSince =
    velocityNormPerSecond < stableVelocityThreshold
      ? stableSince ?? currentPoint.timestamp
      : null;
  const stableMs = nextStableSince == null ? 0 : currentPoint.timestamp - nextStableSince;
  const isStableFixation = stableMs >= requiredStableFixationMs;

  return {
    stableSince: nextStableSince,
    stableMs,
    isStableFixation,
    fixationProgress: clamp01(stableMs / requiredStableFixationMs),
    shouldCollect:
      isStableFixation &&
      currentPoint.timestamp - lastCaptureAt >= captureCooldownMs,
  };
}
