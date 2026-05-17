import { NextResponse } from 'next/server';

import { requireAttemptsUser } from '@/features/attempts/server/auth';
import { getUserAttempt } from '@/features/attempts/server/attempts-repository';
import { toAttemptsErrorResponse } from '@/features/attempts/server/http';

interface RouteContext {
  params: Promise<{ attemptId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const [{ attemptId }, user] = await Promise.all([context.params, requireAttemptsUser()]);
    const attempt = await getUserAttempt(user.id, attemptId);

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    return toAttemptsErrorResponse(error);
  }
}
