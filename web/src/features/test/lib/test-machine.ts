import type {
  WebcamTestFlowState,
  WebcamTestState,
  TestFlowState,
  TestAction,
  TestState,
} from '../types';

const WEBCAM_TEST_STATES = new Set<TestState>([
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
]);

function isWebcamTestState(state: TestState): state is WebcamTestState {
  return WEBCAM_TEST_STATES.has(state);
}

// ─── Initial State ───────────────────────────────────────

export function createWebcamInitialState(): WebcamTestFlowState {
  return {
    mode: 'webcam',
    currentState: 'idle',
    intake: null,
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

export const createTobiiInitialState = createWebcamInitialState;

// ─── Webcam 3-Task Reducer (ETDD70 Pipeline) ─────────────

function webcamReducer(state: WebcamTestFlowState, action: TestAction): WebcamTestFlowState {
  switch (action.type) {
    case 'START':
      return { ...state, currentState: 'intake', error: null };

    case 'INTAKE_COMPLETE':
      return { ...state, currentState: 'device-setup', intake: action.data };

    case 'CAMERA_READY':
    case 'DEVICE_READY':
      return { ...state, currentState: 'calibration-setup' };

    case 'SETUP_COMPLETE':
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
      return createWebcamInitialState();

    case 'ERROR':
      return { ...state, currentState: 'error', error: action.error };

    case 'FORCE_STATE':
      return isWebcamTestState(action.state) ? { ...state, currentState: action.state } : state;

    default:
      return state;
  }
}

// ─── Combined Reducer ────────────────────────────────────

export function testFlowReducer(state: TestFlowState, action: TestAction): TestFlowState {
  return webcamReducer(state as WebcamTestFlowState, action);
}
