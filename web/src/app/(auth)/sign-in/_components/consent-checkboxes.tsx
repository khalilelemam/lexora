'use client';

import { useCallback } from 'react';
import Link from 'next/link';

interface ConsentCheckboxesProps {
  termsAccepted: boolean;
  rawDataOptIn: boolean;
  onTermsChange: (checked: boolean) => void;
  onRawDataChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Consent checkboxes shown on the sign-in / sign-up screen.
 *
 * - **Terms / Privacy** — required to proceed with any auth method.
 * - **Raw data opt-in** — unchecked by default; explicit opt-in for
 *   storing raw gaze data for research & model retraining.
 */
export function ConsentCheckboxes({
  termsAccepted,
  rawDataOptIn,
  onTermsChange,
  onRawDataChange,
  disabled,
}: ConsentCheckboxesProps) {
  const handleTerms = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onTermsChange(e.target.checked),
    [onTermsChange],
  );

  const handleRawData = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onRawDataChange(e.target.checked),
    [onRawDataChange],
  );

  return (
    <div className="flex flex-col gap-3.5">
      {/* Terms / Privacy — required */}
      <label
        htmlFor="consent-terms"
        className="flex cursor-pointer items-start gap-3 text-sm leading-snug"
      >
        <input
          id="consent-terms"
          type="checkbox"
          checked={termsAccepted}
          onChange={handleTerms}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer border-[#51513d]/30 accent-[#51513d]"
        />
        <span className="text-[#1b2021]/60">
          I agree to the{' '}
          <Link
            href="/privacy"
            target="_blank"
            className="font-black text-[#51513d] underline underline-offset-2 hover:text-[#1b2021] hover:no-underline"
          >
            Terms &amp; Privacy Policy
          </Link>
          <span className="ml-0.5 font-black text-red-500">*</span>
        </span>
      </label>

      {/* Raw data opt-in — optional, unchecked by default */}
      <label
        htmlFor="consent-raw-data"
        className="flex cursor-pointer items-start gap-3 text-sm leading-snug"
      >
        <input
          id="consent-raw-data"
          type="checkbox"
          checked={rawDataOptIn}
          onChange={handleRawData}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer border-[#51513d]/30 accent-[#51513d]"
        />
        <span className="text-[#1b2021]/60">
          I consent to storing my raw gaze data for research &amp; model improvement{' '}
          <span className="text-[10px] font-black tracking-[0.15em] text-[#51513d]/40 uppercase">
            optional
          </span>
        </span>
      </label>
    </div>
  );
}
