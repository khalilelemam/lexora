import 'server-only';

import { Buffer } from 'node:buffer';

import {
  AttemptOutcome,
  CalibrationMode as PrismaCalibrationMode,
  Prisma,
  TestMode as PrismaTestMode,
} from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  createAttemptBlobContainerClient,
  downloadAttemptJson,
} from '@/features/test/server/attempt-blob-storage';
import type { AttemptFilters, AttemptListItem } from '@/features/attempts/types';
import type { CalibrationMode, RiskLevel, TestMode } from '@/features/test/types';

import { getAttemptVisualizations, getContentSnapshot, toPredictionResult } from './attempt-result';

const DEFAULT_LIMIT = 12;

const ATTEMPT_SELECT = {
  attemptId: true,
  testType: true,
  outcome: true,
  modelVersion: true,
  calibrationMode: true,
  age: true,
  label: true,
  derivedBlobUrl: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.TestAttemptSelect;

interface AttemptListRow {
  attempt_id: string;
  test_type: PrismaTestMode;
  outcome: AttemptOutcome;
  age: number;
  label: string;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  total_count: bigint | number;
}

interface ListAttemptsResult {
  attempts: AttemptListItem[];
  nextCursor: string | null;
  total: number;
}

interface AttemptCursor {
  createdAt: Date;
  attemptId: string;
}

export async function listUserAttempts(
  userId: string,
  filters: AttemptFilters,
): Promise<ListAttemptsResult> {
  return listAttempts({ filters, userId, includeUser: false, includeDeleted: false });
}

export async function getUserAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { attemptId, userId, deletedAt: null },
    select: ATTEMPT_SELECT,
  });

  return attempt ? toAttemptDetail(attempt, false) : null;
}

export async function softDeleteUserAttempt(userId: string, attemptId: string) {
  const result = await prisma.testAttempt.updateMany({
    where: { attemptId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return result.count > 0;
}

export async function listAdminAttempts(filters: AttemptFilters): Promise<ListAttemptsResult> {
  return listAttempts({ filters, includeUser: true, includeDeleted: true });
}

export async function getAdminAttempt(attemptId: string) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { attemptId },
    select: ATTEMPT_SELECT,
  });

  return attempt ? toAttemptDetail(attempt, true) : null;
}

async function listAttempts({
  filters,
  userId,
  includeUser,
  includeDeleted,
}: {
  filters: AttemptFilters;
  userId?: string;
  includeUser: boolean;
  includeDeleted: boolean;
}): Promise<ListAttemptsResult> {
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const whereSql = buildWhereSql({ filters, userId, includeDeleted });

  const rows = await prisma.$queryRaw<AttemptListRow[]>(Prisma.sql`
    SELECT
      a.attempt_id,
      a.test_type,
      a.outcome,
      a.age,
      a.label,
      a.deleted_at,
      a.created_at,
      a.updated_at,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      COUNT(*) OVER() AS total_count
    FROM test_attempts a
    INNER JOIN users u ON u.id = a.user_id
    ${whereSql}
    ORDER BY a.created_at DESC, a.attempt_id DESC
    LIMIT ${limit + 1}
  `);

  const hasNextPage = rows.length > limit;
  const visibleRows = hasNextPage ? rows.slice(0, limit) : rows;
  const total = Number(rows[0]?.total_count ?? 0);

  return {
    attempts: visibleRows.map((row) => toAttemptListItemFromRow(row, includeUser)),
    nextCursor: hasNextPage ? encodeCursor(visibleRows[visibleRows.length - 1]) : null,
    total,
  };
}

