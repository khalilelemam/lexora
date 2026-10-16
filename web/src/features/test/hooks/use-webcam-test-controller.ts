'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { submitWebcamTest } from '@/features/test/actions/submit-webcam-test';
import type { CalibrationVisualMode } from '@/features/test/lib/calibration-mode';
import type {
  CalibrationResult,
  IntakeData,
  WebcamGazePoint,
  WebcamTaskType,
  WebcamTestFlowState,
} from '@/features/test/types';

import { useFullscreen } from './use-fullscreen';
import { useStableAttemptId } from './use-stable-attempt-id';
import { useCalibrationQueryParams } from './use-calibration-query-params';
import { useTestFlow } from './use-test-flow';
import { useWebcamGaze } from './use-webcam-gaze';
import { WEBCAM_STEPS, getStepKeyForState, MIN_GAZE_POINTS } from '../lib/constants';
import { getTaskContent } from '../lib/test-content';

const ACTIVE_TASK_STATES = new Set([
  'task-syllables',
  'task-pseudo-words',
  'task-meaningful-text',
]);

const STEP_INDICATOR_HIDDEN_STATES = new Set([
  'idle',
  'camera-setup',
  'calibrating',
  'task-syllables',
  'task-pseudo-words',
  'task-meaningful-text',
  'review-syllables',
  'review-pseudo-words',
  'review-meaningful-text',
  'results',
  'submitting',
]);

