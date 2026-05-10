import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Next.js 16 proxy — lightweight cookie-based auth guard.
 *
 * Only checks for the *existence* of a session cookie to redirect
 * unauthenticated users. Full validation happens inside each
 * protected page/route via `auth.api.getSession()`.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/test/:path*'],
};
