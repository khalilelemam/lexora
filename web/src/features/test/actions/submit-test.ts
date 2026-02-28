'use server';

import { predictEyeTracker, predictWebcam, MLServiceError } from '../services/ml-service';
import type { TobiiGazePoint, WebcamGazePoint, PredictionResult } from '../types';
import { ML_RETRY_CONFIG } from '../lib/constants';

// ─── Result Types ────────────────────────────────────────

type ActionResult =
  | { success: true; data: PredictionResult }
  | { success: false; error: string; code: string };

// ─── Retry Helper ────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = ML_RETRY_CONFIG;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Don't retry on validation errors (400/422) — they won't succeed
      if (error instanceof MLServiceError && (error.code === 'BAD_REQUEST' || error.code === 'VALIDATION_ERROR')) {
        throw error;
      }
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ─── Tobii Submit ────────────────────────────────────────

export async function submitTobiiTest(
  syllables: TobiiGazePoint[],
  pseudoWords: TobiiGazePoint[],
  meaningfulText: TobiiGazePoint[],
  screenWidth: number,
  screenHeight: number,
): Promise<ActionResult> {
  try {
    const result = await withRetry(() =>
      predictEyeTracker({
        syllablesTask: { gazePoints: syllables },
        meaningfulTask: { gazePoints: meaningfulText },
        pseudoTask: { gazePoints: pseudoWords },
        screenWidth,
        screenHeight,
      }),
    );
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof MLServiceError) {
      return { success: false, error: error.message, code: error.code };
    }
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN',
    };
  }
}

// ─── Webcam Submit ───────────────────────────────────────

export async function submitWebcamTest(
  gazeData: WebcamGazePoint[],
  screenWidth: number,
  screenHeight: number,
): Promise<ActionResult> {
  try {
    const result = await withRetry(() =>
      predictWebcam({
        gazeData,
        screenWidth,
        screenHeight,
      }),
    );
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof MLServiceError) {
      return { success: false, error: error.message, code: error.code };
    }
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN',
    };
  }
}
