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
  WebcamTestIntro,
} from '@/features/test/components';
import { CalibrationSetup } from '@/features/test/components/calibration/calibration-setup';
import { useWebcamTestController } from '@/features/test/hooks';
import { DEBUG_GAZE_OVERLAY } from '@/features/test/lib/debug-config';
import { MIN_GAZE_POINTS } from '@/features/test/lib/constants';
import type { IntakeData, WebcamGazePoint } from '@/features/test/types';

type WebcamDebugView = CalibrationDebugView | 'submitting' | null;

const DEBUG_REVIEW_GAZE_DATA: WebcamGazePoint[] = [
  { x: 100, y: 100, timestamp: 0 },
  { x: 200, y: 100, timestamp: 500 },
  { x: 300, y: 100, timestamp: 1000 },
  { x: 400, y: 100, timestamp: 1500 },
  { x: 100, y: 150, timestamp: 2000 },
  { x: 200, y: 150, timestamp: 2500 },
];

export default function WebcamTestScreen() {
  const [debugView, setDebugView] = useState<WebcamDebugView>(null);
  const {
    state,
    videoRef,
    webcamGaze,
    participantAge,
    initialWaitlistId,
    initialParticipantName,
    initialEmail,
    requestedCalibrationMode,
    setSelectedMode,
    taskContent,
    activeTaskType,
    gazePointCount,
    reviewGazeData,
    lastTaskGazePosition,
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
  ];

  const renderState = () => {
    if (debugView === 'submitting') {
      return <LoadingScreen message="جاري حفظ وتجهيز بيانات القراءة وحركة العين..." />;
    }

    switch (state.currentState) {
      case 'idle':
      case 'intake':
        return (
          <WebcamTestIntro
            initialWaitlistId={initialWaitlistId}
            initialAge={participantAge}
            initialName={initialParticipantName}
            initialEmail={initialEmail}
            onStart={(data: IntakeData) => completeIntake(data)}
          />
        );

      case 'device-setup':
        return (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
            <div className="text-center">
              <p className="mb-4 text-xs font-black tracking-[0.32em] text-[#51513d] uppercase">
                إعداد تتبع العين عبر الكاميرا
              </p>
              <h1 className="text-4xl leading-tight font-black tracking-tight text-[#1b2021] md:text-5xl">
                تجهيز كاميرا الويب
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
              startButtonText="ابدأ المعايرة (Start Calibration)"
            />
          </div>
        );

      case 'calibrating':
        return (
          <CalibrationScreen
            tracker="webcam"
            mode="grid"
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
            debugView={debugView}
          />
        );

      // ─── Task 1: Syllables ──────────────────────────────────
      case 'task-syllables':
        return (
          <TaskDisplay
            taskType="syllables"
            content={taskContent}
            pointCount={gazePointCount}
            isCollecting={webcamGaze.collecting}
            onDone={handleTaskDone}
            getLastGazePosition={() => lastTaskGazePosition}
            onScreenshotReady={(dataUrl) => setScreenshot('syllables', dataUrl)}
            onPauseCollection={webcamGaze.pauseCollecting}
            onResumeCollection={webcamGaze.resumeCollecting}
          />
        );

      case 'review-syllables': {
        const gazeDataToDisplay =
          reviewGazeData.length > 0
            ? reviewGazeData
            : process.env.NODE_ENV === 'development'
              ? DEBUG_REVIEW_GAZE_DATA
              : [];

        return (
          <ReviewPanel
            taskType="syllables"
            pointCount={gazePointCount || gazeDataToDisplay.length}
            isLastTask={false}
            onRetake={handleRetake}
            onContinue={handleContinue}
            readingContent={taskContent}
            rawGazeData={gazeDataToDisplay}
          />
        );
      }

      // ─── Task 2: Pseudo-words ───────────────────────────────
      case 'task-pseudo-words':
        return (
          <TaskDisplay
            taskType="pseudo-words"
            content={taskContent}
            pointCount={gazePointCount}
            isCollecting={webcamGaze.collecting}
            onDone={handleTaskDone}
            getLastGazePosition={() => lastTaskGazePosition}
            onScreenshotReady={(dataUrl) => setScreenshot('pseudo-words', dataUrl)}
            onPauseCollection={webcamGaze.pauseCollecting}
            onResumeCollection={webcamGaze.resumeCollecting}
          />
        );

      case 'review-pseudo-words': {
        const gazeDataToDisplay =
          reviewGazeData.length > 0
            ? reviewGazeData
            : process.env.NODE_ENV === 'development'
              ? DEBUG_REVIEW_GAZE_DATA
              : [];

        return (
          <ReviewPanel
            taskType="pseudo-words"
            pointCount={gazePointCount || gazeDataToDisplay.length}
            isLastTask={false}
            onRetake={handleRetake}
            onContinue={handleContinue}
            readingContent={taskContent}
            rawGazeData={gazeDataToDisplay}
          />
        );
      }

      // ─── Task 3: Meaningful Narrative Text ──────────────────
      case 'task-meaningful-text':
        return (
          <TaskDisplay
            taskType="meaningful-text"
            content={taskContent}
            pointCount={gazePointCount}
            isCollecting={webcamGaze.collecting}
            onDone={handleTaskDone}
            getLastGazePosition={() => lastTaskGazePosition}
            onScreenshotReady={(dataUrl) => setScreenshot('meaningful-text', dataUrl)}
            onPauseCollection={webcamGaze.pauseCollecting}
            onResumeCollection={webcamGaze.resumeCollecting}
          />
        );

      case 'review-meaningful-text': {
        const gazeDataToDisplay =
          reviewGazeData.length > 0
            ? reviewGazeData
            : process.env.NODE_ENV === 'development'
              ? DEBUG_REVIEW_GAZE_DATA
              : [];

        return (
          <ReviewPanel
            taskType="meaningful-text"
            pointCount={gazePointCount || gazeDataToDisplay.length}
            isLastTask={true}
            onRetake={handleRetake}
            onContinue={handleContinue}
            readingContent={taskContent}
            rawGazeData={gazeDataToDisplay}
          />
        );
      }

      case 'submitting':
        return <LoadingScreen message="جاري حفظ وتجهيز بيانات القراءة وحركة العين..." />;

      case 'results': {
        const resultToDisplay = state.results || {
          success: true,
          attemptId: 'demo-sample-id',
          participantAge: participantAge ?? 9,
          totalGazePoints: 450,
          taskCounts: {
            syllables: 120,
            pseudoWords: 140,
            meaningfulText: 190,
          },
          calibrationQuality: 'good',
          savedAt: new Date().toISOString(),
        };

        return (
          <ResultsDisplay
            result={resultToDisplay}
            onNewTest={handleNewTest}
          />
        );
      }

      case 'error':
        return (
          <ErrorScreen
            error={state.error ?? 'حدث خطأ غير متوقع أثناء معالجة الجلسة'}
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
            <div className="sticky top-0 z-50 mb-8 pt-4 pb-2" dir="rtl">
              <StepIndicator steps={steps} currentStepKey={currentStepKey} />
            </div>
          )}

          {renderState()}
          {DEBUG_GAZE_OVERLAY && state.currentState.startsWith('task-') && (
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
