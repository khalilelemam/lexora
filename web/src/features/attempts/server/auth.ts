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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  if (!userId) {
    throw new AttemptsAuthError();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new AttemptsAuthError('Your account could not be found. Please sign in again.');
  }

  return user;
}

export async function requireAdminAttemptsUser() {
  const user = await requireAttemptsUser();

  if (user.role !== Role.ADMIN) {
    throw new AttemptsForbiddenError('Admin access is required.');
  }

  return user;
}
