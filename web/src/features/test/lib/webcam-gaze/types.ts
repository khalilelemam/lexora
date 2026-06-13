export interface CalibrationMapping {
  /** Model-agnostic predict: iris/head-pose features -> screen pixels. */
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
}

export interface IrisPosition {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

export interface RawIrisLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GlobalIrisPosition {
  x: number;
  y: number;
}

export interface HeadPose {
  /** Left-right head turn; positive = turned right, normalized by face width. */
  yaw: number;
  /** Up-down head nod; positive = tilted down, normalized by face height. */
  pitch: number;
  /** Head tilt around camera axis in radians; positive = clockwise. */
  roll: number;
  /** Lateral translation estimate in meters; right = positive. */
  headX: number;
  /** Vertical translation estimate in meters; down = positive. */
  headY: number;
  /** Approximate distance from camera in meters. */
  headZ: number;
}

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceLandmarker {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => { faceLandmarks: Array<FaceLandmark[]> };
  close: () => void;
}
