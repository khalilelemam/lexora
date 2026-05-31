'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebcamGazePoint } from '../types';
import { GazeKalman } from '../lib/gaze-kalman';

/**
 * Webcam gaze tracking using MediaPipe FaceLandmarker.
 *
 * How it works:
 * 1. Get camera feed via getUserMedia
 * 2. Run MediaPipe FaceLandmarker on each frame to get 478 face landmarks
 * 3. Extract iris center positions (landmarks 468-472 for left, 473-477 for right)
 * 4. After calibration, use a polynomial regression to map iris positions → screen coords
 * 5. Output { x, y, timestamp } in pixel coordinates (what the ML service expects)
 *
 * The calibration data (iris positions + known screen positions) is provided externally
 * by the calibration system and set via `setCalibrationData`.
 */

interface CalibrationMapping {
  /** Model-agnostic predict: (irisX, irisY, yaw, pitch) → screen (px) */
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

interface IrisPosition {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

interface RawIrisLandmark {
  x: number;
  y: number;
  z: number;
}

interface GlobalIrisPosition {
  x: number;
  y: number;
}

interface HeadPose {
  /** Left-right head turn — positive = turned right (normalized by face width) */
  yaw: number;
  /** Up-down head nod — positive = tilted down (normalized by face height) */
  pitch: number;
  /** Head tilt around camera axis (radians), positive = clockwise */
  roll: number;
  /** Lateral translation estimate in meters, right = positive */
  headX: number;
  /** Vertical translation estimate in meters, down = positive */
  headY: number;
  /** Depth estimate from camera in meters */
  headZ: number;
}

interface UseWebcamGazeOptions {
  /** Whether to actively collect gaze data */
  enabled: boolean;
  /** Callback for each gaze point */
  onGazePoint?: (point: WebcamGazePoint) => void;
}

// MediaPipe types — loaded dynamically
type FaceLandmarker = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => { faceLandmarks: Array<Array<{ x: number; y: number; z: number }>> };
  close: () => void;
};

type VisionTasksModule = {
  FaceLandmarker: {
    createFromOptions: (
      filesetResolver: unknown,
      options: {
        baseOptions: { modelAssetPath: string; delegate: 'GPU' | 'CPU' };
        runningMode: 'VIDEO';
        numFaces: number;
        outputFaceBlendshapes: boolean;
        outputFacialTransformationMatrixes: boolean;
      },
    ) => Promise<unknown>;
  };
  FilesetResolver: {
    forVisionTasks: (wasmPath: string) => Promise<unknown>;
  };
};

const MEDIAPIPE_VERSION = process.env.NEXT_PUBLIC_MEDIAPIPE_VERSION ?? '0.10.32';
const MEDIAPIPE_MODEL_URL =
  process.env.NEXT_PUBLIC_MEDIAPIPE_MODEL_URL ??
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const WEBCAM_WIDTH = Number(process.env.NEXT_PUBLIC_WEBCAM_WIDTH) || 640;
const WEBCAM_HEIGHT = Number(process.env.NEXT_PUBLIC_WEBCAM_HEIGHT) || 480;

async function loadVisionTasksModule(): Promise<VisionTasksModule> {
  try {
    const mod = (await import('@mediapipe/tasks-vision')) as VisionTasksModule;
    return mod;
  } catch (localErr) {
    // Fallback: load directly from CDN if Next fails to fetch the split chunk.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - dynamic URL import is runtime-only and browser-supported.
    const cdnMod = (await import(
      /* webpackIgnore: true */ `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`
    )) as VisionTasksModule;

    console.warn('Falling back to CDN MediaPipe bundle after local chunk-load failure.', localErr);
    return cdnMod;
  }
}

export function useWebcamGaze({ enabled, onGazePoint }: UseWebcamGazeOptions) {
  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const calibrationRef = useRef<CalibrationMapping | null>(null);
  const gazeKalmanRef = useRef(new GazeKalman());
  const rafRef = useRef<number>(0);
  const onGazePointRef = useRef(onGazePoint);
  const enabledRef = useRef(enabled);
  const cameraReadyRef = useRef(cameraReady);
  const modelReadyRef = useRef(modelReady);
  const detectLastTimestampRef = useRef<number>(-1);
  // Track last iris positions for calibration
  const lastIrisRef = useRef<IrisPosition | null>(null);
  const lastRawIrisLandmarksRef = useRef<RawIrisLandmark[] | null>(null);
  const lastGlobalIrisRef = useRef<GlobalIrisPosition | null>(null);
  // Track last head pose for diagnostics
  const lastHeadPoseRef = useRef<HeadPose | null>(null);
  const pointCountRef = useRef(0);
  const frameCountRef = useRef(0);

  // ─── Initialize Camera ──────────────────────────────────

  const initCamera = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: WEBCAM_WIDTH },
          height: { ideal: WEBCAM_HEIGHT },
          facingMode: 'user',
        },
      });
      videoElement.srcObject = stream;
      await videoElement.play();
      videoRef.current = videoElement;
      streamRef.current = stream;
      setCameraReady(true);
      setError(null);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Failed to access camera. Make sure your camera is connected and not in use.';
      setError(message);
      setCameraReady(false);
    }
  }, []);

  // ─── Initialize MediaPipe ───────────────────────────────

  const initModel = useCallback(async () => {
    try {
      const vision = await loadVisionTasksModule();
      const { FaceLandmarker: FL, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`,
      );

      // Attempt GPU first, fallback to CPU if it fails (common in some browsers/incognito)
      let faceLandmarker;
      try {
        faceLandmarker = await FL.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MEDIAPIPE_MODEL_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      } catch (gpuErr) {
        console.warn('GPU acceleration failed for FaceLandmarker, falling back to CPU.', gpuErr);
        faceLandmarker = await FL.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MEDIAPIPE_MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
      }

      faceLandmarkerRef.current = faceLandmarker as unknown as FaceLandmarker;
      setModelReady(true);
      setError(null);
    } catch (err) {
      console.error('MediaPipe Model Error:', err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Unknown error during initialization';
      setError(`Failed to load face tracking model: ${message}`);
      setModelReady(false);
    }
  }, []);

  // ─── Extract Iris Center from Landmarks ─────────────────

  const extractIrisPosition = useCallback(
    (landmarks: Array<{ x: number; y: number; z: number }>): IrisPosition | null => {
      if (landmarks.length < 478) return null;

      // ── Eye-relative iris normalization ──────────────────────
      // Raw MediaPipe iris coordinates span only ~0.04 of the
      // normalized range (e.g. 0.53–0.57), making the polynomial
      // regression extremely sensitive to noise.  Normalizing the
      // iris center relative to the eye bounding box expands the
      // usable input range to roughly 0.2–0.8.
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

      // Eye dimensions
      const leftEyeW = Math.abs(leftOuter.x - leftInner.x);
      const leftEyeH = Math.abs(leftBottom.y - leftTop.y);
      const rightEyeW = Math.abs(rightOuter.x - rightInner.x);
      const rightEyeH = Math.abs(rightBottom.y - rightTop.y);

      // Blink detection — reject frame when either eye is nearly closed
      if (leftEyeW > 0.001 && leftEyeH / leftEyeW < 0.15) return null;
      if (rightEyeW > 0.001 && rightEyeH / rightEyeW < 0.15) return null;

      // Normalize iris center within the eye bounding box
      const leftMinX = Math.min(leftOuter.x, leftInner.x);
      const leftMinY = Math.min(leftTop.y, leftBottom.y);
      const rightMinX = Math.min(rightOuter.x, rightInner.x);
      const rightMinY = Math.min(rightTop.y, rightBottom.y);

      // Anchor vertical position to the inner canthus (medial canthi) and
      // normalize by eye width. Inner canthi are cartilage-anchored points
      // that barely move with vertical gaze, so using them as Y reference
      // produces a more monotonic and robust vertical feature.
      const leftRelY = leftEyeW > 0.001 ? (leftIris.y - leftInner.y) / leftEyeW : 0.5;
      const rightRelY = rightEyeW > 0.001 ? (rightIris.y - rightInner.y) / rightEyeW : 0.5;

      return {
        leftX: leftEyeW > 0.001 ? (leftIris.x - leftMinX) / leftEyeW : 0.5,
        leftY: leftRelY,
        rightX: rightEyeW > 0.001 ? (rightIris.x - rightMinX) / rightEyeW : 0.5,
        rightY: rightRelY,
      };
    },
    [],
  );

  const extractRawIrisLandmarks = useCallback(
    (landmarks: Array<{ x: number; y: number; z: number }>): RawIrisLandmark[] | null => {
      if (landmarks.length < 478) return null;

      const indices = [468, 469, 470, 471, 472, 473, 474, 475, 476, 477];
      return indices.map((index) => ({
        x: landmarks[index].x,
        y: landmarks[index].y,
        z: landmarks[index].z,
      }));
    },
    [],
  );

  const extractGlobalIrisPosition = useCallback(
    (landmarks: Array<{ x: number; y: number; z: number }>): GlobalIrisPosition | null => {
      if (landmarks.length < 478) return null;
      const left = landmarks[468];
      const right = landmarks[473];
      // Mirror x-axis: MediaPipe uses camera-space coordinates where
      // looking left moves the iris right in the image (selfie camera).
      return {
        x: 1 - (left.x + right.x) / 2,
        y: (left.y + right.y) / 2,
      };
    },
    [],
  );

  // ─── Extract Head Pose from Landmarks ────────────────────

  const extractHeadPose = useCallback(
    (landmarks: Array<{ x: number; y: number; z: number }>): HeadPose | null => {
      if (landmarks.length < 478) return null;

      const noseTip = landmarks[1];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];
      const forehead = landmarks[10];
      const chin = landmarks[152];

      // Yaw: asymmetry of nose position relative to ear midpoint
      const faceWidth = Math.abs(rightEar.x - leftEar.x);
      const faceCenterX = (leftEar.x + rightEar.x) / 2;
      const yaw = faceWidth > 0.001 ? (noseTip.x - faceCenterX) / faceWidth : 0;

      // Pitch: vertical offset of nose relative to forehead-chin midpoint
      const faceHeight = Math.abs(chin.y - forehead.y);
      const faceCenterY = (forehead.y + chin.y) / 2;
      const pitch = faceHeight > 0.001 ? (noseTip.y - faceCenterY) / faceHeight : 0;

      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const rollRaw = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

      const iod = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
      const headZApprox = (0.065 / Math.max(iod, 0.001)) * 0.65;

      // Approximate translation from face center offsets scaled by depth.
      const headXRaw = (faceCenterX - 0.5) * headZApprox;
      const headYRaw = (faceCenterY - 0.5) * headZApprox;

      const roll = Number.isFinite(rollRaw) ? rollRaw : 0;
      const headX = Number.isFinite(headXRaw) ? headXRaw : 0;
      const headY = Number.isFinite(headYRaw) ? headYRaw : 0;
      const headZ = Number.isFinite(headZApprox) && headZApprox > 0.1 ? headZApprox : 0.65;

      return { yaw, pitch, roll, headX, headY, headZ };
    },
    [],
  );

  // ─── Map Iris → Screen Coordinates ──────────────────────

  const mapToScreen = useCallback((iris: IrisPosition): { x: number; y: number } | null => {
    const cal = calibrationRef.current;
    if (!cal) return null;

    // Average both eyes
    const ix = (iris.leftX + iris.rightX) / 2;
    const iy = (iris.leftY + iris.rightY) / 2;

    // Keep the legacy call shape; calibrated models now use pitch for vertical correction.
    const hp = lastHeadPoseRef.current;
    const yaw = hp?.yaw ?? 0;
    const pitch = hp?.pitch ?? 0;
    const roll = hp?.roll ?? 0;
    const headX = hp?.headX ?? 0;
    const headY = hp?.headY ?? 0;
    return cal.predict(ix, iy, yaw, pitch, roll, headX, headY, 0);
  }, []);

  // ─── Detection Loop ─────────────────────────────────────
  // Always runs when camera + model are ready — keeps lastIrisRef fresh
  // for calibration sampling. Gaze point emission is gated by `collecting`.

  const collectingRef = useRef(false);

  useEffect(() => {
    onGazePointRef.current = onGazePoint;
  }, [onGazePoint]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    cameraReadyRef.current = cameraReady;
  }, [cameraReady]);

  useEffect(() => {
    modelReadyRef.current = modelReady;
  }, [modelReady]);

  useEffect(() => {
    collectingRef.current = collecting;
  }, [collecting]);

  useEffect(() => {
    const detect = () => {
      if (!enabledRef.current || !cameraReadyRef.current || !modelReadyRef.current) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      const activeVideo = videoRef.current;
      const faceLandmarker = faceLandmarkerRef.current;
      if (!activeVideo || !faceLandmarker) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }

      if (activeVideo.readyState >= 2 && activeVideo.currentTime !== detectLastTimestampRef.current) {
        detectLastTimestampRef.current = activeVideo.currentTime;
        const results = faceLandmarker.detectForVideo(activeVideo, performance.now());

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];

          const rawIrisLandmarks = extractRawIrisLandmarks(landmarks);
          if (rawIrisLandmarks) {
            lastRawIrisLandmarksRef.current = rawIrisLandmarks;
          }

          const globalIris = extractGlobalIrisPosition(landmarks);
          if (globalIris) {
            lastGlobalIrisRef.current = globalIris;
          }

          const iris = extractIrisPosition(landmarks);
          if (iris) {
            lastIrisRef.current = iris;

            // Extract head pose for diagnostics
            const headPose = extractHeadPose(landmarks);
            if (headPose) {
              lastHeadPoseRef.current = headPose;
            }

            // Only emit gaze points when actively collecting (task phase)
            if (collectingRef.current && calibrationRef.current) {
              const screenPos = mapToScreen(iris);
              if (screenPos) {
                // Apply adaptive Kalman filtering to smooth gaze position.
                // The filter adapts its process noise based on gaze velocity:
                // - Low velocity (fixations): high confidence in filter prediction → smooth
                // - High velocity (saccades): low confidence in prediction → responsive to raw signal
                // This prevents jitter during reading while preserving saccade responsiveness.
                const smoothed = gazeKalmanRef.current.update(
                  screenPos.x,
                  screenPos.y,
                  performance.now(),
                );

                onGazePointRef.current?.({
                  x: smoothed.x,
                  y: smoothed.y,
                  timestamp: Math.round(performance.now()),
                });
                pointCountRef.current += 1;
                frameCountRef.current += 1;
                if (frameCountRef.current % 5 === 0) {
                  setPointCount(pointCountRef.current);
                }
              }
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(detect);
    };

    rafRef.current = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Public API ─────────────────────────────────────────

  const setCalibrationData = useCallback((mapping: CalibrationMapping) => {
    calibrationRef.current = mapping;
  }, []);

  const startCollecting = useCallback(() => {
    pointCountRef.current = 0;
    frameCountRef.current = 0;
    setPointCount(0);
    gazeKalmanRef.current.reset(); // Reset Kalman filter state for fresh task collection
    setCollecting(true);
  }, []);

  const stopCollecting = useCallback(() => {
    setCollecting(false);
  }, []);

  const getLastIrisPosition = useCallback(() => lastIrisRef.current, []);

  const getLastRawIrisLandmarks = useCallback(() => lastRawIrisLandmarksRef.current, []);

  const getLastGlobalIrisPosition = useCallback(() => lastGlobalIrisRef.current, []);

  const getLastHeadPose = useCallback(() => lastHeadPoseRef.current, []);

  const resetCount = useCallback(() => setPointCount(0), []);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    try {
      faceLandmarkerRef.current?.close();
    } catch {
      // MediaPipe WASM module may already be disposed
    }
    faceLandmarkerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    setCameraReady(false);
    setModelReady(false);
    setCollecting(false);
    calibrationRef.current = null;
    lastIrisRef.current = null;
    lastRawIrisLandmarksRef.current = null;
    lastGlobalIrisRef.current = null;
    lastHeadPoseRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return {
    // State
    cameraReady,
    modelReady,
    collecting,
    pointCount,
    error,
    // Init
    initCamera,
    initModel,
    // Calibration
    setCalibrationData,
    getLastIrisPosition,
    getLastRawIrisLandmarks,
    getLastGlobalIrisPosition,
    getLastHeadPose,
    // Collection
    startCollecting,
    stopCollecting,
    resetCount,
    // Cleanup
    cleanup,
  };
}
