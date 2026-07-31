'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteMyAttempt,
  getAdminAttempt,
  getAdminAttempts,
  getMyAttempt,
  getMyAttempts,
} from '@/features/attempts/api';
import type { AttemptFilters, AttemptsListResponse } from '@/features/attempts/types';

/**
 * Stops paging when the server hands back the cursor it was just given.
 *
 * A cursor that does not advance means the next request would return the page
 * we already have, so treating it as "no more pages" keeps a server-side
 * pagination fault from turning into an endlessly repeating list.
 */
function getNextCursor(
  lastPage: AttemptsListResponse,
  _allPages: AttemptsListResponse[],
  lastPageParam: string | undefined,
) {
  if (!lastPage.nextCursor || lastPage.nextCursor === lastPageParam) {
    return undefined;
  }

  return lastPage.nextCursor;
}

export function useMyAttempts(filters: AttemptFilters) {
  return useInfiniteQuery({
    queryKey: ['attempts', 'mine', filters],
    queryFn: ({ pageParam }) => getMyAttempts({ ...filters, cursor: pageParam }),
    getNextPageParam: getNextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

export function useMyAttempt(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: ['attempts', 'mine', attemptId],
    queryFn: () => getMyAttempt(attemptId),
    enabled,
  });
}

export function useAdminAttempts(filters: AttemptFilters) {
  return useInfiniteQuery({
    queryKey: ['attempts', 'admin', filters],
    queryFn: ({ pageParam }) => getAdminAttempts({ ...filters, cursor: pageParam }),
    getNextPageParam: getNextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

export function useAdminAttempt(attemptId: string, enabled = true) {
  return useQuery({
    queryKey: ['attempts', 'admin', attemptId],
    queryFn: () => getAdminAttempt(attemptId),
    enabled,
  });
}

export function useDeleteMyAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMyAttempt,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attempts', 'mine'] });
    },
  });
}
