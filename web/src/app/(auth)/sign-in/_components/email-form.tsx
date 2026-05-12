'use client';

import { useCallback, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';

import { authClient } from '@/lib/auth-client';
import { emailSchema } from '@/lib/validators/auth';

interface EmailFormProps {
  callbackUrl: string;
  disabled?: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (message: string) => void;
  onSuccess: (email: string) => void;
  /** Called immediately before sending the magic link to persist consent cookie. */
  onBeforeAuth?: () => void;
}

/**
 * Email magic-link form.
 * Validates with Zod, sends the magic link via Better Auth,
 * then triggers onSuccess to show the confirmation view.
 */
export function EmailForm({
  callbackUrl,
  disabled,
  onLoadingChange,
  onError,
  onSuccess,
  onBeforeAuth,
}: EmailFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setValidationError('');

      const result = emailSchema.safeParse(email.trim());
      if (!result.success) {
        setValidationError(result.error.issues[0].message);
        return;
      }

      onBeforeAuth?.();

      setLoading(true);
      onLoadingChange(true);
      onError('');

      try {
        const { error: authError } = await authClient.signIn.magicLink({
          email: result.data,
          callbackURL: callbackUrl,
        });

        if (authError) {
          onError(authError.message || 'Failed to send sign-in link.');
          setLoading(false);
          onLoadingChange(false);
        } else {
          onSuccess(result.data);
          setLoading(false);
          onLoadingChange(false);
        }
      } catch {
        onError('Failed to send sign-in link. Please try again.');
        setLoading(false);
        onLoadingChange(false);
      }
    },
    [email, callbackUrl, onLoadingChange, onError, onSuccess, onBeforeAuth],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-[10px] font-black tracking-[0.2em] text-[#51513d] uppercase"
        >
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#51513d]/50" />
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError('');
            }}
            className="h-12 w-full border border-[#51513d]/18 bg-[#e3dcc2]/50 pl-10 pr-4 text-sm text-[#1b2021] placeholder:text-[#51513d]/35 focus:border-[#51513d]/40 focus:outline-none focus:ring-2 focus:ring-[#a6a867]/25"
            disabled={disabled || loading}
            autoComplete="email"
          />
        </div>
        {validationError && (
          <p className="text-xs font-medium text-red-600">{validationError}</p>
        )}
      </div>

      <button
        id="sign-in-email"
        type="submit"
        className="flex h-12 w-full items-center justify-center gap-2 bg-[#51513d] text-sm font-black text-[#e3dcc2] transition-all hover:bg-[#1b2021] hover:shadow-[4px_4px_0_rgba(81,81,61,.15)] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled || loading || !email.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          'Continue with Email'
        )}
      </button>
    </form>
  );
}
