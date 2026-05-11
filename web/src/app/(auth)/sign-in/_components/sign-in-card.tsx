'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { CONSENT_COOKIE_NAME } from '@/lib/consent';

import { ConsentCheckboxes } from './consent-checkboxes';
import { EmailForm } from './email-form';
import { EmailSent } from './email-sent';
import { GoogleButton } from './google-button';

interface SignInCardProps {
  callbackUrl: string;
}

/**
 * Sets a short-lived consent cookie so the server can read the user's
 * Terms / Privacy acceptance and raw-data opt-in during account creation
 * or session creation (issue #45).
 */
function setConsentCookie(terms: boolean, rawData: boolean) {
  const payload = JSON.stringify({
    terms,
    rawData,
    ts: new Date().toISOString(),
  });

  // 20-minute expiry — must exceed the magic-link token lifetime (900s)
  // so the cookie is still present when a delayed link is clicked.
  const maxAge = 1200;
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(payload)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Client-side sign-in card — orchestrates Google and email flows.
 * Extracted from page.tsx to keep the page as a server component.
 *
 * Consent checkboxes gate the auth buttons:
 * - Terms / Privacy acceptance is **required** to proceed.
 * - Raw data opt-in is optional and unchecked by default.
 */
export function SignInCard({ callbackUrl }: SignInCardProps) {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  // ── Consent state ───────────────────────────────────────
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rawDataOptIn, setRawDataOptIn] = useState(false);

  const handleBack = useCallback(() => {
    setSentEmail(null);
    setError('');
  }, []);

  /**
   * Must be called before initiating any auth flow so the server
   * can read consent from the cookie in `databaseHooks`.
   */
  const persistConsent = useCallback(() => {
    setConsentCookie(termsAccepted, rawDataOptIn);
  }, [termsAccepted, rawDataOptIn]);

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
              disabled={globalLoading || !termsAccepted}
              onLoadingChange={setGlobalLoading}
              onError={setError}
              onBeforeAuth={persistConsent}
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
              disabled={globalLoading || !termsAccepted}
              onLoadingChange={setGlobalLoading}
              onError={setError}
              onSuccess={setSentEmail}
              onBeforeAuth={persistConsent}
            />

            {/* Consent checkboxes (issue #45) */}
            <div className="mt-6">
              <ConsentCheckboxes
                termsAccepted={termsAccepted}
                rawDataOptIn={rawDataOptIn}
                onTermsChange={setTermsAccepted}
                onRawDataChange={setRawDataOptIn}
                disabled={globalLoading}
              />
            </div>

            {/* Terms-not-accepted hint */}
            <AnimatePresence>
              {!termsAccepted && !error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-muted-foreground mt-3 text-center text-xs"
                >
                  Please accept the Terms &amp; Privacy Policy to continue.
                </motion.p>
              )}
            </AnimatePresence>

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
