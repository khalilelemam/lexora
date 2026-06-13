import type {
  FaceLandmark,
  GlobalIrisPosition,
  HeadPose,
  IrisPosition,
  RawIrisLandmark,
} from './types';

const MIN_FACE_LANDMARKS = 478;
const RAW_IRIS_LANDMARK_INDICES = [468, 469, 470, 471, 472, 473, 474, 475, 476, 477] as const;

export function extractIrisPosition(landmarks: FaceLandmark[]): IrisPosition | null {
  if (landmarks.length < MIN_FACE_LANDMARKS) return null;

  const leftInner = landmarks[133];
  const leftOuter = landmarks[33];
  const leftTop = landmarks[159];
  const leftBottom = landmarks[145];

  const rightInner = landmarks[362];
  const rightOuter = landmarks[263];
  const rightTop = landmarks[386];
  const rightBottom = landmarks[374];

  const leftIris = landmarks[468];
  const rightIris = landmarks[473];

  const leftEyeW = Math.abs(leftOuter.x - leftInner.x);
  const leftEyeH = Math.abs(leftBottom.y - leftTop.y);
  const rightEyeW = Math.abs(rightOuter.x - rightInner.x);
  const rightEyeH = Math.abs(rightBottom.y - rightTop.y);

  // Reject likely blinks. Closed eyes collapse the eye box and make relative
  // iris features jump enough to poison both calibration and live prediction.
  if (leftEyeW > 0.001 && leftEyeH / leftEyeW < 0.15) return null;
  if (rightEyeW > 0.001 && rightEyeH / rightEyeW < 0.15) return null;

  const leftMinX = Math.min(leftOuter.x, leftInner.x);
  const rightMinX = Math.min(rightOuter.x, rightInner.x);

  // Use inner canthi as vertical anchors. They move less with gaze than eyelid
  // landmarks, so vertical features stay more monotonic across the grid.
  const leftRelY = leftEyeW > 0.001 ? (leftIris.y - leftInner.y) / leftEyeW : 0.5;
  const rightRelY = rightEyeW > 0.001 ? (rightIris.y - rightInner.y) / rightEyeW : 0.5;

  return {
    leftX: leftEyeW > 0.001 ? (leftIris.x - leftMinX) / leftEyeW : 0.5,
    leftY: leftRelY,
    rightX: rightEyeW > 0.001 ? (rightIris.x - rightMinX) / rightEyeW : 0.5,
    rightY: rightRelY,
  };
}

export function extractRawIrisLandmarks(landmarks: FaceLandmark[]): RawIrisLandmark[] | null {
  if (landmarks.length < MIN_FACE_LANDMARKS) return null;

  return RAW_IRIS_LANDMARK_INDICES.map((index) => ({
    x: landmarks[index].x,
    y: landmarks[index].y,
    z: landmarks[index].z,
  }));
}

export function extractGlobalIrisPosition(landmarks: FaceLandmark[]): GlobalIrisPosition | null {
  if (landmarks.length < MIN_FACE_LANDMARKS) return null;

  const left = landmarks[468];
  const right = landmarks[473];

  // Mirror x-axis: MediaPipe uses camera-space coordinates where looking left
  // moves the iris right in a selfie-camera image.
  return {
    x: 1 - (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };
}

export function extractHeadPose(landmarks: FaceLandmark[]): HeadPose | null {
  if (landmarks.length < MIN_FACE_LANDMARKS) return null;

  const noseTip = landmarks[1];
  const leftEar = landmarks[234];
  const rightEar = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  const faceWidth = Math.abs(rightEar.x - leftEar.x);
  const faceCenterX = (leftEar.x + rightEar.x) / 2;
  const yaw = faceWidth > 0.001 ? (noseTip.x - faceCenterX) / faceWidth : 0;

  const faceHeight = Math.abs(chin.y - forehead.y);
  const faceCenterY = (forehead.y + chin.y) / 2;
  const pitch = faceHeight > 0.001 ? (noseTip.y - faceCenterY) / faceHeight : 0;

  return {
    yaw,
    pitch,
  };
}
