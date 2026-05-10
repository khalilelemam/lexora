'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { EmailForm } from './email-form';
import { EmailSent } from './email-sent';
import { GoogleButton } from './google-button';

interface SignInCardProps {
  callbackUrl: string;
}

/**
 * Client-side sign-in card — orchestrates Google and email flows.
 * Extracted from page.tsx to keep the page as a server component.
 */
export function SignInCard({ callbackUrl }: SignInCardProps) {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    setSentEmail(null);
    setError('');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="bg-card relative w-full overflow-hidden rounded-2xl border shadow-lg"
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-[oklch(0.4_0.04_110)] via-[oklch(0.7_0.1_115)] to-[oklch(0.78_0.1_90)]" />

      <AnimatePresence mode="wait">
        {sentEmail ? (
          <EmailSent email={sentEmail} onBack={handleBack} />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8"
          >
            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-muted-foreground mt-1 text-sm">Sign in to continue to Lexora</p>
            </div>

            {/* Google */}
            <GoogleButton
              callbackUrl={callbackUrl}
              disabled={globalLoading}
              onLoadingChange={setGlobalLoading}
              onError={setError}
            />

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                or
              </span>
              <div className="bg-border h-px flex-1" />
            </div>

            {/* Email */}
            <EmailForm
              callbackUrl={callbackUrl}
              disabled={globalLoading}
              onLoadingChange={setGlobalLoading}
              onError={setError}
              onSuccess={setSentEmail}
            />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 text-center text-sm text-red-500"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
