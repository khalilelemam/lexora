import type { GazeFeature, PredictionResult, TobiiTaskType } from '../types';
import type { AttemptVisualization } from '@/features/attempts/types';

/**
 * Tobii task definitions for building result visualizations.
 *
 * Maps each Tobii task to its feature key (on the ML response) and display label.
 * The order here determines the tab order in the visualization overlay.
 */
const TOBII_TASKS: ReadonlyArray<{
  taskType: TobiiTaskType;
  label: string;
}> = [
  { taskType: 'syllables', label: 'Syllables' },
  { taskType: 'pseudo-words', label: 'Pseudo Words' },
  { taskType: 'meaningful-text', label: 'Meaningful Text' },
];

/**
 * Derive regression and return-sweep flags from raw eye-tracker features.
 *
 * The ML service returns fixation coordinates without these boolean flags
 * (unlike webcam), so we compute them from X/Y coordinate movement.
 */
function deriveGazeFlags(features: GazeFeature[]): GazeFeature[] {
  return features.map((f, i) => ({
    ...f,
    isRegression: i > 0 ? f.fixationX < features[i - 1].fixationX : false,
    isReturnSweep:
      i > 0
        ? f.fixationY > features[i - 1].fixationY + 0.03 && f.fixationX < features[i - 1].fixationX
        : false,
  }));
}

/**
 * Build visualization entries for Tobii results from the flat `PredictionResult`
 * and task content available in the test screen.
 *
 * Because the current `PredictionResult.features` only contains meaningful-text
 * features, this function uses those for the "Meaningful Text" tab. For syllables
 * and pseudo-words, we can only build a visualization if their content is available
 * (the features are not present in the current response).
 *
 * When the ML service begins returning per-task features via a richer response,
 * this function can be extended to populate all three tabs with real data.
 */
export function buildTobiiResultVisualizations(
  result: PredictionResult,
  taskContent: Partial<Record<string, string>>,
): AttemptVisualization[] {
  const visualizations: AttemptVisualization[] = [];

  for (const { taskType, label } of TOBII_TASKS) {
    const content = taskContent[taskType];

    if (!content) {
      continue;
    }

    // Currently, result.features only contains meaningful-text fixations.
    // For meaningful-text, use the flat features; for other tasks, we can
    // only show the content layout without fixation data until the API
    // is extended to return per-task features in PredictionResult.
    if (taskType === 'meaningful-text' && result.features?.length) {
      visualizations.push({
        taskType,
        label,
        content,
        features: deriveGazeFlags(result.features),
      });
    }
  }

  return visualizations;
}