export function useWebcamTestController() {
  const router = useRouter();
  const { state, dispatch, forceState } = useTestFlow({ mode: 'webcam' });
  const webcamState = state as WebcamTestFlowState;
  const { mode: initialCalibrationMode, age: participantAge } = useCalibrationQueryParams();
  const { getOrCreateAttemptId, resetAttemptId } = useStableAttemptId();
  const { enterFullscreen, exitFullscreen } = useFullscreen();

  const [selectedMode, setSelectedMode] = useState<CalibrationVisualMode | undefined>(
    initialCalibrationMode,
  );
  const requestedCalibrationMode: CalibrationVisualMode = 'grid';

  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── 3 Task Gaze Buffers (ETDD70 Standard) ─────────────
  const syllablesGazeRef = useRef<WebcamGazePoint[]>([]);
  const pseudoWordsGazeRef = useRef<WebcamGazePoint[]>([]);
  const meaningfulTextGazeRef = useRef<WebcamGazePoint[]>([]);

  const lastTaskGazePositionRef = useRef<{ x: number; y: number } | null>(null);
  const screenshotsRef = useRef<Record<string, string>>({});
  const calibrationResultRef = useRef<CalibrationResult | null>(null);

  const [taskPointCounts, setTaskPointCounts] = useState<Record<WebcamTaskType, number>>({
    syllables: 0,
    'pseudo-words': 0,
    'meaningful-text': 0,
  });

  const [reviewGazeData, setReviewGazeData] = useState<WebcamGazePoint[]>([]);
  const [taskContent, setTaskContent] = useState('');
  const [activeTaskType, setActiveTaskType] = useState<WebcamTaskType>('syllables');
  const [lastTaskGazePosition, setLastTaskGazePosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  const setScreenshot = useCallback((taskType: string, dataUrl: string) => {
    screenshotsRef.current[taskType] = dataUrl;
  }, []);

  const getCurrentTaskType = useCallback((currentState: string): WebcamTaskType | null => {
    if (currentState.includes('syllables')) return 'syllables';
    if (currentState.includes('pseudo-words')) return 'pseudo-words';
    if (currentState.includes('meaningful-text')) return 'meaningful-text';
    return null;
  }, []);

  const webcamGaze = useWebcamGaze({
    enabled: true,
    onGazePoint: useCallback(
      (point: WebcamGazePoint) => {
        const currentTask = getCurrentTaskType(webcamState.currentState);
        if (!currentTask) return;

        if (currentTask === 'syllables') {
          syllablesGazeRef.current.push(point);
          setTaskPointCounts((prev) => ({ ...prev, syllables: prev.syllables + 1 }));
        } else if (currentTask === 'pseudo-words') {
          pseudoWordsGazeRef.current.push(point);
          setTaskPointCounts((prev) => ({ ...prev, 'pseudo-words': prev['pseudo-words'] + 1 }));
        } else if (currentTask === 'meaningful-text') {
          meaningfulTextGazeRef.current.push(point);
          setTaskPointCounts((prev) => ({ ...prev, 'meaningful-text': prev['meaningful-text'] + 1 }));
        }

        const previous = lastTaskGazePositionRef.current;
        const dx = previous ? point.x - previous.x : Number.POSITIVE_INFINITY;
        const dy = previous ? point.y - previous.y : Number.POSITIVE_INFINITY;
        if (!previous || dx * dx + dy * dy > 1) {
          const next = { x: point.x, y: point.y };
          lastTaskGazePositionRef.current = next;
          setLastTaskGazePosition(next);
        }
      },
      [getCurrentTaskType, webcamState.currentState],
    ),
  });

  const handleCameraReady = useCallback(() => {
    dispatch({ type: 'CAMERA_READY' });
    enterFullscreen();
  }, [dispatch, enterFullscreen]);

  const completeSetup = useCallback(() => {
    dispatch({ type: 'SETUP_COMPLETE' });
    enterFullscreen();
  }, [dispatch, enterFullscreen]);

  const handleCalibrationComplete = useCallback(
    (
      result: CalibrationResult,
      mapping?: {
        predict: (ix: number, iy: number, yaw: number, pitch: number) => { x: number; y: number };
      },
    ) => {
      if (mapping) {
        webcamGaze.setCalibrationData(mapping);
      }
      calibrationResultRef.current = result;
      dispatch({ type: 'CALIBRATION_COMPLETE', result });

      // Start Task 1: Syllables
      setActiveTaskType('syllables');
      setTaskContent(getTaskContent('syllables', participantAge, 'ar'));
      syllablesGazeRef.current = [];
      setTaskPointCounts((prev) => ({ ...prev, syllables: 0 }));
      setReviewGazeData([]);
      lastTaskGazePositionRef.current = null;
      setLastTaskGazePosition(null);
    },
    [dispatch, webcamGaze, participantAge],
  );

  const handleTaskDone = useCallback(() => {
    webcamGaze.stopCollecting();
    const currentTask = getCurrentTaskType(webcamState.currentState);

    if (currentTask === 'syllables') {
      setReviewGazeData([...syllablesGazeRef.current]);
    } else if (currentTask === 'pseudo-words') {
      setReviewGazeData([...pseudoWordsGazeRef.current]);
    } else if (currentTask === 'meaningful-text') {
      setReviewGazeData([...meaningfulTextGazeRef.current]);
    }

    dispatch({ type: 'TASK_COMPLETE' });
  }, [dispatch, getCurrentTaskType, webcamGaze, webcamState.currentState]);

  const handleRetake = useCallback(() => {
    const currentTask = getCurrentTaskType(webcamState.currentState);
    if (currentTask === 'syllables') {
      syllablesGazeRef.current = [];
      setTaskPointCounts((prev) => ({ ...prev, syllables: 0 }));
    } else if (currentTask === 'pseudo-words') {
      pseudoWordsGazeRef.current = [];
      setTaskPointCounts((prev) => ({ ...prev, 'pseudo-words': 0 }));
    } else if (currentTask === 'meaningful-text') {
      meaningfulTextGazeRef.current = [];
      setTaskPointCounts((prev) => ({ ...prev, 'meaningful-text': 0 }));
    }

    setReviewGazeData([]);
    lastTaskGazePositionRef.current = null;
    setLastTaskGazePosition(null);
    dispatch({ type: 'RETAKE' });
  }, [dispatch, getCurrentTaskType, webcamState.currentState]);

  const handleContinue = useCallback(() => {
    dispatch({ type: 'CONTINUE' });
  }, [dispatch]);

  const retrySubmission = useCallback(() => {
    dispatch({ type: 'RETRY_SUBMIT' });
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    const totalGazePoints =
      syllablesGazeRef.current.length +
      pseudoWordsGazeRef.current.length +
      meaningfulTextGazeRef.current.length;

    if (totalGazePoints < MIN_GAZE_POINTS) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: `بيانات التتبع المسجلة غير كافية (${totalGazePoints} نقطة). يرجى التأكد من وضوح الكاميرا أمام وجه الطفل وإعادة المحاولة.`,
      });
      return;
    }

    if (!webcamState.intake) {
      dispatch({
        type: 'SUBMIT_ERROR',
        error: 'بيانات التسجيل مفقودة، يرجى إعادة بدء الاختبار.',
      });
      return;
    }

    const language = webcamState.intake.language || 'ar';
    const age = webcamState.intake.age;

    const result = await submitWebcamTest({
      attempt: {
        attemptId: getOrCreateAttemptId(),
        age,
        label: webcamState.intake.label,
        language,
        calibrationMode: 'grid',
        contentSnapshot: {
          version: 1,
          primaryTask: 'meaningful-text',
          tasks: {
            syllables: getTaskContent('syllables', age, language),
            'pseudo-words': getTaskContent('pseudo-words', age, language),
            'meaningful-text': getTaskContent('meaningful-text', age, language),
          },
        },
      },
      waitlistEntryId: webcamState.intake.waitlistEntryId,
      syllables: syllablesGazeRef.current,
      pseudoWords: pseudoWordsGazeRef.current,
      meaningfulText: meaningfulTextGazeRef.current,
      calibrationResult: calibrationResultRef.current || webcamState.calibration || undefined,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      language,
      screenshots: screenshotsRef.current,
    });

    if (result.success) {
      dispatch({ type: 'SUBMIT_SUCCESS', result: result.data });
      return;
    }

    dispatch({ type: 'SUBMIT_ERROR', error: result.error });
  }, [dispatch, getOrCreateAttemptId, webcamState.calibration, webcamState.intake]);

  const handleNewTest = useCallback(() => {
    resetAttemptId();
    syllablesGazeRef.current = [];
    pseudoWordsGazeRef.current = [];
    meaningfulTextGazeRef.current = [];
    setTaskPointCounts({
      syllables: 0,
      'pseudo-words': 0,
      'meaningful-text': 0,
    });
    setReviewGazeData([]);
    lastTaskGazePositionRef.current = null;
    setLastTaskGazePosition(null);
    setTaskContent('');
    screenshotsRef.current = {};
    calibrationResultRef.current = null;
    dispatch({ type: 'RESET' });
    dispatch({ type: 'START' });
  }, [dispatch, resetAttemptId]);

  const handleExit = useCallback(() => {
    webcamGaze.cleanup();
    exitFullscreen();
    router.push('/');
  }, [exitFullscreen, router, webcamGaze]);

  // Handle auto-triggering submission when entering submitting state
  useEffect(() => {
    if (webcamState.currentState === 'submitting') {
      void handleSubmit();
    }
  }, [handleSubmit, webcamState.currentState]);

  // Handle task content and collection start on task state transition
  useEffect(() => {
    const age = webcamState.intake?.age ?? participantAge;
    const lang = webcamState.intake?.language || 'ar';

    if (webcamState.currentState === 'task-syllables') {
      setActiveTaskType('syllables');
      setTaskContent(getTaskContent('syllables', age, lang));
      webcamGaze.startCollecting();
    } else if (webcamState.currentState === 'task-pseudo-words') {
      setActiveTaskType('pseudo-words');
      setTaskContent(getTaskContent('pseudo-words', age, lang));
      webcamGaze.startCollecting();
    } else if (webcamState.currentState === 'task-meaningful-text') {
      setActiveTaskType('meaningful-text');
      setTaskContent(getTaskContent('meaningful-text', age, lang));
      webcamGaze.startCollecting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run strictly on state transition
  }, [webcamState.currentState]);

  const webcamGazeRef = useRef(webcamGaze);
  webcamGazeRef.current = webcamGaze;

  useEffect(() => {
    if (webcamState.currentState === 'results') {
      webcamGazeRef.current.cleanup();
      exitFullscreen();
    }
  }, [exitFullscreen, webcamState.currentState]);

  useEffect(() => {
    if (webcamState.currentState === 'error') {
      webcamGazeRef.current.cleanup();
    }
  }, [webcamState.currentState]);

  const currentTask = getCurrentTaskType(webcamState.currentState) || 'syllables';
  const currentTaskGazeCount = taskPointCounts[currentTask] || 0;

  return {
    state: webcamState,
    dispatch,
    videoRef,
    webcamGaze,
    participantAge,
    requestedCalibrationMode,
    selectedMode,
    setSelectedMode,
    taskContent,
    activeTaskType,
    gazePointCount: currentTaskGazeCount,
    taskPointCounts,
    reviewGazeData,
    lastTaskGazePosition,
    steps: WEBCAM_STEPS.map((step) => ({ key: step.key, label: step.label })),
    currentStepKey: getStepKeyForState(webcamState.currentState),
    showStepIndicator: !STEP_INDICATOR_HIDDEN_STATES.has(webcamState.currentState),
    canRetrySubmission: currentTaskGazeCount >= MIN_GAZE_POINTS,
    handleCameraReady,
    completeSetup,
    handleCalibrationComplete,
    handleTaskDone,
    handleRetake,
    handleContinue,
    retrySubmission,
    handleNewTest,
    handleExit,
    completeIntake: (data: IntakeData) => dispatch({ type: 'INTAKE_COMPLETE', data }),
    startFromIdle: () => dispatch({ type: 'START' }),
    setScreenshot,
    forceState,
  };
}
