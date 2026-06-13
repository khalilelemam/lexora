import type { CalibrationPhaseType } from '../../types';

export interface TrainingSample {
  ix: number;
  iy: number;
  yaw: number;
  pitch: number;
  roll: number;
  headX: number;
  headY: number;
  invHeadZ: number;
  targetX: number;
  targetY: number;
  pointIndex: number;
  sampleWeight: number;
  phase: CalibrationPhaseType;
}

export type ModelKind = 'idw' | 'polynomial-ridge';

export interface CalibrationModel {
  kind: ModelKind;
  predict: (
    irisX: number,
    irisY: number,
    yaw: number,
    pitch: number,
    roll: number,
    headX: number,
    headY: number,
    invHeadZ: number,
  ) => { x: number; y: number };
  trainingError: number;
  maxCentroidErrorPx?: number;
  info: string;
}
