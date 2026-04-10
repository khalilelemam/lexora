'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  TestErrorBoundary,
} from '@/features/test/components';
import { useTestFlow, useTobiiGazeStream } from '@/features/test/hooks';
import { submitTobiiTest } from '@/features/test/actions/submit-test';
import { getTobiiTaskContent } from '@/features/test/lib/test-content';
import { TOBII_STEPS, getStepKeyForState } from '@/features/test/lib/constants';
import { useFullscreen } from '@/features/test/hooks/use-fullscreen';
import type { TobiiGazePoint, TobiiTestFlowState, CalibrationResult } from '@/features/test/types';
import type { CalibrationVisualMode } from '@/features/test/hooks/use-calibration-engine';
import { parseCalibrationMode } from '@/features/test/lib/parse-calibration-mode';

type TobiiTaskKey = 'syllables' | 'pseudo-words' | 'meaningful-text';

export default function TobiiTestPage() {
  const router = useRouter();
  const { state, dispatch } = useTestFlow({ mode: 'tobii' });
  const tobiiState = state as TobiiTestFlowState;

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

  const requestedCalibrationMode = calibrationParams.mode;
  const participantAge = calibrationParams.age;

  const { enterFullscreen, exitFullscreen } = useFullscreen();

  // Gaze data buffers (refs to avoid re-renders on every gaze point)
  const syllablesRef = useRef<TobiiGazePoint[]>([]);
  const pseudoWordsRef = useRef<TobiiGazePoint[]>([]);
  const meaningfulTextRef = useRef<TobiiGazePoint[]>([]);

  // Track which buffer is currently active
  const activeBufferRef = useRef<TobiiGazePoint[] | null>(null);
  const activeTaskKeyRef = useRef<TobiiTaskKey | null>(null);

  // Gaze point count for UI (updated via callback)
  const [gazePointCount, setGazePointCount] = useState(0);
  const [taskPointCounts, setTaskPointCounts] = useState<Record<TobiiTaskKey, number>>({
    syllables: 0,
    'pseudo-words': 0,
    'meaningful-text': 0,
  });
  const [lastTaskGazePosition, setLastTaskGazePosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Last gaze point ref for calibration sampling
  const lastGazeRef = useRef<{ x: number; y: number } | null>(null);

  // Content refs (generated once per task entry)
  const [taskContent, setTaskContent] = useState<Record<string, string>>({});

  // Y-Axis Line Snapping: store normalized line centers for each task
  const lineCentersRef = useRef<Record<string, number[]>>({
    syllables: [],
    'pseudo-words': [],
    'meaningful-text': [],
  });

  const isTaskActive = ['task-syllables', 'task-pseudo-words', 'task-meaningful-text'].includes(
    tobiiState.currentState,
  );

  // Stream gaze data from Tobii WebSocket
  const { connected } = useTobiiGazeStream({
    enabled: isTaskActive || tobiiState.currentState === 'calibrating',
    onGazeData: useCallback((points: TobiiGazePoint[]) => {
      // Store last point for calibration
      if (points.length > 0) {
        const last = points[points.length - 1];
        lastGazeRef.current = { x: last.fixationX, y: last.fixationY };
        setLastTaskGazePosition({
          x: last.fixationX * window.screen.width,
          y: last.fixationY * window.screen.height,
        });
      }

      // Only buffer during task states
      const activeBuffer = activeBufferRef.current;
      if (activeBuffer) {
        activeBuffer.push(...points);
        const nextCount = activeBuffer.length;
        setGazePointCount(nextCount);

        const activeTaskKey = activeTaskKeyRef.current;
        if (activeTaskKey) {
          setTaskPointCounts((prev) => ({ ...prev, [activeTaskKey]: nextCount }));
        }
      }
    }, []),
  });

  const handleDeviceReady = useCallback(() => {
    dispatch({ type: 'DEVICE_READY' });
    // Enter fullscreen right before calibration
    enterFullscreen();
  }, [dispatch, enterFullscreen]);

  const handleCalibrationComplete = useCallback(
    (result: CalibrationResult) => {
      dispatch({ type: 'CALIBRATION_COMPLETE', result });
      // Set up first task content
      const content = getTobiiTaskContent('syllables');
      setTaskContent((prev) => ({ ...prev, syllables: content }));
      activeBufferRef.current = syllablesRef.current;
      activeTaskKeyRef.current = 'syllables';
      setGazePointCount(0);
      setTaskPointCounts({
        syllables: 0,
        'pseudo-words': 0,
        'meaningful-text': 0,
      });
      setLastTaskGazePosition(null);
    },
    [dispatch],
  );

  const handleLineCentersReady = useCallback((taskKey: string, centers: number[]) => {
    lineCentersRef.current[taskKey] = centers;
  }, []);

  const handleTaskDone = useCallback(() => {
    dispatch({ type: 'TASK_COMPLETE' });
  }, [dispatch]);

  const handleRetake = useCallback(() => {
    // Clear the current buffer
    if (activeBufferRef.current) {
      activeBufferRef.current.length = 0;
    }
    const activeTaskKey = activeTaskKeyRef.current;
    if (activeTaskKey) {
      setTaskPointCounts((prev) => ({ ...prev, [activeTaskKey]: 0 }));
    }
    setGazePointCount(0);
    setLastTaskGazePosition(null);
    dispatch({ type: 'RETAKE' });
  }, [dispatch]);

  const handleContinue = useCallback(() => {
    const currentState = tobiiState.currentState;

    // Set up next task content and buffer
    if (currentState === 'review-syllables') {
      const content = getTobiiTaskContent('pseudo-words');
      setTaskContent((prev) => ({ ...prev, 'pseudo-words': content }));
      activeBufferRef.current = pseudoWordsRef.current;
      activeTaskKeyRef.current = 'pseudo-words';
      setGazePointCount(0);
      setLastTaskGazePosition(null);
    } else if (currentState === 'review-pseudo-words') {
      const content = getTobiiTaskContent('meaningful-text');
      setTaskContent((prev) => ({ ...prev, 'meaningful-text': content }));
      activeBufferRef.current = meaningfulTextRef.current;
      activeTaskKeyRef.current = 'meaningful-text';
      setGazePointCount(0);
      setLastTaskGazePosition(null);
    }

    dispatch({ type: 'CONTINUE' });
  }, [dispatch, tobiiState.currentState]);

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
      lineCentersRef.current,
    );

    if (result.success) {
      dispatch({ type: 'SUBMIT_SUCCESS', result: result.data });
    } else {
      dispatch({ type: 'SUBMIT_ERROR', error: result.error });
    }
  }, [dispatch]);

  useEffect(() => {
    if (tobiiState.currentState === 'submitting') {
      handleSubmit();
    }
  }, [tobiiState.currentState, handleSubmit]);

  const handleNewTest = useCallback(() => {
    syllablesRef.current = [];
    pseudoWordsRef.current = [];
    meaningfulTextRef.current = [];
    activeBufferRef.current = null;
    activeTaskKeyRef.current = null;
    lastGazeRef.current = null;
    setGazePointCount(0);
    setTaskPointCounts({
      syllables: 0,
      'pseudo-words': 0,
      'meaningful-text': 0,
    });
    setLastTaskGazePosition(null);
    setTaskContent({});
    dispatch({ type: 'RESET' });
    dispatch({ type: 'START' });
  }, [dispatch]);

  const handleExit = useCallback(() => {
    exitFullscreen();
    router.push('/');
  }, [router, exitFullscreen]);

  useEffect(() => {
    if (tobiiState.currentState === 'results') {
      exitFullscreen();
    }
  }, [tobiiState.currentState, exitFullscreen]);

  const currentStepKey = getStepKeyForState(tobiiState.currentState);
  const steps = TOBII_STEPS.map((s) => ({ key: s.key, label: s.label }));

  const renderState = () => {
    switch (tobiiState.currentState) {
      case 'idle':
        return (
          <div className="flex flex-col items-center gap-6">
            <h1 className="font-bold text-3xl">Eye Tracker Test</h1>
            <p className="text-muted-foreground">
              This test uses a Tobii eye tracker to screen for dyslexia indicators. It consists of 3
              reading tasks: syllables, pseudo-words, and meaningful text.
            </p>
            <button
              onClick={() => dispatch({ type: 'START' })}
              className="bg-primary hover:bg-primary/90 px-6 py-3 rounded-md font-medium text-primary-foreground text-lg"
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
            tracker="tobii"
            mode={requestedCalibrationMode}
            participantAge={participantAge}
            onGetGazeSample={() => lastGazeRef.current}
            onComplete={handleCalibrationComplete}
            blockOnPoor={true}
          />
        );

      case 'task-syllables':
        return (
          <TaskDisplay
            taskType="syllables"
            content={taskContent['syllables'] ?? getTobiiTaskContent('syllables')}
            pointCount={gazePointCount}
            isCollecting={connected}
            onDone={handleTaskDone}
            onLineCentersReady={(centers) => handleLineCentersReady('syllables', centers)}
            getLastGazePosition={() => lastTaskGazePosition}
          />
        );

      case 'review-syllables':
        return (
          <ReviewPanel
            taskType="syllables"
            pointCount={taskPointCounts.syllables}
            isLastTask={false}
            onRetake={handleRetake}
            onContinue={handleContinue}
          />
        );

      case 'task-pseudo-words':
        return (
          <TaskDisplay
            taskType="pseudo-words"
            content={taskContent['pseudo-words'] ?? getTobiiTaskContent('pseudo-words')}
            pointCount={gazePointCount}
            isCollecting={connected}
            onDone={handleTaskDone}
            onLineCentersReady={(centers) => handleLineCentersReady('pseudo-words', centers)}
            getLastGazePosition={() => lastTaskGazePosition}
          />
        );

      case 'review-pseudo-words':
        return (
          <ReviewPanel
            taskType="pseudo-words"
            pointCount={taskPointCounts['pseudo-words']}
            isLastTask={false}
            onRetake={handleRetake}
            onContinue={handleContinue}
          />
        );

      case 'task-meaningful-text':
        return (
          <TaskDisplay
            taskType="meaningful-text"
            content={taskContent['meaningful-text'] ?? getTobiiTaskContent('meaningful-text')}
            pointCount={gazePointCount}
            isCollecting={connected}
            onDone={handleTaskDone}
            onLineCentersReady={(centers) => handleLineCentersReady('meaningful-text', centers)}
            getLastGazePosition={() => lastTaskGazePosition}
          />
        );

      case 'review-meaningful-text':
        return (
          <ReviewPanel
            taskType="meaningful-text"
            pointCount={taskPointCounts['meaningful-text']}
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
          <ResultsDisplay result={tobiiState.results} mode="tobii" onNewTest={handleNewTest} />
        );

      case 'error':
        return (
          <ErrorScreen
            error={tobiiState.error ?? 'An unexpected error occurred'}
            // Tobii data quality is reliable — always allow retrying submission
            onRetry={
              taskPointCounts.syllables > 0 ||
              taskPointCounts['pseudo-words'] > 0 ||
              taskPointCounts['meaningful-text'] > 0
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
    </TestErrorBoundary>
  );
}
