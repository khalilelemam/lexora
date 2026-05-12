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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="relative w-full overflow-hidden border border-[#51513d]/18 bg-[#f3edd7] shadow-[12px_12px_0_rgba(81,81,61,.10)]"
    >
      {/* Accent bar — editorial stripe */}
      <div className="flex h-2">
        <div className="flex-1 bg-[#1b2021]" />
        <div className="flex-1 bg-[#51513d]" />
        <div className="flex-1 bg-[#a6a867]" />
        <div className="flex-1 bg-[#e3dc95]" />
      </div>

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
            <div className="mb-7">
              <p className="mb-3 text-[10px] font-black tracking-[0.35em] text-[#51513d] uppercase">
                Authenticate
              </p>
              <h1 className="text-3xl font-black tracking-tight text-[#1b2021]">Welcome back</h1>
              <p className="mt-2 text-sm leading-relaxed text-[#1b2021]/58">
                Sign in to continue to Lexora
              </p>
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
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#51513d]/15" />
              <span className="text-[10px] font-black tracking-[0.3em] text-[#51513d]/50 uppercase">
                or
              </span>
              <div className="h-px flex-1 bg-[#51513d]/15" />
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
            <div className="mt-7 border-t border-[#51513d]/12 pt-6">
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
                  className="mt-4 text-center text-xs font-medium text-[#51513d]/60"
                >
                  Please accept the Terms &amp; Privacy Policy to continue.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-5 border border-red-400/40 bg-red-50/80 p-3 text-center text-sm text-red-700"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
