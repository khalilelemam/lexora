'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
} from '@/features/test/components';
import { useTestFlow, useWebcamGaze } from '@/features/test/hooks';
import { useFullscreen } from '@/features/test/hooks/use-fullscreen';
import { submitWebcamTest } from '@/features/test/actions/submit-test';
import { getWebcamTaskContent } from '@/features/test/lib/test-content';
import { WEBCAM_STEPS, getStepKeyForState, MIN_GAZE_POINTS } from '@/features/test/lib/constants';
import type { WebcamGazePoint, WebcamTestFlowState, CalibrationResult, Language } from '@/features/test/types';

export default function WebcamTestPage() {
  const router = useRouter();
  const [language] = useState<Language>('en');
  const { state, dispatch } = useTestFlow({ mode: 'webcam', language });
  const webcamState = state as WebcamTestFlowState;

  const { enterFullscreen, exitFullscreen } = useFullscreen();

  // ─── Persistent video element for MediaPipe ────────────
  // Lives at the page level so it survives CameraSetup unmount.
  const videoRef = useRef<HTMLVideoElement>(null);

  // Gaze data buffer
  const gazeDataRef = useRef<WebcamGazePoint[]>([]);
  const [gazePointCount, setGazePointCount] = useState(0);

  // Webcam gaze hook — page level so it persists across state transitions
  const webcamGaze = useWebcamGaze({
    enabled: true,
    onGazePoint: useCallback((point: WebcamGazePoint) => {
      gazeDataRef.current.push(point);
      setGazePointCount((prev) => prev + 1);
    }, []),
  });

  // Task content
  const [taskContent, setTaskContent] = useState<string>('');

  // ─── Handlers ──────────────────────────────────────────

  const handleCameraReady = useCallback(() => {
    dispatch({ type: 'CAMERA_READY' });
    // Enter fullscreen right before calibration
    enterFullscreen();
  }, [dispatch, enterFullscreen]);

  const handleCalibrationComplete = useCallback(
    (result: CalibrationResult, mapping?: { xCoeffs: number[]; yCoeffs: number[] }) => {
      if (mapping) {
        webcamGaze.setCalibrationData(mapping);
      }
      dispatch({ type: 'CALIBRATION_COMPLETE', result });

      const content = getWebcamTaskContent(language);
      setTaskContent(content);
      gazeDataRef.current = [];
      setGazePointCount(0);
    },
    [dispatch, language, webcamGaze],
  );

  const handleTaskDone = useCallback(() => {
    webcamGaze.stopCollecting();
    dispatch({ type: 'TASK_COMPLETE' });
  }, [dispatch, webcamGaze]);

  const handleRetake = useCallback(() => {
    gazeDataRef.current = [];
    setGazePointCount(0);
    dispatch({ type: 'RETAKE' });
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    dispatch({ type: 'CONTINUE' });
  }, [dispatch]);

  // Auto-submit
  const handleSubmit = useCallback(async () => {
    // Pre-submit validation — avoid BAD_REQUEST from ML service
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

    const result = await submitWebcamTest(gazeDataRef.current, screen.width, screen.height);

    if (result.success) {
      dispatch({ type: 'SUBMIT_SUCCESS', result: result.data });
    } else {
      dispatch({ type: 'SUBMIT_ERROR', error: result.error });
    }
  }, [dispatch]);

  // Trigger submit when state transitions to 'submitting'
  useEffect(() => {
    if (webcamState.currentState === 'submitting') {
      handleSubmit();
    }
  }, [webcamState.currentState, handleSubmit]);

  const handleNewTest = useCallback(() => {
    gazeDataRef.current = [];
    setGazePointCount(0);
    setTaskContent('');
    dispatch({ type: 'RESET' });
    dispatch({ type: 'START' });
  }, [dispatch]);

  const handleExit = useCallback(() => {
    webcamGaze.cleanup();
    exitFullscreen();
    router.push('/');
  }, [router, webcamGaze, exitFullscreen]);

  // Start collecting when entering task state
  useEffect(() => {
    if (webcamState.currentState === 'task-paragraph') {
      webcamGaze.startCollecting();
    }
  }, [webcamState.currentState, webcamGaze]);

  // Exit fullscreen and stop camera when results are shown
  useEffect(() => {
    if (webcamState.currentState === 'results') {
      webcamGaze.cleanup();
      exitFullscreen();
    }
  }, [webcamState.currentState, webcamGaze, exitFullscreen]);

  // Clean up camera on error state
  useEffect(() => {
    if (webcamState.currentState === 'error') {
      webcamGaze.cleanup();
    }
  }, [webcamState.currentState, webcamGaze]);

  // ─── Step indicator ────────────────────────────────────

  const currentStepKey = getStepKeyForState(webcamState.currentState);
  const steps = WEBCAM_STEPS.map((s) => ({ key: s.key, label: s.label }));

  // ─── Render ────────────────────────────────────────────

  const renderState = () => {
    switch (webcamState.currentState) {
      case 'idle':
        return (
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-3xl font-bold">Webcam Eye Test</h1>
            <p className="max-w-lg text-center text-muted-foreground">
              This test uses your webcam to track eye movement while reading a paragraph.
              It&apos;s less accurate than a professional eye tracker but doesn&apos;t require
              special hardware.
            </p>
            <button
              onClick={() => dispatch({ type: 'START' })}
              className="rounded-md bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start Test
            </button>
          </div>
        );

      case 'camera-setup':
        return (
          <CameraSetup
            webcamGaze={webcamGaze}
            videoRef={videoRef}
            onReady={handleCameraReady}
          />
        );

      case 'calibrating':
        return (
          <CalibrationScreen
            mode="webcam"
            onGetIrisSample={() => {
              const iris = webcamGaze.getLastIrisPosition();
              if (!iris) return null;
              return {
                x: (iris.leftX + iris.rightX) / 2,
                y: (iris.leftY + iris.rightY) / 2,
              };
            }}
            onComplete={handleCalibrationComplete}
            blockOnPoor={false}
          />
        );

      case 'task-paragraph':
        return (
          <TaskDisplay
            taskType="paragraph"
            content={taskContent || getWebcamTaskContent(language)}
            language={language}
            pointCount={gazePointCount}
            isCollecting={webcamGaze.collecting}
            onDone={handleTaskDone}
            getLastGazePosition={() => {
              const last = gazeDataRef.current[gazeDataRef.current.length - 1];
              return last ? { x: last.x, y: last.y } : null;
            }}
          />
        );

      case 'review-paragraph':
        return (
          <ReviewPanel
            taskType="paragraph"
            pointCount={gazeDataRef.current.length}
            isLastTask={true}
            onRetake={handleRetake}
            onContinue={handleContinue}
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
            readingContent={taskContent || getWebcamTaskContent(language)}
            contentDirection={language === 'ar' ? 'rtl' : 'ltr'}
          />
        );

      case 'error':
        return (
          <ErrorScreen
            error={webcamState.error ?? 'An unexpected error occurred'}
            // Only offer "Retry Submission" when we have enough data —
            // otherwise re-submitting the same insufficient data just loops.
            onRetry={
              gazeDataRef.current.length >= MIN_GAZE_POINTS
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
          webcamState.currentState !== 'calibrating' &&
          webcamState.currentState !== 'task-paragraph' && (
            <div className="mb-8">
              <StepIndicator steps={steps} currentStepKey={currentStepKey} />
            </div>
          )}
        {renderState()}
      </FullscreenShell>
    </ScreenGuard>
  );
}
