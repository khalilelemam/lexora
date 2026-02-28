import type { PredictionResult, RiskLevel, GazeFeature } from '@/features/test/types';

/** ML prediction request timeout (ms) */
const ML_PREDICTION_TIMEOUT = 15_000;

// ─── ML Service Types ────────────────────────────────────

interface MLErrorResponse {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export class MLServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'MLServiceError';
  }
}

// ─── Eye Tracker Prediction ──────────────────────────────

interface EyeTrackerGazePoint {
  fixationX: number;
  fixationY: number;
  timestamp: number;
}

interface EyeTrackerPredictInput {
  syllablesTask: { gazePoints: EyeTrackerGazePoint[] };
  meaningfulTask: { gazePoints: EyeTrackerGazePoint[] };
  pseudoTask: { gazePoints: EyeTrackerGazePoint[] };
  screenWidth?: number;
  screenHeight?: number;
}

interface EyeTrackerPredictResponse {
  dyslexiaProbability: number;
  riskLevel: RiskLevel;
  confidence: number;
  metadata: { sequencesAnalyzed: number; totalFixations: number };
  features: {
    syllables: unknown[];
    meaningful: unknown[];
    pseudo: unknown[];
  };
}

// ─── Webcam Prediction ───────────────────────────────────

interface WebcamGazePoint {
  x: number;
  y: number;
  timestamp: number;
}

interface WebcamPredictInput {
  gazeData: WebcamGazePoint[];
  screenWidth: number;
  screenHeight: number;
}

interface WebcamPredictResponse {
  dyslexiaProbability: number;
  riskLevel: RiskLevel;
  confidence: number;
  metadata: { sequencesAnalyzed: number; totalFixations: number };
  features: Array<{
    timestamp: number;
    durationMs: number;
    fixationX: number;
    fixationY: number;
    saccadeAmplitude: number;
    isRegression: boolean;
  }>;
}

// ─── Internal Fetch Helper ───────────────────────────────

async function mlFetch<T>(endpoint: string, body: unknown): Promise<T> {
  const baseUrl = process.env.ML_SERVICE_URL;
  if (!baseUrl) {
    throw new MLServiceError('CONFIG_ERROR', 'ML_SERVICE_URL environment variable is not set');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ML_PREDICTION_TIMEOUT);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as MLErrorResponse | null;
      throw new MLServiceError(
        errorBody?.code ?? `HTTP_${response.status}`,
        errorBody?.message ?? `ML service returned ${response.status}`,
        errorBody?.details,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof MLServiceError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new MLServiceError('TIMEOUT', 'ML service request timed out');
    }
    throw new MLServiceError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Failed to connect to ML service',
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Public API ──────────────────────────────────────────

export async function predictEyeTracker(input: EyeTrackerPredictInput): Promise<PredictionResult> {
  const response = await mlFetch<EyeTrackerPredictResponse>('/v1/eye-tracker/predict', input);
  return {
    dyslexiaProbability: response.dyslexiaProbability,
    riskLevel: response.riskLevel,
    confidence: response.confidence,
    metadata: response.metadata,
  };
}

export async function predictWebcam(input: WebcamPredictInput): Promise<PredictionResult> {
  const response = await mlFetch<WebcamPredictResponse>('/v1/webcam/predict', input);
  return {
    dyslexiaProbability: response.dyslexiaProbability,
    riskLevel: response.riskLevel,
    confidence: response.confidence,
    metadata: response.metadata,
    features: response.features.map((f) => ({
      timestamp: f.timestamp,
      durationMs: f.durationMs,
      fixationX: f.fixationX,
      fixationY: f.fixationY,
      saccadeAmplitude: f.saccadeAmplitude,
      isRegression: f.isRegression,
    })),
  };
}
