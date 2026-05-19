import { headers } from 'next/headers';
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
 * Validates that a callback URL is a safe, internal path.
 * Rejects absolute URLs, protocol-relative URLs, and other external redirects
 * to prevent open-redirect attacks (e.g. `/sign-in?callbackUrl=https://evil.com`).
 */
function sanitizeCallbackUrl(url: string | undefined): string {
  if (!url) return '/';
  // Must start with a single slash (not //) to be a relative path
  if (!url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}

/**
 * Sign-in page — **server component**.
 *
 * - Redirects authenticated users away (they shouldn't see this page).
 * - Reads `callbackUrl` from search params and passes it to the client card.
 * - Sanitizes callbackUrl to prevent open-redirect attacks.
 * - All interactive logic lives in `_components/sign-in-card.tsx`.
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { callbackUrl: rawCallbackUrl } = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(rawCallbackUrl);

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <div className="relative flex w-full max-w-105 flex-col items-center">
      <FloatingOrbs />

      {/* Theme toggle */}
      <div className="absolute -top-2 right-0">
        <ThemeToggle />
      </div>

      {/* Logo */}
      <div className="mb-8">
        <LexoraLogo size="lg" animate />
      </div>

      {/* Sign-in card (includes consent checkboxes — issue #45) */}
      <SignInCard callbackUrl={callbackUrl} />
    </div>
  );
}
