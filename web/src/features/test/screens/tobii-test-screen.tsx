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
  DebugTestNavigation,
} from '@/features/test/components';
import { CalibrationSetup } from '@/features/test/components/calibration/calibration-setup';
import { PreTestIntake } from '@/features/test/components/pre-test-intake';
import { PreTestSlides } from '@/features/test/components/pre-test-slides';
import { useTobiiTestController } from '@/features/test/hooks';
import { getTobiiTaskContent } from '@/features/test/lib/test-content';
import { buildTobiiResultVisualizations } from '@/features/test/lib/build-tobii-visualizations';
import type { IntakeData } from '@/features/test/types';
import Image from 'next/image';

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
    forceState,
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
          <div className="grid h-[min(640px,calc(100dvh-5.5rem))] min-h-0 w-full max-w-6xl gap-4 pt-10 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="min-h-0">
              <TobiiServiceStatusCard
                serviceChecking={serviceChecking}
                serviceRunning={serviceRunning}
                serviceDevice={serviceDevice ?? null}
                serviceError={serviceError}
                onRefresh={checkStatus}
              />
            </section>

            <div className="relative flex min-h-0 flex-col overflow-hidden border border-[#51513d]/18 bg-[#1b2021] text-[#e3dcc2] shadow-[10px_10px_0_rgba(81,81,61,.08)]">
              {/* Premium Hero Visual Section */}
              <div className="relative flex-1 overflow-hidden border-b border-[#51513d]/18">
                <Image
                  src="/images/service-tray.png"
                  alt="Lexora Eye Tracker Service in System Tray"
                  className="absolute inset-0 h-full w-full object-cover"
                  width={800}
                  height={600}
                />

                {/* Simulated Pulse around the tray area (adjusting position) */}
                <div className="absolute right-[36.5%] bottom-[20%] h-12 w-12 -translate-x-1/2 rounded-full border-2 border-[#a6a867] opacity-80">
                  <div className="absolute inset-0 animate-ping rounded-full bg-[#a6a867]/40" />
                </div>
              </div>

              {/* Instructions Section */}
              <div className="relative z-10 p-6">
                <div className="mb-4 inline-flex items-center gap-2 bg-[#a6a867]/20 px-3 py-1 text-[10px] font-black tracking-widest text-[#e3dc95] uppercase">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e3dc95] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e3dc95]" />
                  </span>
                  Action Required
                </div>

                <h1 className="text-3xl leading-tight font-black tracking-tight text-[#e3dcc2]">
                  Start the Lexora Service
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-[#e3dcc2]/70">
                  To connect your eye tracker to the browser, the Lexora helper app must be running
                  on your machine.
                </p>

                <div className="mt-6 flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#51513d] text-sm font-black text-[#e3dcc2]">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-[#e3dcc2]">Open from System Tray</p>
                      <p className="mt-1 text-xs text-[#e3dcc2]/60">
                        Click the Lexora icon in your Windows taskbar cascade menu.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#51513d] text-sm font-black text-[#e3dcc2]">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-[#e3dcc2]">Click Start</p>
                      <p className="mt-1 text-xs text-[#e3dcc2]/60">
                        Inside the desktop app, click the Start button to begin tracking.
                      </p>
                    </div>
                  </div>
                </div>
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
          
          <DebugTestNavigation
            states={[
              'idle',
              'intake',
              'device-setup',
              'calibration-setup',
              'calibrating',
              'task-syllables',
              'review-syllables',
              'task-pseudo-words',
              'review-pseudo-words',
              'task-meaningful-text',
              'review-meaningful-text',
              'submitting',
              'results',
              'error',
            ]}
            currentState={state.currentState}
            onForceState={forceState}
          />
        </FullscreenShell>
      </ScreenGuard>
    </TestErrorBoundary>
  );
}
