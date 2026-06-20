'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebcamGazePoint } from '../types';
import { GazeKalman } from '../lib/gaze-kalman';
import { calibrationLogger } from '../lib/debug-config';
import { cameraErrorMessage, startWebcamStream, stopWebcamStream } from '../lib/webcam-gaze/camera';
import {
  extractGlobalIrisPosition,
  extractHeadPose,
  extractIrisPosition,
  extractRawIrisLandmarks,
} from '../lib/webcam-gaze/landmarks';
import { createFaceLandmarker } from '../lib/webcam-gaze/mediapipe';
import type {
  CalibrationMapping,
  FaceLandmarker,
  GlobalIrisPosition,
  HeadPose,
  IrisPosition,
  RawIrisLandmark,
} from '../lib/webcam-gaze/types';

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

interface UseWebcamGazeOptions {
  /** Whether to actively collect gaze data */
  enabled: boolean;
  /** Callback for each gaze point */
  onGazePoint?: (point: WebcamGazePoint) => void;
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
      const stream = await startWebcamStream(videoElement);
      videoRef.current = videoElement;
      streamRef.current = stream;
      setCameraReady(true);
      setError(null);
    } catch (err) {
      setError(cameraErrorMessage(err));
      setCameraReady(false);
    }
  }, []);

  // ─── Initialize MediaPipe ───────────────────────────────

  const initModel = useCallback(async () => {
    try {
      faceLandmarkerRef.current = await createFaceLandmarker();
      setModelReady(true);
      setError(null);
    } catch (err) {
      calibrationLogger.error('MediaPipe Model Error:', err);
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

  // ─── Map Iris → Screen Coordinates ──────────────────────

  const mapToScreen = useCallback((iris: IrisPosition): { x: number; y: number } | null => {
    const cal = calibrationRef.current;
    if (!cal) return null;

    // Average both eyes
    const ix = (iris.leftX + iris.rightX) / 2;
    const iy = (iris.leftY + iris.rightY) / 2;

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
    if (!enabled || !cameraReady || !modelReady) return;

    const detect = () => {
      if (!enabledRef.current || !cameraReadyRef.current || !modelReadyRef.current) {
        return;
      }

      const activeVideo = videoRef.current;
      const faceLandmarker = faceLandmarkerRef.current;
      if (!activeVideo || !faceLandmarker) {
        return;
      }

      if (
        activeVideo.readyState >= 2 &&
        activeVideo.currentTime !== detectLastTimestampRef.current
      ) {
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
  }, [cameraReady, enabled, mapToScreen, modelReady]);

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

  const pauseCollecting = useCallback(() => {
    collectingRef.current = false;
    setCollecting(false);
  }, []);

  const resumeCollecting = useCallback(() => {
    collectingRef.current = true;
    setCollecting(true);
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
    stopWebcamStream(streamRef.current);
    streamRef.current = null;
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
    pauseCollecting,
    resumeCollecting,
    resetCount,
    // Cleanup
    cleanup,
  };
}