function buildWhereSql({
  filters,
  userId,
  includeDeleted,
}: {
  filters: AttemptFilters;
  userId?: string;
  includeDeleted: boolean;
}) {
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
        OR a.label ILIKE ${likeQuery} ESCAPE '\\'
        OR coalesce(u.name, '') ILIKE ${likeQuery} ESCAPE '\\'
        OR coalesce(u.email, '') ILIKE ${likeQuery} ESCAPE '\\'
        OR a.attempt_id::text ILIKE ${likeQuery} ESCAPE '\\'
        OR a.test_type::text ILIKE ${likeQuery} ESCAPE '\\'
        OR a.outcome::text ILIKE ${likeQuery} ESCAPE '\\'
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

async function toAttemptDetail(
  attempt: Prisma.TestAttemptGetPayload<{ select: typeof ATTEMPT_SELECT }>,
  includeUser: boolean,
) {
  const rawResponse = await downloadAttemptJson(
    createAttemptBlobContainerClient(),
    `derived/${attempt.attemptId}.json`,
  );
  const testType = fromPrismaTestMode(attempt.testType);

  return {
    ...toAttemptListItem(attempt, includeUser),
    modelVersion: attempt.modelVersion,
    calibrationMode: fromPrismaCalibrationMode(attempt.calibrationMode),
    result: toPredictionResult(rawResponse, testType),
    contentSnapshot: getContentSnapshot(rawResponse),
    visualizations: getAttemptVisualizations(rawResponse, testType),
  };
}

function toAttemptListItem(
  attempt: Prisma.TestAttemptGetPayload<{ select: typeof ATTEMPT_SELECT }>,
  includeUser: boolean,
): AttemptListItem {
  return {
    attemptId: attempt.attemptId,
    testType: fromPrismaTestMode(attempt.testType),
    outcome: fromPrismaOutcome(attempt.outcome),
    age: attempt.age,
    label: attempt.label,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
    deletedAt: attempt.deletedAt?.toISOString() ?? null,
    user: includeUser ? attempt.user : undefined,
  };
}

function toAttemptListItemFromRow(row: AttemptListRow, includeUser: boolean): AttemptListItem {
  return {
    attemptId: row.attempt_id,
    testType: fromPrismaTestMode(row.test_type),
    outcome: fromPrismaOutcome(row.outcome),
    age: row.age,
    label: row.label,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    user: includeUser
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
        }
      : undefined,
  };
}

function encodeCursor(row: AttemptListRow) {
  return Buffer.from(
    JSON.stringify({
      createdAt: new Date(row.created_at).toISOString(),
      attemptId: row.attempt_id,
    }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(cursor?: string): AttemptCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      attemptId?: unknown;
    };
    const createdAt = typeof decoded.createdAt === 'string' ? new Date(decoded.createdAt) : null;

    if (!createdAt || Number.isNaN(createdAt.getTime()) || typeof decoded.attemptId !== 'string') {
      return null;
    }

    return { createdAt, attemptId: decoded.attemptId };
  } catch {
    return null;
  }
}

function startOfUtcDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endExclusiveUtcDay(value: string) {
  const date = startOfUtcDay(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function toPrismaTestMode(testType: TestMode): PrismaTestMode {
  return testType === 'tobii' ? PrismaTestMode.TOBII : PrismaTestMode.WEBCAM;
}

function fromPrismaTestMode(testType: PrismaTestMode): TestMode {
  return testType === PrismaTestMode.TOBII ? 'tobii' : 'webcam';
}

function toPrismaOutcome(outcome: RiskLevel): AttemptOutcome {
  switch (outcome) {
    case 'low':
      return AttemptOutcome.LOW;
    case 'medium':
      return AttemptOutcome.MEDIUM;
    case 'high':
      return AttemptOutcome.HIGH;
  }
}

function fromPrismaOutcome(outcome: AttemptOutcome): RiskLevel {
  switch (outcome) {
    case AttemptOutcome.LOW:
      return 'low';
    case AttemptOutcome.MEDIUM:
      return 'medium';
    case AttemptOutcome.HIGH:
      return 'high';
  }
}

function fromPrismaCalibrationMode(calibrationMode: PrismaCalibrationMode): CalibrationMode {
  switch (calibrationMode) {
    case PrismaCalibrationMode.GRID:
      return 'grid';
    case PrismaCalibrationMode.STAR:
      return 'star';
    case PrismaCalibrationMode.STICKMAN:
      return 'stickman';
  }
}
