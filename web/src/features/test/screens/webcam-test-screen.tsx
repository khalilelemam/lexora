'use client';

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
} from '@/features/test/components';
import { CalibrationSetup } from '@/features/test/components/calibration/calibration-setup';
import { PreTestIntake } from '@/features/test/components/pre-test-intake';
import { PreTestSlides } from '@/features/test/components/pre-test-slides';
import { useWebcamTestController } from '@/features/test/hooks';
import { getWebcamTaskContent } from '@/features/test/lib/test-content';
import type { IntakeData } from '@/features/test/types';

export function WebcamTestScreen() {
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
    steps,
    currentStepKey,
    showStepIndicator,
    canRetrySubmission,
    handleCameraReady,
    handleCalibrationComplete,
    handleTaskDone,
    handleLineCentersReady,
    handleRetake,
    handleContinue,
    retrySubmission,
    handleNewTest,
    handleExit,
    completeIntake,
    completeEducation,
    startFromIdle,
  } = useWebcamTestController();

  const renderState = () => {
    switch (state.currentState) {
      case 'idle':
        return (
          <CalibrationSetup
            resolvedMode={requestedCalibrationMode}
            onSelectMode={setSelectedMode}
            onStart={startFromIdle}
            startButtonText="Continue to Instructions"
          />
        );

      case 'intake':
        return <PreTestIntake onComplete={(data: IntakeData) => completeIntake(data)} />;

      case 'pre-test-education':
        return (
          <PreTestSlides
            mode="webcam"
            isStarMode={requestedCalibrationMode === 'star'}
            onComplete={completeEducation}
            onSkip={completeEducation}
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
        if (!state.results) {
          return null;
        }

        return (
          <ResultsDisplay
            result={state.results}
            mode="webcam"
            onNewTest={handleNewTest}
            readingContent={taskContent || getWebcamTaskContent()}
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
          <video
            ref={videoRef}
            className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-[0.01]"
            autoPlay
            playsInline
            muted
          />

          {showStepIndicator && (
            <div className="mb-8">
              <StepIndicator steps={steps} currentStepKey={currentStepKey} />
            </div>
          )}

          {renderState()}

          <GazeDebugDot active={false} getPosition={() => lastTaskGazePosition} />
        </FullscreenShell>
      </ScreenGuard>
    </TestErrorBoundary>
  );
}
