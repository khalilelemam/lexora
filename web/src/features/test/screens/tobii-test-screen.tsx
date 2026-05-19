'use client';

import { useMemo } from 'react';

import { FullscreenShell, LoadingScreen, StepIndicator } from '@/components/shared';
import {
  CalibrationScreen,
  DeviceCheck,
  ErrorScreen,
  ResultsDisplay,
  ReviewPanel,
  ScreenGuard,
  SupportedHardware,
  TaskDisplay,
  TestErrorBoundary,
  TobiiServiceStatusCard,
} from '@/features/test/components';
import { CalibrationSetup } from '@/features/test/components/calibration/calibration-setup';
import { PreTestIntake } from '@/features/test/components/pre-test-intake';
import { PreTestSlides } from '@/features/test/components/pre-test-slides';
import { useTobiiTestController } from '@/features/test/hooks';
import { getTobiiTaskContent } from '@/features/test/lib/test-content';
import { buildTobiiResultVisualizations } from '@/features/test/lib/build-tobii-visualizations';
import type { IntakeData } from '@/features/test/types';

export function TobiiTestScreen() {
  const {
    state,
    connected,
    participantAge,
    requestedCalibrationMode,
    setSelectedMode,
    serviceChecking,
    serviceError,
    checkStatus,
    serviceRunning,
    serviceDevice,
    lastGazeRef,
    gazePointCount,
    taskPointCounts,
    lastTaskGazePosition,
    taskContent,
    setLineCenters,
    steps,
    currentStepKey,
    showStepIndicator,
    canRetrySubmission,
    handleDeviceReady,
    handleCalibrationComplete,
    handleTaskDone,
    handleRetake,
    handleContinue,
    retrySubmission,
    handleNewTest,
    handleExit,
    completeIntake,
    confirmHardware,
    completeEducation,
    startFromIdle,
  } = useTobiiTestController();

  const visualizations = useMemo(
    () =>
      state.currentState === 'results' && state.results
        ? buildTobiiResultVisualizations(state.results, taskContent)
        : [],
    [state.currentState, state.results, taskContent],
  );

  const renderState = () => {
    switch (state.currentState) {
      case 'idle':
        return (
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6">
            <h1 className="text-3xl font-bold">Eye Tracker Test</h1>
            <p className="text-muted-foreground max-w-2xl text-center">
              This test uses a Tobii eye tracker to screen for dyslexia indicators. It consists of 3
              reading tasks: syllables, pseudo-words, and meaningful text.
            </p>

            <TobiiServiceStatusCard
              serviceChecking={serviceChecking}
              serviceRunning={serviceRunning}
              serviceDevice={serviceDevice ?? null}
              serviceError={serviceError}
              onRefresh={checkStatus}
            />

            <CalibrationSetup
              resolvedMode={requestedCalibrationMode}
              onSelectMode={setSelectedMode}
              onStart={startFromIdle}
              startButtonText="Continue to Instructions"
            />
          </div>
        );

      case 'intake':
        return <PreTestIntake onComplete={(data: IntakeData) => completeIntake(data)} />;

      case 'hardware-check':
        return <SupportedHardware onContinue={confirmHardware} />;

      case 'pre-test-education':
        return (
          <PreTestSlides
            mode="tobii"
            isStarMode={requestedCalibrationMode === 'star'}
            onComplete={completeEducation}
            onSkip={completeEducation}
          />
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
            content={taskContent.syllables ?? getTobiiTaskContent('syllables')}
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
            readingContent={taskContent.syllables ?? getTobiiTaskContent('syllables')}
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
            readingContent={taskContent['pseudo-words'] ?? getTobiiTaskContent('pseudo-words')}
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
            readingContent={
              taskContent['meaningful-text'] ?? getTobiiTaskContent('meaningful-text')
            }
          />
        );

      case 'submitting':
        return <LoadingScreen message="Analyzing eye movement data..." />;

      case 'results':
        if (!state.results) {
          return null;
        }

        return (
          <ResultsDisplay
            result={state.results}
            mode="tobii"
            onNewTest={handleNewTest}
            readingContent={
              taskContent['meaningful-text'] ?? getTobiiTaskContent('meaningful-text')
            }
            visualizations={visualizations}
          />
        );

      case 'error':
        return (
          <ErrorScreen
            error={state.error ?? 'An unexpected error occurred'}
            onRetry={canRetrySubmission ? retrySubmission : undefined}
            onStartOver={handleNewTest}
            onGoHome={handleExit}
          />
        );
    }
  };

  return (
    <TestErrorBoundary>
      <ScreenGuard>
        <FullscreenShell onExit={handleExit} showExit={state.currentState !== 'results'}>
          {showStepIndicator && (
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
