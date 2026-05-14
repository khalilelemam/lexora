import 'server-only';

import type { SubmissionActionResult } from '../actions/types';
import {
  MLServiceError,
  predictEyeTrackerDetailed,
  predictWebcamDetailed,
} from '../services/ml-service';
import type { TobiiSubmissionInput, WebcamSubmissionInput } from '../types';
import { persistTestAttempt } from './persist-test-attempt';
import { SubmissionAuthError, getAuthenticatedSubmissionUser } from './test-submission-auth';

export async function submitTobiiTestAttempt(
  input: TobiiSubmissionInput,
): Promise<SubmissionActionResult> {
  try {
    const user = await getAuthenticatedSubmissionUser();
    const mlInput = {
      syllablesTask: {
        gazePoints: input.syllables,
        normalizedLineCenters: input.lineCenters?.syllables ?? [],
      },
      meaningfulTask: {
        gazePoints: input.meaningfulText,
        normalizedLineCenters: input.lineCenters?.['meaningful-text'] ?? [],
      },
      pseudoTask: {
        gazePoints: input.pseudoWords,
        normalizedLineCenters: input.lineCenters?.['pseudo-words'] ?? [],
      },
      screenWidth: input.screenWidth,
      screenHeight: input.screenHeight,
    };

    const prediction = await predictEyeTrackerDetailed(mlInput);

    try {
      await persistTestAttempt({
        attemptId: input.attempt.attemptId,
        userId: user.id,
        testType: 'tobii',
        taskType: input.attempt.taskType,
        outcome: prediction.result.riskLevel,
        modelVersion: prediction.modelVersion,
        calibrationMode: input.attempt.calibrationMode,
        age: input.attempt.age,
        label: input.attempt.label,
        rawDataConsented: user.rawDataConsent,
        rawPayload: mlInput,
        derivedPayload: prediction.rawResponse,
      });
    } catch (persistenceError) {
      logPersistenceFailure(
        'submitTobiiTestAttempt',
        input.attempt.attemptId,
        user.id,
        persistenceError,
      );
    }

    return { success: true, data: prediction.result };
  } catch (error) {
    return toSubmissionActionError(error);
  }
}

export async function submitWebcamTestAttempt(
  input: WebcamSubmissionInput,
): Promise<SubmissionActionResult> {
  try {
    const user = await getAuthenticatedSubmissionUser();
    const mlInput = {
      gazeData: input.gazeData,
      screenWidth: input.screenWidth,
      screenHeight: input.screenHeight,
      normalizedLineCenters: input.lineCenters ?? [],
    };

    const prediction = await predictWebcamDetailed(mlInput);

    try {
      await persistTestAttempt({
        attemptId: input.attempt.attemptId,
        userId: user.id,
        testType: 'webcam',
        taskType: input.attempt.taskType,
        outcome: prediction.result.riskLevel,
        modelVersion: prediction.modelVersion,
        calibrationMode: input.attempt.calibrationMode,
        age: input.attempt.age,
        label: input.attempt.label,
        rawDataConsented: user.rawDataConsent,
        rawPayload: mlInput,
        derivedPayload: prediction.rawResponse,
      });
    } catch (persistenceError) {
      logPersistenceFailure(
        'submitWebcamTestAttempt',
        input.attempt.attemptId,
        user.id,
        persistenceError,
      );
    }

    return { success: true, data: prediction.result };
  } catch (error) {
    return toSubmissionActionError(error);
  }
}

function logPersistenceFailure(
  operation: string,
  attemptId: string,
  userId: string,
  persistenceError: unknown,
) {
  console.error(`[${operation}] persistence failed after prediction`, {
    attemptId,
    userId,
    persistenceError,
  });
}

function toSubmissionActionError(error: unknown): SubmissionActionResult {
  if (error instanceof SubmissionAuthError) {
    return { success: false, error: error.message, code: 'UNAUTHORIZED' };
  }

  if (error instanceof MLServiceError) {
    return { success: false, error: error.message, code: error.code };
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'UNKNOWN',
  };
}
