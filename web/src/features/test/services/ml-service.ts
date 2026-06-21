import ky, { HTTPError } from 'ky';
import type { PredictionResult, RiskLevel } from '@/features/test/types';

// ─── Configuration ───────────────────────────────────────

/** ML prediction request timeout (ms) */
const ML_PREDICTION_TIMEOUT = 15_000;

/** Retry config for transient failures */
const ML_RETRY_CONFIG = {
  limit: 3,
  methods: ['post'] as string[],
  statusCodes: [408, 429, 500, 502, 503, 504],
  backoffLimit: 5_000,
};

// ─── ML Service Client ──────────────────────────────────

function createMLClient() {
  const baseUrl = process.env.ML_SERVICE_URL;
  if (!baseUrl) {
    throw new MLServiceError('CONFIG_ERROR', 'ML_SERVICE_URL environment variable is not set');
  }

  return ky.create({
    prefix: baseUrl,
    timeout: ML_PREDICTION_TIMEOUT,
    retry: ML_RETRY_CONFIG,
    hooks: {
      beforeRetry: [
        async ({ error }) => {
          // Don't retry on validation errors — they won't succeed
          if (error instanceof HTTPError) {
            const status = error.response.status;
            if (status === 400 || status === 422) {
              throw error;
            }
          }
        },
      ],
    },
  });
}

// ─── Error Handling ──────────────────────────────────────

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

async function handleMLError(error: unknown): Promise<never> {
  if (error instanceof MLServiceError) throw error;

  if (error instanceof HTTPError) {
    const errorBody = (await error.response.json().catch(() => null)) as MLErrorResponse | null;
    throw new MLServiceError(
      errorBody?.code ?? `HTTP_${error.response.status}`,
      errorBody?.message ?? `ML service returned ${error.response.status}`,
      errorBody?.details,
    );
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new MLServiceError('TIMEOUT', 'ML service request timed out');
  }

  throw new MLServiceError(
    'NETWORK_ERROR',
    error instanceof Error ? error.message : 'Failed to connect to ML service',
  );
}

// ─── Eye Tracker Types ───────────────────────────────────

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

interface EyeTrackerFeatureRow {
  timestamp: number;
  durationMs: number;
  fixationX: number;
  fixationY: number;
  saccadeAmplitude: number;
  saccadeVelocity: number;
}

interface EyeTrackerPredictResponse {
  dyslexiaProbability: number;
  riskLevel: RiskLevel;
  confidence: number;
  metadata: { sequencesAnalyzed: number; totalFixations: number };
  modelVersion: string;
  features: {
    syllables: EyeTrackerFeatureRow[];
    meaningful: EyeTrackerFeatureRow[];
    pseudo: EyeTrackerFeatureRow[];
  };
}

// ─── Webcam Types ────────────────────────────────────────

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
  modelVersion: string;
  features: Array<{
    timestamp: number;
    durationMs: number;
    fixationX: number;
    fixationY: number;
    saccadeAmplitude: number;
    isRegression: boolean;
    isReturnSweep?: boolean;
  }>;
}

export interface DetailedPrediction<TResponse> {
  result: PredictionResult;
  rawResponse: TResponse;
  modelVersion: string;
}

// ─── Public API ──────────────────────────────────────────

export async function predictEyeTracker(input: EyeTrackerPredictInput): Promise<PredictionResult> {
  const detailed = await predictEyeTrackerDetailed(input);
  return detailed.result;
}

export async function predictEyeTrackerDetailed(
  input: EyeTrackerPredictInput,
): Promise<DetailedPrediction<EyeTrackerPredictResponse>> {
  try {
    const client = createMLClient();
    const response = await client
      .post('v1/eye-tracker/predict', { json: input })
      .json<EyeTrackerPredictResponse>();

    // Use meaningful-text features for the gaze replay (primary reading task).
    // Eye tracker features use saccadeVelocity instead of isRegression/isReturnSweep,
    // so we derive regressions from X-coordinate movement direction.
    const rawFeatures = response.features?.meaningful ?? [];
    const features = rawFeatures.map((f, i) => ({
      timestamp: f.timestamp,
      durationMs: f.durationMs,
      fixationX: f.fixationX,
      fixationY: f.fixationY,
      saccadeAmplitude: f.saccadeAmplitude,
      // Regression = rightward-to-leftward movement in LTR text
      isRegression: i > 0 ? f.fixationX < rawFeatures[i - 1].fixationX : false,
      isReturnSweep:
        i > 0
          ? f.fixationY > rawFeatures[i - 1].fixationY + 0.03 &&
            f.fixationX < rawFeatures[i - 1].fixationX
          : false,
    }));

    return {
      result: {
        dyslexiaProbability: response.dyslexiaProbability,
        riskLevel: response.riskLevel,
        confidence: response.confidence,
        metadata: response.metadata,
        features,
      },
      rawResponse: response,
      modelVersion: response.modelVersion,
    };
  } catch (error) {
    return handleMLError(error);
  }
}

export async function predictWebcam(input: WebcamPredictInput): Promise<PredictionResult> {
  const detailed = await predictWebcamDetailed(input);
  return detailed.result;
}

export async function predictWebcamDetailed(
  input: WebcamPredictInput,
): Promise<DetailedPrediction<WebcamPredictResponse>> {
  try {
    const client = createMLClient();
    const response = await client
      .post('v1/webcam/predict', { json: input })
      .json<WebcamPredictResponse>();

    return {
      result: {
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
          isReturnSweep: f.isReturnSweep,
        })),
      },
      rawResponse: response,
      modelVersion: response.modelVersion,
    };
  } catch (error) {
    return handleMLError(error);
  }
}
