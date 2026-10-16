import type { DataCollectionResult } from '@/features/test/types';

export class MLServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MLServiceError';
  }
}

export interface DetailedPredictionResponse {
  result: DataCollectionResult;
  modelVersion: string;
  rawResponse: Record<string, unknown>;
}

export async function predictEyeTrackerDetailed(
  input: any,
): Promise<DetailedPredictionResponse> {
  void input;
  return {
    result: {
      success: true,
      attemptId: 'local-attempt',
      participantAge: 10,
      totalGazePoints: 0,
      taskCounts: { syllables: 0, pseudoWords: 0, meaningfulText: 0 },
      calibrationQuality: 'good',
      savedAt: new Date().toISOString(),
    },
    modelVersion: 'waitlist-data-collector-v1',
    rawResponse: {},
  };
}

export async function predictWebcamDetailed(
  input: any,
): Promise<DetailedPredictionResponse> {
  void input;
  return {
    result: {
      success: true,
      attemptId: 'local-attempt',
      participantAge: 10,
      totalGazePoints: 0,
      taskCounts: { syllables: 0, pseudoWords: 0, meaningfulText: 0 },
      calibrationQuality: 'good',
      savedAt: new Date().toISOString(),
    },
    modelVersion: 'waitlist-data-collector-v1',
    rawResponse: {},
  };
}
