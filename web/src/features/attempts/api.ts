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
 * Uses a raw fetch (rather than ky) because we need to handle the binary
 * response as a blob and trigger a file download rather than parsing JSON.
 */
export async function exportAdminAttempts(
  filters: AttemptFilters,
  include: ExportContentMode,
  includeVisuals: boolean,
): Promise<void> {
  const response = await fetch('/api/admin/export', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters: toFilterBody(filters), include, includeVisuals }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Export failed' }));
    throw new Error((error as { error?: string }).error ?? 'Export failed');
  }

  // Extract filename from Content-Disposition header or use a default.
  const disposition = response.headers.get('Content-Disposition');
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] ?? 'lexora-export.zip';

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up after a short delay to ensure the download starts.
  setTimeout(() => {
    URL.revokeObjectURL(url);
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
  if (filters.minCalibrationAccuracy !== undefined) params.set('minCalibrationAccuracy', String(filters.minCalibrationAccuracy));

  return params;
}

/**
 * Converts AttemptFilters into a plain object for the export POST body.
 * Array fields (outcomes) are serialized as arrays rather than repeated params.
 */
function toFilterBody(filters: AttemptFilters): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (filters.testType) body.testType = filters.testType;
  if (filters.outcomes?.length) body.outcome = filters.outcomes;
  if (filters.query) body.query = filters.query;
  if (filters.createdFrom) body.createdFrom = filters.createdFrom;
  if (filters.createdTo) body.createdTo = filters.createdTo;
  if (filters.minCalibrationAccuracy !== undefined) body.minCalibrationAccuracy = filters.minCalibrationAccuracy;

  return body;
}
