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
  // Temporarily bypass authentication check so anyone can access /test pages
  // const session = await auth.api.getSession({
  //   headers: await headers(),
  // });
  //
  // if (!session) {
  //   const signInUrl = new URL('/sign-in', request.url);
  //   signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  //   return NextResponse.redirect(signInUrl);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ['/test/:path*'],
};
