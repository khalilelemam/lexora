import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import type { AttemptContentSnapshot, CalibrationMode, RiskLevel, TestMode } from '../types';

export interface PersistTestAttemptParams {
  attemptId: string;
  userId?: string;
  waitlistEntryId?: string;
  testType: TestMode;
  outcome?: RiskLevel;
  modelVersion?: string;
  calibrationMode: CalibrationMode;
  age: number;
  label?: string;
  contentSnapshot?: AttemptContentSnapshot;
  rawDataConsented?: boolean;
  rawPayload?: unknown;
  derivedPayload?: unknown;
  screenshots?: Record<string, string>;
}

export async function persistTestAttempt(params: PersistTestAttemptParams): Promise<void> {
  const dataDir = path.resolve(process.cwd(), 'data', 'tests');
  await fs.mkdir(dataDir, { recursive: true });

  const filePath = path.join(dataDir, `${params.attemptId}.json`);
  const payload = {
    attemptId: params.attemptId,
    createdAt: new Date().toISOString(),
    age: params.age,
    label: params.label,
    calibrationMode: params.calibrationMode,
    rawPayload: params.rawPayload,
    derivedPayload: params.derivedPayload,
    screenshots: params.screenshots,
  };

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

  await prisma.testAttempt.upsert({
    where: { id: params.attemptId },
    create: {
      id: params.attemptId,
      waitlistEntryId: params.waitlistEntryId || null,
      testType: params.testType.toUpperCase(),
      participantAge: params.age,
      label: params.label || 'Research Participant',
      readingLanguage: 'ar',
      calibrationMode: 'GRID',
      calibrationQuality: 'good',
      jsonFilePath: `data/tests/${params.attemptId}.json`,
    },
    update: {
      participantAge: params.age,
      label: params.label,
    },
  });
}
