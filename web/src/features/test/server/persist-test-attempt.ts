import 'server-only';

import type { AttemptTaskType, CalibrationMode, RiskLevel, TestMode } from '../types';
import {
  createAttemptBlobContainerClient,
  ensureAttemptBlobContainer,
  uploadAttemptJson,
} from './attempt-blob-storage';
import { upsertTestAttemptRecord } from './test-attempt-repository';

const ATTEMPT_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PersistTestAttemptParams {
  attemptId: string;
  userId: string;
  testType: TestMode;
  taskType: AttemptTaskType;
  outcome: RiskLevel;
  modelVersion: string;
  calibrationMode: CalibrationMode;
  age: number;
  label?: string;
  // Snapshot of the user's consent at submission time.
  rawDataConsented: boolean;
  rawPayload?: unknown;
  derivedPayload: unknown;
}

export async function persistTestAttempt(params: PersistTestAttemptParams): Promise<void> {
  validateAttemptPayload(params);
  const submittedAt = new Date();

  const containerClient = createAttemptBlobContainerClient();
  await ensureAttemptBlobContainer(containerClient);

  const derivedBlobUrl = await uploadAttemptJson(
    containerClient,
    `derived/${params.attemptId}.json`,
    params.derivedPayload,
  );

  let rawBlobUrl: string | null | undefined = null;
  if (params.rawDataConsented && typeof params.rawPayload !== 'undefined') {
    try {
      rawBlobUrl = await uploadAttemptJson(
        containerClient,
        `raw/${params.attemptId}.json`,
        params.rawPayload,
      );
    } catch (error) {
      rawBlobUrl = undefined;
      console.error('[persistTestAttempt] raw blob upload failed', {
        attemptId: params.attemptId,
        userId: params.userId,
        error,
      });
    }
  }

  await upsertTestAttemptRecord({
    attemptId: params.attemptId,
    userId: params.userId,
    testType: params.testType,
    taskType: params.taskType,
    outcome: params.outcome,
    modelVersion: params.modelVersion,
    calibrationMode: params.calibrationMode,
    age: params.age,
    label: resolveAttemptLabel(params.label, params.taskType, params.testType, submittedAt),
    rawDataConsented: params.rawDataConsented,
    rawBlobUrl: !params.rawDataConsented ? null : rawBlobUrl,
    derivedBlobUrl,
  });
}

function validateAttemptPayload(params: PersistTestAttemptParams) {
  if (!ATTEMPT_ID_REGEX.test(params.attemptId)) {
    throw new Error('Invalid attemptId. Expected a UUID generated on the client.');
  }

  if (!Number.isInteger(params.age) || params.age < 1) {
    throw new Error('Invalid participant age supplied for attempt persistence.');
  }

  if (!params.modelVersion.trim()) {
    throw new Error('Attempt persistence requires a non-empty modelVersion.');
  }
}

function resolveAttemptLabel(
  label: string | undefined,
  taskType: AttemptTaskType,
  testType: TestMode,
  submittedAt: Date,
) {
  const normalizedLabel = normalizeOptionalText(label);
  if (normalizedLabel) {
    return normalizedLabel;
  }

  const generatedLabel =
    taskType === 'full-battery'
      ? 'Tobii Full Battery'
      : testType === 'tobii'
        ? `Tobii ${humanizeTaskType(taskType)}`
        : `Webcam ${humanizeTaskType(taskType)}`;

  return `${generatedLabel} - ${formatAttemptTimestamp(submittedAt)}`;
}

function formatAttemptTimestamp(date: Date) {
  return date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function humanizeTaskType(taskType: AttemptTaskType) {
  switch (taskType) {
    case 'full-battery':
      return 'Full Battery';
    case 'paragraph':
      return 'Paragraph';
    case 'syllables':
      return 'Syllables';
    case 'pseudo-words':
      return 'Pseudo Words';
    case 'meaningful-text':
      return 'Meaningful Text';
  }

  const exhaustiveCheck: never = taskType;
  throw new Error(`Unsupported attempt task type: ${exhaustiveCheck}`);
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
