'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

import { Button } from '@/components/ui/button';
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
    <Button
      id="sign-in-google"
      variant="outline"
      className="relative h-11 w-full text-sm font-medium"
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FcGoogle className="mr-2 h-5 w-5" />
      )}
      Continue with Google
    </Button>
  );
}
