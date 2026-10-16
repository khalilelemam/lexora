// ─── Test Modes ──────────────────────────────────────────
export type TestMode = 'webcam' | 'tobii';
export type CalibrationMode = 'grid' | 'star' | 'stickman';

// ─── Pre-test Intake ─────────────────────────────────────
export interface IntakeData {
  age: number;
  label?: string;
  language?: 'ar' | 'en';
  waitlistEntryId?: string;
}

// ─── Task Types (ETDD70 Standard: Syllables, Pseudo-words, Meaningful Text) ────
export type WebcamTaskType = 'syllables' | 'pseudo-words' | 'meaningful-text';
export type TobiiTaskType = 'syllables' | 'pseudo-words' | 'meaningful-text';
export type TaskType = WebcamTaskType;

// ─── Calibration ─────────────────────────────────────────
export type CalibrationQuality = 'good' | 'acceptable' | 'poor';

export type CalibrationPhaseType =
  | 'STATIC'
  | 'PURSUIT_SAMPLE'
  | 'PURSUIT_VALIDATION'
  | 'READING_ANCHOR'
  | 'READING_VALIDATION';

export interface CalibrationPoint {
  x: number; // normalized 0–1
  y: number; // normalized 0–1
  phase: CalibrationPhaseType;
  label?: string;
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
  x?: number;
  y?: number;
}

/** Webcam raw gaze point — pixel coords, millisecond timestamps */
export interface WebcamGazePoint {
  x: number;
  y: number;
  timestamp: number;
  fixationX?: number;
  fixationY?: number;
}

// ─── Gaze Buffers (per task) ─────────────────────────────
export interface WebcamTaskGazeData {
  taskType: WebcamTaskType;
  gazePoints: WebcamGazePoint[];
}

export interface TobiiTaskGazeData {
  taskType: TobiiTaskType;
  gazePoints: TobiiGazePoint[];
}

// ─── Risk Levels ─────────────────────────────────────────
export type RiskLevel = 'low' | 'medium' | 'high';

// ─── Research Data Collection Results ────────────────────
export interface DataCollectionResult {
  success: boolean;
  attemptId: string;
  participantAge: number;
  totalGazePoints: number;
  taskCounts: {
    syllables: number;
    pseudoWords: number;
    meaningfulText: number;
  };
  calibrationQuality: CalibrationQuality;
  averageError?: number;
  savedAt: string;
  // Compatibility fields
  dyslexiaProbability?: number;
  riskLevel?: RiskLevel;
  confidence?: number;
  metadata?: any;
  features?: GazeFeature[];
}
export interface PredictionResult {
  dyslexiaProbability?: number;
  riskLevel?: RiskLevel;
  confidence?: number;
  metadata?: any;
  features?: GazeFeature[];
}

export interface AttemptMetadata {
  attemptId: string;
  age: number;
  label?: string;
  language?: string;
  waitlistEntryId?: string;
  calibrationMode: CalibrationMode;
  contentSnapshot?: AttemptContentSnapshot;
}

export interface AttemptContentSnapshot {
  version: 1;
  primaryTask: TaskType;
  tasks: Partial<Record<TaskType, string>>;
}

export interface WebcamSubmissionInput {
  attempt: AttemptMetadata;
  waitlistEntryId?: string;
  syllables: WebcamGazePoint[];
  pseudoWords: WebcamGazePoint[];
  meaningfulText: WebcamGazePoint[];
  calibrationResult?: CalibrationResult;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio?: number;
  language?: string;
  gazeData?: WebcamGazePoint[];
  screenshots?: Record<string, string>;
}

export interface TobiiSubmissionInput {
  attempt: AttemptMetadata;
  waitlistEntryId?: string;
  syllables: TobiiGazePoint[];
  pseudoWords: TobiiGazePoint[];
  meaningfulText: TobiiGazePoint[];
  calibrationResult?: CalibrationResult;
  screenWidth: number;
  screenHeight: number;
  screenshots?: Record<string, string>;
}

// ─── Test Flow States ────────────────────────────────────
export type WebcamTestState =
  | 'idle'
  | 'intake'
  | 'device-setup'
  | 'calibration-setup'
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

export type TobiiTestState =
  | 'idle'
  | 'intake'
  | 'device-setup'
  | 'calibration-setup'
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

export type TestState = WebcamTestState;

// ─── Test Flow Actions ───────────────────────────────────
export type TestAction =
  | { type: 'START' }
  | { type: 'INTAKE_COMPLETE'; data: IntakeData }
  | { type: 'HARDWARE_CONFIRMED' }
  | { type: 'SETUP_COMPLETE' }
  | { type: 'CAMERA_READY' }
  | { type: 'DEVICE_READY' }
  | { type: 'CALIBRATION_COMPLETE'; result: CalibrationResult }
  | { type: 'CALIBRATION_RETRY' }
  | { type: 'TASK_COMPLETE' }
  | { type: 'RETAKE' }
  | { type: 'CONTINUE' }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; result: DataCollectionResult }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RETRY_SUBMIT' }
  | { type: 'RESET' }
  | { type: 'ERROR'; error: string }
  | { type: 'FORCE_STATE'; state: TestState };

// ─── Full Test Flow State ────────────────────────────────
export interface WebcamTestFlowState {
  mode: 'webcam';
  currentState: WebcamTestState;
  intake: IntakeData | null;
  calibration: CalibrationResult | null;
  taskData: {
    syllables: WebcamGazePoint[];
    pseudoWords: WebcamGazePoint[];
    meaningfulText: WebcamGazePoint[];
  };
  results: DataCollectionResult | null;
  error: string | null;
}

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
  results: DataCollectionResult | null;
  error: string | null;
}

export type TestFlowState = WebcamTestFlowState | TobiiTestFlowState;

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

export interface GazeFeature {
  timestamp: number;
  durationMs: number;
  fixationX: number;
  fixationY: number;
  saccadeAmplitude: number;
  efficiencyRatio?: number;
  isRegression: boolean;
  isReturnSweep?: boolean;
}
