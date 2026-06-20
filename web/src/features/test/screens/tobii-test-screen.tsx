'use client';

import { useMemo } from 'react';

import { FullscreenShell, LoadingScreen, StepIndicator } from '@/components/shared';
import {
  CalibrationScreen,
  ErrorScreen,
  ResultsDisplay,
  ReviewPanel,
  ScreenGuard,
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

export default function TobiiTestScreen() {
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
    steps,
    currentStepKey,
    showStepIndicator,
    canRetrySubmission,
    handleCalibrationComplete,
    handleTaskDone,
    handleRetake,
    handleContinue,
    retrySubmission,
    handleNewTest,
    handleExit,
    completeIntake,
    completeSetup,
    startFromIdle,
    setScreenshot,
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
        return <PreTestSlides mode="tobii" onComplete={startFromIdle} onSkip={startFromIdle} />;
      case 'intake':
        return <PreTestIntake onComplete={(data: IntakeData) => completeIntake(data)} />;

      case 'device-setup':
        return (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            <div className="text-center">
              <p className="mb-4 text-xs font-black tracking-[0.32em] text-[#51513d] uppercase">
                Device Setup
              </p>
              <h1 className="text-4xl leading-tight font-black tracking-tight text-[#1b2021] md:text-5xl">
                Connect your Tracker
              </h1>
            </div>

            <div className="grid w-full gap-5 md:grid-cols-[1.2fr_0.8fr]">
              <TobiiServiceStatusCard
                serviceChecking={serviceChecking}
                serviceRunning={serviceRunning}
                serviceDevice={serviceDevice ?? null}
                serviceError={serviceError}
                onRefresh={checkStatus}
              />

              <div className="border border-[#51513d]/18 bg-[#f3edd7] p-6 shadow-[10px_10px_0_rgba(81,81,61,.08)]">
                <p className="mb-1 text-xs font-black tracking-[0.2em] text-[#51513d] uppercase">
                  Hardware Check
                </p>
                <p className="mb-5 text-xs leading-relaxed text-[#1b2021]/58">
                  The Tobii flow only works with Tobii Pro screen-based trackers. You must have a
                  compatible tracker connected and the Lexora Tobii Service running.
                </p>
                <a
                  href="/test/supported-hardware"
                  target="_blank"
                  className="inline-block text-sm font-black text-[#51513d] underline transition-colors hover:text-[#1b2021]"
                >
                  View Supported Devices →
                </a>
              </div>
            </div>
          </div>
        );

      case 'calibration-setup':
        return (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            <CalibrationSetup
              tracker="tobii"
              resolvedMode={requestedCalibrationMode}
              onSelectMode={setSelectedMode}
              onStart={completeSetup}
              startButtonText="Enter Fullscreen & Start Calibration"
            />
          </div>
        );

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
            getLastGazePosition={() => lastTaskGazePosition}
            onScreenshotReady={(dataUrl) => setScreenshot('syllables', dataUrl)}
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
            getLastGazePosition={() => lastTaskGazePosition}
            onScreenshotReady={(dataUrl) => setScreenshot('pseudo-words', dataUrl)}
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
            getLastGazePosition={() => lastTaskGazePosition}
            onScreenshotReady={(dataUrl) => setScreenshot('meaningful-text', dataUrl)}
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
            <div className="sticky top-0 z-50 mb-8 pt-4 pb-2">
              <StepIndicator steps={steps} currentStepKey={currentStepKey} />
            </div>
          )}
          {renderState()}
        </FullscreenShell>
      </ScreenGuard>
    </TestErrorBoundary>
  );
}
