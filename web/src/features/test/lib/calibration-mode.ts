export type CalibrationVisualMode = 'grid' | 'star' | 'stickman';

export function resolveCalibrationMode(
  requestedMode?: CalibrationVisualMode,
  participantAge?: number,
): CalibrationVisualMode {
  void requestedMode;
  void participantAge;
  return 'grid';
}
