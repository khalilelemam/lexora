import 'server-only';

import { prisma } from '@/lib/prisma';
import type { CalibrationMode, RiskLevel, TestMode } from '../types';

export interface UpsertTestAttemptRecordParams {
  attemptId: string;
  userId?: string;
  waitlistEntryId?: string;
  testType: TestMode;
  outcome?: RiskLevel;
  modelVersion?: string;
  calibrationMode: CalibrationMode;
  age: number;
  label?: string;
  readingLanguage?: string;
  calibrationQuality?: string;
  averageError?: number;
  jsonFilePath?: string;
  totalGazePoints?: number;
  syllablesPointCount?: number;
  pseudoWordsPointCount?: number;
  meaningfulTextPointCount?: number;
  screenResolution?: string;
  userAgent?: string;
}

export async function upsertTestAttemptRecord(
  params: UpsertTestAttemptRecordParams,
): Promise<void> {
  await prisma.testAttempt.upsert({
    where: { id: params.attemptId },
    create: {
      id: params.attemptId,
      waitlistEntryId: params.waitlistEntryId || null,
      testType: params.testType.toUpperCase(),
      participantAge: params.age,
      label: params.label || 'Research Participant',
      readingLanguage: params.readingLanguage || 'ar',
      calibrationMode: 'GRID',
      calibrationQuality: params.calibrationQuality || 'good',
      averageError: params.averageError || null,
      jsonFilePath: params.jsonFilePath || `data/tests/${params.attemptId}.json`,
      totalGazePoints: params.totalGazePoints || 0,
      syllablesPointCount: params.syllablesPointCount || 0,
      pseudoWordsPointCount: params.pseudoWordsPointCount || 0,
      meaningfulTextPointCount: params.meaningfulTextPointCount || 0,
      screenResolution: params.screenResolution || null,
      userAgent: params.userAgent || null,
    },
    update: {
      participantAge: params.age,
      label: params.label,
      calibrationQuality: params.calibrationQuality,
      averageError: params.averageError,
      jsonFilePath: params.jsonFilePath,
      totalGazePoints: params.totalGazePoints,
    },
  });
}

export async function markExportArtifactReady(
  attemptIdOrParams: string | { attemptId: string; manifestPath: string },
  manifestPath?: string,
): Promise<void> {
  void attemptIdOrParams;
  void manifestPath;
}

export async function markExportArtifactFailed(
  attemptIdOrParams: string | { attemptId: string; error: string },
  error?: unknown,
): Promise<void> {
  void attemptIdOrParams;
  void error;
}

export const markAttemptExportArtifactReady = markExportArtifactReady;
export const markAttemptExportArtifactFailed = markExportArtifactFailed;
