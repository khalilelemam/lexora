import type { GazeFeature, WebcamGazePoint } from '../types';

/**
 * Recalculates regressions for ML feature data based on visual thresholds.
 * A regression is defined as the gaze moving backwards against the reading direction
 * while remaining roughly on the same vertical line.
 */
export function detectRegressions(
  features: GazeFeature[],
  direction: 'ltr' | 'rtl' = 'ltr',
): GazeFeature[] {
  if (features.length < 2) return features;

  const REGRESSION_X_THRESHOLD = 0.02; // 2% of screen width jump backwards
  const SAME_LINE_Y_THRESHOLD = 0.05; // 5% of screen height to be considered same line

  return features.map((feature, i) => {
    if (i === 0) return { ...feature, isRegression: false };

    const prev = features[i - 1];
    const isSameLine = Math.abs(feature.fixationY - prev.fixationY) < SAME_LINE_Y_THRESHOLD;

    let isRegression = false;
    if (isSameLine) {
      if (direction === 'ltr') {
        isRegression = feature.fixationX < prev.fixationX - REGRESSION_X_THRESHOLD;
      } else {
        isRegression = feature.fixationX > prev.fixationX + REGRESSION_X_THRESHOLD;
      }
    }

    // Preserve isReturnSweep if the backend calculated it accurately
    return { ...feature, isRegression: isRegression || feature.isRegression };
  });
}

export interface GazeFixation {
  x: number;
  y: number;
  timestamp: number;
  durationMs: number;
}

/**
 * Groups raw, noisy gaze points into stabilized fixations using a dispersion-threshold algorithm (I-DT).
 * This eliminates the "jitter" associated with raw webcam predictions.
 */
export function groupIntoFixations(
  rawPoints: WebcamGazePoint[],
  dispersionThreshold = 40, // px radius
  durationThresholdMs = 100, // minimum duration to be considered a fixation
): GazeFixation[] {
  if (rawPoints.length === 0) return [];

  const fixations: GazeFixation[] = [];
  let currentGroup: WebcamGazePoint[] = [rawPoints[0]];
  let windowStart = 0;

  for (let i = 1; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    const firstPt = rawPoints[windowStart];

    // Check distance from the start of the window
    const dx = pt.x - firstPt.x;
    const dy = pt.y - firstPt.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= dispersionThreshold) {
      currentGroup.push(pt);
    } else {
      // Calculate duration of current group
      const duration = rawPoints[i - 1].timestamp - firstPt.timestamp;

      if (duration >= durationThresholdMs) {
        // It's a valid fixation, calculate centroid
        const centroidX = currentGroup.reduce((sum, p) => sum + p.x, 0) / currentGroup.length;
        const centroidY = currentGroup.reduce((sum, p) => sum + p.y, 0) / currentGroup.length;

        fixations.push({
          x: centroidX,
          y: centroidY,
          timestamp: firstPt.timestamp,
          durationMs: duration,
        });
      }

      // Start new group
      currentGroup = [pt];
      windowStart = i;
    }
  }

  // Handle last group
  if (currentGroup.length > 0) {
    const duration = rawPoints[rawPoints.length - 1].timestamp - rawPoints[windowStart].timestamp;
    if (duration >= durationThresholdMs) {
      const centroidX = currentGroup.reduce((sum, p) => sum + p.x, 0) / currentGroup.length;
      const centroidY = currentGroup.reduce((sum, p) => sum + p.y, 0) / currentGroup.length;

      fixations.push({
        x: centroidX,
        y: centroidY,
        timestamp: rawPoints[windowStart].timestamp,
        durationMs: duration,
      });
    }
  }

  // If no fixations were detected (extremely noisy/sparse), fallback to heavily downsampled points
  if (fixations.length === 0) {
    return rawPoints
      .filter((_, i) => i % 15 === 0)
      .map((p) => ({
        x: p.x,
        y: p.y,
        timestamp: p.timestamp,
        durationMs: 150,
      }));
  }

  return fixations;
}
