import type {
  AttemptContentSnapshot,
  GazeFeature,
  PredictionResult,
  RiskLevel,
  TestMode,
} from '@/features/test/types';

interface EyeTrackerFeatureRow {
  timestamp: number;
  durationMs: number;
  fixationX: number;
  fixationY: number;
  saccadeAmplitude: number;
}

interface WebcamFeatureRow extends EyeTrackerFeatureRow {
  isRegression: boolean;
  isReturnSweep?: boolean;
}

interface StoredPredictionResponse {
  dyslexiaProbability: number;
  riskLevel: RiskLevel;
  confidence: number;
  metadata: {
    sequencesAnalyzed: number;
    totalFixations: number;
  };
  features?: WebcamFeatureRow[] | { meaningful?: EyeTrackerFeatureRow[] };
}

interface StoredAttemptArtifact {
  mlResponse?: StoredPredictionResponse;
  contentSnapshot?: AttemptContentSnapshot;
}

export function toPredictionResult(payload: unknown, testType: TestMode): PredictionResult {
  const response = unwrapStoredPrediction(payload);

  return {
    dyslexiaProbability: response.dyslexiaProbability,
    riskLevel: response.riskLevel,
    confidence: response.confidence,
    metadata: response.metadata,
    features: toGazeFeatures(response.features, testType),
  };
}

export function getContentSnapshot(payload: unknown): AttemptContentSnapshot | null {
  const artifact = payload as StoredAttemptArtifact;

  return artifact?.contentSnapshot ?? null;
}

function unwrapStoredPrediction(payload: unknown): StoredPredictionResponse {
  const artifact = payload as StoredAttemptArtifact;

  return artifact?.mlResponse ?? (payload as StoredPredictionResponse);
}

function toGazeFeatures(
  features: StoredPredictionResponse['features'],
  testType: TestMode,
): GazeFeature[] | undefined {
  if (!features) {
    return undefined;
  }

  if (testType === 'webcam' && Array.isArray(features)) {
    return features.map((feature) => ({
      timestamp: feature.timestamp,
      durationMs: feature.durationMs,
      fixationX: feature.fixationX,
      fixationY: feature.fixationY,
      saccadeAmplitude: feature.saccadeAmplitude,
      isRegression: feature.isRegression,
      isReturnSweep: feature.isReturnSweep,
    }));
  }

  if (!Array.isArray(features) && Array.isArray(features.meaningful)) {
    return features.meaningful.map((feature, index, allFeatures) => ({
      timestamp: feature.timestamp,
      durationMs: feature.durationMs,
      fixationX: feature.fixationX,
      fixationY: feature.fixationY,
      saccadeAmplitude: feature.saccadeAmplitude,
      isRegression: index > 0 ? feature.fixationX < allFeatures[index - 1].fixationX : false,
      isReturnSweep:
        index > 0
          ? feature.fixationY > allFeatures[index - 1].fixationY + 0.03 &&
            feature.fixationX < allFeatures[index - 1].fixationX
          : false,
    }));
  }

  return undefined;
}
