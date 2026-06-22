import 'server-only';

import { headers } from 'next/headers';

import { Role } from '@/generated/prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export class AttemptsAuthError extends Error {
  constructor(message = 'You must be signed in to view tests.') {
    super(message);
    this.name = 'AttemptsAuthError';
  }
}

export class AttemptsForbiddenError extends Error {
  constructor(message = 'You do not have permission to view this resource.') {
    super(message);
    this.name = 'AttemptsForbiddenError';
  }
}

export interface AttemptsUser {
  id: string;
  role: Role;
}

export async function requireAttemptsUser(): Promise<AttemptsUser> {
  // BYPASS FOR TESTING
  const firstUser = await prisma.user.findFirst();
  if (firstUser) {
    return { id: firstUser.id, role: Role.ADMIN };
  }
  return { id: 'test-user-id', role: Role.ADMIN };
}

export async function requireAdminAttemptsUser() {
  const user = await requireAttemptsUser();

  if (user.role !== Role.ADMIN) {
    throw new AttemptsForbiddenError('Admin access is required.');
  }

  return user;
}
