import { apiClient } from '@/lib/api-client';
import type {
  AttemptDetailResponse,
  AttemptFilters,
  AttemptsListResponse,
} from '@/features/attempts/types';

export type ExportContentMode = 'raw' | 'derived' | 'both';

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

export async function deleteMyAttempt(attemptId: string) {
  return apiClient.delete(`/api/attempts/${attemptId}`).json<{ ok: true }>();
}

export async function getAdminAttempts(filters: AttemptFilters) {
  return apiClient
    .get('/api/admin/tests', {
      searchParams: toSearchParams(filters),
    })
    .json<AttemptsListResponse>();
}

export async function getAdminAttempt(attemptId: string) {
  return apiClient.get(`/api/admin/tests/${attemptId}`).json<AttemptDetailResponse>();
}

/**
 * Triggers a ZIP export download for the given filters and content mode.
 *
 * Uses a dynamically constructed GET URL and an anchor tag to leverage
 * the browser's native download streaming, avoiding in-memory buffering.
 */
export async function exportAdminAttempts(
  filters: AttemptFilters,
  include: ExportContentMode,
  includeVisuals: boolean,
): Promise<void> {
  const params = toSearchParams(filters);
  params.set('include', include);
  params.set('includeVisuals', String(includeVisuals));

  const url = `/api/admin/export?${params.toString()}`;

  const anchor = document.createElement('a');
  anchor.href = url;
  // The browser will use the Content-Disposition header for the filename.
  anchor.download = '';
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up after a short delay to ensure the download starts.
  setTimeout(() => {
    anchor.remove();
  }, 100);
}

function toSearchParams(filters: AttemptFilters) {
  const params = new URLSearchParams();

  if (filters.testType) params.set('testType', filters.testType);
  filters.outcomes?.forEach((outcome) => params.append('outcome', outcome));
  if (filters.query) params.set('query', filters.query);
  if (filters.createdFrom) params.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) params.set('createdTo', filters.createdTo);
  if (filters.cursor) params.set('cursor', filters.cursor);
  if (filters.limit) params.set('limit', String(filters.limit));

  return params;
}
