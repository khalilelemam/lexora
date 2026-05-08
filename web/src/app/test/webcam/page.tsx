'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FullscreenShell } from '@/components/shared';
import { StepIndicator } from '@/components/shared';
import { LoadingScreen } from '@/components/shared';
import {
  CameraSetup,
  CalibrationScreen,
  TaskDisplay,
  ReviewPanel,
  ResultsDisplay,
  ErrorScreen,
  ScreenGuard,
  GazeDebugDot,
  TestErrorBoundary,
} from '@/features/test/components';
import { PreTestSlides } from '@/features/test/components/pre-test-slides';
import { CalibrationSetup } from '@/features/test/components/calibration/calibration-setup';
import { useTestFlow, useWebcamGaze } from '@/features/test/hooks';
import { Star, Target } from 'lucide-react';
import { useFullscreen } from '@/features/test/hooks/use-fullscreen';
import { submitWebcamTest } from '@/features/test/actions/submit-test';
import { getWebcamTaskContent } from '@/features/test/lib/test-content';
import { WEBCAM_STEPS, getStepKeyForState, MIN_GAZE_POINTS } from '@/features/test/lib/constants';
import type {
  WebcamGazePoint,
  WebcamTestFlowState,
  CalibrationResult,
} from '@/features/test/types';
import type { CalibrationVisualMode } from '@/features/test/hooks/use-calibration-engine';
import { parseCalibrationMode } from '@/features/test/lib/parse-calibration-mode';

