export type CalibrationVisualMode = 'grid' | 'stickman' | 'star';

export function resolveCalibrationMode(
  requestedMode?: CalibrationVisualMode,
  participantAge?: number,
): CalibrationVisualMode {
  if (requestedMode === 'grid' || requestedMode === 'star') return requestedMode;
  if (requestedMode === 'stickman') {
    return 'grid';
  }

  if (typeof participantAge === 'number' && Number.isFinite(participantAge)) {
    if (participantAge >= 7 && participantAge <= 9) return 'star';
    if (participantAge >= 10) return 'grid';
  }

  return 'grid';
}
