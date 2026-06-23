'use client';

import { useState } from 'react';
import { FullscreenShell, LoadingScreen, StepIndicator } from '@/components/shared';
import {
  CalibrationScreen,
  CameraSetup,
  ErrorScreen,
  GazeDebugDot,
  ResultsDisplay,
  ReviewPanel,
  ScreenGuard,
  TaskDisplay,
  TestErrorBoundary,
  DebugTestNavigation,
  isTestDebugNavigationEnabled,
  type CalibrationDebugView,
  type DebugTestShortcut,
} from '@/features/test/components';
import { CalibrationSetup } from '@/features/test/components/calibration/calibration-setup';
import { PreTestIntake } from '@/features/test/components/pre-test-intake';
import { PreTestSlides } from '@/features/test/components/pre-test-slides';
import { useWebcamTestController } from '@/features/test/hooks';
import { DEBUG_GAZE_OVERLAY } from '@/features/test/lib/debug-config';
import { MIN_GAZE_POINTS } from '@/features/test/lib/constants';
import { getWebcamTaskContent } from '@/features/test/lib/test-content';
import type { IntakeData, WebcamGazePoint } from '@/features/test/types';
import type { GazeFeature } from '@/features/test/types';

type WebcamDebugView = CalibrationDebugView | 'reading-dialog' | 'submitting' | null;

const DEBUG_REVIEW_GAZE_DATA: WebcamGazePoint[] = [
  { x: 100, y: 100, timestamp: 0 },
  { x: 200, y: 100, timestamp: 500 },
  { x: 300, y: 100, timestamp: 1000 },
  { x: 400, y: 100, timestamp: 1500 },
  { x: 100, y: 150, timestamp: 2000 },
  { x: 200, y: 150, timestamp: 2500 },
];

const DEBUG_RESULT_FEATURES: GazeFeature[] = [
  {
    timestamp: 0,
    durationMs: 180,
    fixationX: 0.24,
    fixationY: 0.2,
    saccadeAmplitude: 0.08,
    efficiencyRatio: 0.82,
    isRegression: false,
  },
  {
    timestamp: 190,
    durationMs: 230,
    fixationX: 0.38,
    fixationY: 0.21,
    saccadeAmplitude: 0.11,
    efficiencyRatio: 0.78,
    isRegression: false,
  },
  {
    timestamp: 430,
    durationMs: 310,
    fixationX: 0.58,
    fixationY: 0.22,
    saccadeAmplitude: 0.14,
    efficiencyRatio: 0.7,
    isRegression: false,
  },
  {
    timestamp: 760,
    durationMs: 260,
    fixationX: 0.77,
    fixationY: 0.23,
    saccadeAmplitude: 0.13,
    efficiencyRatio: 0.74,
    isRegression: false,
  },
  {
    timestamp: 1040,
    durationMs: 190,
    fixationX: 0.28,
    fixationY: 0.34,
    saccadeAmplitude: 0.18,
    efficiencyRatio: 0.68,
    isRegression: false,
    isReturnSweep: true,
  },
  {
    timestamp: 1240,
    durationMs: 340,
    fixationX: 0.46,
    fixationY: 0.35,
    saccadeAmplitude: 0.12,
    efficiencyRatio: 0.66,
    isRegression: false,
  },
  {
    timestamp: 1600,
    durationMs: 300,
    fixationX: 0.36,
    fixationY: 0.35,
    saccadeAmplitude: 0.1,
    efficiencyRatio: 0.58,
    isRegression: true,
  },
  {
    timestamp: 1920,
    durationMs: 220,
    fixationX: 0.62,
    fixationY: 0.36,
    saccadeAmplitude: 0.17,
    efficiencyRatio: 0.76,
    isRegression: false,
  },
  {
    timestamp: 2160,
    durationMs: 240,
    fixationX: 0.25,
    fixationY: 0.49,
    saccadeAmplitude: 0.2,
    efficiencyRatio: 0.72,
    isRegression: false,
    isReturnSweep: true,
  },
  {
    timestamp: 2420,
    durationMs: 280,
    fixationX: 0.52,
    fixationY: 0.5,
    saccadeAmplitude: 0.16,
    efficiencyRatio: 0.8,
    isRegression: false,
  },
];

