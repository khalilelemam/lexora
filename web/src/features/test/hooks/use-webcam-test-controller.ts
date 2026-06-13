'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { submitWebcamTest } from '@/features/test/actions/submit-webcam-test';
import type { CalibrationVisualMode } from '@/features/test/lib/calibration-mode';
import type {
  CalibrationResult,
  IntakeData,
  WebcamGazePoint,
  WebcamTestFlowState,
} from '@/features/test/types';

import { useFullscreen } from './use-fullscreen';
import { useStableAttemptId } from './use-stable-attempt-id';
import { useCalibrationQueryParams } from './use-calibration-query-params';
import { useTestFlow } from './use-test-flow';
import { useWebcamGaze } from './use-webcam-gaze';
import { WEBCAM_STEPS, getStepKeyForState, MIN_GAZE_POINTS } from '../lib/constants';
import { getWebcamTaskContent } from '../lib/test-content';

const STEP_INDICATOR_HIDDEN_STATES = new Set([
  'idle',
  'camera-setup',
  'calibrating',
  'task-paragraph',
  'review-paragraph',
  'results',
  'submitting',
]);

export function useWebcamTestController() {
  const router = useRouter();
  const { state, dispatch } = useTestFlow({ mode: 'webcam' });
  const webcamState = state as WebcamTestFlowState;
  const { mode: initialCalibrationMode, age: participantAge } = useCalibrationQueryParams();
  const { getOrCreateAttemptId, resetAttemptId } = useStableAttemptId();
  const { enterFullscreen, exitFullscreen } = useFullscreen();

  const [selectedMode, setSelectedMode] = useState<CalibrationVisualMode | undefined>(
    initialCalibrationMode,
  );
  const requestedCalibrationMode = selectedMode || 'grid';

  const videoRef = useRef<HTMLVideoElement>(null);
  const gazeDataRef = useRef<WebcamGazePoint[]>([]);
  const lineCentersRef = useRef<number[]>([]);
  const lastTaskGazePositionRef = useRef<{ x: number; y: number } | null>(null);

  const [gazePointCount, setGazePointCount] = useState(0);
  const [reviewGazeData, setReviewGazeData] = useState<WebcamGazePoint[]>([]);
  const [taskContent, setTaskContent] = useState('');
  const [lastTaskGazePosition, setLastTaskGazePosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Screenshot captured from TaskDisplay for export visualizations.
  const screenshotRef = useRef<string | null>(null);

  const setScreenshot = useCallback((_taskType: string, dataUrl: string) => {
    screenshotRef.current = dataUrl;
  }, []);

  const webcamGaze = useWebcamGaze({
    enabled: true,
    onGazePoint: useCallback((point: WebcamGazePoint) => {
      gazeDataRef.current.push(point);
      setGazePointCount((prev) => prev + 1);

      const previous = lastTaskGazePositionRef.current;
      const dx = previous ? point.x - previous.x : Number.POSITIVE_INFINITY;
      const dy = previous ? point.y - previous.y : Number.POSITIVE_INFINITY;
      if (!previous || dx * dx + dy * dy > 1) {
        const next = { x: point.x, y: point.y };
        lastTaskGazePositionRef.current = next;
        setLastTaskGazePosition(next);
      }
    }, []),
  });

  const handleCameraReady = useCallback(() => {
    dispatch({ type: 'CAMERA_READY' });
    enterFullscreen();
  }, [dispatch, enterFullscreen]);

  const handleCalibrationComplete = useCallback(
    (
      result: CalibrationResult,
      mapping?: {
        predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
      },
    ) => {
      if (mapping) {
        webcamGaze.setCalibrationData(mapping);
      }

      dispatch({ type: 'CALIBRATION_COMPLETE', result });
      setTaskContent(getWebcamTaskContent());
      gazeDataRef.current = [];
      setGazePointCount(0);
      setReviewGazeData([]);
      lastTaskGazePositionRef.current = null;
      setLastTaskGazePosition(null);
    },
    [dispatch, webcamGaze],
  );

  const handleTaskDone = useCallback(() => {
    webcamGaze.stopCollecting();
    setReviewGazeData([...gazeDataRef.current]);
    dispatch({ type: 'TASK_COMPLETE' });
  }, [dispatch, webcamGaze]);

  const handleLineCentersReady = useCallback((centers: number[]) => {
    lineCentersRef.current = centers;
  }, []);

  const handleRetake = useCallback(() => {
    gazeDataRef.current = [];
    setGazePointCount(0);
    setReviewGazeData([]);
    lastTaskGazePositionRef.current = null;
    setLastTaskGazePosition(null);
    dispatch({ type: 'RETAKE' });
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    dispatch({ type: 'CONTINUE' });
  }, [dispatch]);

  const retrySubmission = useCallback(() => {
    dispatch({ type: 'RETRY_SUBMIT' });
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    if (gazeDataRef.current.length < MIN_GAZE_POINTS) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: `Not enough gaze data collected (${gazeDataRef.current.length} points). Please ensure the camera has a clear view of your face and try again.`,
      });
      return;
    }

    if (!webcamState.intake) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: 'Missing intake data. Please restart the test and try again.',
      });
      return;
    }

    const result = await submitWebcamTest({
      attempt: {
        attemptId: getOrCreateAttemptId(),
        age: webcamState.intake.age,
        label: webcamState.intake.label,
        calibrationMode: requestedCalibrationMode,
        contentSnapshot: {
          version: 1,
          primaryTask: 'paragraph',
          tasks: {
            paragraph: taskContent,
          },
        },
      },
      gazeData: gazeDataRef.current,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      lineCenters: lineCentersRef.current,
      screenshots: screenshotRef.current ? { paragraph: screenshotRef.current } : undefined,
    });

    if (result.success) {
      dispatch({ type: 'SUBMIT_SUCCESS', result: result.data });
      return;
    }

    dispatch({ type: 'SUBMIT_ERROR', error: result.error });
  }, [dispatch, getOrCreateAttemptId, requestedCalibrationMode, taskContent, webcamState.intake]);

  const handleNewTest = useCallback(() => {
    resetAttemptId();
    gazeDataRef.current = [];
    setGazePointCount(0);
    setReviewGazeData([]);
    lastTaskGazePositionRef.current = null;
    setLastTaskGazePosition(null);
    setTaskContent('');
    screenshotRef.current = null;
    dispatch({ type: 'RESET' });
    dispatch({ type: 'START' });
  }, [dispatch, resetAttemptId]);

  const handleExit = useCallback(() => {
    webcamGaze.cleanup();
    exitFullscreen();
    router.push('/');
  }, [exitFullscreen, router, webcamGaze]);

  useEffect(() => {
    if (webcamState.currentState === 'submitting') {
      void handleSubmit();
    }
  }, [handleSubmit, webcamState.currentState]);

  useEffect(() => {
    if (webcamState.currentState === 'task-paragraph') {
      webcamGaze.startCollecting();
    }
  }, [webcamGaze, webcamState.currentState]);

  useEffect(() => {
    if (webcamState.currentState === 'results') {
      webcamGaze.cleanup();
      exitFullscreen();
    }
  }, [exitFullscreen, webcamGaze, webcamState.currentState]);

  useEffect(() => {
    if (webcamState.currentState === 'error') {
      webcamGaze.cleanup();
    }
  }, [webcamGaze, webcamState.currentState]);

  return {
    state: webcamState,
    dispatch,
    videoRef,
    webcamGaze,
    participantAge,
    requestedCalibrationMode,
    selectedMode,
    setSelectedMode,
    taskContent,
    gazePointCount,
    reviewGazeData,
    lastTaskGazePosition,
    steps: WEBCAM_STEPS.map((step) => ({ key: step.key, label: step.label })),
    currentStepKey: getStepKeyForState(webcamState.currentState),
    showStepIndicator: !STEP_INDICATOR_HIDDEN_STATES.has(webcamState.currentState),
    canRetrySubmission: gazePointCount >= MIN_GAZE_POINTS,
    handleCameraReady,
    handleCalibrationComplete,
    handleTaskDone,
    handleLineCentersReady,
    handleRetake,
    handleContinue,
    retrySubmission,
    handleNewTest,
    handleExit,
    completeIntake: (data: IntakeData) => dispatch({ type: 'INTAKE_COMPLETE', data }),
    completeEducation: () => dispatch({ type: 'EDUCATION_COMPLETE' }),
    startFromIdle: () => dispatch({ type: 'START' }),
    setScreenshot,
  };
}
