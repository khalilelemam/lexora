import { NextRequest, NextResponse } from 'next/server';

import { listAdminAttempts } from '@/features/attempts/server/attempts-repository';
import { requireAdminAttemptsUser } from '@/features/attempts/server/auth';
import { parseAttemptFilters } from '@/features/attempts/server/filters';
import { toAttemptsErrorResponse } from '@/features/attempts/server/http';

export async function GET(request: NextRequest) {
  try {
    await requireAdminAttemptsUser();
    const { attempts, pagination } = await listAdminAttempts(
      parseAttemptFilters(request.nextUrl.searchParams),
    );

    return NextResponse.json({ attempts, pagination });
  } catch (error) {
    return toAttemptsErrorResponse(error);
  }
}
