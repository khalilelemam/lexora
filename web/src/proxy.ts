import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';

/**
 * Next.js 16 proxy — session-validated auth guard.
 *
 * Validates the session token against Better Auth (not just cookie
 * existence) to prevent stale/revoked cookies from bypassing protection.
 * Preserves the full URL (path + query) in the callbackUrl.
 */
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const signInUrl = new URL('/sign-in', request.url);
    const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;
    signInUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/test/:path*'],
};
