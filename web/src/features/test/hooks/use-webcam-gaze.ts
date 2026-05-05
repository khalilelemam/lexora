'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebcamGazePoint } from '../types';
import { WEBCAM_GAZE_EMA_ALPHA } from '../lib/constants';

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
  predict: (irisX: number, irisY: number, yaw: number, pitch: number) => { x: number; y: number };
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
  const rafRef = useRef<number>(0);
  const onGazePointRef = useRef(onGazePoint);
  // Track last iris positions for calibration
  const lastIrisRef = useRef<IrisPosition | null>(null);
  const lastRawIrisLandmarksRef = useRef<RawIrisLandmark[] | null>(null);
  const lastGlobalIrisRef = useRef<GlobalIrisPosition | null>(null);
  // Track last head pose for diagnostics
  const lastHeadPoseRef = useRef<HeadPose | null>(null);
  // Track previous smoothed gaze position for EMA
  const prevSmoothedRef = useRef<{ x: number; y: number } | null>(null);

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

      return {
        leftX: leftEyeW > 0.001 ? (leftIris.x - leftMinX) / leftEyeW : 0.5,
        leftY: leftEyeH > 0.001 ? (leftIris.y - leftMinY) / leftEyeH : 0.5,
        rightX: rightEyeW > 0.001 ? (rightIris.x - rightMinX) / rightEyeW : 0.5,
        rightY: rightEyeH > 0.001 ? (rightIris.y - rightMinY) / rightEyeH : 0.5,
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

      return { yaw, pitch };
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

    // Include head pose in prediction (model uses it for better Y-axis mapping)
    const hp = lastHeadPoseRef.current;
    const yaw = hp?.yaw ?? 0;
    const pitch = hp?.pitch ?? 0;

    return cal.predict(ix, iy, yaw, pitch);
  }, []);

  // ─── Detection Loop ─────────────────────────────────────
  // Always runs when camera + model are ready — keeps lastIrisRef fresh
  // for calibration sampling. Gaze point emission is gated by `collecting`.

  const collectingRef = useRef(false);

  useEffect(() => {
    onGazePointRef.current = onGazePoint;
  }, [onGazePoint]);

  useEffect(() => {
    collectingRef.current = collecting;
  }, [collecting]);

  useEffect(() => {
    if (!enabled || !cameraReady || !modelReady) return;

    const video = videoRef.current;
    const faceLandmarker = faceLandmarkerRef.current;
    if (!video || !faceLandmarker) return;

    let lastTimestamp = -1;

    const detect = () => {
      if (video.readyState >= 2 && video.currentTime !== lastTimestamp) {
        lastTimestamp = video.currentTime;
        const results = faceLandmarker.detectForVideo(video, performance.now());

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
                // Apply EMA smoothing to reduce frame-to-frame jitter.
                // The ML service I-VT detector uses a tight velocity threshold
                // (0.5 norm-units/s → ~16 px/frame at 60 fps). Without smoothing,
                // webcam iris tracking noise causes most points to be classified
                // as saccades, producing too few fixations.
                const alpha = WEBCAM_GAZE_EMA_ALPHA;
                const prev = prevSmoothedRef.current;
                const smoothed = prev
                  ? {
                      x: alpha * screenPos.x + (1 - alpha) * prev.x,
                      y: alpha * screenPos.y + (1 - alpha) * prev.y,
                    }
                  : screenPos;
                prevSmoothedRef.current = smoothed;

                onGazePointRef.current?.({
                  x: smoothed.x,
                  y: smoothed.y,
                  timestamp: Math.round(performance.now()),
                });
                setPointCount((prev) => prev + 1);
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
  }, [
    enabled,
    cameraReady,
    modelReady,
    extractIrisPosition,
    extractRawIrisLandmarks,
    extractGlobalIrisPosition,
    extractHeadPose,
    mapToScreen,
  ]);

  // ─── Public API ─────────────────────────────────────────

  const setCalibrationData = useCallback((mapping: CalibrationMapping) => {
    calibrationRef.current = mapping;
  }, []);

  const startCollecting = useCallback(() => {
    setPointCount(0);
    prevSmoothedRef.current = null; // Reset EMA state for fresh collection
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
    prevSmoothedRef.current = null;
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
