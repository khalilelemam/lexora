import type { TobiiTestFlowState, WebcamTestFlowState, TestFlowState, TestAction } from '../types';

// ─── Initial States ──────────────────────────────────────

export function createTobiiInitialState(): TobiiTestFlowState {
  return {
    mode: 'tobii',
    currentState: 'idle',
    calibration: null,
    taskData: {
      syllables: [],
      pseudoWords: [],
      meaningfulText: [],
    },
    results: null,
    error: null,
  };
}

export function createWebcamInitialState(): WebcamTestFlowState {
  return {
    mode: 'webcam',
    currentState: 'idle',
    calibration: null,
    taskData: {
      paragraph: [],
    },
    results: null,
    error: null,
  };
}

// ─── Tobii Reducer ───────────────────────────────────────

function tobiiReducer(state: TobiiTestFlowState, action: TestAction): TobiiTestFlowState {
  switch (action.type) {
    case 'START':
      return { ...state, currentState: 'hardware-check', error: null };

    case 'HARDWARE_CONFIRMED':
      return { ...state, currentState: 'pre-test-education' };

    case 'EDUCATION_COMPLETE':
      return { ...state, currentState: 'device-check' };

    case 'DEVICE_READY':
      return { ...state, currentState: 'calibrating' };

    case 'CALIBRATION_COMPLETE':
      return {
        ...state,
        currentState: 'task-syllables',
        calibration: action.result,
      };

    case 'CALIBRATION_RETRY':
      return { ...state, currentState: 'calibrating', calibration: null };

    case 'TASK_COMPLETE':
      switch (state.currentState) {
        case 'task-syllables':
          return { ...state, currentState: 'review-syllables' };
        case 'task-pseudo-words':
          return { ...state, currentState: 'review-pseudo-words' };
        case 'task-meaningful-text':
          return { ...state, currentState: 'review-meaningful-text' };
        default:
          return state;
      }

    case 'RETAKE':
      switch (state.currentState) {
        case 'review-syllables':
          return {
            ...state,
            currentState: 'task-syllables',
            taskData: { ...state.taskData, syllables: [] },
          };
        case 'review-pseudo-words':
          return {
            ...state,
            currentState: 'task-pseudo-words',
            taskData: { ...state.taskData, pseudoWords: [] },
          };
        case 'review-meaningful-text':
          return {
            ...state,
            currentState: 'task-meaningful-text',
            taskData: { ...state.taskData, meaningfulText: [] },
          };
        default:
          return state;
      }

    case 'CONTINUE':
      switch (state.currentState) {
        case 'review-syllables':
          return { ...state, currentState: 'task-pseudo-words' };
        case 'review-pseudo-words':
          return { ...state, currentState: 'task-meaningful-text' };
        case 'review-meaningful-text':
          return { ...state, currentState: 'submitting' };
        default:
          return state;
      }

    case 'SUBMIT_SUCCESS':
      return { ...state, currentState: 'results', results: action.result, error: null };

    case 'SUBMIT_ERROR':
      return { ...state, currentState: 'error', error: action.error };

    case 'RETRY_SUBMIT':
      return { ...state, currentState: 'submitting', error: null };

    case 'RESET':
      return createTobiiInitialState();

    case 'ERROR':
      return { ...state, currentState: 'error', error: action.error };

    default:
      return state;
  }
}

// ─── Webcam Reducer ──────────────────────────────────────

function webcamReducer(state: WebcamTestFlowState, action: TestAction): WebcamTestFlowState {
  switch (action.type) {
    case 'START':
      return { ...state, currentState: 'pre-test-education', error: null };

    case 'EDUCATION_COMPLETE':
      return { ...state, currentState: 'camera-setup' };

    case 'CAMERA_READY':
      return { ...state, currentState: 'calibrating' };

    case 'CALIBRATION_COMPLETE':
      return {
        ...state,
        currentState: 'task-paragraph',
        calibration: action.result,
      };

    case 'CALIBRATION_RETRY':
      return { ...state, currentState: 'calibrating', calibration: null };

    case 'TASK_COMPLETE':
      if (state.currentState === 'task-paragraph') {
        return { ...state, currentState: 'review-paragraph' };
      }
      return state;

    case 'RETAKE':
      if (state.currentState === 'review-paragraph') {
        return {
          ...state,
          currentState: 'task-paragraph',
          taskData: { paragraph: [] },
        };
      }
      return state;

    case 'CONTINUE':
      if (state.currentState === 'review-paragraph') {
        return { ...state, currentState: 'submitting' };
      }
      return state;

    case 'SUBMIT_SUCCESS':
      return { ...state, currentState: 'results', results: action.result, error: null };

    case 'SUBMIT_ERROR':
      return { ...state, currentState: 'error', error: action.error };

    case 'RETRY_SUBMIT':
      return { ...state, currentState: 'submitting', error: null };

    case 'RESET':
      return createWebcamInitialState();

    case 'ERROR':
      return { ...state, currentState: 'error', error: action.error };

    default:
      return state;
  }
}

// ─── Combined Reducer ────────────────────────────────────

export function testFlowReducer(state: TestFlowState, action: TestAction): TestFlowState {
  if (state.mode === 'tobii') {
    return tobiiReducer(state as TobiiTestFlowState, action);
  }
  return webcamReducer(state as WebcamTestFlowState, action);
}
