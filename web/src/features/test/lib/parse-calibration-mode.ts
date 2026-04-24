import type { CalibrationVisualMode } from '../hooks/use-calibration-engine';

/**
 * Parse a URL query parameter into a CalibrationVisualMode.
 * Returns undefined if the value is not a valid mode.
 */
export function parseCalibrationMode(rawMode: string | null): CalibrationVisualMode | undefined {
  if (rawMode === 'grid' || rawMode === 'stickman' || rawMode === 'star') {
    return rawMode;
  }
  return undefined;
}
