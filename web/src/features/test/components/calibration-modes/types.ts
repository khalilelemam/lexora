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
