'use client';

import { useCallback } from 'react';
import Link from 'next/link';

import { Label } from '@/components/ui/label';

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
    <div className="flex flex-col gap-3">
      {/* Terms / Privacy — required */}
      <Label
        htmlFor="consent-terms"
        className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug font-normal"
      >
        <input
          id="consent-terms"
          type="checkbox"
          checked={termsAccepted}
          onChange={handleTerms}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border accent-[oklch(0.40_0.04_110)]"
        />
        <span className="text-muted-foreground">
          I agree to the{' '}
          <Link
            href="/privacy"
            target="_blank"
            className="text-foreground underline underline-offset-2 hover:no-underline"
          >
            Terms &amp; Privacy Policy
          </Link>
          <span className="text-destructive ml-0.5">*</span>
        </span>
      </Label>

      {/* Raw data opt-in — optional, unchecked by default */}
      <Label
        htmlFor="consent-raw-data"
        className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug font-normal"
      >
        <input
          id="consent-raw-data"
          type="checkbox"
          checked={rawDataOptIn}
          onChange={handleRawData}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border accent-[oklch(0.40_0.04_110)]"
        />
        <span className="text-muted-foreground">
          I consent to storing my raw gaze data for research &amp; model improvement{' '}
          <span className="text-muted-foreground/60 text-xs">(optional)</span>
        </span>
      </Label>
    </div>
  );
}
