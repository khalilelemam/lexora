'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

import { authClient } from '@/lib/auth-client';

interface GoogleButtonProps {
  callbackUrl: string;
  disabled?: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (message: string) => void;
  /** Called immediately before the OAuth redirect to persist consent cookie. */
  onBeforeAuth?: () => void;
}

/**
 * Google OAuth sign-in button.
 * Triggers the social sign-in flow via Better Auth.
 */
export function GoogleButton({
  callbackUrl,
  disabled,
  onLoadingChange,
  onError,
  onBeforeAuth,
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    onBeforeAuth?.();

    setLoading(true);
    onLoadingChange(true);
    onError('');

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
      });
    } catch {
      onError('Google sign-in failed. Please try again.');
      setLoading(false);
      onLoadingChange(false);
    }
  }, [callbackUrl, onLoadingChange, onError, onBeforeAuth]);

  return (
    <button
      id="sign-in-google"
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className="relative flex h-12 w-full items-center justify-center gap-2.5 border border-[#51513d]/20 bg-[#e3dcc2]/60 text-sm font-black text-[#1b2021] transition-all hover:bg-[#e3dcc2] hover:shadow-[4px_4px_0_rgba(81,81,61,.10)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#51513d]" />
      ) : (
        <FcGoogle className="h-5 w-5" />
      )}
      Continue with Google
    </button>
  );
}
