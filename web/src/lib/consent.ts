/**
 * Consent cookie utilities.
 *
 * The sign-in page sets a `lexora_consent` cookie with the user's
 * Terms/Privacy acceptance and raw-data opt-in choice. These helpers
 * parse that cookie on the server so we can persist consent to the DB.
 */

export const CONSENT_COOKIE_NAME = 'lexora_consent';

export interface ConsentPayload {
  /** Whether Terms / Privacy were accepted. */
  terms: boolean;
  /** Whether the user opted in to raw data storage. */
  rawData: boolean;
  /** ISO timestamp when consent was given. */
  ts: string;
}

/**
 * Parse the consent cookie value. Returns `null` if absent or malformed.
 */
export function parseConsentCookie(cookieHeader: string | null): ConsentPayload | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONSENT_COOKIE_NAME}=`));

  if (!match) return null;

  try {
    const raw = decodeURIComponent(match.split('=').slice(1).join('='));
    const parsed = JSON.parse(raw) as Partial<ConsentPayload>;

    if (typeof parsed.terms !== 'boolean' || typeof parsed.rawData !== 'boolean' || !parsed.ts) {
      return null;
    }

    return parsed as ConsentPayload;
  } catch {
    return null;
  }
}