export default function WebcamTestPage() {
  const router = useRouter();
  const { state, dispatch } = useTestFlow({ mode: 'webcam' });
  const webcamState = state as WebcamTestFlowState;

  const calibrationParams = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        mode: undefined as CalibrationVisualMode | undefined,
        age: undefined as number | undefined,
      };
    }

    const params = new URLSearchParams(window.location.search);
    const parsedMode = parseCalibrationMode(params.get('calibrationMode'));
    const parsedAge = Number(params.get('age'));

    return {
      mode: parsedMode,
      age: Number.isFinite(parsedAge) ? parsedAge : undefined,
    };
  }, []);

  const [selectedMode, setSelectedMode] = useState<CalibrationVisualMode | undefined>(
    calibrationParams.mode,
  );

  const requestedCalibrationMode = selectedMode || 'grid';
  const participantAge = calibrationParams.age;

  const handleStartTest = useCallback(
    (mode: CalibrationVisualMode) => {
      setSelectedMode(mode);
      dispatch({ type: 'START' });
    },
    [dispatch],
  );

  const { enterFullscreen, exitFullscreen } = useFullscreen();

  // Keep the video element mounted so MediaPipe can persist between UI states.
  const videoRef = useRef<HTMLVideoElement>(null);

  // Gaze data buffer
  const gazeDataRef = useRef<WebcamGazePoint[]>([]);
  const [gazePointCount, setGazePointCount] = useState(0);
  const [reviewGazeData, setReviewGazeData] = useState<WebcamGazePoint[]>([]);
  const [lastTaskGazePosition, setLastTaskGazePosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Task content
  const [taskContent, setTaskContent] = useState<string>('');

  // Y-Axis Line Snapping: store normalized line centers for the reading task
  const lineCentersRef = useRef<number[]>([]);

  // Webcam gaze hook — page level so it persists across state transitions
  const webcamGaze = useWebcamGaze({
    enabled: true,
    onGazePoint: useCallback((point: WebcamGazePoint) => {
      gazeDataRef.current.push(point);
      setGazePointCount((prev) => prev + 1);
      setLastTaskGazePosition({ x: point.x, y: point.y });
    }, []),
  });

  const handleCameraReady = useCallback(() => {
    dispatch({ type: 'CAMERA_READY' });
    // Enter fullscreen right before calibration
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

      const content = getWebcamTaskContent();
      setTaskContent(content);
      gazeDataRef.current = [];
      setGazePointCount(0);
      setReviewGazeData([]);
      setLastTaskGazePosition(null);
    },
    [dispatch, webcamGaze],
  );

  const handleTaskDone = useCallback(() => {
    // Stop collecting — review panel shows raw gaze trail replay, not live feed
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
    setLastTaskGazePosition(null);
    dispatch({ type: 'RETAKE' });
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    dispatch({ type: 'CONTINUE' });
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    // Avoid sending obviously invalid payloads to the ML service.
    if (gazeDataRef.current.length < MIN_GAZE_POINTS) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: `Not enough gaze data collected (${gazeDataRef.current.length} points). Please ensure the camera has a clear view of your face and try again.`,
      });
      return;
    }

    const screen = {
      width: window.screen.width,
      height: window.screen.height,
    };

    const result = await submitWebcamTest(
      gazeDataRef.current,
      screen.width,
      screen.height,
      lineCentersRef.current,
    );

    if (result.success) {
      dispatch({ type: 'SUBMIT_SUCCESS', result: result.data });
    } else {
      dispatch({ type: 'SUBMIT_ERROR', error: result.error });
    }
  }, [dispatch]);

  useEffect(() => {
    if (webcamState.currentState === 'submitting') {
      handleSubmit();
    }
  }, [webcamState.currentState, handleSubmit]);

  const handleNewTest = useCallback(() => {
    gazeDataRef.current = [];
    setGazePointCount(0);
    setReviewGazeData([]);
    setLastTaskGazePosition(null);
    setTaskContent('');
    dispatch({ type: 'RESET' });
    dispatch({ type: 'START' });
  }, [dispatch]);

  const handleExit = useCallback(() => {
    webcamGaze.cleanup();
    exitFullscreen();
    router.push('/');
  }, [router, webcamGaze, exitFullscreen]);

  useEffect(() => {
    if (webcamState.currentState === 'task-paragraph') {
      webcamGaze.startCollecting();
    }
  }, [webcamState.currentState, webcamGaze]);

  useEffect(() => {
    if (webcamState.currentState === 'results') {
      webcamGaze.cleanup();
      exitFullscreen();
    }
  }, [webcamState.currentState, webcamGaze, exitFullscreen]);

  useEffect(() => {
    if (webcamState.currentState === 'error') {
      webcamGaze.cleanup();
    }
  }, [webcamState.currentState, webcamGaze]);

  const currentStepKey = getStepKeyForState(webcamState.currentState);
  const steps = WEBCAM_STEPS.map((s) => ({ key: s.key, label: s.label }));

  const renderState = () => {
    switch (webcamState.currentState) {
      case 'idle':
        return (
          <CalibrationSetup
            resolvedMode={requestedCalibrationMode}
            onSelectMode={setSelectedMode}
            onStart={() => dispatch({ type: 'START' })}
            startButtonText="Continue to Instructions"
          />
        );

      case 'pre-test-education':
        return (
          <PreTestSlides
            mode="webcam"
            isStarMode={requestedCalibrationMode === 'star'}
            onComplete={() => dispatch({ type: 'EDUCATION_COMPLETE' })}
            onSkip={() => dispatch({ type: 'EDUCATION_COMPLETE' })}
          />
        );

      case 'camera-setup':
        return (
          <CameraSetup webcamGaze={webcamGaze} videoRef={videoRef} onReady={handleCameraReady} />
        );

      case 'calibrating':
        return (
          <CalibrationScreen
            tracker="webcam"
            mode={requestedCalibrationMode}
            participantAge={participantAge}
            onGetIrisSample={() => {
              const iris = webcamGaze.getLastIrisPosition();
              if (!iris) return null;

              const rawIrisLandmarks = webcamGaze.getLastRawIrisLandmarks();
              const globalIris = webcamGaze.getLastGlobalIrisPosition();

              return {
                x: (iris.leftX + iris.rightX) / 2,
                y: (iris.leftY + iris.rightY) / 2,
                rawIrisLandmarks: rawIrisLandmarks ?? [],
                screenHint: globalIris
                  ? {
                      x: globalIris.x * window.screen.width,
                      y: globalIris.y * window.screen.height,
                    }
                  : null,
              };
            }}
            onGetHeadPoseSample={() => webcamGaze.getLastHeadPose()}
            onComplete={handleCalibrationComplete}
            blockOnPoor={true}
          />
        );

      case 'task-paragraph':
        return (
          <TaskDisplay
            taskType="paragraph"
            content={taskContent || getWebcamTaskContent()}
            pointCount={gazePointCount}
            isCollecting={webcamGaze.collecting}
            onDone={handleTaskDone}
            onLineCentersReady={handleLineCentersReady}
            getLastGazePosition={() => lastTaskGazePosition}
          />
        );

      case 'review-paragraph':
        return (
          <ReviewPanel
            taskType="paragraph"
            pointCount={gazePointCount}
            isLastTask={true}
            onRetake={handleRetake}
            onContinue={handleContinue}
            readingContent={taskContent || getWebcamTaskContent()}
            rawGazeData={reviewGazeData}
          />
        );

      case 'submitting':
        return <LoadingScreen message="Analyzing eye movement data..." />;

      case 'results':
        if (!webcamState.results) return null;
        return (
          <ResultsDisplay
            result={webcamState.results}
            mode="webcam"
            onNewTest={handleNewTest}
            readingContent={taskContent || getWebcamTaskContent()}
          />
        );

      case 'error':
        return (
          <ErrorScreen
            error={webcamState.error ?? 'An unexpected error occurred'}
            // Only offer "Retry Submission" when we have enough data —
            // otherwise re-submitting the same insufficient data just loops.
            onRetry={
              gazePointCount >= MIN_GAZE_POINTS
                ? () => dispatch({ type: 'RETRY_SUBMIT' })
                : undefined
            }
            onStartOver={handleNewTest}
            onGoHome={handleExit}
          />
        );

      default:
        return null;
    }
  };

  return (
    <TestErrorBoundary>
      <ScreenGuard>
        <FullscreenShell onExit={handleExit} showExit={webcamState.currentState !== 'results'}>
          {/* Hidden video element for MediaPipe — always in DOM */}
          <video
            ref={videoRef}
            className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-[0.01]"
            autoPlay
            playsInline
            muted
          />

          {webcamState.currentState !== 'idle' &&
            webcamState.currentState !== 'camera-setup' &&
            webcamState.currentState !== 'calibrating' &&
            webcamState.currentState !== 'task-paragraph' &&
            webcamState.currentState !== 'review-paragraph' &&
            webcamState.currentState !== 'results' &&
            webcamState.currentState !== 'submitting' && (
              <div className="mb-8">
                <StepIndicator steps={steps} currentStepKey={currentStepKey} />
              </div>
            )}
          {renderState()}
          {/* Gaze debug dot disabled during active reading tests.
            Research: visible gaze feedback creates tracking feedback loops
            where the child follows the dot instead of reading naturally.
            Can be re-enabled for review/debug screens. */}
          <GazeDebugDot active={false} getPosition={() => lastTaskGazePosition} />
        </FullscreenShell>
      </ScreenGuard>
    </TestErrorBoundary>
  );
}
