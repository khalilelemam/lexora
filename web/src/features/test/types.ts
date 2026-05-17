// ─── Test Modes ──────────────────────────────────────────
export type TestMode = 'tobii' | 'webcam';
export type CalibrationMode = 'grid' | 'star' | 'stickman';

// ─── Pre-test Intake ─────────────────────────────────────
export interface IntakeData {
  age: number;
  label?: string;
}

// ─── Task Types ──────────────────────────────────────────
export type TobiiTaskType = 'syllables' | 'pseudo-words' | 'meaningful-text';
export type WebcamTaskType = 'paragraph';
export type TaskType = TobiiTaskType | WebcamTaskType;

// ─── Calibration ─────────────────────────────────────────
export type CalibrationQuality = 'good' | 'acceptable' | 'poor';

export interface CalibrationPoint {
  x: number;
  y: number;
}

export interface CalibrationResult {
  quality: CalibrationQuality;
  pointAccuracies: number[];
  averageError: number;
}

// ─── Gaze Data ───────────────────────────────────────────
/** Tobii gaze point — normalized 0-1 coords, microsecond timestamps */
export interface TobiiGazePoint {
  fixationX: number;
  fixationY: number;
  timestamp: number;
}

/** Webcam raw gaze point — pixel coords, millisecond timestamps */
export interface WebcamGazePoint {
  x: number;
  y: number;
  timestamp: number;
}

// ─── Gaze Buffers (per task) ─────────────────────────────
export interface TobiiTaskGazeData {
  taskType: TobiiTaskType;
  gazePoints: TobiiGazePoint[];
}

export interface WebcamTaskGazeData {
  taskType: WebcamTaskType;
  gazePoints: WebcamGazePoint[];
}

// ─── Risk Levels ─────────────────────────────────────────
export type RiskLevel = 'low' | 'medium' | 'high';

// ─── ML Prediction Results ───────────────────────────────
export interface PredictionMetadata {
  sequencesAnalyzed: number;
  totalFixations: number;
}

/** Per-fixation feature data returned by the ML service (for gaze replay) */
export interface GazeFeature {
  timestamp: number;
  durationMs: number;
  fixationX: number;
  fixationY: number;
  saccadeAmplitude: number;
  isRegression: boolean;
  isReturnSweep?: boolean;
}

export interface PredictionResult {
  dyslexiaProbability: number;
  riskLevel: RiskLevel;
  confidence: number;
  metadata: PredictionMetadata;
  /** Per-fixation features for gaze replay visualization */
  features?: GazeFeature[];
}

export interface AttemptMetadata {
  attemptId: string;
  age: number;
  label?: string;
  calibrationMode: CalibrationMode;
  contentSnapshot?: AttemptContentSnapshot;
}

export interface AttemptContentSnapshot {
  version: 1;
  primaryTask: TaskType;
  tasks: Partial<Record<TaskType, string>>;
}

export interface TobiiSubmissionInput {
  attempt: AttemptMetadata;
  syllables: TobiiGazePoint[];
  pseudoWords: TobiiGazePoint[];
  meaningfulText: TobiiGazePoint[];
  screenWidth: number;
  screenHeight: number;
  lineCenters?: Record<string, number[]>;
}

export interface WebcamSubmissionInput {
  attempt: AttemptMetadata;
  gazeData: WebcamGazePoint[];
  screenWidth: number;
  screenHeight: number;
  lineCenters?: number[];
}

// ─── Test Flow States ────────────────────────────────────
export type TobiiTestState =
  | 'idle'
  | 'intake'
  | 'hardware-check'
  | 'pre-test-education'
  | 'device-check'
  | 'calibrating'
  | 'task-syllables'
  | 'review-syllables'
  | 'task-pseudo-words'
  | 'review-pseudo-words'
  | 'task-meaningful-text'
  | 'review-meaningful-text'
  | 'submitting'
  | 'results'
  | 'error';

export type WebcamTestState =
  | 'idle'
  | 'intake'
  | 'pre-test-education'
  | 'camera-setup'
  | 'calibrating'
  | 'task-paragraph'
  | 'review-paragraph'
  | 'submitting'
  | 'results'
  | 'error';

export type TestState = TobiiTestState | WebcamTestState;

// ─── Test Flow Actions ───────────────────────────────────
export type TestAction =
  | { type: 'START' }
  | { type: 'INTAKE_COMPLETE'; data: IntakeData }
  | { type: 'HARDWARE_CONFIRMED' }
  | { type: 'EDUCATION_COMPLETE' }
  | { type: 'DEVICE_READY' }
  | { type: 'CAMERA_READY' }
  | { type: 'CALIBRATION_COMPLETE'; result: CalibrationResult }
  | { type: 'CALIBRATION_RETRY' }
  | { type: 'TASK_COMPLETE' }
  | { type: 'RETAKE' }
  | { type: 'CONTINUE' }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; result: PredictionResult }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RETRY_SUBMIT' }
  | { type: 'RESET' }
  | { type: 'ERROR'; error: string };

// ─── Full Test Flow State ────────────────────────────────
export interface TobiiTestFlowState {
  mode: 'tobii';
  currentState: TobiiTestState;
  intake: IntakeData | null;
  calibration: CalibrationResult | null;
  taskData: {
    syllables: TobiiGazePoint[];
    pseudoWords: TobiiGazePoint[];
    meaningfulText: TobiiGazePoint[];
  };
  results: PredictionResult | null;
  error: string | null;
}

export interface WebcamTestFlowState {
  mode: 'webcam';
  currentState: WebcamTestState;
  intake: IntakeData | null;
  calibration: CalibrationResult | null;
  taskData: {
    paragraph: WebcamGazePoint[];
  };
  results: PredictionResult | null;
  error: string | null;
}

export type TestFlowState = TobiiTestFlowState | WebcamTestFlowState;

// ─── Screen Info ─────────────────────────────────────────
export interface ScreenInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
}

// ─── Tobii Status ────────────────────────────────────────
export interface TobiiDevice {
  deviceName: string;
  serialNumber: string;
  model: string;
  firmwareVersion: string;
}

export interface TobiiStatus {
  connected: boolean;
  device: TobiiDevice | null;
}
