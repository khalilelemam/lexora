import 'server-only';

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
import type {
  AttemptFilters,
  AttemptListItem,
  AttemptsPagination,
} from '@/features/attempts/types';
import type { CalibrationMode, RiskLevel, TestMode } from '@/features/test/types';

import { getContentSnapshot, toPredictionResult } from './attempt-result';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

const ATTEMPT_SELECT = {
  attemptId: true,
  testType: true,
  outcome: true,
  modelVersion: true,
  calibrationMode: true,
  age: true,
  label: true,
  derivedBlobUrl: true,
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
  label: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  total_count: bigint | number;
}

interface ListAttemptsResult {
  attempts: AttemptListItem[];
  pagination: AttemptsPagination;
}

export async function listUserAttempts(
  userId: string,
  filters: AttemptFilters,
): Promise<ListAttemptsResult> {
  return listAttempts({ filters, userId, includeUser: false });
}

export async function getUserAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.testAttempt.findFirst({
    where: { attemptId, userId },
    select: ATTEMPT_SELECT,
  });

  return attempt ? toAttemptDetail(attempt, false) : null;
}

export async function listAdminAttempts(filters: AttemptFilters): Promise<ListAttemptsResult> {
  return listAttempts({ filters, includeUser: true });
}

export async function getAdminAttempt(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { attemptId },
    select: ATTEMPT_SELECT,
  });

  return attempt ? toAttemptDetail(attempt, true) : null;
}

async function listAttempts({
  filters,
  userId,
  includeUser,
}: {
  filters: AttemptFilters;
  userId?: string;
  includeUser: boolean;
}): Promise<ListAttemptsResult> {
  const page = filters.page ?? DEFAULT_PAGE;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const whereSql = buildWhereSql(filters, userId);

  const rows = await prisma.$queryRaw<AttemptListRow[]>(Prisma.sql`
    SELECT
      a.attempt_id,
      a.test_type,
      a.outcome,
      a.age,
      a.label,
      a.created_at,
      a.updated_at,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      COUNT(*) OVER() AS total_count
    FROM test_attempts a
    INNER JOIN users u ON u.id = a.user_id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `);

  const total = Number(rows[0]?.total_count ?? 0);

  return {
    attempts: rows.map((row) => toAttemptListItemFromRow(row, includeUser)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

function buildWhereSql(filters: AttemptFilters, userId?: string) {
  const conditions: Prisma.Sql[] = [];

  if (userId) {
    conditions.push(Prisma.sql`a.user_id = ${userId}`);
  }

  if (filters.testType) {
    conditions.push(Prisma.sql`a.test_type::text = ${toPrismaTestMode(filters.testType)}`);
  }

  if (filters.outcome) {
    conditions.push(Prisma.sql`a.outcome::text = ${toPrismaOutcome(filters.outcome)}`);
  }

  if (filters.query) {
    conditions.push(Prisma.sql`
      to_tsvector(
        'simple',
        concat_ws(
          ' ',
          coalesce(a.label, ''),
          a.test_type::text,
          a.outcome::text,
          coalesce(u.name, ''),
          coalesce(u.email, '')
        )
      ) @@ websearch_to_tsquery('simple', ${filters.query})
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
    user: includeUser
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
        }
      : undefined,
  };
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
