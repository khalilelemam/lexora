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
  code?: string;
  message?: string;
  detail?: string | Array<{ field: string; message: string }>;
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
    // FastAPI usually returns { detail: string | array }
    const errorBody = (await error.response.json().catch(() => null)) as MLErrorResponse | null;
    const statusCode = error.response.status;

    let code = errorBody?.code ?? `HTTP_${statusCode}`;
    let friendlyMessage = 'We ran into a small issue analyzing your results. Please try again.';

    if (statusCode === 422) {
      code = 'VALIDATION_ERROR';
      friendlyMessage =
        "Hmm, the eye tracking data we received wasn't quite right. Make sure your face is clearly visible and try the test again.";
    } else if (statusCode === 404) {
      code = 'NOT_FOUND';
      friendlyMessage =
        "We couldn't reach the analysis engine. It might be taking a quick nap. Give it another try!";
    } else if (statusCode >= 500) {
      code = 'SERVER_ERROR';
      friendlyMessage =
        'Our analysis servers are currently taking a breather. Please try again in a few moments!';
    } else if (statusCode === 429) {
      code = 'RATE_LIMITED';
      friendlyMessage =
        "Whoa, slow down! We're processing a lot of tests right now. Please wait a minute before trying again.";
    } else if (errorBody?.detail && typeof errorBody.detail === 'string') {
      friendlyMessage = errorBody.detail;
    } else if (errorBody?.message) {
      friendlyMessage = errorBody.message;
    }

    throw new MLServiceError(
      code,
      friendlyMessage,
      Array.isArray(errorBody?.detail) ? errorBody.detail : errorBody?.details,
    );
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new MLServiceError(
      'TIMEOUT',
      'The analysis took a bit too long and timed out. This usually happens if the connection is slow. Please try again!',
    );
  }

  throw new MLServiceError(
    'NETWORK_ERROR',
    "We couldn't connect to our analysis servers. Please check your internet connection and try again.",
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
    efficiencyRatio: number;
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
          efficiencyRatio: f.efficiencyRatio,
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
