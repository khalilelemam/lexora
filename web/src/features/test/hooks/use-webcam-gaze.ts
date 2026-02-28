'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebcamGazePoint } from '../types';

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
  /** Coefficients for X mapping: x = a0 + a1*irisX + a2*irisY + a3*irisX^2 + a4*irisY^2 + a5*irisX*irisY */
  xCoeffs: number[];
  /** Coefficients for Y mapping (same structure) */
  yCoeffs: number[];
}

interface IrisPosition {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
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
  onGazePointRef.current = onGazePoint;
  // Track last iris positions for calibration
  const lastIrisRef = useRef<IrisPosition | null>(null);

  // ─── Initialize Camera ──────────────────────────────────

  const initCamera = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
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
      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker: FL, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      );

      const faceLandmarker = await FL.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      faceLandmarkerRef.current = faceLandmarker as unknown as FaceLandmarker;
      setModelReady(true);
    } catch (err) {
      setError(
        `Failed to load face tracking model: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      setModelReady(false);
    }
  }, []);

  // ─── Extract Iris Center from Landmarks ─────────────────

  const extractIrisPosition = useCallback(
    (landmarks: Array<{ x: number; y: number; z: number }>): IrisPosition | null => {
      // Left iris: landmarks 468-472, Right iris: 473-477
      // Center of each iris: index 468 (left), 473 (right)
      if (landmarks.length < 478) return null;

      return {
        leftX: landmarks[468].x,
        leftY: landmarks[468].y,
        rightX: landmarks[473].x,
        rightY: landmarks[473].y,
      };
    },
    [],
  );

  // ─── Map Iris → Screen Coordinates ──────────────────────

  const mapToScreen = useCallback(
    (iris: IrisPosition): { x: number; y: number } | null => {
      const cal = calibrationRef.current;
      if (!cal) return null;

      // Average both eyes
      const ix = (iris.leftX + iris.rightX) / 2;
      const iy = (iris.leftY + iris.rightY) / 2;

      // Polynomial mapping: val = a0 + a1*ix + a2*iy + a3*ix^2 + a4*iy^2 + a5*ix*iy
      const computeCoord = (coeffs: number[]) =>
        coeffs[0] +
        coeffs[1] * ix +
        coeffs[2] * iy +
        coeffs[3] * ix * ix +
        coeffs[4] * iy * iy +
        coeffs[5] * ix * iy;

      return {
        x: computeCoord(cal.xCoeffs),
        y: computeCoord(cal.yCoeffs),
      };
    },
    [],
  );

  // ─── Detection Loop ─────────────────────────────────────
  // Always runs when camera + model are ready — keeps lastIrisRef fresh
  // for calibration sampling. Gaze point emission is gated by `collecting`.

  const collectingRef = useRef(false);
  collectingRef.current = collecting;

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
          const iris = extractIrisPosition(results.faceLandmarks[0]);
          if (iris) {
            lastIrisRef.current = iris;

            // Only emit gaze points when actively collecting (task phase)
            if (collectingRef.current && calibrationRef.current) {
              const screenPos = mapToScreen(iris);
              if (screenPos) {
                onGazePointRef.current?.({
                  x: screenPos.x,
                  y: screenPos.y,
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
  }, [enabled, cameraReady, modelReady, extractIrisPosition, mapToScreen]);

  // ─── Public API ─────────────────────────────────────────

  const setCalibrationData = useCallback((mapping: CalibrationMapping) => {
    calibrationRef.current = mapping;
  }, []);

  const startCollecting = useCallback(() => {
    setPointCount(0);
    setCollecting(true);
  }, []);

  const stopCollecting = useCallback(() => {
    setCollecting(false);
  }, []);

  const getLastIrisPosition = useCallback(() => lastIrisRef.current, []);

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
    // Collection
    startCollecting,
    stopCollecting,
    resetCount,
    // Cleanup
    cleanup,
  };
}
