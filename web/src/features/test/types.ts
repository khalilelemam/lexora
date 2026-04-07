// ─── Test Modes ──────────────────────────────────────────
export type TestMode = 'tobii' | 'webcam';

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

// ─── Test Flow States ────────────────────────────────────
export type TobiiTestState =
  | 'idle'
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
  calibration: CalibrationResult | null;
  taskData: {
    paragraph: WebcamGazePoint[];
  };
  results: PredictionResult | null;
  error: string | null;
}

export type TestFlowState = TobiiTestFlowState | WebcamTestFlowState;

// ─── Calibration Diagnostics ─────────────────────────────

export interface CalibrationDiagnostics {
  /** Per-point error breakdown */
  perPointErrors: Array<{
    point: { x: number; y: number };
    /** Mean Euclidean error in pixels (from polynomial prediction on raw samples) */
    meanError: number;
    /** Standard deviation of per-sample errors in pixels */
    stdError: number;
    /** Number of raw iris samples collected for this point */
    sampleCount: number;
  }>;
  /** Pearson correlation between predicted X and target X */
  corrX: number;
  /** Pearson correlation between predicted Y and target Y */
  corrY: number;
  /** Bounding box of predicted gaze positions and screen coverage ratios */
  coverage: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    /** Fraction of screen width covered by predictions (0-1) */
    widthCoverage: number;
    /** Fraction of screen height covered by predictions (0-1) */
    heightCoverage: number;
  };
  /** Mean Euclidean error across all raw samples in pixels */
  meanErrorPx: number;
  /** Mean error normalized by screen diagonal (0-1) */
  meanErrorNormalized: number;
  /** Median Euclidean error in pixels */
  medianErrorPx: number;
  /** Range of raw iris coordinates observed during calibration */
  irisRange: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  /** Head pose statistics during calibration */
  headPose: {
    meanYaw: number;
    meanPitch: number;
    stdYaw: number;
    stdPitch: number;
  };
  /** Target vs predicted screen positions for offline heatmap plotting */
  heatmapPairs: Array<{
    target: { x: number; y: number };
    predicted: { x: number; y: number };
  }>;
}

/** A single head pose sample (yaw/pitch proxy values from face landmarks) */
export interface HeadPoseSample {
  /** Left-right head turn — positive = turned right (normalized by face width) */
  yaw: number;
  /** Up-down head nod — positive = tilted down (normalized by face height) */
  pitch: number;
}

/** Result of validating a single calibration point post-calibration */
export interface ValidationPointResult {
  point: { x: number; y: number };
  /** Raw iris coordinates sampled during validation dwell */
  irisSamples: Array<{ x: number; y: number }>;
  /** All predicted screen positions sampled during the validation dwell */
  predictions: Array<{ x: number; y: number }>;
  /** Mean Euclidean error in pixels between predictions and target */
  meanErrorPx: number;
  /** Standard deviation of predicted coordinates (jitter/precision) during validation fixation */
  jitterStdDev: number;
  /** Head pose samples collected during validation at this point */
  headPoseSamples: HeadPoseSample[];
}

/** Diagnostics for a single regression model */
export interface ModelDiagnostic {
  kind: string;
  trainingErrorPx: number;
  validationErrorPx: number; // Post-validation mean error
  validationJitterStdDev: number; // Mean jitter across validation points
  info: string;
  isBest: boolean;
  /** Per-point mean error in px */
  perPointErrors: Array<{
    point: { x: number; y: number };
    meanError: number;
  }>;
  /** Pearson correlations */
  corrX: number;
  corrY: number;
}

/** Head pose drift metrics comparing training vs validation */
export interface HeadPoseDrift {
  meanYawTraining: number;
  meanYawValidation: number;
  deltaYaw: number;
  meanPitchTraining: number;
  meanPitchValidation: number;
  deltaPitch: number;
}

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
