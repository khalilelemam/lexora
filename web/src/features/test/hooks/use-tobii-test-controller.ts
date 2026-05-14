'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { submitTobiiTest } from '@/features/test/actions/submit-tobii-test';
import type { CalibrationVisualMode } from '@/features/test/hooks/use-calibration-engine';
import type { CalibrationResult, IntakeData, TobiiTestFlowState } from '@/features/test/types';

import { useCalibrationQueryParams } from './use-calibration-query-params';
import { useFullscreen } from './use-fullscreen';
import { useStableAttemptId } from './use-stable-attempt-id';
import { useTestFlow } from './use-test-flow';
import { useTobiiGazeStream, useTobiiStatus } from './use-tobii-gaze';
import { useTobiiTaskBuffers } from './use-tobii-task-buffers';
import { TOBII_STEPS, getStepKeyForState } from '../lib/constants';
import { getTobiiTaskContent } from '../lib/test-content';

const ACTIVE_TOBII_TASK_STATES = new Set([
  'task-syllables',
  'task-pseudo-words',
  'task-meaningful-text',
]);

const STEP_INDICATOR_HIDDEN_STATES = new Set([
  'idle',
  'calibrating',
  'task-syllables',
  'task-pseudo-words',
  'task-meaningful-text',
]);

export function useTobiiTestController() {
  const router = useRouter();
  const { state, dispatch } = useTestFlow({ mode: 'tobii' });
  const tobiiState = state as TobiiTestFlowState;
  const { mode: initialCalibrationMode, age: participantAge } = useCalibrationQueryParams();
  const { getOrCreateAttemptId, resetAttemptId } = useStableAttemptId();
  const { enterFullscreen, exitFullscreen } = useFullscreen();

  const [selectedMode, setSelectedMode] = useState<CalibrationVisualMode | undefined>(
    initialCalibrationMode,
  );
  const requestedCalibrationMode = selectedMode || 'grid';

  const {
    status: tobiiStatus,
    checking: serviceChecking,
    error: serviceError,
    checkStatus,
  } = useTobiiStatus();
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

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const isTaskActive =
    ACTIVE_TOBII_TASK_STATES.has(tobiiState.currentState) ||
    tobiiState.currentState === 'calibrating';

  const { connected } = useTobiiGazeStream({
    enabled: isTaskActive,
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
    [activateTask, dispatch],
  );

  const handleTaskDone = useCallback(() => {
    dispatch({ type: 'TASK_COMPLETE' });
  }, [dispatch]);

  const handleRetake = useCallback(() => {
    clearActiveBuffer();
    dispatch({ type: 'RETAKE' });
  }, [clearActiveBuffer, dispatch]);

  const handleContinue = useCallback(() => {
    if (tobiiState.currentState === 'review-syllables') {
      activateTask('pseudo-words', getTobiiTaskContent('pseudo-words'));
    } else if (tobiiState.currentState === 'review-pseudo-words') {
      activateTask('meaningful-text', getTobiiTaskContent('meaningful-text'));
    }

    dispatch({ type: 'CONTINUE' });
  }, [activateTask, dispatch, tobiiState.currentState]);

  const retrySubmission = useCallback(() => {
    dispatch({ type: 'RETRY_SUBMIT' });
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    if (!tobiiState.intake) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: 'Missing intake data. Please restart the test and try again.',
      });
      return;
    }

    const result = await submitTobiiTest({
      attempt: {
        attemptId: getOrCreateAttemptId(),
        taskType: 'full-battery',
        age: tobiiState.intake.age,
        label: tobiiState.intake.label,
        calibrationMode: requestedCalibrationMode,
      },
      syllables: syllablesRef.current,
      pseudoWords: pseudoWordsRef.current,
      meaningfulText: meaningfulTextRef.current,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      lineCenters: lineCentersRef.current,
    });

    if (result.success) {
      dispatch({ type: 'SUBMIT_SUCCESS', result: result.data });
      return;
    }

    dispatch({ type: 'SUBMIT_ERROR', error: result.error });
  }, [
    dispatch,
    getOrCreateAttemptId,
    lineCentersRef,
    meaningfulTextRef,
    pseudoWordsRef,
    requestedCalibrationMode,
    syllablesRef,
    tobiiState.intake,
  ]);

  const handleNewTest = useCallback(() => {
    resetAttemptId();
    resetAll();
    dispatch({ type: 'RESET' });
    dispatch({ type: 'START' });
  }, [dispatch, resetAll, resetAttemptId]);

  const handleExit = useCallback(() => {
    exitFullscreen();
    router.push('/');
  }, [exitFullscreen, router]);

  useEffect(() => {
    if (tobiiState.currentState === 'submitting') {
      void handleSubmit();
    }
  }, [handleSubmit, tobiiState.currentState]);

  useEffect(() => {
    if (tobiiState.currentState === 'results') {
      exitFullscreen();
    }
  }, [exitFullscreen, tobiiState.currentState]);

  return {
    state: tobiiState,
    dispatch,
    connected,
    participantAge,
    requestedCalibrationMode,
    selectedMode,
    setSelectedMode,
    tobiiStatus,
    serviceChecking,
    serviceError,
    checkStatus,
    serviceRunning: tobiiStatus?.connected === true,
    serviceDevice: tobiiStatus?.device,
    lastGazeRef,
    gazePointCount,
    taskPointCounts,
    lastTaskGazePosition,
    taskContent,
    activateTask,
    setLineCenters,
    steps: TOBII_STEPS.map((step) => ({ key: step.key, label: step.label })),
    currentStepKey: getStepKeyForState(tobiiState.currentState),
    showStepIndicator: !STEP_INDICATOR_HIDDEN_STATES.has(tobiiState.currentState),
    canRetrySubmission:
      taskPointCounts.syllables > 0 ||
      taskPointCounts['pseudo-words'] > 0 ||
      taskPointCounts['meaningful-text'] > 0,
    handleDeviceReady,
    handleCalibrationComplete,
    handleTaskDone,
    handleRetake,
    handleContinue,
    retrySubmission,
    handleNewTest,
    handleExit,
    completeIntake: (data: IntakeData) => dispatch({ type: 'INTAKE_COMPLETE', data }),
    confirmHardware: () => dispatch({ type: 'HARDWARE_CONFIRMED' }),
    completeEducation: () => dispatch({ type: 'EDUCATION_COMPLETE' }),
    startFromIdle: () => dispatch({ type: 'START' }),
  };
}
