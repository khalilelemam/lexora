'use client';

import { useCallback, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { emailSchema } from '@/lib/validators/auth';

interface EmailFormProps {
  callbackUrl: string;
  disabled?: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (message: string) => void;
  onSuccess: (email: string) => void;
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
    [email, callbackUrl, onLoadingChange, onError, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email address
        </Label>
        <div className="relative">
          <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError('');
            }}
            className="h-11 pl-10"
            disabled={disabled || loading}
            autoComplete="email"
          />
        </div>
        {validationError && <p className="text-destructive text-sm">{validationError}</p>}
      </div>

      <Button
        id="sign-in-email"
        type="submit"
        className="h-11 w-full bg-[oklch(0.40_0.04_110)] font-medium text-[oklch(0.94_0.02_90)] hover:bg-[oklch(0.35_0.04_110)]"
        disabled={disabled || loading || !email.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          'Continue with Email'
        )}
      </Button>
    </form>
  );
}
