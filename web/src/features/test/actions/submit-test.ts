'use server';

import { predictEyeTracker, predictWebcam, MLServiceError } from '../services/ml-service';
import type { TobiiGazePoint, WebcamGazePoint, PredictionResult } from '../types';

// ─── Result Types ────────────────────────────────────────

type ActionResult =
  | { success: true; data: PredictionResult }
  | { success: false; error: string; code: string };

// ─── Tobii Submit ────────────────────────────────────────

export async function submitTobiiTest(
  syllables: TobiiGazePoint[],
  pseudoWords: TobiiGazePoint[],
  meaningfulText: TobiiGazePoint[],
  screenWidth: number,
  screenHeight: number,
  lineCenters?: Record<string, number[]>,
): Promise<ActionResult> {
  try {
    const result = await predictEyeTracker({
      syllablesTask: {
        gazePoints: syllables,
        normalizedLineCenters: lineCenters?.['syllables'] ?? [],
      },
      meaningfulTask: {
        gazePoints: meaningfulText,
        normalizedLineCenters: lineCenters?.['meaningful-text'] ?? [],
      },
      pseudoTask: {
        gazePoints: pseudoWords,
        normalizedLineCenters: lineCenters?.['pseudo-words'] ?? [],
      },
      screenWidth,
      screenHeight,
    });
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
  lineCenters?: number[],
): Promise<ActionResult> {
  try {
    const result = await predictWebcam({
      gazeData,
      screenWidth,
      screenHeight,
      normalizedLineCenters: lineCenters ?? [],
    });
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
