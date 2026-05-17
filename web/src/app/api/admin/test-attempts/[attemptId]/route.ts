import { NextResponse } from 'next/server';

import { getAdminAttempt } from '@/features/attempts/server/attempts-repository';
import { requireAdminAttemptsUser } from '@/features/attempts/server/auth';
import { toAttemptsErrorResponse } from '@/features/attempts/server/http';

interface RouteContext {
  params: Promise<{ attemptId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const [{ attemptId }] = await Promise.all([context.params, requireAdminAttemptsUser()]);
    const attempt = await getAdminAttempt(attemptId);

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    return toAttemptsErrorResponse(error);
  }
}
