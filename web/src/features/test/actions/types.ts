import type { PredictionResult } from '../types';

export type SubmissionActionResult =
  | { success: true; data: PredictionResult }
  | { success: false; error: string; code: string };
