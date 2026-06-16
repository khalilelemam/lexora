import { NextResponse } from 'next/server';

import { AttemptsAuthError, AttemptsForbiddenError } from './auth';

export function toAttemptsErrorResponse(error: unknown) {
  if (error instanceof AttemptsAuthError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof AttemptsForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  console.error('[attempts-api] unexpected error', error);
  return NextResponse.json({ error: 'Unable to load tests.' }, { status: 500 });
}
