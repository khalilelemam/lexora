import type { TrainingSample } from './types';

export function meanEuclideanError(
  samples: TrainingSample[],
  predict: (sample: TrainingSample) => { x: number; y: number },
): number {
  if (samples.length === 0) return Number.POSITIVE_INFINITY;

  let total = 0;
  for (const sample of samples) {
    const predicted = predict(sample);
    total += Math.hypot(predicted.x - sample.targetX, predicted.y - sample.targetY);
  }

  return total / samples.length;
}
