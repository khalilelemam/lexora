export type CalibrationVisualMode = 'grid' | 'stickman' | 'star';

export function resolveCalibrationMode(
  requestedMode?: CalibrationVisualMode,
  participantAge?: number,
): CalibrationVisualMode {
  void requestedMode;
  void participantAge;
  return 'grid';
}
