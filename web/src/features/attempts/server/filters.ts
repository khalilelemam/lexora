import type { AttemptFilters } from '@/features/attempts/types';
import type { RiskLevel, TestMode } from '@/features/test/types';

const TEST_TYPES = new Set<TestMode>(['tobii', 'webcam']);
const OUTCOMES = new Set<RiskLevel>(['low', 'medium', 'high']);
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export function parseAttemptFilters(searchParams: URLSearchParams): AttemptFilters {
  const testType = searchParams.get('testType');
  const outcome = searchParams.get('outcome');
  const query = normalizeQuery(searchParams.get('query'));
  const page = parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
  const pageSize = Math.min(
    parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  return {
    testType: TEST_TYPES.has(testType as TestMode) ? (testType as TestMode) : undefined,
    outcome: OUTCOMES.has(outcome as RiskLevel) ? (outcome as RiskLevel) : undefined,
    query,
    page,
    pageSize,
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
