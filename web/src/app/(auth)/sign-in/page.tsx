import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LexoraLogo } from '@/components/shared/lexora-logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { auth } from '@/lib/auth';

import { FloatingOrbs } from './_components/floating-orbs';
import { SignInCard } from './_components/sign-in-card';

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

/**
 * Sign-in page — **server component**.
 *
 * - Redirects authenticated users away (they shouldn't see this page).
 * - Reads `callbackUrl` from search params and passes it to the client card.
 * - All interactive logic lives in `_components/sign-in-card.tsx`.
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    const params = await searchParams;
    redirect(params.callbackUrl || '/');
  }

  const { callbackUrl = '/' } = await searchParams;

  return (
    <div className="relative flex w-full max-w-[420px] flex-col items-center">
      <FloatingOrbs />

      {/* Theme toggle */}
      <div className="absolute -top-2 right-0">
        <ThemeToggle />
      </div>

      {/* Logo */}
      <div className="mb-8">
        <LexoraLogo size="lg" animate />
      </div>

      {/* Sign-in card */}
      <SignInCard callbackUrl={callbackUrl} />

      {/* Footer */}
      <p className="text-muted-foreground mt-6 text-center text-xs">
        By signing in, you agree to our{' '}
        <Link
          href="/privacy"
          className="text-foreground underline underline-offset-2 hover:no-underline"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
