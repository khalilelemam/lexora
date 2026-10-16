import 'server-only';

import { Buffer } from 'node:buffer';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { AttemptFilters, AttemptListItem } from '@/features/attempts/types';

const DEFAULT_LIMIT = 12;

interface ListAttemptsResult {
  attempts: AttemptListItem[];
  nextCursor: string | null;
  total: number;
}

export async function listUserAttempts(
  userId: string,
  filters: AttemptFilters,
): Promise<ListAttemptsResult> {
  return listAttempts({ filters, userId, includeUser: false, includeDeleted: false });
}

export async function getUserAttempt(userId: string, attemptId: string) {
  void userId;
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId },
  });

  if (!attempt) return null;

  return {
    attemptId: attempt.id,
    testType: 'webcam' as const,
    outcome: 'low' as const,
    age: attempt.participantAge,
    label: attempt.label ?? 'Research Participant',
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
    deletedAt: null,
    user: undefined,
    modelVersion: 'v1.0.0-waitlist',
    calibrationMode: 'grid' as const,
    result: {
      dyslexiaProbability: 0,
      riskLevel: 'low' as const,
      confidence: 1,
      metadata: {},
      features: [],
    },
    contentSnapshot: null,
    visualizations: [],
  };
}

export async function softDeleteUserAttempt(userId: string, attemptId: string) {
  void userId;
  const result = await prisma.testAttempt.deleteMany({
    where: { id: attemptId },
  });
  return result.count > 0;
}

export async function listAdminAttempts(filters: AttemptFilters): Promise<ListAttemptsResult> {
  return listAttempts({ filters, includeUser: true, includeDeleted: true });
}

export async function getAdminAttempt(attemptId: string) {
  return getUserAttempt('admin', attemptId);
}

async function listAttempts({
  filters,
  userId,
  includeUser,
}: {
  filters: AttemptFilters;
  userId?: string;
  includeUser: boolean;
  includeDeleted: boolean;
}): Promise<ListAttemptsResult> {
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const where: Prisma.TestAttemptWhereInput = {};
  void userId;

  const [items, total] = await Promise.all([
    prisma.testAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    }),
    prisma.testAttempt.count({ where }),
  ]);

  const hasNextPage = items.length > limit;
  const visibleItems = hasNextPage ? items.slice(0, limit) : items;

  const attempts: AttemptListItem[] = visibleItems.map((attempt) => ({
    attemptId: attempt.id,
    testType: (attempt.testType?.toLowerCase() === 'tobii' ? 'tobii' : 'webcam') as 'tobii' | 'webcam',
    outcome: 'low',
    age: attempt.participantAge,
    label: attempt.label ?? 'Research Participant',
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
    deletedAt: null,
    user: includeUser
      ? { id: 'research', name: 'Waitlist Contributor', email: 'contributor@lexora.page' }
      : undefined,
  }));

  const lastItem = visibleItems[visibleItems.length - 1];
  const nextCursor =
    hasNextPage && lastItem
      ? Buffer.from(
          JSON.stringify({
            createdAt: lastItem.createdAt.toISOString(),
            attemptId: lastItem.id,
          }),
          'utf8',
        ).toString('base64url')
      : null;

  return {
    attempts,
    nextCursor,
    total,
  };
}
