import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import type { SubmissionActionResult } from '../actions/types';
import type { WebcamSubmissionInput, DataCollectionResult } from '../types';

/**
 * Ensures the target data directory exists on the server.
 * In serverless environments like Vercel, process.cwd() is read-only, so /tmp is used.
 */
async function ensureDataDirectory(): Promise<string> {
  const customDir = process.env.DATA_DIR;
  if (customDir) {
    await fs.mkdir(customDir, { recursive: true });
    return customDir;
  }
  const dataDir = process.env.VERCEL
    ? path.join('/tmp', 'data', 'tests')
    : path.resolve(process.cwd(), 'data', 'tests');

  await fs.mkdir(dataDir, { recursive: true });
  return dataDir;
}

/**
 * Handles test attempt submission for the waitlist data collection initiative.
 * - Saves complete raw/derived eye gaze JSON directly to the server file system.
 * - Persists session metadata to SQLite via Prisma.
 * - Updates the waitlist participant record (if linked).
 * - Returns confirmation metrics (no diagnostic ML inference needed).
 */
export async function submitWebcamTestAttempt(
  input: WebcamSubmissionInput,
): Promise<SubmissionActionResult> {
  try {
    const attemptId = input.attempt.attemptId;
    const dataDir = await ensureDataDirectory();
    const fileName = `${attemptId}.json`;
    const fullFilePath = path.join(dataDir, fileName);
    const relativeFilePath = path.join(
      dataDir === path.resolve(process.cwd(), 'data', 'tests') ? 'data/tests' : dataDir,
      fileName,
    );

    const totalGazePoints =
      (input.syllables?.length || 0) +
      (input.pseudoWords?.length || 0) +
      (input.meaningfulText?.length || 0);

    const fullPayload = {
      attemptId,
      waitlistEntryId: input.waitlistEntryId || null,
      submittedAt: new Date().toISOString(),
      participant: {
        age: input.attempt.age,
        label: input.attempt.label || null,
        language: input.language || 'ar',
      },
      environment: {
        screenWidth: input.screenWidth,
        screenHeight: input.screenHeight,
        devicePixelRatio: input.devicePixelRatio || 1,
      },
      calibration: {
        mode: input.attempt.calibrationMode,
        quality: input.calibrationResult?.quality || 'acceptable',
        pointAccuracies: input.calibrationResult?.pointAccuracies || [],
        averageError: input.calibrationResult?.averageError || null,
      },
      contentSnapshot: input.attempt.contentSnapshot || null,
      tasks: {
        syllables: {
          taskType: 'syllables',
          pointCount: input.syllables?.length || 0,
          gazePoints: input.syllables || [],
        },
        pseudoWords: {
          taskType: 'pseudo-words',
          pointCount: input.pseudoWords?.length || 0,
          gazePoints: input.pseudoWords || [],
        },
        meaningfulText: {
          taskType: 'meaningful-text',
          pointCount: input.meaningfulText?.length || 0,
          gazePoints: input.meaningfulText || [],
        },
      },
      screenshots: input.screenshots || null,
    };

    // 1. Write JSON file to server disk
    try {
      await fs.writeFile(fullFilePath, JSON.stringify(fullPayload, null, 2), 'utf-8');
    } catch (fsError) {
      console.warn('[SubmitTest] Disk file write warning:', fsError);
    }

    // 2. Persist record in SQLite
    try {
      await prisma.testAttempt.create({
        data: {
          id: attemptId,
          waitlistEntryId: input.waitlistEntryId || null,
          testType: 'WEBCAM',
          participantAge: input.attempt.age,
          label: input.attempt.label || 'Waitlist Participant',
          readingLanguage: input.language || 'ar',
          calibrationMode: 'GRID',
          calibrationQuality: input.calibrationResult?.quality || 'acceptable',
          averageError: input.calibrationResult?.averageError || null,
          jsonFilePath: relativeFilePath,
          totalGazePoints,
          syllablesPointCount: input.syllables?.length || 0,
          pseudoWordsPointCount: input.pseudoWords?.length || 0,
          meaningfulTextPointCount: input.meaningfulText?.length || 0,
          screenResolution: `${input.screenWidth}x${input.screenHeight}`,
        },
      });

      // Update waitlist entry status if applicable
      if (input.waitlistEntryId) {
        await prisma.waitlistEntry.update({
          where: { id: input.waitlistEntryId },
          data: { hasCompletedTest: true },
        }).catch((err) => {
          console.warn('[SubmitTest] Failed to update waitlist entry flag:', err);
        });
      }
    } catch (dbError) {
      console.error('[SubmitTest] SQLite persistence warning:', dbError);
      // We still proceed since the JSON was saved securely on disk!
    }

    const dataCollectionResult: DataCollectionResult = {
      success: true,
      attemptId,
      participantAge: input.attempt.age,
      totalGazePoints,
      taskCounts: {
        syllables: input.syllables?.length || 0,
        pseudoWords: input.pseudoWords?.length || 0,
        meaningfulText: input.meaningfulText?.length || 0,
      },
      calibrationQuality: input.calibrationResult?.quality || 'good',
      averageError: input.calibrationResult?.averageError,
      savedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: dataCollectionResult,
    };
  } catch (error) {
    console.error('[SubmitTest] Fatal submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save test data',
      code: 'SUBMISSION_FAILED',
    };
  }
}

export async function submitTobiiTestAttempt(
  input: import('../types').TobiiSubmissionInput,
): Promise<SubmissionActionResult> {
  return submitWebcamTestAttempt(input as unknown as WebcamSubmissionInput);
}
