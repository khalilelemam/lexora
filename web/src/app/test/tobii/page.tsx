'use client';

import { useCallback, useEffect, useMemo } from 'react';
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
import { useTobiiTaskBuffers } from '@/features/test/hooks/use-tobii-task-buffers';
import { submitTobiiTest } from '@/features/test/actions/submit-test';
import { getTobiiTaskContent } from '@/features/test/lib/test-content';
import { TOBII_STEPS, getStepKeyForState } from '@/features/test/lib/constants';
import { useFullscreen } from '@/features/test/hooks/use-fullscreen';
import type { TobiiTestFlowState, CalibrationResult } from '@/features/test/types';
import type { CalibrationVisualMode } from '@/features/test/hooks/use-calibration-engine';
import { parseCalibrationMode } from '@/features/test/lib/parse-calibration-mode';

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

  const {
    syllablesRef,
    pseudoWordsRef,
    meaningfulTextRef,
    lastGazeRef,
    lineCentersRef,
    gazePointCount,
    taskPointCounts,
    lastTaskGazePosition,
    taskContent,
    pushGazeData,
    activateTask,
    clearActiveBuffer,
    setLineCenters,
    resetAll,
  } = useTobiiTaskBuffers();

  const isTaskActive = ['task-syllables', 'task-pseudo-words', 'task-meaningful-text'].includes(
    tobiiState.currentState,
  );

  // Stream gaze data from Tobii WebSocket
  const { connected } = useTobiiGazeStream({
    enabled: isTaskActive || tobiiState.currentState === 'calibrating',
    onGazeData: pushGazeData,
  });

  const handleDeviceReady = useCallback(() => {
    dispatch({ type: 'DEVICE_READY' });
    enterFullscreen();
  }, [dispatch, enterFullscreen]);

  const handleCalibrationComplete = useCallback(
    (result: CalibrationResult) => {
      dispatch({ type: 'CALIBRATION_COMPLETE', result });
      activateTask('syllables', getTobiiTaskContent('syllables'));
    },
    [dispatch, activateTask],
  );

  const handleTaskDone = useCallback(() => {
    dispatch({ type: 'TASK_COMPLETE' });
  }, [dispatch]);

  const handleRetake = useCallback(() => {
    clearActiveBuffer();
    dispatch({ type: 'RETAKE' });
  }, [dispatch, clearActiveBuffer]);

  const handleContinue = useCallback(() => {
    const currentState = tobiiState.currentState;

    if (currentState === 'review-syllables') {
      activateTask('pseudo-words', getTobiiTaskContent('pseudo-words'));
    } else if (currentState === 'review-pseudo-words') {
      activateTask('meaningful-text', getTobiiTaskContent('meaningful-text'));
    }

    dispatch({ type: 'CONTINUE' });
  }, [dispatch, tobiiState.currentState, activateTask]);

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
  }, [dispatch, syllablesRef, pseudoWordsRef, meaningfulTextRef, lineCentersRef]);

  useEffect(() => {
    if (tobiiState.currentState === 'submitting') {
      handleSubmit();
    }
  }, [tobiiState.currentState, handleSubmit]);

  const handleNewTest = useCallback(() => {
    resetAll();
    dispatch({ type: 'RESET' });
    dispatch({ type: 'START' });
  }, [dispatch, resetAll]);

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
            onLineCentersReady={(centers) => setLineCenters('syllables', centers)}
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
            onLineCentersReady={(centers) => setLineCenters('pseudo-words', centers)}
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
            onLineCentersReady={(centers) => setLineCenters('meaningful-text', centers)}
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
