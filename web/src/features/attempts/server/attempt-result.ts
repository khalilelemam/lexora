import type {
  AttemptContentSnapshot,
  GazeFeature,
  PredictionResult,
  RiskLevel,
  TestMode,
} from '@/features/test/types';
import type { AttemptVisualization } from '@/features/attempts/types';

interface EyeTrackerFeatureRow {
  timestamp: number;
  durationMs: number;
  fixationX: number;
  fixationY: number;
  saccadeAmplitude: number;
  saccadeVelocity?: number;
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
  features?:
    | WebcamFeatureRow[]
    | {
        syllables?: EyeTrackerFeatureRow[];
        pseudo?: EyeTrackerFeatureRow[];
        meaningful?: EyeTrackerFeatureRow[];
      };
}

interface StoredAttemptArtifact {
  mlResponse?: StoredPredictionResponse;
  contentSnapshot?: AttemptContentSnapshot;
}

const TOBII_VISUALIZATION_TASKS = [
  { featureKey: 'syllables', taskType: 'syllables', label: 'Syllables' },
  { featureKey: 'pseudo', taskType: 'pseudo-words', label: 'Pseudo Words' },
  { featureKey: 'meaningful', taskType: 'meaningful-text', label: 'Meaningful Text' },
] as const;

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

export function getAttemptVisualizations(
  payload: unknown,
  testType: TestMode,
): AttemptVisualization[] {
  const response = unwrapStoredPrediction(payload);
  const snapshot = getContentSnapshot(payload);

  if (!snapshot || !response.features) {
    return [];
  }

  if (testType === 'webcam' && Array.isArray(response.features)) {
    const taskType = snapshot.primaryTask;
    const content = snapshot.tasks[taskType];

    if (!content) {
      return [];
    }

    return [
      {
        taskType,
        label: taskType === 'paragraph' ? 'Paragraph' : 'Reading Task',
        content,
        features: toWebcamGazeFeatures(response.features),
      },
    ].filter((visualization) => visualization.features.length > 0);
  }

  const taskFeatures = response.features;

  if (!taskFeatures || Array.isArray(taskFeatures)) {
    return [];
  }

  return TOBII_VISUALIZATION_TASKS.flatMap(({ featureKey, taskType, label }) => {
    const content = snapshot.tasks[taskType];
    const features = taskFeatures[featureKey];

    if (!content || !features?.length) {
      return [];
    }

    return [
      {
        taskType,
        label,
        content,
        features: toEyeTrackerGazeFeatures(features),
      },
    ];
  });
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
    return toWebcamGazeFeatures(features);
  }

  if (!Array.isArray(features) && Array.isArray(features.meaningful)) {
    return toEyeTrackerGazeFeatures(features.meaningful);
  }

  return undefined;
}

function toWebcamGazeFeatures(features: WebcamFeatureRow[]): GazeFeature[] {
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

function toEyeTrackerGazeFeatures(features: EyeTrackerFeatureRow[]): GazeFeature[] {
  return features.map((feature, index, allFeatures) => ({
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
