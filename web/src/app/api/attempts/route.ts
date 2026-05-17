import { NextRequest, NextResponse } from 'next/server';

import { requireAttemptsUser } from '@/features/attempts/server/auth';
import { toAttemptsErrorResponse } from '@/features/attempts/server/http';
import { listUserAttempts } from '@/features/attempts/server/attempts-repository';
import { parseAttemptFilters } from '@/features/attempts/server/filters';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAttemptsUser();
    const { attempts, pagination } = await listUserAttempts(
      user.id,
      parseAttemptFilters(request.nextUrl.searchParams),
    );

    return NextResponse.json({ attempts, pagination });
  } catch (error) {
    return toAttemptsErrorResponse(error);
  }
}
