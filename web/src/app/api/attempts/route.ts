import { NextRequest, NextResponse } from 'next/server';

import { requireAttemptsUser } from '@/features/attempts/server/auth';
import { toAttemptsErrorResponse } from '@/features/attempts/server/http';
import { listUserAttempts } from '@/features/attempts/server/attempts-repository';
import { parseAttemptFilters } from '@/features/attempts/server/filters';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAttemptsUser();
    const result = await listUserAttempts(
      user.id,
      parseAttemptFilters(request.nextUrl.searchParams),
    );

    return NextResponse.json(result);
  } catch (error) {
    return toAttemptsErrorResponse(error);
  }
}
