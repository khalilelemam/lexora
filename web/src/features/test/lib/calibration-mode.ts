export type CalibrationVisualMode = 'grid' | 'stickman' | 'star';

export function resolveCalibrationMode(
  _requestedMode?: CalibrationVisualMode,
  _participantAge?: number,
): CalibrationVisualMode {
  return 'grid';
}
