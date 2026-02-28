'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FullscreenShell } from '@/components/shared';
import { StepIndicator } from '@/components/shared';
import { LoadingScreen } from '@/components/shared';
import {
  DeviceCheck,
  CalibrationScreen,
  TaskDisplay,
  ReviewPanel,
  ResultsDisplay,
  ErrorScreen,
  ScreenGuard,
} from '@/features/test/components';
import { useTestFlow, useTobiiGazeStream } from '@/features/test/hooks';
import { submitTobiiTest } from '@/features/test/actions/submit-test';
import { getTobiiTaskContent, TASK_LABELS } from '@/features/test/lib/test-content';
import { TOBII_STEPS, getStepKeyForState } from '@/features/test/lib/constants';
import { useFullscreen } from '@/features/test/hooks/use-fullscreen';
import type { TobiiGazePoint, TobiiTestFlowState, CalibrationResult, Language } from '@/features/test/types';

export default function TobiiTestPage() {
  const router = useRouter();
  const [language] = useState<Language>('en');
  const { state, dispatch } = useTestFlow({ mode: 'tobii', language });
  const tobiiState = state as TobiiTestFlowState;

  const { enterFullscreen, exitFullscreen } = useFullscreen();

  // Gaze data buffers (refs to avoid re-renders on every gaze point)
  const syllablesRef = useRef<TobiiGazePoint[]>([]);
  const pseudoWordsRef = useRef<TobiiGazePoint[]>([]);
  const meaningfulTextRef = useRef<TobiiGazePoint[]>([]);

  // Track which buffer is currently active
  const activeBufferRef = useRef<TobiiGazePoint[]>(syllablesRef.current);

  // Gaze point count for UI (updated via callback)
  const [gazePointCount, setGazePointCount] = useState(0);

  // Last gaze point ref for calibration sampling
  const lastGazeRef = useRef<{ x: number; y: number } | null>(null);

  // Content refs (generated once per task entry)
  const [taskContent, setTaskContent] = useState<Record<string, string>>({});

  // Are we in a task state that should stream gaze data?
  const isTaskActive = ['task-syllables', 'task-pseudo-words', 'task-meaningful-text'].includes(
    tobiiState.currentState,
  );

  // Stream gaze data from Tobii WebSocket
  const { connected, pointCount: _wsPointCount } = useTobiiGazeStream({
    enabled: isTaskActive || tobiiState.currentState === 'calibrating',
    onGazeData: useCallback((points: TobiiGazePoint[]) => {
      // Store last point for calibration
      if (points.length > 0) {
        const last = points[points.length - 1];
        lastGazeRef.current = { x: last.fixationX, y: last.fixationY };
      }

      // Only buffer during task states
      if (activeBufferRef.current) {
        activeBufferRef.current.push(...points);
        setGazePointCount(activeBufferRef.current.length);
      }
    }, []),
  });

  // ─── Handlers ──────────────────────────────────────────

  const handleDeviceReady = useCallback(() => {
    dispatch({ type: 'DEVICE_READY' });
    // Enter fullscreen right before calibration
    enterFullscreen();
  }, [dispatch, enterFullscreen]);

  const handleCalibrationComplete = useCallback(
    (result: CalibrationResult) => {
      dispatch({ type: 'CALIBRATION_COMPLETE', result });
      // Set up first task content
      const content = getTobiiTaskContent(language, 'syllables');
      setTaskContent((prev) => ({ ...prev, syllables: content }));
      activeBufferRef.current = syllablesRef.current;
      setGazePointCount(0);
    },
    [dispatch, language],
  );

  const handleCalibrationRetry = useCallback(() => {
    dispatch({ type: 'CALIBRATION_RETRY' });
  }, [dispatch]);

  const handleTaskDone = useCallback(() => {
    dispatch({ type: 'TASK_COMPLETE' });
  }, [dispatch]);

  const handleRetake = useCallback(() => {
    // Clear the current buffer
    activeBufferRef.current.length = 0;
    setGazePointCount(0);
    dispatch({ type: 'RETAKE' });
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    const currentState = tobiiState.currentState;

    // Set up next task content and buffer
    if (currentState === 'review-syllables') {
      const content = getTobiiTaskContent(language, 'pseudo-words');
      setTaskContent((prev) => ({ ...prev, 'pseudo-words': content }));
      activeBufferRef.current = pseudoWordsRef.current;
      setGazePointCount(0);
    } else if (currentState === 'review-pseudo-words') {
      const content = getTobiiTaskContent(language, 'meaningful-text');
      setTaskContent((prev) => ({ ...prev, 'meaningful-text': content }));
      activeBufferRef.current = meaningfulTextRef.current;
      setGazePointCount(0);
    }

    dispatch({ type: 'CONTINUE' });
  }, [dispatch, tobiiState.currentState, language]);

  // Auto-submit when entering submitting state
  const handleSubmit = useCallback(async () => {
    const screen = {
      width: window.screen.width,
      height: window.screen.height,
    };

    const result = await submitTobiiTest(
      syllablesRef.current,
      pseudoWordsRef.current,
      meaningfulTextRef.current,
      screen.width,
      screen.height,
    );

    if (result.success) {
      dispatch({ type: 'SUBMIT_SUCCESS', result: result.data });
    } else {
      dispatch({ type: 'SUBMIT_ERROR', error: result.error });
    }
  }, [dispatch]);

  // Trigger submit when state transitions to 'submitting'
  useEffect(() => {
    if (tobiiState.currentState === 'submitting') {
      handleSubmit();
    }
  }, [tobiiState.currentState, handleSubmit]);

  const handleNewTest = useCallback(() => {
    syllablesRef.current = [];
    pseudoWordsRef.current = [];
    meaningfulTextRef.current = [];
    setGazePointCount(0);
    setTaskContent({});
    dispatch({ type: 'RESET' });
    dispatch({ type: 'START' });
  }, [dispatch]);

  const handleExit = useCallback(() => {
    exitFullscreen();
    router.push('/');
  }, [router, exitFullscreen]);

  // Exit fullscreen when results are shown
  useEffect(() => {
    if (tobiiState.currentState === 'results') {
      exitFullscreen();
    }
  }, [tobiiState.currentState, exitFullscreen]);

  // ─── Step indicator mapping ────────────────────────────

  const currentStepKey = getStepKeyForState(tobiiState.currentState);
  const steps = TOBII_STEPS.map((s) => ({ key: s.key, label: s.label }));

  // ─── Render Current State ──────────────────────────────

  const renderState = () => {
    switch (tobiiState.currentState) {
      case 'idle':
        return (
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-3xl font-bold">Eye Tracker Test</h1>
            <p className="text-muted-foreground">
              This test uses a Tobii eye tracker to screen for dyslexia indicators.
              It consists of 3 reading tasks: syllables, pseudo-words, and meaningful text.
            </p>
            <button
              onClick={() => dispatch({ type: 'START' })}
              className="rounded-md bg-primary px-6 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start Test
            </button>
          </div>
        );

      case 'device-check':
        return <DeviceCheck onReady={handleDeviceReady} />;

      case 'calibrating':
        return (
          <CalibrationScreen
            mode="tobii"
            onGetGazeSample={() => lastGazeRef.current}
            onComplete={handleCalibrationComplete}
            blockOnPoor={true}
          />
        );

      case 'task-syllables':
        return (
          <TaskDisplay
            taskType="syllables"
            content={taskContent['syllables'] ?? getTobiiTaskContent(language, 'syllables')}
            language={language}
            pointCount={gazePointCount}
            isCollecting={connected}
            onDone={handleTaskDone}
            getLastGazePosition={() => {
              if (!lastGazeRef.current) return null;
              return {
                x: lastGazeRef.current.x * window.screen.width,
                y: lastGazeRef.current.y * window.screen.height,
              };
            }}
          />
        );

      case 'review-syllables':
        return (
          <ReviewPanel
            taskType="syllables"
            pointCount={syllablesRef.current.length}
            isLastTask={false}
            onRetake={handleRetake}
            onContinue={handleContinue}
          />
        );

      case 'task-pseudo-words':
        return (
          <TaskDisplay
            taskType="pseudo-words"
            content={taskContent['pseudo-words'] ?? getTobiiTaskContent(language, 'pseudo-words')}
            language={language}
            pointCount={gazePointCount}
            isCollecting={connected}
            onDone={handleTaskDone}
            getLastGazePosition={() => {
              if (!lastGazeRef.current) return null;
              return {
                x: lastGazeRef.current.x * window.screen.width,
                y: lastGazeRef.current.y * window.screen.height,
              };
            }}
          />
        );

      case 'review-pseudo-words':
        return (
          <ReviewPanel
            taskType="pseudo-words"
            pointCount={pseudoWordsRef.current.length}
            isLastTask={false}
            onRetake={handleRetake}
            onContinue={handleContinue}
          />
        );

      case 'task-meaningful-text':
        return (
          <TaskDisplay
            taskType="meaningful-text"
            content={
              taskContent['meaningful-text'] ??
              getTobiiTaskContent(language, 'meaningful-text')
            }
            language={language}
            pointCount={gazePointCount}
            isCollecting={connected}
            onDone={handleTaskDone}
            getLastGazePosition={() => {
              if (!lastGazeRef.current) return null;
              return {
                x: lastGazeRef.current.x * window.screen.width,
                y: lastGazeRef.current.y * window.screen.height,
              };
            }}
          />
        );

      case 'review-meaningful-text':
        return (
          <ReviewPanel
            taskType="meaningful-text"
            pointCount={meaningfulTextRef.current.length}
            isLastTask={true}
            onRetake={handleRetake}
            onContinue={handleContinue}
          />
        );

      case 'submitting':
        return <LoadingScreen message="Analyzing eye movement data..." />;

      case 'results':
        if (!tobiiState.results) return null;
        return (
          <ResultsDisplay
            result={tobiiState.results}
            mode="tobii"
            onNewTest={handleNewTest}
          />
        );

      case 'error':
        return (
          <ErrorScreen
            error={tobiiState.error ?? 'An unexpected error occurred'}
            onRetry={() => dispatch({ type: 'RETRY_SUBMIT' })}
            onGoHome={handleExit}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ScreenGuard>
      <FullscreenShell onExit={handleExit} showExit={tobiiState.currentState !== 'results'}>
        {tobiiState.currentState !== 'idle' &&
          tobiiState.currentState !== 'calibrating' &&
          !['task-syllables', 'task-pseudo-words', 'task-meaningful-text'].includes(
            tobiiState.currentState,
          ) && (
            <div className="mb-8">
              <StepIndicator steps={steps} currentStepKey={currentStepKey} />
            </div>
          )}
        {renderState()}
      </FullscreenShell>
    </ScreenGuard>
  );
}
