import { apiClient } from '@/lib/api-client';
import type {
  AttemptDetailResponse,
  AttemptFilters,
  AttemptsListResponse,
} from '@/features/attempts/types';

export async function getMyAttempts(filters: AttemptFilters) {
  return apiClient
    .get('/api/attempts', {
      searchParams: toSearchParams(filters),
    })
    .json<AttemptsListResponse>();
}

export async function getMyAttempt(attemptId: string) {
  return apiClient.get(`/api/attempts/${attemptId}`).json<AttemptDetailResponse>();
}

export async function getAdminAttempts(filters: AttemptFilters) {
  return apiClient
    .get('/api/admin/test-attempts', {
      searchParams: toSearchParams(filters),
    })
    .json<AttemptsListResponse>();
}

export async function getAdminAttempt(attemptId: string) {
  return apiClient.get(`/api/admin/test-attempts/${attemptId}`).json<AttemptDetailResponse>();
}

function toSearchParams(filters: AttemptFilters) {
  const params = new URLSearchParams();

  if (filters.testType) params.set('testType', filters.testType);
  if (filters.outcome) params.set('outcome', filters.outcome);
  if (filters.query) params.set('query', filters.query);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

  return params;
}
