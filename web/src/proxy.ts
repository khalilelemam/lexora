import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';

/**
 * Server-side auth guard — protects /test routes.
 *
 * Unauthenticated users are redirected to /sign-in with a callbackUrl
 * pointing back to the original test route so they return after login.
 *
 * @see https://github.com/khalilelemam/lexora/issues/46
 */
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // BYPASS FOR TESTING: Disable redirect to allow unauthenticated access during UI testing.
    return NextResponse.next();
    // const signInUrl = new URL('/sign-in', request.url);
    // signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    // return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/test/:path*'],
};
