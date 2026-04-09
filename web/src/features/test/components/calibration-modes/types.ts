import type { CalibrationPoint } from '../../types';

export interface CalibrationModeViewProps {
  points: readonly CalibrationPoint[];
  currentPoint: CalibrationPoint;
  previousPoint: CalibrationPoint;
  collectionStep: number;
  collectionTotal: number;
  isBossPoint: boolean;
  fixationProgress: number;
  isStableFixation: boolean;
  capturePulse: boolean;
  motionDurationMs: number;
  holdDurationMs: number;
}

/** Extended props for Canvas-based modes that need gaze coordinates */
export interface CalibrationCanvasModeProps extends CalibrationModeViewProps {
  gazeX: number;
  gazeY: number;
  /** Callback when the mode internally determines fixation is complete */
  onSampleCollected?: () => void;
}
