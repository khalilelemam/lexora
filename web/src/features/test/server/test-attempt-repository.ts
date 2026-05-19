import 'server-only';

import {
  AttemptOutcome as PrismaAttemptOutcome,
  CalibrationMode as PrismaCalibrationMode,
  TestMode as PrismaTestMode,
} from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

import type { CalibrationMode, RiskLevel, TestMode } from '../types';

export interface UpsertTestAttemptRecordParams {
  attemptId: string;
  userId: string;
  testType: TestMode;
  outcome: RiskLevel;
  modelVersion: string;
  calibrationMode: CalibrationMode;
  age: number;
  label: string;
  rawDataConsented: boolean;
  rawBlobUrl: string | null | undefined;
  derivedBlobUrl: string;
}

export async function upsertTestAttemptRecord(
  params: UpsertTestAttemptRecordParams,
): Promise<void> {
  await prisma.testAttempt.upsert({
    where: { attemptId: params.attemptId },
    create: {
      attemptId: params.attemptId,
      userId: params.userId,
      testType: mapTestMode(params.testType),
      outcome: mapOutcome(params.outcome),
      modelVersion: params.modelVersion,
      calibrationMode: mapCalibrationMode(params.calibrationMode),
      age: params.age,
      label: params.label,
      rawDataConsented: params.rawDataConsented,
      rawBlobUrl: params.rawBlobUrl ?? null,
      derivedBlobUrl: params.derivedBlobUrl,
    },
    update: {
      testType: mapTestMode(params.testType),
      outcome: mapOutcome(params.outcome),
      modelVersion: params.modelVersion,
      calibrationMode: mapCalibrationMode(params.calibrationMode),
      age: params.age,
      label: params.label,
      rawDataConsented: params.rawDataConsented,
      rawBlobUrl: params.rawBlobUrl,
      derivedBlobUrl: params.derivedBlobUrl,
    },
  });
}

function mapTestMode(testType: TestMode): PrismaTestMode {
  return testType === 'tobii' ? PrismaTestMode.TOBII : PrismaTestMode.WEBCAM;
}

function mapOutcome(outcome: RiskLevel): PrismaAttemptOutcome {
  switch (outcome) {
    case 'low':
      return PrismaAttemptOutcome.LOW;
    case 'medium':
      return PrismaAttemptOutcome.MEDIUM;
    case 'high':
      return PrismaAttemptOutcome.HIGH;
  }

  const exhaustiveCheck: never = outcome;
  throw new Error(`Unsupported attempt outcome: ${exhaustiveCheck}`);
}

function mapCalibrationMode(calibrationMode: CalibrationMode): PrismaCalibrationMode {
  switch (calibrationMode) {
    case 'grid':
      return PrismaCalibrationMode.GRID;
    case 'star':
      return PrismaCalibrationMode.STAR;
    case 'stickman':
      return PrismaCalibrationMode.STICKMAN;
  }

  const exhaustiveCheck: never = calibrationMode;
  throw new Error(`Unsupported calibration mode: ${exhaustiveCheck}`);
}
