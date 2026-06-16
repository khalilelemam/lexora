import 'server-only';

import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export class SubmissionAuthError extends Error {
  constructor(message = 'You must be signed in to submit a test.') {
    super(message);
    this.name = 'SubmissionAuthError';
  }
}

export interface AuthenticatedSubmissionUser {
  id: string;
  rawDataConsent: boolean;
}

export async function getAuthenticatedSubmissionUser(): Promise<AuthenticatedSubmissionUser> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  if (!userId) {
    throw new SubmissionAuthError();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      rawDataConsent: true,
    },
  });

  if (!user) {
    throw new SubmissionAuthError('Your account could not be found. Please sign in again.');
  }

  return user;
}