export default function WebcamTestScreen() {
  const [debugView, setDebugView] = useState<WebcamDebugView>(null);
  const {
    state,
    videoRef,
    webcamGaze,
    participantAge,
    requestedCalibrationMode,
    setSelectedMode,
    taskContent,
    gazePointCount,
    reviewGazeData,
    lastTaskGazePosition,
    paragraphScreenshot,
    steps,
    currentStepKey,
    showStepIndicator,
    canRetrySubmission,
    handleCameraReady,
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
  } = useWebcamTestController();

  const forceDebugState = (nextState: Parameters<typeof forceState>[0]) => {
    if (nextState === 'submitting') {
      setDebugView('submitting');
      return;
    }

    setDebugView(null);
    forceState(nextState);
  };

  const showCalibrationDebugView = (view: CalibrationDebugView) => {
    setDebugView(view);
    forceState('calibrating');
  };

  const debugShortcuts: DebugTestShortcut[] = [
    {
      key: 'calibration-static-countdown',
      label: 'Static Countdown',
      group: 'Calibration',
      active: debugView === 'static-countdown',
      onSelect: () => showCalibrationDebugView('static-countdown'),
    },
    {
      key: 'calibration-static-points',
      label: 'Static Points',
      group: 'Calibration',
      active: debugView === 'static-points',
      onSelect: () => showCalibrationDebugView('static-points'),
    },
    {
      key: 'calibration-pursuit-countdown',
      label: 'Pursuit Countdown',
      group: 'Calibration',
      active: debugView === 'pursuit-countdown',
      onSelect: () => showCalibrationDebugView('pursuit-countdown'),
    },
    {
      key: 'calibration-pursuit-active',
      label: 'Pursuit Active',
      group: 'Calibration',
      active: debugView === 'pursuit-active',
      onSelect: () => showCalibrationDebugView('pursuit-active'),
    },
    {
      key: 'calibration-validation-countdown',
      label: 'Validation Countdown',
      group: 'Calibration',
      active: debugView === 'validation-countdown',
      onSelect: () => showCalibrationDebugView('validation-countdown'),
    },
    {
      key: 'calibration-validation-active',
      label: 'Validation Active',
      group: 'Calibration',
      active: debugView === 'validation-active',
      onSelect: () => showCalibrationDebugView('validation-active'),
    },
    {
      key: 'calibration-accuracy-result',
      label: 'Accuracy Result',
      group: 'Calibration',
      active: debugView === 'accuracy-result',
      onSelect: () => showCalibrationDebugView('accuracy-result'),
    },
    {
      key: 'calibration-reading-prep',
      label: 'Reading Prep Countdown',
      group: 'Calibration',
      active: debugView === 'reading-prep',
      onSelect: () => showCalibrationDebugView('reading-prep'),
    },
    {
      key: 'reading-done-dialog',
      label: 'Done Reading Dialog',
      group: 'Reading',
      active: debugView === 'reading-dialog',
      onSelect: () => {
        setDebugView('reading-dialog');
        forceState('task-paragraph');
      },
    },
  ];

  const renderState = () => {
    if (debugView === 'submitting') {
      return <LoadingScreen message="Analyzing eye movement data..." />;
    }

    switch (state.currentState) {
      case 'idle':
        return <PreTestSlides mode="webcam" onComplete={startFromIdle} onSkip={startFromIdle} />;

      case 'intake':
        return <PreTestIntake onComplete={(data: IntakeData) => completeIntake(data)} />;

      case 'device-setup':
        return (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            <div className="text-center">
              <p className="mb-4 text-xs font-black tracking-[0.32em] text-[#51513d] uppercase">
                Webcam Tracking
              </p>
              <h1 className="text-4xl leading-tight font-black tracking-tight text-[#1b2021] md:text-5xl">
                Webcam Setup
              </h1>
            </div>
            <CameraSetup webcamGaze={webcamGaze} videoRef={videoRef} onReady={handleCameraReady} />
          </div>
        );

      case 'calibration-setup':
        return (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            <CalibrationSetup
              tracker="webcam"
              resolvedMode={requestedCalibrationMode}
              onSelectMode={setSelectedMode}
              onStart={completeSetup}
              startButtonText="Start Calibration"
            />
          </div>
        );

      case 'calibrating':
        return (
          <CalibrationScreen
            tracker="webcam"
            mode={requestedCalibrationMode}
            participantAge={participantAge}
            onGetIrisSample={() => {
              const iris = webcamGaze.getLastIrisPosition();
              if (!iris) {
                return null;
              }

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
            debugView={debugView === 'reading-dialog' ? null : debugView}
          />
        );

      case 'task-paragraph':
        return (
          <TaskDisplay
            taskType="paragraph"
            content={taskContent || getWebcamTaskContent()}
            pointCount={debugView === 'reading-dialog' ? MIN_GAZE_POINTS : gazePointCount}
            isCollecting={debugView === 'reading-dialog' ? true : webcamGaze.collecting}
            onDone={handleTaskDone}
            getLastGazePosition={() => lastTaskGazePosition}
            onScreenshotReady={(dataUrl) => setScreenshot('paragraph', dataUrl)}
            onPauseCollection={webcamGaze.pauseCollecting}
            onResumeCollection={webcamGaze.resumeCollecting}
            debugOpenDoneDialog={debugView === 'reading-dialog'}
          />
        );

      case 'review-paragraph': {
        let gazeDataToDisplay = reviewGazeData;
        // Inject mock gaze data if accessed via debug menu
        if (gazeDataToDisplay.length === 0 && process.env.NODE_ENV === 'development') {
          gazeDataToDisplay = DEBUG_REVIEW_GAZE_DATA;
        }

        return (
          <ReviewPanel
            taskType="paragraph"
            pointCount={gazePointCount || 100}
            isLastTask={true}
            onRetake={handleRetake}
            onContinue={handleContinue}
            readingContent={taskContent || getWebcamTaskContent()}
            rawGazeData={gazeDataToDisplay}
          />
        );
      }

      case 'submitting':
        return <LoadingScreen message="Analyzing eye movement data..." />;

      case 'results': {
        let resultToDisplay = state.results;

        // Inject mock result data if accessed via debug menu
        if (!resultToDisplay && process.env.NODE_ENV === 'development') {
          resultToDisplay = {
            dyslexiaProbability: 0.12,
            riskLevel: 'low',
            confidence: 0.89,
            metadata: {
              sequencesAnalyzed: 120,
              totalFixations: 85,
            },
            features: DEBUG_RESULT_FEATURES,
          };
        }

        if (!resultToDisplay) {
          return null;
        }

        return (
          <ResultsDisplay
            result={resultToDisplay}
            mode="webcam"
            onNewTest={handleNewTest}
            readingContent={taskContent || getWebcamTaskContent()}
            rawGazeData={reviewGazeData.length > 1 ? reviewGazeData : DEBUG_REVIEW_GAZE_DATA}
            rawGazeCoordinateSpace="screen-pixels"
            taskScreenshot={paragraphScreenshot}
          />
        );
      }

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
          <video
            ref={videoRef}
            className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-[0.01]"
            autoPlay
            playsInline
            muted
          />

          {showStepIndicator && (
            <div className="sticky top-0 z-50 mb-8 pt-4 pb-2">
              <StepIndicator steps={steps} currentStepKey={currentStepKey} />
            </div>
          )}

          {renderState()}
          {DEBUG_GAZE_OVERLAY && state.currentState === 'task-paragraph' && (
            <GazeDebugDot active={webcamGaze.collecting} getPosition={() => lastTaskGazePosition} />
          )}

          {isTestDebugNavigationEnabled() && (
            <DebugTestNavigation
              states={[
                'idle',
                'intake',
                'device-setup',
                'calibration-setup',
                'calibrating',
                'task-paragraph',
                'review-paragraph',
                'submitting',
                'results',
                'error',
              ]}
              currentState={debugView === 'submitting' ? 'submitting' : state.currentState}
              onForceState={forceDebugState}
              shortcuts={debugShortcuts}
            />
          )}
        </FullscreenShell>
      </ScreenGuard>
    </TestErrorBoundary>
  );
}
