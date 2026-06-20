import 'server-only';

import {
  AttemptOutcome,
  CalibrationMode as PrismaCalibrationMode,
  Prisma,
  TestMode as PrismaTestMode,
} from '@/generated/prisma/client';
import type { AttemptFilters } from '@/features/attempts/types';
import type { CalibrationMode, RiskLevel, TestMode } from '@/features/test/types';

// ── Cursor ──────────────────────────────────────────────────

export interface AttemptCursor {
  createdAt: Date;
  attemptId: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function decodeCursor(cursor?: string): AttemptCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      attemptId?: unknown;
    };
    const createdAt = typeof decoded.createdAt === 'string' ? new Date(decoded.createdAt) : null;

    if (
      !createdAt ||
      Number.isNaN(createdAt.getTime()) ||
      typeof decoded.attemptId !== 'string' ||
      !UUID_RE.test(decoded.attemptId)
    ) {
      return null;
    }

    return { createdAt, attemptId: decoded.attemptId };
  } catch {
    return null;
  }
}

// ── WHERE clause builder ────────────────────────────────────

export interface BuildWhereOptions {
  filters: AttemptFilters;
  userId?: string;
  includeDeleted: boolean;
}

export function buildWhereSql({ filters, userId, includeDeleted }: BuildWhereOptions) {
  const conditions: Prisma.Sql[] = [];
  const cursor = decodeCursor(filters.cursor);

  if (!includeDeleted) {
    conditions.push(Prisma.sql`a.deleted_at IS NULL`);
  }

  if (userId) {
    conditions.push(Prisma.sql`a.user_id = ${userId}`);
  }

  if (filters.testType) {
    conditions.push(Prisma.sql`a.test_type::text = ${toPrismaTestMode(filters.testType)}`);
  }

  if (filters.outcomes?.length) {
    const outcomes = filters.outcomes.map(toPrismaOutcome);
    conditions.push(Prisma.sql`a.outcome::text IN (${Prisma.join(outcomes)})`);
  }

  if (filters.createdFrom) {
    conditions.push(Prisma.sql`a.created_at >= ${startOfUtcDay(filters.createdFrom)}`);
  }

  if (filters.createdTo) {
    conditions.push(Prisma.sql`a.created_at < ${endExclusiveUtcDay(filters.createdTo)}`);
  }

  if (filters.minCalibrationAccuracy !== undefined) {
    conditions.push(Prisma.sql`a.calibration_accuracy >= ${filters.minCalibrationAccuracy}`);
  }

  if (filters.query) {
    const likeQuery = `%${escapeLikePattern(filters.query)}%`;
    conditions.push(Prisma.sql`
      (
        to_tsvector(
          'simple',
          concat_ws(
            ' ',
            a.label,
            a.test_type::text,
            CASE a.test_type::text
              WHEN 'TOBII' THEN 'tobii eye tracker'
              WHEN 'WEBCAM' THEN 'webcam camera'
            END,
            a.outcome::text,
            CASE a.outcome::text
              WHEN 'LOW' THEN 'low risk'
              WHEN 'MEDIUM' THEN 'possible indicators medium risk'
              WHEN 'HIGH' THEN 'high risk'
            END,
            coalesce(u.name, ''),
            coalesce(u.email, ''),
            a.attempt_id::text
          )
        ) @@ websearch_to_tsquery('simple', ${filters.query})
        OR a.label ILIKE ${likeQuery}
        OR coalesce(u.name, '') ILIKE ${likeQuery}
        OR coalesce(u.email, '') ILIKE ${likeQuery}
        OR a.attempt_id::text ILIKE ${likeQuery}
        OR a.test_type::text ILIKE ${likeQuery}
        OR a.outcome::text ILIKE ${likeQuery}
      )
    `);
  }

  if (cursor) {
    conditions.push(Prisma.sql`
      (a.created_at, a.attempt_id) < (${cursor.createdAt}, CAST(${cursor.attemptId} AS uuid))
    `);
  }

  return conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

// ── Type converters ─────────────────────────────────────────

export function toPrismaTestMode(testType: TestMode): PrismaTestMode {
  return testType === 'tobii' ? PrismaTestMode.TOBII : PrismaTestMode.WEBCAM;
}

export function fromPrismaTestMode(testType: PrismaTestMode): TestMode {
  return testType === PrismaTestMode.TOBII ? 'tobii' : 'webcam';
}

export function toPrismaOutcome(outcome: RiskLevel): AttemptOutcome {
  switch (outcome) {
    case 'low':
      return AttemptOutcome.LOW;
    case 'medium':
      return AttemptOutcome.MEDIUM;
    case 'high':
      return AttemptOutcome.HIGH;
  }
}

export function fromPrismaOutcome(outcome: AttemptOutcome): RiskLevel {
  switch (outcome) {
    case AttemptOutcome.LOW:
      return 'low';
    case AttemptOutcome.MEDIUM:
      return 'medium';
    case AttemptOutcome.HIGH:
      return 'high';
  }
}

export function fromPrismaCalibrationMode(calibrationMode: PrismaCalibrationMode): CalibrationMode {
  switch (calibrationMode) {
    case PrismaCalibrationMode.GRID:
      return 'grid';
    case PrismaCalibrationMode.STAR:
      return 'star';
    case PrismaCalibrationMode.STICKMAN:
      return 'stickman';
  }
}

// ── Date helpers ────────────────────────────────────────────

export function startOfUtcDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function endExclusiveUtcDay(value: string) {
  const date = startOfUtcDay(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

// ── String helpers ──────────────────────────────────────────

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
