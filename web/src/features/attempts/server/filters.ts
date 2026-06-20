import type { AttemptFilters } from '@/features/attempts/types';
import type { RiskLevel, TestMode } from '@/features/test/types';

const TEST_TYPES = new Set<TestMode>(['tobii', 'webcam']);
const OUTCOMES = new Set<RiskLevel>(['low', 'medium', 'high']);
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

export function parseAttemptFilters(searchParams: URLSearchParams): AttemptFilters {
  const testType = searchParams.get('testType');
  const outcomes = searchParams
    .getAll('outcome')
    .filter((outcome): outcome is RiskLevel => OUTCOMES.has(outcome as RiskLevel));
  const query = normalizeQuery(searchParams.get('query'));
  const limit = Math.min(parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT);

  const minCalibrationAccuracyParam = searchParams.get('minCalibrationAccuracy');
  const minCalibrationAccuracy = minCalibrationAccuracyParam
    ? parsePositiveInt(minCalibrationAccuracyParam, 0)
    : undefined;

  return {
    testType: TEST_TYPES.has(testType as TestMode) ? (testType as TestMode) : undefined,
    outcomes: outcomes.length > 0 ? outcomes : undefined,
    query,
    createdFrom: normalizeDate(searchParams.get('createdFrom')),
    createdTo: normalizeDate(searchParams.get('createdTo')),
    cursor: normalizeQuery(searchParams.get('cursor')),
    limit,
    minCalibrationAccuracy,
  };
}

function normalizeQuery(query: string | null) {
  const normalized = query?.trim();
  return normalized ? normalized.slice(0, 120) : undefined;
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
