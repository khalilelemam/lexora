import type { AttemptFilters } from '@/features/attempts/types';
import type { RiskLevel, TestMode } from '@/features/test/types';

const TEST_TYPES = new Set<TestMode>(['tobii', 'webcam']);
const OUTCOMES = new Set<RiskLevel>(['low', 'medium', 'high']);
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

/**
 * Upper bound for the opaque pagination cursor, as an abuse guard only.
 *
 * A real cursor is a fixed 122 characters (base64url of an ISO timestamp plus
 * a UUID), so this must stay comfortably above that — truncating a cursor
 * corrupts it. `decodeCursor` does the actual validation.
 */
const MAX_CURSOR_LENGTH = 256;

export function parseAttemptFilters(searchParams: URLSearchParams): AttemptFilters {
  const testType = searchParams.get('testType');
  const outcomes = searchParams
    .getAll('outcome')
    .filter((outcome): outcome is RiskLevel => OUTCOMES.has(outcome as RiskLevel));
  const query = normalizeQuery(searchParams.get('query'));
  const limit = Math.min(parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT);

  return {
    testType: TEST_TYPES.has(testType as TestMode) ? (testType as TestMode) : undefined,
    outcomes: outcomes.length > 0 ? outcomes : undefined,
    query,
    createdFrom: normalizeDate(searchParams.get('createdFrom')),
    createdTo: normalizeDate(searchParams.get('createdTo')),
    cursor: normalizeCursor(searchParams.get('cursor')),
    limit,
  };
}

/** Caps free-text search so it cannot blow up the tsquery. */
function normalizeQuery(query: string | null) {
  const normalized = query?.trim();
  return normalized ? normalized.slice(0, 120) : undefined;
}

/**
 * The cursor is an opaque token, not free text, so it gets its own bound.
 *
 * Sharing `normalizeQuery` here silently truncated every cursor to 120 of its
 * 122 characters. `decodeCursor` then failed to parse the result and fell back
 * to "no cursor", so each page after the first restarted from the top and the
 * list repeated forever.
 */
function normalizeCursor(cursor: string | null) {
  const normalized = cursor?.trim();
  return normalized ? normalized.slice(0, MAX_CURSOR_LENGTH) : undefined;
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeDate(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : value;
}
