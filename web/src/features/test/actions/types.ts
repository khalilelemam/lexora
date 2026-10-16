import type { DataCollectionResult } from '../types';

export type SubmissionActionResult =
  | { success: true; data: DataCollectionResult }
  | { success: false; error: string; code: string };
